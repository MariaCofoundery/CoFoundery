"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { answerableOf } from "@/features/instruments/align/questionnaireData";
import { VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { validateAnswerV21, type AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import { isVentureBetaEnabled } from "@/features/modules/ventureBeta/gate";
import { BETA_CORE_ITEM_IDS, findBetaItem } from "@/features/modules/ventureBeta/registry";
import { loadBetaPageState } from "@/features/modules/ventureBeta/data";
import { createClient } from "@/lib/supabase/server";

/**
 * Venture Alignment (Beta): speichern, zuruecknehmen, abgeben, beginnen.
 *
 * EIGENER LEBENSZYKLUS, EIGENE DATEI. Die Abgabe des Bestands (`instruments/align/answerActions.ts`)
 * haengt am Scope: `registryOf("venture_alignment")` kennt genau `venture-alignment-v1`. Die Beta ist
 * ein zweites Instrument in derselben Speicherfamilie und darf dort nicht auftauchen - deshalb eine
 * eigene, nach `instrument_id` benannte Abfrage. Der bestehende Flow bleibt unveraendert.
 *
 * DIE DATENBANK ENTSCHEIDET MIT: Der allgemeine Waechter (`guard_shareable_*`, Migration
 * 20261207120000) lehnt ein fremdes Vorhaben, einen unbekannten Block und eine unvollstaendige Abgabe
 * ab. Hier steht, was fuer eine freundliche Rueckmeldung gebraucht wird.
 *
 * GEATED, NICHT BERECHTIGT: Die Beta ist nur fuer freigeschaltete Konten erreichbar (`gate.ts`). Das
 * ist Sichtbarkeit, keine Zugriffsregel - die liegt in der Datenbank.
 *
 * KEINE STILLE UEBERNAHME. Antworten aus v1 oder einer fruehen Abgabe werden nur kopiert, wenn die
 * Person es ausdruecklich anstoesst (`startBeta` mit `source`) - in einen NEUEN Entwurf, den sie
 * pruefen, aendern und selbst abgibt. Submission != Sharing: Hier wird nichts geteilt.
 */
const PAGE = "/founder-alignment/vorhaben/beta";

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

function grundFuer(error: { code?: string } | null): string {
  switch (error?.code) {
    case "42501":
      return "no_permission";
    case "22P02":
    case "23503":
    case "42703":
    case "42P01":
    case "42883":
    case "42704":
      return "setup_missing";
    case "23514":
      return "value_rejected";
    case "40001":
    case "40P01":
      return "unreachable";
    default:
      return "draft_create_failed";
  }
}

async function authed() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) return null;
  // Nicht freigeschaltet: so tun, als gaebe es die Beta nicht.
  if (!isVentureBetaEnabled(data.user)) return null;
  return { supabase, userId: data.user.id };
}

type Supabase = NonNullable<Awaited<ReturnType<typeof authed>>>["supabase"];

async function openDraft(supabase: Supabase, userId: string, ventureId: string) {
  const { data } = await supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", userId)
    .eq("instrument_id", VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID)
    .eq("venture_id", ventureId)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; submitted_at: string | null } | null) ?? null;
}

/** Den offenen Entwurf holen - oder anlegen. */
async function ensureDraft(supabase: Supabase, userId: string, ventureId: string) {
  const existing = await openDraft(supabase, userId, ventureId);
  if (existing) return { ok: true as const, draft: existing, created: false };

  const { data: created, error } = await supabase
    .from("assessments")
    .insert({
      user_id: userId,
      module: "venture_alignment",
      instrument_id: VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID,
      venture_id: ventureId,
    })
    .select("id, submitted_at")
    .single();

  if (error?.code === "23505") {
    const found = await openDraft(supabase, userId, ventureId);
    if (found) return { ok: true as const, draft: found, created: false };
  }
  if (error || !created) return { ok: false as const, reason: grundFuer(error), detail: error?.message };
  return { ok: true as const, draft: created as { id: string; submitted_at: string | null }, created: true };
}

export async function saveBetaAnswer(ventureId: string, answer: AlignmentAnswerV21): Promise<Result> {
  const item = findBetaItem(answer.blockId);
  // Eine Frage aus einem anderen Bogen wird abgewiesen, nicht stillschweigend angenommen.
  if (!item) return { ok: false, reason: "unknown_block", detail: answer.blockId };

  const verdict = validateAnswerV21(answer, answerableOf(item));
  if (!verdict.ok) return verdict;

  const session = await authed();
  if (!session) return { ok: false, reason: "not_authenticated" };

  const draft = await ensureDraft(session.supabase, session.userId, ventureId);
  if (!draft.ok) return draft;

  const { error } = await session.supabase.from("alignment_answers").upsert(
    {
      assessment_id: draft.draft.id,
      block_id: answer.blockId,
      answer_format: item.answerFormat,
      value: answer.value ?? null,
      missing_code: answer.missingCode ?? null,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "assessment_id,block_id" }
  );
  if (error) return { ok: false, reason: grundFuer(error), detail: error.message };
  return { ok: true };
}

