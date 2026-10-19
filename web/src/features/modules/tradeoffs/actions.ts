"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { answerableOf } from "@/features/instruments/align/questionnaireData";
import {
  VENTURE_ALIGNMENT_INSTRUMENT_ID,
  VENTURE_TRADEOFFS_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import { validateAnswerV21, type AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import { findTradeoffItem, TRADEOFF_ITEM_IDS, tradeoffItems } from "@/features/modules/tradeoffs/registry";
import { createClient } from "@/lib/supabase/server";

/**
 * Werte & Zielkonflikte: speichern, zuruecknehmen, abgeben, beginnen.
 *
 * EIGENER LEBENSZYKLUS, EIGENE DATEI. Die Abgabe des Bestands
 * (`instruments/align/answerActions.ts`) haengt am Scope: `registryOf(scope)`
 * kennt zu `venture_alignment` genau `venture-alignment-v1`. Dieses Instrument
 * ist ein zweites in derselben Speicherfamilie und darf dort nicht auftauchen -
 * deshalb eine eigene, nach `instrument_id` benannte Abfrage. Der bestehende Flow
 * bleibt unveraendert.
 *
 * DIE DATENBANK ENTSCHEIDET MIT: Der Waechter `guard_venture_tradeoffs_*`
 * (Migration 20261205130000) lehnt ein fremdes Vorhaben, ein fremdes Item, ein
 * falsches Format und eine unvollstaendige Abgabe ab. Hier steht deshalb nur,
 * was fuer eine freundliche Rueckmeldung gebraucht wird.
 *
 * KEINE STILLE UEBERNAHME. Frueherer Antworten werden nur kopiert, wenn die
 * Person es ausdruecklich anstoesst (`startTradeoffs` mit `source`).
 */

const PAGE = "/founder-alignment/vorhaben/zielkonflikte";

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
      // Die Datenbank kennt das Instrument nicht: Wiederholen hilft nicht.
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
  return { supabase, userId: data.user.id };
}

type Supabase = NonNullable<Awaited<ReturnType<typeof authed>>>["supabase"];

async function openDraft(supabase: Supabase, userId: string, ventureId: string) {
  const { data } = await supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", userId)
    .eq("instrument_id", VENTURE_TRADEOFFS_INSTRUMENT_ID)
    .eq("venture_id", ventureId)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; submitted_at: string | null } | null) ?? null;
}

/** Den offenen Entwurf holen - oder anlegen. Wer zu zweit ankommt, nimmt den ersten. */
async function ensureDraft(supabase: Supabase, userId: string, ventureId: string) {
  const existing = await openDraft(supabase, userId, ventureId);
  if (existing) return { ok: true as const, draft: existing, created: false };

  const { data: created, error } = await supabase
    .from("assessments")
    .insert({
      user_id: userId,
      module: "venture_alignment",
      instrument_id: VENTURE_TRADEOFFS_INSTRUMENT_ID,
      venture_id: ventureId,
    })
    .select("id, submitted_at")
    .single();

  if (error?.code === "23505") {
    const found = await openDraft(supabase, userId, ventureId);
    if (found) return { ok: true as const, draft: found, created: false };
  }
  if (error || !created) {
    return { ok: false as const, reason: grundFuer(error), detail: error?.message };
  }
  return { ok: true as const, draft: created as { id: string; submitted_at: string | null }, created: true };
}

