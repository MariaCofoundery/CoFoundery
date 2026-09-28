"use server";

import { createClient } from "@/lib/supabase/server";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import {
  getDiscoveryTopicsV21,
  type TopicWish,
} from "@/features/instruments/v21/discoveryTopicsV21";

export type TopicChoiceV21 = { topicKey: string; wish: TopicWish; rank: number };

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

/**
 * Die eigenen Suchvorgaben speichern.
 *
 * ---------------------------------------------------------------------------
 * ALLES AUF EINMAL, NICHT EINZELN
 * ---------------------------------------------------------------------------
 *
 * Die Reihenfolge ist eine Eigenschaft der ganzen Liste - wer ein Thema nach
 * oben schiebt, ändert die Ränge aller anderen mit. Einzelne Aufrufe könnten
 * dazwischen einen Zustand hinterlassen, in dem zwei Themen denselben Rang
 * haben, und die Sortierung wäre stillschweigend zufällig.
 *
 * ---------------------------------------------------------------------------
 * UND IMMER MIT DER FASSUNG
 * ---------------------------------------------------------------------------
 *
 * Wer beide Fragebögen ausgefüllt hat, hat zwei Themenwahlen. Ohne die
 * Kennung würde die eine die andere löschen - und zwar lautlos, weil beide
 * Listen plausibel aussehen.
 */
export async function saveDiscoveryTopicsV21(
  choices: readonly TopicChoiceV21[],
): Promise<Result> {
  const known = new Set(getDiscoveryTopicsV21().map((topic) => topic.key));
  const unknown = choices.filter((choice) => !known.has(choice.topicKey));
  if (unknown.length) {
    return { ok: false, reason: "unknown_topic", detail: unknown.map((c) => c.topicKey).join(", ") };
  }
  if (new Set(choices.map((choice) => choice.topicKey)).size !== choices.length) {
    return { ok: false, reason: "topic_twice" };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { ok: false, reason: "not_authenticated" };

  // Erst räumen, dann setzen: Was nicht mehr in der Liste steht, ist „egal“.
  // Und nur die eigene Fassung - die andere bleibt unangetastet.
  const { error: clearError } = await supabase
    .from("discovery_alignment_topics")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID);
  if (clearError) return { ok: false, reason: "clear_failed", detail: clearError.message };

  if (choices.length === 0) return { ok: true };

  // Die Ränge werden hier neu vergeben, nicht übernommen - so gibt es keine
  // Lücken und keine Doppelungen, egal was der Browser geschickt hat.
  const rows = [...choices]
    .sort((a, b) => a.rank - b.rank)
    .map((choice, index) => ({
      user_id: auth.user.id,
      instrument_id: ALIGNMENT_V21_INSTRUMENT_ID,
      topic_key: choice.topicKey,
      wish: choice.wish,
      rank: index + 1,
    }));

  const { error } = await supabase.from("discovery_alignment_topics").insert(rows);
  if (error) return { ok: false, reason: "save_failed", detail: error.message };
  return { ok: true };
}