export async function clearBetaAnswer(ventureId: string, itemId: string): Promise<Result> {
  if (!findBetaItem(itemId)) return { ok: false, reason: "unknown_block", detail: itemId };

  const session = await authed();
  if (!session) return { ok: false, reason: "not_authenticated" };

  const draft = await openDraft(session.supabase, session.userId, ventureId);
  // Ohne Entwurf gibt es nichts zurueckzunehmen - und keinen, der dafuer angelegt wird.
  if (!draft) return { ok: true };

  const { error } = await session.supabase
    .from("alignment_answers")
    .delete()
    .eq("assessment_id", draft.id)
    .eq("block_id", itemId);
  if (error) return { ok: false, reason: "clear_failed", detail: error.message };
  return { ok: true };
}

/**
 * Abgeben.
 *
 * Verlangt alle 19 Core-Fragen - notfalls mit einem Auslassungsgrund; die privaten Betragsfelder sind
 * freiwillig. Ein privater Betrag, dessen Hauptfrage inzwischen keinen Betrag mehr zulaesst
 * (z. B. „voraussichtlich nicht innerhalb von zwölf Monaten“), wird vor der Abgabe entfernt: Er soll
 * nicht als Rest einer frueheren Antwort in der Abgabe stehen. Die Datenbank prueft die Vollstaendigkeit
 * noch einmal. Abgeben teilt NICHTS.
 */
export async function submitBeta(ventureId: string): Promise<Result & { missing?: string[] }> {
  const session = await authed();
  if (!session) return { ok: false, reason: "not_authenticated" };

  const draft = await openDraft(session.supabase, session.userId, ventureId);
  if (!draft) return { ok: false, reason: "no_draft" };

  const { data: rows, error: readError } = await session.supabase
    .from("alignment_answers")
    .select("block_id, value, missing_code")
    .eq("assessment_id", draft.id);
  if (readError) return { ok: false, reason: "read_failed", detail: readError.message };

  const byBlock = new Map((rows ?? []).map((row) => [row.block_id as string, row]));
  const missing = BETA_CORE_ITEM_IDS.filter((itemId) => !byBlock.has(itemId));
  if (missing.length > 0) return { ok: false, reason: "incomplete", missing: [...missing] };

  const optionOf = (blockId: string) => (byBlock.get(blockId)?.value as { optionId?: string } | null)?.optionId;
  const stale = [
    byBlock.has("M01p") && !["M01_o1", "M01_o2"].includes(optionOf("M01") ?? "") ? "M01p" : null,
    byBlock.has("M02p") && ["M02_o1", undefined].includes(optionOf("M02")) ? "M02p" : null,
  ].filter((blockId): blockId is string => blockId !== null);
  if (stale.length > 0) {
    await session.supabase.from("alignment_answers").delete().eq("assessment_id", draft.id).in("block_id", stale);
  }

  const { error } = await session.supabase
    .from("assessments")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", draft.id)
    .is("submitted_at", null);
  if (error) return { ok: false, reason: error.code === "23514" ? "incomplete" : "submit_failed", detail: error.message };

  revalidatePath(PAGE);
  revalidatePath("/me/profile");
  revalidatePath(`/teams/${ventureId}`);
  return { ok: true };
}

/**
 * Beginnen - leer oder von einem Ausgangspunkt.
 *
 *   `empty`     ein neuer, leerer Entwurf.
 *   `takeover`  die identischen Items aus `venture-alignment-v1` werden als AUSGANGSPUNKT kopiert -
 *               nur auf diese ausdrueckliche Aktion. Die Person prueft, aendert und gibt selbst ab.
 *   `previous`  die letzte Abgabe der Beta als Ausgangspunkt fuer einen neuen Durchlauf.
 *
 * Kopiert wird nur in einen NEUEN Entwurf; ein bestehender wird nie ueberschrieben. Die alten Antworten
 * bleiben unveraendert, wo sie sind, und ein neuer Durchlauf aendert keinen bestehenden Share.
 */
export async function startBeta(formData: FormData) {
  const ventureId = String(formData.get("ventureId") ?? "");
  const source = String(formData.get("source") ?? "empty");
  const back = `${PAGE}?venture=${encodeURIComponent(ventureId)}`;

  const session = await authed();
  if (!session || !ventureId) redirect(back);
  const { supabase, userId } = session;

  const draft = await ensureDraft(supabase, userId, ventureId);
  if (!draft.ok) redirect(`${back}&error=${encodeURIComponent(draft.reason)}`);

  let from: "takeover" | "previous" | null = null;
  if (draft.created && (source === "takeover" || source === "previous")) {
    const state = await loadBetaPageState(supabase, userId, ventureId);
    const origin = source === "takeover" ? state.takeover : (state.submitted?.answers ?? []);
    const copies = origin
      .filter((row) => {
        const item = findBetaItem(row.block_id);
        if (!item) return false;
        // Nichts Ungueltiges mitnehmen: Jede Kopie muss die Pruefung der Beta bestehen.
        const answer = (row.missing_code ? { blockId: row.block_id, missingCode: row.missing_code } : { blockId: row.block_id, value: row.value }) as AlignmentAnswerV21;
        return validateAnswerV21(answer, answerableOf(item)).ok;
      })
      .map((row) => ({
        assessment_id: draft.draft.id,
        block_id: row.block_id,
        answer_format: row.answer_format,
        value: row.value,
        missing_code: row.missing_code,
        answered_at: new Date().toISOString(),
      }));

    if (copies.length > 0) {
      const { error } = await supabase.from("alignment_answers").insert(copies);
      if (!error) from = source as "takeover" | "previous";
    }
  }

  revalidatePath(PAGE);
  redirect(from ? `${back}&from=${from}` : back);
}
