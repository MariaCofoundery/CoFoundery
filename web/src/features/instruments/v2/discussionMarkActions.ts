"use server";

import { createClient } from "@/lib/supabase/server";
import { answerFormatOfBlock } from "@/features/instruments/v2/alignmentAnswersV2";

/**
 * „Darüber möchte ich sprechen" - im Nachgang gesetzt, nicht beim Ausfüllen.
 *
 * ---------------------------------------------------------------------------
 * WARUM NICHT IM FRAGEBOGEN
 * ---------------------------------------------------------------------------
 *
 * Maria am 28.09.2026: „Das ist auch ein bisschen zu viel für diesen
 * Fragebogen, weil man soll sich ja hier darauf konzentrieren."
 *
 * Das trifft etwas Genaueres, als es klingt. Beim Ausfüllen beantwortet man
 * eine Frage nach der anderen und sieht nie den Zusammenhang. Was man
 * besprechen möchte, weiß man erst, wenn die eigenen Antworten nebeneinander
 * stehen - und dann ist es eine andere Art von Aufmerksamkeit.
 *
 * DIE MARKIERUNG IST KEINE ANTWORT, deshalb darf sie sich auch nach der
 * Abgabe noch ändern. Ein Trigger in der Datenbank haelt die Antwort selbst
 * eingefroren (`alignment_answer_frozen_after_submit`).
 */

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

export async function setDiscussionMark(
  blockId: string,
  marked: boolean,
  changeCondition?: string | null
): Promise<Result> {
  if (!answerFormatOfBlock(blockId)) return { ok: false, reason: "unknown_block", detail: blockId };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { ok: false, reason: "not_authenticated" };

  // Die eigenen Fragebogen dieser Fassung - die Zeile wird ueber block_id
  // gefunden, nicht ueber eine vom Browser geschickte Kennung.
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", "founder-alignment-v2");

  const ids = (assessments ?? []).map((row) => row.id);
  if (ids.length === 0) return { ok: false, reason: "no_assessment" };

  const { error } = await supabase
    .from("alignment_answers")
    .update({
      marked_for_discussion: marked,
      // Ohne Markierung keine Notiz - sonst bliebe ein Satz stehen, der sich
      // auf ein Gespraech bezieht, das niemand mehr fuehren wollte.
      change_condition: marked ? (changeCondition?.trim() || null) : null,
    })
    .in("assessment_id", ids)
    .eq("block_id", blockId);

  if (error) return { ok: false, reason: "mark_failed", detail: error.message };
  return { ok: true };
}