export async function saveTradeoffAnswer(ventureId: string, answer: AlignmentAnswerV21): Promise<Result> {
  const item = findTradeoffItem(answer.blockId);
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

export async function clearTradeoffAnswer(ventureId: string, itemId: string): Promise<Result> {
  if (!findTradeoffItem(itemId)) return { ok: false, reason: "unknown_block", detail: itemId };

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
 * Verlangt alle vier Situationen - notfalls mit einem Auslassungsgrund. Die
 * Datenbank prueft es noch einmal; hier steht es, damit die Person sagen kann,
 * welche fehlt.
 */
export async function submitTradeoffs(ventureId: string): Promise<Result & { missing?: string[] }> {
  const session = await authed();
  if (!session) return { ok: false, reason: "not_authenticated" };

  const draft = await openDraft(session.supabase, session.userId, ventureId);
  if (!draft) return { ok: false, reason: "no_draft" };

  const { data: rows, error: readError } = await session.supabase
    .from("alignment_answers")
    .select("block_id")
    .eq("assessment_id", draft.id);
  if (readError) return { ok: false, reason: "read_failed", detail: readError.message };

  const answered = new Set((rows ?? []).map((row) => row.block_id as string));
  const missing = tradeoffItems()
    .map((item) => item.itemId)
    .filter((itemId) => !answered.has(itemId));
  if (missing.length > 0) return { ok: false, reason: "incomplete", missing };

  const { error } = await session.supabase
    .from("assessments")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", draft.id)
    .is("submitted_at", null);
  if (error) return { ok: false, reason: error.code === "23514" ? "incomplete" : "submit_failed", detail: error.message };

  revalidatePath(PAGE);
  revalidatePath("/me/profile");
  return { ok: true };
}

/**
 * Beginnen - leer oder von einem Ausgangspunkt.
 *
 *   `empty`    ein neuer, leerer Entwurf.
 *   `legacy`   die W03-W06-Antworten aus `venture-alignment-v1` werden als
 *              AUSGANGSPUNKT kopiert - nur auf diese ausdrueckliche Aktion, nie
 *              automatisch. Die Person prueft, aendert und gibt selbst ab.
 *   `previous` die letzte Abgabe dieses Moduls als Ausgangspunkt fuer einen
 *              neuen Durchlauf.
 *
 * Kopiert wird nur in einen NEUEN Entwurf; ein bestehender wird nie
 * ueberschrieben. Die alten Antworten bleiben unveraendert, wo sie sind.
 */
export async function startTradeoffs(formData: FormData) {
  const ventureId = String(formData.get("ventureId") ?? "");
  const source = String(formData.get("source") ?? "empty");
  const back = `${PAGE}?venture=${encodeURIComponent(ventureId)}`;

  const session = await authed();
  if (!session || !ventureId) redirect(back);
  const { supabase, userId } = session;

  const draft = await ensureDraft(supabase, userId, ventureId);
  if (!draft.ok) redirect(`${back}&error=${encodeURIComponent(draft.reason)}`);

  let from: "legacy" | "previous" | null = null;
  if (draft.created && (source === "legacy" || source === "previous")) {
    const instrumentId = source === "legacy" ? VENTURE_ALIGNMENT_INSTRUMENT_ID : VENTURE_TRADEOFFS_INSTRUMENT_ID;
    const { data: origin } = await supabase
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("instrument_id", instrumentId)
      .eq("venture_id", ventureId)
      .not("submitted_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (origin?.id) {
      const { data: rows } = await supabase
        .from("alignment_answers")
        .select("block_id, answer_format, value, missing_code")
        .eq("assessment_id", origin.id)
        .in("block_id", [...TRADEOFF_ITEM_IDS]);

      const copies = ((rows ?? []) as {
        block_id: string;
        answer_format: string;
        value: Record<string, unknown> | null;
        missing_code: string | null;
      }[])
        .filter((row) => row.answer_format === "value_case")
        .map((row) => ({
          assessment_id: draft.draft.id,
          block_id: row.block_id,
          answer_format: "value_case",
          value: row.value,
          missing_code: row.missing_code,
          answered_at: new Date().toISOString(),
        }));

      if (copies.length > 0) {
        const { error } = await supabase.from("alignment_answers").insert(copies);
        if (!error) from = source as "legacy" | "previous";
      }
    }
  }

  revalidatePath(PAGE);
  redirect(from ? `${back}&from=${from}` : back);
}
