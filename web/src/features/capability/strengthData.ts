import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isStrengthTheme, type EvidenceLevel, type StrengthThemeId } from "@/features/strengths/strengthThemes";

const LEVELS = ["clear", "shown", "hint"] as const;
const asLevel = (value: unknown): EvidenceLevel | null => (LEVELS as readonly unknown[]).includes(value) ? (value as EvidenceLevel) : null;
const asTheme = (value: unknown): StrengthThemeId | null => (isStrengthTheme(value) ? value : null);

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
  /**
   * Kurze Bezeichnung ("Verantwortung übernehmen"). Seit dem 18.10.2026 und
   * optional: eigene Sätze und ältere Stärken haben keine - sie stehen dann
   * wie bisher als Satz da.
   */
  label: string | null;
  statement: string;
  /** Eines der 28 Themen, wenn die Stärke aus dem Interview v2 stammt. */
  theme?: StrengthThemeId | null;
  /** Wie gut belegt - kein Rang, keine Ausprägung. */
  evidenceLevel?: EvidenceLevel | null;
  origin: "own_words" | "confirmed_proposal" | "edited_proposal";
  selfFrequency: StrengthFrequency | null;
  reflectedFrequency: StrengthFrequency | null;
  reflectedWho: ReflectedGroup | null;
};

/**
 * Ein Vorschlag, wie er zur Bestätigung vorliegt.
 *
 * ZWEI GENERATIONEN: Ältere Vorschläge (aus der Capability-Auswertung, bis
 * zum 18.10.2026) haben nur Satz und Zitat. Neue aus dem Stärken-Interview
 * haben dazu Bezeichnung, Begründung und das Gespräch, aus dem sie stammen.
 * Beide lassen sich gleich bestätigen.
 */
export type StrengthProposal = {
  id: string;
  label: string | null;
  statement: string;
  rationale: string | null;
  quote: string;
  sessionId: string | null;
  theme: StrengthThemeId | null;
  evidenceLevel: EvidenceLevel | null;
};

export async function getPersonStrengths(client: SupabaseClient): Promise<PersonStrength[]> {
  const { data, error } = await client
    .from("person_strengths")
    .select("id, label, statement, origin, theme, evidence_level, self_frequency, reflected_frequency, reflected_who")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error || !data) return [];

  return (
    data as {
      id: string;
      label: string | null;
      statement: string;
      theme: string | null;
      evidence_level: string | null;
      origin: PersonStrength["origin"];
      self_frequency: StrengthFrequency | null;
      reflected_frequency: StrengthFrequency | null;
      reflected_who: ReflectedGroup | null;
    }[]
  ).map((row) => ({
    id: row.id,
    label: row.label,
    statement: row.statement,
    theme: asTheme(row.theme),
    evidenceLevel: asLevel(row.evidence_level),
    origin: row.origin,
    selfFrequency: row.self_frequency,
    reflectedFrequency: row.reflected_frequency,
    reflectedWho: row.reflected_who,
  }));
}

export async function getPendingStrengthProposals(
  client: SupabaseClient,
  options?: { sessionId?: string }
): Promise<StrengthProposal[]> {
  let query = client
    .from("person_strength_proposals")
    .select("id, label, statement, rationale, evidence_quote, session_id, theme, evidence_level")
    .eq("status", "pending");
  if (options?.sessionId) query = query.eq("session_id", options.sessionId);
  const { data } = await query.order("created_at", { ascending: true }).limit(20);

  return (
    (data ?? []) as {
      id: string;
      label: string | null;
      statement: string;
      rationale: string | null;
      evidence_quote: string;
      session_id: string | null;
      theme: string | null;
      evidence_level: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    label: row.label,
    statement: row.statement,
    rationale: row.rationale,
    quote: row.evidence_quote,
    sessionId: row.session_id,
    theme: asTheme(row.theme),
    evidenceLevel: asLevel(row.evidence_level),
  }));
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
