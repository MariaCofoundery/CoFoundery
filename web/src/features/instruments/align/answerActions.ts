"use server";

import { followUpApplies } from "@/features/instruments/align/followUps";

import { createClient } from "@/lib/supabase/server";
import {
  FOUNDER_PROFILE_INSTRUMENT_ID,
  VENTURE_ALIGNMENT_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import {
  getItemsV22,
  registryOf,
  type AssessmentScope,
} from "@/features/instruments/align/registries";
import { answerableOf } from "@/features/instruments/align/questionnaireData";
import {
  validateAnswerV21,
  type AlignmentAnswerV21,
} from "@/features/instruments/v21/answersV21";
import { resolveVenture } from "@/features/instruments/align/ventureResolution";

/**
 * Speichern, zurücknehmen, abgeben - für beide Bögen.
 *
 * ---------------------------------------------------------------------------
 * DER SCOPE ENTSCHEIDET, WO DIE ANTWORT LANDET
 * ---------------------------------------------------------------------------
 *
 * Das Arbeitsprofil gehört zur Person: ein Fragebogen, kein Vorhaben. Das
 * Venture-Alignment gehört zu EINEM Vorhaben - dieselbe Person kann bei zwei
 * Vorhaben verschiedene Zusagen machen, ohne sich zu widersprechen.
 *
 * Deshalb wird der Entwurf je Scope gesucht UND angelegt. Ein Fragebogen ohne
 * diese Unterscheidung wäre genau die Unklarheit, wegen der geteilt wurde:
 * Hieß „15 Stunden“ allgemein oder für dieses Vorhaben im September?
 */

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

/**
 * Was die Datenbank abgewiesen hat - in Worten statt in Fehlercodes.
 *
 * ---------------------------------------------------------------------------
 * "SETUP_MISSING" IST DER FALL, DEN NIEMAND ERRAET
 * ---------------------------------------------------------------------------
 *
 * Gemeldet am 30.09.2026: Speichern geht nicht, „Erneut versuchen" hilft
 * nicht. Die Ursache lag nicht im Code, sondern daneben - die Migrationen
 * waren in der Produktionsdatenbank nie eingespielt. Dort gibt es die beiden
 * Fassungen nicht, und der Modulwert `founder_profile` fehlt im Aufzählungstyp.
 *
 * Postgres sagt dazu `22P02` (unbekannter Wert in einer Aufzählung) oder
 * `23503` (Fremdschlüssel zeigt ins Leere). Beides heißt dasselbe: Diese
 * Datenbank kennt den Fragebogen nicht.
 *
 * WARUM DAS EINEN EIGENEN NAMEN BRAUCHT: Ein Wiederholen-Knopf, der nie
 * Erfolg haben kann, ist schlimmer als gar keiner. Er lässt jemanden zehnmal
 * klicken und dann glauben, er habe etwas falsch gemacht.
 */
/**
 * Warum die Datenbank nein gesagt hat.
 *
 * ---------------------------------------------------------------------------
 * DREI CODES REICHTEN NICHT
 * ---------------------------------------------------------------------------
 *
 * Alles ausser drei Codes landete bei `draft_create_failed` - und das hatte
 * keinen eigenen Satz in der Oberflaeche. Heraus kam "Das konnte nicht
 * gespeichert werden" mit einem Knopf "Erneut versuchen", der nie half.
 *
 * Die wichtigste Ergaenzung sind die drei Codes fuer "das gibt es hier nicht":
 * fehlende Spalte, fehlende Tabelle, fehlende Funktion. Sie heissen alle
 * dasselbe - die Datenbank ist nicht auf dem Stand der Anwendung -, und genau
 * dafuer gibt es schon einen Satz, der sagt, dass Wiederholen nicht hilft.
 * Am 30.09.2026 war das bereits einmal die Ursache, damals sichtbar an einem
 * anderen Code.
 */
function grundFuer(error: { code?: string } | null): string {
  switch (error?.code) {
    case "42501":
      return "no_permission";

    // Die Datenbank kennt etwas nicht, das die Anwendung erwartet: eine
    // Spalte, eine Tabelle, eine Funktion, ein Wert einer Aufzaehlung.
    case "22P02":
    case "23503":
    case "42703":
    case "42P01":
    case "42883":
    case "42704":
      return "setup_missing";

    // Eine Pruefregel hat die Antwort abgelehnt. Wiederholen aendert daran
    // nichts - dieselbe Antwort wird dieselbe Ablehnung bekommen.
    case "23514":
      return "value_rejected";

    // Zwei Schreibversuche gleichzeitig. Der zweite kann Erfolg haben.
    case "40001":
    case "40P01":
      return "unreachable";

    default:
      return "draft_create_failed";
  }
}

const INSTRUMENT: Record<AssessmentScope, string> = {
  founder_profile: FOUNDER_PROFILE_INSTRUMENT_ID,
  venture_alignment: VENTURE_ALIGNMENT_INSTRUMENT_ID,
};

/**
 * Der laufende Entwurf.
 *
 * ---------------------------------------------------------------------------
 * DAS GEMEINTE VORHABEN WIRD DURCHGEREICHT, NICHT ERRATEN
 * ---------------------------------------------------------------------------
 *
 * Vorher stand hier `resolveVenture(userId)` ohne die Wahl der Person. Wer in
 * zwei Vorhaben ist, konnte den Fragebogen damit oeffnen - die Seite fragt ja,
 * welches gemeint ist - und dann nichts speichern: `resolveVenture` gibt bei
 * mehreren `null` zurueck, und der Aufruf warf `venture_ambiguous`.
 *
 * Gefunden am 29.09.2026. Es ist derselbe Fehler wie auf der
 * Bestaetigungsseite: Die Wahl steht in der Adresse und kam nicht bis hierher.
 */
/**
 * ERWARTBARE FEHLSCHLAEGE SIND ERGEBNISSE, KEINE AUSNAHMEN.
 *
 * Vorher warf diese Funktion. Eine geworfene Serveraktion kommt im Browser
 * als abgelehntes Versprechen an, und das sah dort aus wie ein Netzfehler:
 * „Keine Verbindung - deine Eingabe ist nicht gespeichert." Gemeldet am
 * 30.09.2026. Wer keine Founder-Rolle hat oder in zwei Vorhaben steht, hat
 * aber kein Netzproblem, sondern eines, das man ihm sagen kann.
 */
type Draft =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; assessment: { id: string; submitted_at: string | null }; ventureId: string | null }
  | { ok: false; reason: string; detail?: string };

