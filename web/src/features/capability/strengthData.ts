import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Stärken - und zwei Blickrichtungen darauf.
 *
 * WAS EINE STÄRKE HIER IST: ein Satz über eine Arbeitsweise, die in einer
 * erzählten Situation sichtbar wurde. Kein Bereich aus dem Vokabular (dafür
 * gibt es die Fähigkeiten) und kein Merkmal einer Person.
 *
 * DER ABSTAND ZWISCHEN DEN BEIDEN BLICKEN IST DAS ERGEBNIS. Eine
 * Selbsteinschätzung misst Selbstbild und Selbstvertrauen, und beides ist
 * ungleich verteilt. Die Frage "was würden andere sagen" umgeht das
 * teilweise: Sie verlangt nicht, sich selbst zu loben - man berichtet nur.
 */

export const STRENGTH_FREQUENCIES = ["rarely", "sometimes", "often", "almost_always"] as const;
export type StrengthFrequency = (typeof STRENGTH_FREQUENCIES)[number];

export const REFLECTED_GROUPS = [
  "former_colleagues",
  "current_colleagues",
  "managers",
  "friends",
  "family",
] as const;
export type ReflectedGroup = (typeof REFLECTED_GROUPS)[number];

export type PersonStrength = {
  id: string;
  statement: string;
  origin: "own_words" | "confirmed_proposal" | "edited_proposal";
  selfFrequency: StrengthFrequency | null;
  reflectedFrequency: StrengthFrequency | null;
  reflectedWho: ReflectedGroup | null;
};

export type StrengthProposal = {
  id: string;
  statement: string;
  quote: string;
};

export async function getPersonStrengths(client: SupabaseClient): Promise<PersonStrength[]> {
  const { data, error } = await client
    .from("person_strengths")
    .select("id, statement, origin, self_frequency, reflected_frequency, reflected_who")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error || !data) return [];

  return (
    data as {
      id: string;
      statement: string;
      origin: PersonStrength["origin"];
      self_frequency: StrengthFrequency | null;
      reflected_frequency: StrengthFrequency | null;
      reflected_who: ReflectedGroup | null;
    }[]
  ).map((row) => ({
    id: row.id,
    statement: row.statement,
    origin: row.origin,
    selfFrequency: row.self_frequency,
    reflectedFrequency: row.reflected_frequency,
    reflectedWho: row.reflected_who,
  }));
}

export async function getPendingStrengthProposals(
  client: SupabaseClient
): Promise<StrengthProposal[]> {
  const { data } = await client
    .from("person_strength_proposals")
    .select("id, statement, evidence_quote")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(20);

  return ((data ?? []) as { id: string; statement: string; evidence_quote: string }[]).map(
    (row) => ({ id: row.id, statement: row.statement, quote: row.evidence_quote })
  );
}

/**
 * Wo sich die beiden Blicke unterscheiden.
 *
 * NUR EIN HINWEIS, KEINE DEUTUNG: Es steht "hier siehst du dich anders, als du
 * andere vermutest" - nicht "du unterschätzt dich". Der Unterschied kann viele
 * Gründe haben, und die kennt diese Software nicht.
 */
export function strengthGap(strength: PersonStrength) {
  if (!strength.selfFrequency || !strength.reflectedFrequency) return null;
  const order = STRENGTH_FREQUENCIES.indexOf(strength.selfFrequency);
  const reflected = STRENGTH_FREQUENCIES.indexOf(strength.reflectedFrequency);
  if (order === reflected) return null;
  return reflected > order ? "others_see_more" : "others_see_less";
}
