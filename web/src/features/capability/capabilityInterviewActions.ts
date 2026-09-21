"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { attachCapabilityEvidence } from "./capabilityEvidenceWrite";
import { getProposalsForTurn } from "./capabilityProposalData";
import {
  getActiveInterview,
  getSortedInterviewAnswers,
  getUnsortedInterviewAnswers,
} from "./capabilityInterviewData";
import { nextCatalogueQuestion } from "./capabilityInterviewGuide";
import {
  MAX_CONFIRMED_AREAS,
  NARRATIVE_MAX_LENGTH,
  NARRATIVE_MIN_LENGTH,
  parseApplicationLevel,
  parseOwnershipWish,
} from "./capabilityTypes";

/**
 * Bittet ein Modell, diese Antwort zu lesen.
 *
 * VON EINEM MENSCHEN ANGEFORDERT, nicht vom Ablauf - und das ist der
 * Unterschied zum Connect-Text, der veroeffentlicht ist. Eine
 * Interview-Antwort ist der privateste Text im Produkt; Frage 3 fragt
 * ausdruecklich nach dem Leben ausserhalb der Erwerbsarbeit.
 *
 * Die Bedingung "nur die eigene Antwort" steht in der Datenbank
 * (`request_capability_area_proposals`), nicht hier: Eine Pruefung in der
 * Oberflaeche waere eine Bitte, keine Grenze.
 */
export async function askForProposalsAction(formData: FormData) {
  const { client } = await requireUser();
  const turnId = String(formData.get("turnId") ?? "");

  const { error } = await client.rpc("request_capability_area_proposals", {
    p_turn_id: turnId,
  });
  // Ein abgelehnter Auftrag ist kein Drama: Vielleicht laeuft schon einer.
  // Die Seite zeigt den Zustand.
  if (error) redirect(`${SORT_PATH}?error=ask`);

  revalidatePath(SORT_PATH);
  redirect(SORT_PATH);
}

/**
 * Das Gespräch führen.
 *
 * DREI ZUSAGEN AUS MARIAS VORGABE VOM 21.09.2026 - "es soll automatisch
 * gespeichert sein, falls was abstuerzt bzw man auch speichern kann falls man
 * nicht alles auf einmal beantworten will":
 *
 *   1. AUTOMATISCH. `autosaveInterviewAnswerAction` schreibt still mit,
 *      waehrend jemand tippt. Sie leitet nicht weiter, gibt keine Meldung und
 *      laesst nichts scheitern - ein fehlgeschlagener Zwischenstand darf nicht
 *      den Text wegnehmen, den jemand gerade schreibt.
 *
 *   2. AUF WUNSCH. Derselbe Weg, nur mit Rueckmeldung und Verlassen der Seite.
 *
 *   3. FORTSETZEN. Die Sitzung bleibt `active`, bis jemand sie abschliesst.
 *      Wer wiederkommt, steht bei derselben Frage mit demselben Text.
 *
 * WEITERGEGANGEN WIRD NUR DURCH EINE HANDLUNG. Das automatische Speichern
 * setzt `answered_at` - waere "die erste unbeantwortete Frage" die aktuelle,
 * wuerde das Gespraech beim Zwischenspeichern von selbst weiterspringen. Die
 * aktuelle Frage ist deshalb die mit der hoechsten Nummer, und eine neue
 * entsteht nur, wenn jemand "Weiter" oder "Ueberspringen" drueckt.
 */

const PATH = "/profile/interview";
const SORT_PATH = "/profile/interview/sort";