async function draftFor(
  scope: AssessmentScope,
  preferredVentureId?: string,
): Promise<Draft> {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) return { ok: false, reason: "not_authenticated" };
  const userId = auth.user.id;

  // Nur der Venture-Bogen braucht ein Vorhaben. Beim Arbeitsprofil bleibt es
  // leer - die Datenbank weist es sonst ab.
  let ventureId: string | null = null;
  if (scope === "venture_alignment") {
    const { venture } = await resolveVenture(userId, preferredVentureId);
    if (!venture) return { ok: false, reason: "venture_ambiguous" };
    ventureId = venture.id;
  }

  const suche = supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", userId)
    .eq("module", scope)
    .eq("instrument_id", INSTRUMENT[scope])
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: existing } = ventureId
    ? await suche.eq("venture_id", ventureId).maybeSingle()
    : await suche.is("venture_id", null).maybeSingle();

  if (existing) return { ok: true, supabase, assessment: existing, ventureId };

  // Phase 10 - Cutover: Das fruehere Arbeitsprofil (founder-profile-v1) wird
  // nicht neu begonnen; der aktuelle Weg ist Workstyle v0.4. Abgegebenes
  // bleibt als historischer Stand lesbar.
  if (scope === "founder_profile") return { ok: false, reason: "archived_instrument" };

  const { data: created, error } = await supabase
    .from("assessments")
    .insert({
      user_id: userId,
      module: scope,
      instrument_id: INSTRUMENT[scope],
      venture_id: ventureId,
    })
    .select("id, submitted_at")
    .single();

  // ---------------------------------------------------------------------------
  // WER ZU ZWEIT ANKOMMT, NIMMT DEN ERSTEN ENTWURF
  // ---------------------------------------------------------------------------
  //
  // Der Autospeicher feuert je Frage einzeln. Wer zwei Fragen kurz
  // hintereinander beantwortet, loest zwei Aufrufe aus - beide finden oben
  // keinen Entwurf und beide legen einen an. Seit dem 30.09.2026 laesst die
  // Datenbank das nicht mehr zu (`assessments_one_open_draft_uidx`), und der
  // Verlierer sucht hier einfach noch einmal.
  //
  // OHNE DIESE ZEILEN WAERE DER INDEX EINE NEUE FEHLERMELDUNG. Vorher gingen
  // beide durch, und die Antworten verteilten sich auf zwei Entwuerfe - die
  // Seite las den neueren und zeigte die Haelfte.
  if (error?.code === "23505") {
    const { data: gefunden } = ventureId
      ? await suche.eq("venture_id", ventureId).maybeSingle()
      : await suche.is("venture_id", null).maybeSingle();
    if (gefunden) return { ok: true, supabase, assessment: gefunden, ventureId };
  }

  // Jeder Fehlschlag bekommt seinen eigenen Namen. "Konnte nicht gespeichert
  // werden" ist fuer die Person davor keine Auskunft, sondern eine Einladung,
  // es noch einmal zu versuchen - und bei zwei dieser Faelle hat das nie
  // Erfolg.
  if (error || !created) {
    return { ok: false, reason: grundFuer(error), detail: error?.message };
  }
  return { ok: true, supabase, assessment: created, ventureId };
}

