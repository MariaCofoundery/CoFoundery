import "server-only";

import { judgeAll, type DirectedMatch, type ThemeDistance } from "@/features/find/discoveryMatch";
import { THEME_IDS } from "@/features/find/discoveryThemes";
import { getOwnPreferences } from "@/features/find/preferenceData";
import { createClient } from "@/lib/supabase/server";

/**
 * Wie gut passt jemand zu dem, was du suchst?
 *
 * ---------------------------------------------------------------------------
 * DIE ANTWORTEN DER ANDEREN PERSON BLEIBEN BEI IHR
 * ---------------------------------------------------------------------------
 *
 * Die Freigabe von Antworten läuft über `alignment_shares` und ist eine
 * ausdrückliche Entscheidung — eine Suche darf sie nicht umgehen. Deshalb
 * fragt diese Datei nicht nach Antworten, sondern nach Abständen:
 * `discovery_theme_distances` sieht beide Seiten und gibt je Thema drei
 * Zahlen heraus. Geurteilt wird hier, mit denselben Regeln wie überall.
 */

export type CandidateMatch = {
  /** Wie gut die andere Person zu dieser Suche passt. */
  match: DirectedMatch;
  /**
   * Hat die andere Person für ihre eigene Suche etwas festgelegt?
   *
   * Nur ja oder nein. Spec, Abschnitt 13: „[Name] hat für die eigene Suche
   * noch keine Matching-Präferenzen festgelegt." Mehr braucht dieser Satz
   * nicht, und mehr wird deshalb auch nicht geholt.
   */
  otherHasPreferences: boolean;
};

/**
 * Nichts gemessen — und das ist keine Absage.
 *
 * Wer keine eigenen Präferenzen hat oder wessen Gegenüber den Bogen nicht
 * ausgefüllt hat, bekommt sechs Themen ohne Grundlage. FIND zeigt das Profil
 * trotzdem, nur ohne Aussage zur Arbeitsweise (Spec, Abschnitt 25).
 */
const NICHTS: DirectedMatch = {
  themes: [],
  rankingScore: null,
  weightedThemes: 0,
};

export async function getCandidateMatch(
  viewerUserId: string,
  candidateUserId: string,
): Promise<CandidateMatch> {
  if (viewerUserId === candidateUserId) {
    return { match: NICHTS, otherHasPreferences: false };
  }

  try {
    const supabase = await createClient();
    const [{ preferences }, distances, otherHasPreferences] = await Promise.all([
      getOwnPreferences(viewerUserId),
      themeDistances(supabase, candidateUserId),
      hasPreferences(supabase, candidateUserId),
    ]);

    return { match: judgeAll(preferences, distances), otherHasPreferences };
  } catch {
    // Ein Fehler bei einer Person darf die Liste nicht kosten. Sie erscheint
    // dann ohne Aussage zur Arbeitsweise - nicht als Fehlerkasten.
    return { match: NICHTS, otherHasPreferences: false };
  }
}

async function themeDistances(
  supabase: Awaited<ReturnType<typeof createClient>>,
  candidateUserId: string,
): Promise<ThemeDistance[]> {
  const { data, error } = await supabase.rpc("discovery_theme_distances", {
    p_candidate_user_id: candidateUserId,
  });
  if (error || !data) return [];

  return (data as { theme_id: string; comparable: number; total: number; mean_distance: number | null }[])
    // Ein Thema, das es im Code nicht mehr gibt, geht in keine Rechnung ein.
    .filter((row) => THEME_IDS.includes(row.theme_id))
    .map((row) => ({
      themeId: row.theme_id,
      comparable: row.comparable,
      of: row.total,
      // Postgres liefert `numeric` als Zeichenkette - `Number(null)` wäre 0,
      // und 0 hiesse „gleiche Antwort".
      meanDistance: row.mean_distance === null ? null : Number(row.mean_distance),
    }));
}

async function hasPreferences(
  supabase: Awaited<ReturnType<typeof createClient>>,
  candidateUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("discovery_has_preferences", {
    p_user_id: candidateUserId,
  });
  return !error && data === true;
}