async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${PATH}`);
  return { client, userId: user.id };
}

// `: never` ist nicht Deko: Ohne die Angabe nimmt TypeScript an, dass es nach
// `back(...)` weitergeht - und dann ist hinter jeder Pruefung alles wieder
// "moeglicherweise null".
function back(error: string): never {
  redirect(`${PATH}?error=${error}`);
}

/**
 * Was passiert, wenn eine abgeschickte Frage nicht mehr die aktuelle ist.
 *
 * GEMELDET AM 21.09.2026: "Irgendwann zwischendurch hatte ich die Ansage, hey,
 * die Frage ist jetzt veraltet [...] obwohl ich gar nichts gemacht habe."
 *
 * Die Ursache waren Knoepfe ohne Pending-Zustand - ein Klick zeigte nichts,
 * also klickte man noch einmal, und der zweite Klick schickte die inzwischen
 * veraltete Kennung. Das ist behoben (`SubmitButton`), aber die Meldung war
 * auch dann falsch: Es war ja nichts verloren gegangen.
 *
 * DESHALB HIER DIE UNTERSCHEIDUNG. Eine Fehlermeldung gehoert nur dorthin, wo
 * jemand etwas verloren hat:
 *
 *   Die Sitzung ist abgeschlossen  - kein Fehler, sondern ein Ende.
 *   Die Frage ist beantwortet      - kein Fehler, sondern ein zweiter Klick.
 *                                    Still zur aktuellen Frage.
 *   Die Frage ist unbeantwortet    - hier ist wirklich etwas schiefgelaufen.
 */
function continueQuietly(
  state: Awaited<ReturnType<typeof getActiveInterview>>,
  turnId: string
): never {
  if (!state) {
    // Abgeschlossen, waehrend das Formular offen stand.
    redirect("/profile?saved=interview_done");
  }
  const submitted = state.turns.find((turn) => turn.id === turnId);
  if (submitted?.answer) {
    revalidatePath(PATH);
    redirect(PATH);
  }
  back("stale");
}

/**
 * Beginnt ein Gespräch - oder setzt das laufende fort.
 *
 * Idempotent mit Absicht: Ein zweiter Klick auf "Beginnen" (zwei Tabs, ein
 * Doppeltipp) darf keine zweite Sitzung anlegen. Die Datenbank verhindert das
 * ohnehin ueber den Teilindex auf `status = 'active'`; hier wird der Fall
 * freundlich behandelt, statt einen Fehler zu zeigen.
 */
export async function startInterviewAction() {
  const { client, userId } = await requireUser();

  const existing = await getActiveInterview(client);
  if (existing) {
    // Es laeuft schon. Wenn die Sitzung noch keine Frage hat (abgebrochen
    // zwischen zwei Anweisungen), wird sie hier nachgeholt.
    if (!existing.current) {
      const first = nextCatalogueQuestion([]);
      if (first) {
        await client.from("capability_interview_turns").insert({
          session_id: existing.sessionId,
          sort_order: 1,
          question_source: "catalogue",
          question_id: first.id,
        });
      }
    }
    revalidatePath(PATH);
    redirect(PATH);
  }

  const { data: session, error } = await client
    .from("capability_interview_sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !session) back("start");

  const first = nextCatalogueQuestion([]);
  if (first) {
    const { error: turnError } = await client.from("capability_interview_turns").insert({
      session_id: session.id,
      sort_order: 1,
      question_source: "catalogue",
      question_id: first.id,
    });
    if (turnError) back("start");
  }

  revalidatePath(PATH);
  redirect(PATH);
}

/**
 * Schreibt den Zwischenstand. Still.
 *
 * KEINE WEITERLEITUNG UND KEINE MELDUNG: Diese Aktion laeuft, waehrend jemand
 * schreibt. Ein `redirect` wuerde mitten im Satz die Seite wechseln, und eine
 * Fehlermeldung wuerde vom Tippen ablenken - und zwar wegen etwas, das der
 * Browser gleich noch einmal versucht.
 *
 * ZU KURZES WIRD NICHT GESCHRIEBEN. Die Datenbank verlangt (wie beim
 * Textfeld) mindestens zehn Zeichen; drei Buchstaben sind noch kein Satz. Bis
 * dahin haelt der Browser den Text allein - das ist der Grund, warum es beide
 * Ebenen gibt.
 */
export async function autosaveInterviewAnswerAction(input: {
  turnId: string;
  answer: string;
}): Promise<{ saved: boolean }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return { saved: false };

  const answer = input.answer.trim();
  if (answer.length < NARRATIVE_MIN_LENGTH || answer.length > NARRATIVE_MAX_LENGTH) {
    return { saved: false };
  }

  // Die Zeilensicherheit prueft, dass die Frage zu einer eigenen Sitzung
  // gehoert - eine fremde Kennung trifft hier auf keine Zeile.
  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", input.turnId);

  return { saved: !error };
}

/**
 * Antwort festhalten und zur nächsten Frage.
 *
 * `mode` entscheidet, was danach passiert - und beides ist dieselbe
 * Speicherung, damit es nicht zwei Wege gibt, auf denen eine Antwort in die
 * Datenbank kommt:
 *
 *   `next`     - naechste Frage anlegen und dort weitermachen.
 *   `pause`    - speichern und die Seite verlassen. Die Sitzung bleibt offen.
 *   `complete` - speichern und abschliessen. Nur bei der letzten Frage, damit
 *                das Gespraech ein Ende hat und nicht bei derselben Frage
 *                stehen bleibt, zu der es keine naechste mehr gibt.
 */
export async function saveInterviewAnswerAction(formData: FormData) {
  const { client } = await requireUser();

  const turnId = String(formData.get("turnId") ?? "");
  const mode = String(formData.get("mode") ?? "next");
  const answer = String(formData.get("answer") ?? "").trim();

  const state = await getActiveInterview(client);
  if (!state || !state.current || state.current.id !== turnId) {
    continueQuietly(state, turnId);
  }

  if (answer.length > 0) {
    if (answer.length < NARRATIVE_MIN_LENGTH) back("short");
    if (answer.length > NARRATIVE_MAX_LENGTH) back("long");

    const { error } = await client
      .from("capability_interview_turns")
      .update({ answer, answered_at: new Date().toISOString() })
      .eq("id", turnId);
    if (error) back("save");
  }

  if (mode === "pause") {
    revalidatePath(PATH);
    redirect("/profile?notice=interview_paused");
  }

  if (mode === "complete") {
    const { error } = await client
      .from("capability_interview_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", state.sessionId);
    if (error) back("complete");

    revalidatePath(PATH);
    revalidatePath("/profile");
    revalidatePath(SORT_PATH);
    // ZUM EINORDNEN, nicht ins Profil. Gemeldet am 21.09.2026: "Nach dem
    // Abschliessen war unklar, was als naechstes zu tun ist." Das Gespraech
    // hat bis hierher Antworten erzeugt und sonst nichts - die naechste
    // Handlung ist das Einordnen, und sie gehoert an das Ende des Weges und
    // nicht in einen gruenen Kasten auf einer anderen Seite.
    redirect(SORT_PATH);
  }

  await appendNextQuestion(client, state.sessionId);
  revalidatePath(PATH);
  redirect(PATH);
}

/**
 * Überspringen.
 *
 * Eine uebersprungene Frage bleibt im Verlauf stehen - mit leerer Antwort.
 * Sie zu loeschen waere bequemer, wuerde aber dazu fuehren, dass der Leitfaden
 * sie beim naechsten Mal wieder stellt. "Weiss ich nicht" ist eine Antwort,
 * und sie soll nicht dreimal abgefragt werden.
 */
export async function skipInterviewQuestionAction(formData: FormData) {
  const { client } = await requireUser();
  const turnId = String(formData.get("turnId") ?? "");

  const state = await getActiveInterview(client);
  if (!state || !state.current || state.current.id !== turnId) {
    continueQuietly(state, turnId);
  }

  await appendNextQuestion(client, state.sessionId);
  revalidatePath(PATH);
  redirect(PATH);
}

/**
 * Legt die nächste Frage an.
 *
 * Nach der Reihenfolge des LEITFADENS und nicht nach der des Verlaufs: Wer
 * nach zwei Tagen weitermacht, soll dort weitergehen, wo der Leitfaden
 * weitergeht.
 *
 * Gibt es keine mehr, entsteht keine neue Zeile - die Seite zeigt dann den
 * Abschluss. Kein Platzhalter, keine leere Frage.
 */
async function appendNextQuestion(client: Awaited<ReturnType<typeof createClient>>, sessionId: string) {
  const state = await getActiveInterview(client);
  if (!state) return;

  const asked = state.turns
    .filter((turn) => turn.source === "catalogue")
    .map((turn) => turn.questionId);
  const next = nextCatalogueQuestion(asked);
  if (!next) return;

  const sortOrder = state.turns.reduce((max, turn) => Math.max(max, turn.sortOrder), 0) + 1;
  await client.from("capability_interview_turns").insert({
    session_id: sessionId,
    sort_order: sortOrder,
    question_source: "catalogue",
    question_id: next.id,
  });
}

/**
 * Das Gespräch abschließen.
 *
 * Danach ist die Sitzung zu und eine neue kann beginnen. Die Antworten
 * bleiben - sie werden im naechsten Schritt in Bereiche eingeordnet.
 */
export async function completeInterviewAction() {
  const { client } = await requireUser();

  const state = await getActiveInterview(client);
  if (!state) redirect("/profile");

  const { error } = await client
    .from("capability_interview_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", state.sessionId);
  if (error) back("complete");

  revalidatePath(PATH);
  revalidatePath("/profile");
  revalidatePath(SORT_PATH);
  redirect(SORT_PATH);
}

/**
 * Eine Antwort einordnen.
 *
 * DER SCHRITT, DER DAS INTERVIEW ERST ETWAS WERT MACHT: Bis hierher liegen
 * acht Erzaehlungen in einer Tabelle und tun nichts. Hier werden sie zu dem,
 * was das Modell kennt - Eintraege in Bereichen, mit Anwendungsstufe und
 * Verantwortungswunsch, belegt durch die Erzaehlung.
 *
 * GESCHRIEBEN WIRD MIT DERSELBEN FUNKTION WIE BEIM TEXTFELD
 * (`attachCapabilityEvidence`). Das ist keine Sparsamkeit: Zwei Wege, auf
 * denen eine Staerke in dieses Modell kommt, waeren zwei Wahrheiten darueber,
 * was eine Staerke ist.
 *
 * DIE AUSWAHL TRIFFT DER MENSCH. Die Regel-Auswertung schlaegt vor, die Frage
 * selbst legt manchmal einen Bereich nahe - bestaetigt wird beides von Hand,
 * und eine leere Auswahl ist eine gueltige Antwort (dann greift der
 * Auffangwert). Genau dieselbe Regel wie im Textfeld, und aus demselben Grund:
 * Eine Zuordnung, die niemand bestaetigt hat, ist eine Behauptung ueber einen
 * Menschen.
 *
 * DER VERANTWORTUNGSWUNSCH IST HIER NEU. Beim Textfeld wird er in einem
 * eigenen dritten Schritt gesetzt; im Gespraech steht er direkt an der
 * Antwort, weil zwei der acht Fragen ausdruecklich danach fragen ("was
 * wuerdest du lieber abgeben", "was wuerdest du gern uebernehmen"). Ihn dort
 * nicht mitzunehmen hiesse, die Antwort auf eine gestellte Frage wegzuwerfen.
 */
export async function sortInterviewAnswerAction(formData: FormData) {
  const { client, userId } = await requireUser();

  const turnId = String(formData.get("turnId") ?? "");
  const level = parseApplicationLevel(formData.get("application_level"));
  const wish = parseOwnershipWish(formData.get("ownership_wish"));

  const unsorted = await getUnsortedInterviewAnswers(client);
  const turn = unsorted.find((entry) => entry.id === turnId);
  // Schon eingeordnet (zweites Fenster, Zurueck-Knopf) oder nicht die eigene:
  // Dann steht sie nicht in dieser Liste, und es gibt nichts zu tun.
  if (!turn || !turn.answer) redirect(`${SORT_PATH}?notice=already`);

  const areaIds = [
    ...new Set(
      formData
        .getAll("area_id")
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ].slice(0, MAX_CONFIRMED_AREAS);

  // DIE STUFEN JE BEREICH - der Regler, um den Maria gebeten hat. Das Feld
  // heisst `level_<area_id>`; unbekannte oder leere werden stillschweigend
  // uebergangen, weil eine fehlende Stufe ein gueltiger Zustand ist.
  const levelByArea: Record<string, number | null> = {};
  for (const areaId of areaIds) {
    levelByArea[areaId] = parseApplicationLevel(formData.get(`level_${areaId}`));
  }

  const written = await attachCapabilityEvidence({
    client,
    userId,
    areaIds,
    narrative: turn.answer,
    applicationLevel: level,
    levelByArea,
    ownershipWish: wish,
  });
  if (!written.ok) redirect(`${SORT_PATH}?error=${written.reason}`);

  // DIE VORSCHLAEGE DES MODELLS SIND DAMIT ENTSCHIEDEN: angenommen, was
  // angehakt wurde, abgelehnt der Rest. Beides wird vermerkt, damit dieselbe
  // Antwort beim naechsten Lesen nicht wieder dieselben Vorschlaege bringt -
  // wer etwas abgelehnt hat, hat eine Aussage gemacht.
  //
  // Stillschweigend: Das Einordnen ist gelungen, und ein Fehler beim Vermerken
  // darf es nicht zuruecknehmen.
  const proposals = await getProposalsForTurn(client, turnId);
  if (proposals.length > 0) {
    const accepted = proposals.filter((proposal) => areaIds.includes(proposal.areaId));
    const rejected = proposals.filter((proposal) => !areaIds.includes(proposal.areaId));
    const decidedAt = new Date().toISOString();
    if (accepted.length > 0) {
      await client
        .from("capability_area_proposals")
        .update({ status: "accepted", decided_at: decidedAt })
        .in("id", accepted.map((proposal) => proposal.id));
    }
    if (rejected.length > 0) {
      await client
        .from("capability_area_proposals")
        .update({ status: "rejected", decided_at: decidedAt })
        .in("id", rejected.map((proposal) => proposal.id));
    }
  }

  // WELCHE BEREICHE AUS DIESER ANTWORT KAMEN - alle, nicht nur der fuehrende.
  // Der Beleg haengt nur an einem (die Erzaehlung dreimal zu speichern waere
  // dieselbe Geschichte dreimal im Profil), und ohne diesen Vermerk liesse
  // sich nachher nicht sagen, welcher Bereich in MEHREREN Geschichten vorkam.
  //
  // Stillschweigend: Der Blick zurueck ist eine Zugabe. Er darf das Einordnen
  // nicht scheitern lassen, das gerade gelungen ist.
  if (written.areaIds.length > 0) {
    await client
      .from("capability_interview_turn_areas")
      .insert(written.areaIds.map((areaId) => ({ turn_id: turnId, area_id: areaId })));
  }

  // ERST JETZT gilt die Antwort als eingeordnet. Die Reihenfolge ist wichtig:
  // Waere der Verweis vorher gesetzt, verschwaende ein fehlgeschlagenes
  // Schreiben die Antwort aus der Liste - und niemand wuesste, dass sie fehlt.
  const { error } = await client
    .from("capability_interview_turns")
    .update({ evidence_id: written.evidenceId })
    .eq("id", turnId);
  if (error) redirect(`${SORT_PATH}?error=link`);

  revalidatePath(SORT_PATH);
  revalidatePath("/profile");
  redirect(SORT_PATH);
}

/**
 * Eine Antwort nochmal einordnen.
 *
 * GEBRAUCHT AM 21.09.2026: Die Erkennung hatte fuer die Verhaltensbereiche
 * keine Begriffe - wer sein Gespraech vorher eingeordnet hat, bekam deshalb nur
 * Fachliches vorgeschlagen. Die Erzaehlung liegt noch da; sie nochmal
 * erzaehlen zu lassen, weil unsere Begriffsliste besser geworden ist, waere
 * die falsche Richtung.
 *
 * DER ALTE BELEG WIRD GELOESCHT, nicht behalten: Sonst stuende dieselbe
 * Geschichte zweimal im Profil. Die BEREICHE, die dabei bestaetigt wurden,
 * bleiben - wer "Fundraising" schon einmal bestaetigt hat, hat das gesagt, und
 * eine zweite Einordnung nimmt es nicht zurueck. Sie kommt hinzu.
 *
 * Das Loeschen eines Belegs ist eine vorhandene Handlung (im Profil gibt es
 * "Beispiel entfernen"), und die Zeilensicherheit erlaubt sie nur fuer eigene.
 */
export async function resortInterviewAnswerAction(formData: FormData) {
  const { client } = await requireUser();
  const turnId = String(formData.get("turnId") ?? "");

  const sorted = await getSortedInterviewAnswers(client);
  const turn = sorted.find((entry) => entry.id === turnId);
  // Nicht dabei heisst: schon wieder offen, oder nicht die eigene. Beides
  // braucht keine Meldung - die Seite zeigt den aktuellen Stand.
  if (!turn) redirect(SORT_PATH);

  const { error: deleteError } = await client
    .from("person_capability_evidence")
    .delete()
    .eq("id", turn.evidenceId);
  if (deleteError) redirect(`${SORT_PATH}?error=resort`);

  // Die alte Zuordnung der Bereiche zu dieser Antwort geht mit: Sonst zaehlte
  // der Blick zurueck die alte und die neue Einordnung zusammen, und aus einer
  // Geschichte wuerden zwei.
  await client.from("capability_interview_turn_areas").delete().eq("turn_id", turnId);

  // ERST NACH DEM LOESCHEN den Verweis loesen. Umgekehrt bliebe bei einem
  // Fehlschlag ein Beleg ohne Antwort daran - und die Geschichte stuende
  // zweimal im Profil, sobald man neu einordnet.
  const { error } = await client
    .from("capability_interview_turns")
    .update({ evidence_id: null })
    .eq("id", turnId);
  if (error) redirect(`${SORT_PATH}?error=resort`);

  revalidatePath(SORT_PATH);
  revalidatePath("/profile");
  redirect(SORT_PATH);
}
