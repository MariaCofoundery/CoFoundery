"use server";

import { createClient } from "@/lib/supabase/server";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { getItemV21 } from "@/features/instruments/v21/registryV21";

/**
 * „Darüber möchte ich sprechen“ - nachträglich, am eigenen Bericht.
 *
 * ---------------------------------------------------------------------------
 * WARUM NICHT IM FRAGEBOGEN
 * ---------------------------------------------------------------------------
 *
 * Am 28.09.2026 gemeldet: „Dieses kleine Feld mit ‚darüber möchte ich
 * sprechen‘, das ist auch ein bisschen zu viel.“ Stimmt - beim Ausfüllen weiß
 * niemand, was ein Thema wird. Das sieht man, wenn die eigenen Antworten
 * beieinanderstehen.
 *
 * ---------------------------------------------------------------------------
 * UND WARUM ES NACH DER ABGABE NOCH GEHT
 * ---------------------------------------------------------------------------
 *
 * Die Antworten sind nach der Abgabe eingefroren - ein Trigger in der
 * Datenbank hält das fest. Die Markierung ist ausdrücklich ausgenommen, denn
 * sie ist keine Antwort auf die Frage. Sie ist ein Wunsch an das Gespräch, und
 * der darf sich ändern, ohne dass jemand seine Auskunft ändert.
 */

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

export async function setDiscussionMarkV21(
  itemId: string,
  marked: boolean,
): Promise<Result> {
  if (!getItemV21(itemId)) return { ok: false, reason: "unknown_block", detail: itemId };

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) return { ok: false, reason: "not_authenticated" };

  // Über die eigenen Fragebögen, nicht über eine mitgegebene Kennung: Sonst
  // wäre die Markierung ein Weg, an fremden Zeilen zu drehen. Die Policies
  // würden es abfangen - aber eine Serverfunktion soll nicht darauf bauen.
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID);

  const ids = (assessments ?? []).map((row) => row.id);
  if (ids.length === 0) return { ok: false, reason: "no_assessment" };

  const { error } = await supabase
    .from("alignment_answers")
    .update({ marked_for_discussion: marked })
    .in("assessment_id", ids)
    .eq("block_id", itemId);

  if (error) return { ok: false, reason: "mark_failed", detail: error.message };
  return { ok: true };
}
