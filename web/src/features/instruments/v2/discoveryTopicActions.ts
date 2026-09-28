"use server";

import { createClient } from "@/lib/supabase/server";
import { getDiscoveryTopics, type TopicWish } from "@/features/instruments/v2/discoveryTopics";

export type TopicChoice = { topicKey: string; wish: TopicWish; rank: number };

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

/**
 * Die eigenen Suchvorgaben speichern.
 *
 * ALLES AUF EINMAL, NICHT EINZELN. Die Reihenfolge ist eine Eigenschaft der
 * ganzen Liste - wer ein Thema nach oben schiebt, aendert die Raenge aller
 * anderen mit. Einzelne Aufrufe koennten dazwischen einen Zustand hinterlassen,
 * in dem zwei Themen denselben Rang haben, und die Sortierung waere
 * stillschweigend zufaellig.
 */
export async function saveDiscoveryTopics(choices: readonly TopicChoice[]): Promise<Result> {
  const known = new Set(getDiscoveryTopics().map((topic) => topic.key));
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

  // Erst raeumen, dann setzen: Was nicht mehr in der Liste steht, ist "egal".
  const { error: clearError } = await supabase
    .from("discovery_alignment_topics")
    .delete()
    .eq("user_id", auth.user.id);
  if (clearError) return { ok: false, reason: "clear_failed", detail: clearError.message };

  if (choices.length === 0) return { ok: true };

  // Die Raenge werden hier neu vergeben, nicht uebernommen - so gibt es keine
  // Luecken und keine Doppelungen, egal was der Browser geschickt hat.
  const rows = [...choices]
    .sort((a, b) => a.rank - b.rank)
    .map((choice, index) => ({
      user_id: auth.user.id,
      topic_key: choice.topicKey,
      wish: choice.wish,
      rank: index + 1,
    }));

  const { error } = await supabase.from("discovery_alignment_topics").insert(rows);
  if (error) return { ok: false, reason: "save_failed", detail: error.message };
  return { ok: true };
}