export async function saveAnswer(
  scope: AssessmentScope,
  answer: AlignmentAnswerV21,
  ventureId?: string,
): Promise<Result> {
  const item = registryOf(scope).items.find((entry) => entry.itemId === answer.blockId);
  // Eine Frage aus dem ANDEREN Bogen wird abgewiesen, nicht stillschweigend
  // angenommen - sonst laege eine Venture-Antwort im Arbeitsprofil.
  if (!item) return { ok: false, reason: "unknown_block", detail: answer.blockId };

  const verdict = validateAnswerV21(answer, answerableOf(item));
  if (!verdict.ok) return verdict;

  const draft = await draftFor(scope, ventureId);
  if (!draft.ok) return draft;
  const { supabase, assessment } = draft;

  const { error } = await supabase.from("alignment_answers").upsert(
    {
      assessment_id: assessment.id,
      block_id: answer.blockId,
      answer_format: item.answerFormat,
      value: answer.value ?? null,
      missing_code: answer.missingCode ?? null,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "assessment_id,block_id" },
  );

  if (error) return { ok: false, reason: grundFuer(error), detail: error.message };
  return { ok: true };
}

/** Eine Antwort zurücknehmen. Danach gilt die Frage wieder als offen. */
export async function clearAnswer(
  scope: AssessmentScope,
  itemId: string,
  ventureId?: string,
): Promise<Result> {
  if (!registryOf(scope).items.some((entry) => entry.itemId === itemId)) {
    return { ok: false, reason: "unknown_block", detail: itemId };
  }

  const draft = await draftFor(scope, ventureId);
  if (!draft.ok) return draft;
  const { supabase, assessment } = draft;

  const { error } = await supabase
    .from("alignment_answers")
    .delete()
    .eq("assessment_id", assessment.id)
    .eq("block_id", itemId);

  if (error) return { ok: false, reason: "clear_failed", detail: error.message };
  return { ok: true };
}

/**
 * Abgeben.
 *
 * Verlangt Vollständigkeit - für jede Frage gibt es ein Wort, notfalls ein
 * Auslassungsgrund. Eine fehlende Zeile ist deshalb ein Versehen und keine
 * Haltung.
 */
export async function submitScope(
  scope: AssessmentScope,
  ventureId?: string,
): Promise<Result & { missing?: string[] }> {
  const draft = await draftFor(scope, ventureId);
  if (!draft.ok) return draft;
  const { supabase, assessment } = draft;

  const { data: rows, error: readError } = await supabase
    .from("alignment_answers")
    .select("block_id, value, missing_code")
    .eq("assessment_id", assessment.id);

  if (readError) return { ok: false, reason: "read_failed", detail: readError.message };

  const beantwortet = new Set((rows ?? []).map((row) => row.block_id));
  const antwort = new Map(
    ((rows ?? []) as { block_id: string; value: unknown; missing_code: string | null }[]).map((row) => [
      row.block_id,
      { value: row.value, missingCode: row.missing_code },
    ])
  );
  const missing = getItemsV22(scope)
    .filter((item) => {
      // Zurueckgezogene Fragen werden nicht mehr vorgelegt - sie zu verlangen
      // hiesse, eine Abgabe an einer Frage scheitern zu lassen, die niemand
      // zu sehen bekommt.
      if (item.retired) return false;
      // Anschlussfragen zaehlen nur, wenn ihre Voraussetzung INHALTLICH
      // beantwortet ist - dieselbe Regel wie in der Oberflaeche (followUps.ts).
      // Sie zu verlangen hiesse, jemanden fuer eine zulaessige Antwort zu
      // bestrafen - und nach einer Frage zu fragen, die niemand sieht.
      if (!followUpApplies(item, (itemId) => antwort.get(itemId))) return false;
      return !beantwortet.has(item.itemId);
    })
    .map((item) => item.itemId);

  if (missing.length > 0) return { ok: false, reason: "incomplete", missing };

  const { error } = await supabase
    .from("assessments")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", assessment.id)
    .is("submitted_at", null);

  if (error) return { ok: false, reason: "submit_failed", detail: error.message };
  return { ok: true };
}
