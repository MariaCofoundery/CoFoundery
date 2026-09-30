import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  judgeAll,
  normalizePreference,
  type DirectedMatch,
  type ThemeDistance,
  type ThemePreference,
  type ThemeVerdict,
} from "@/features/find/discoveryMatch";
import {
  THEME_IDS,
  type Direction,
  type Importance,
} from "@/features/find/discoveryThemes";
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
 * Zahlen heraus.
 *
 * ---------------------------------------------------------------------------
 * UND IHRE SUCHE ERREICHT DEN SERVER, NICHT DEN BROWSER
 * ---------------------------------------------------------------------------
 *
 * Für „für euch beide ein starker Matchpunkt" muss beurteilt werden, ob auch
 * der Wunsch der anderen Person erfüllt ist. Beurteilt wird hier, in
 * TypeScript, mit denselben Regeln wie überall — also müssen ihre Präferenzen
 * hierher gelangen. Sie gehen nicht weiter: Was diese Datei herausgibt, sind
 * Urteile, nie Richtungen oder Gewichte der anderen Person.
 *
 * Entschieden von Maria am 30.09.2026.
 *
 * ---------------------------------------------------------------------------
 * DREI WEGE, UND KEINER VERRÄT DEN ANDEREN
 * ---------------------------------------------------------------------------
 *
 * Niemand hat Präferenzen · eine Person hat welche · beide haben welche. Alle
 * drei müssen gehen, und keiner darf erkennbar machen, in welchem Fall die
 * andere Person ist: „X hat noch nichts festgelegt" wäre eine Auskunft über
 * sie, die sie nicht gegeben hat. Deshalb gibt es hier kein Feld dafür.
 */

export type CandidateMatch = {
  /** Wie gut die andere Person zu dieser Suche passt. */
  match: DirectedMatch;
  /**
   * Themen, die für BEIDE ein Treffer sind.
   *
   * Nur die Kennungen — nicht, was die andere Person sich gewünscht hat. Die
   * eine kann Ähnlichkeit suchen und die andere Ergänzung; erfüllt heißt
   * hier: jede für sich.
   *
   * Leer heißt NICHT „die andere Person hat nichts festgelegt". Es heißt nur,
   * dass es keine gemeinsamen Punkte gibt — die beiden Fälle sind von außen
   * nicht zu unterscheiden, und das ist Absicht.
   */
  mutualStrongPoints: string[];
};

/**
 * Nichts gemessen — und das ist keine Absage.
 *
 * Wer keine eigenen Präferenzen hat oder wessen Gegenüber den Bogen nicht
 * ausgefüllt hat, bekommt sechs Themen ohne Grundlage. FIND zeigt das Profil
 * trotzdem, nur ohne Aussage zur Arbeitsweise (Spec, Abschnitt 25).
 */
const NICHTS: CandidateMatch = {
  match: { themes: [], rankingScore: null, weightedThemes: 0 },
  mutualStrongPoints: [],
};

const ERFUELLT: ReadonlySet<ThemeVerdict> = new Set(["strong_match", "interesting_complement"]);

export async function getCandidateMatch(
  viewerUserId: string,
  candidateUserId: string,
): Promise<CandidateMatch> {
  if (viewerUserId === candidateUserId) return NICHTS;

  try {
    const supabase = await createClient();
    const [{ preferences }, distances] = await Promise.all([
      getOwnPreferences(viewerUserId),
      themeDistances(supabase, candidateUserId),
    ]);

    const match = judgeAll(preferences, distances);
    return {
      match,
      mutualStrongPoints: await mutualStrongPoints(viewerUserId, candidateUserId, match, distances),
    };
  } catch {
    // Ein Fehler bei einer Person darf die Liste nicht kosten. Sie erscheint
    // dann ohne Aussage zur Arbeitsweise - nicht als Fehlerkasten.
    return NICHTS;
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

  return (
    data as { theme_id: string; comparable: number; total: number; mean_distance: number | null }[]
  )
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

/**
 * Welche Themen für beide Seiten aufgehen.
 *
 * Die Abstände sind dieselben — sie stehen schon da. Was fehlt, ist der Wunsch
 * der anderen Person, und der kommt über den Dienstschlüssel. Ohne ihn (etwa
 * in einer Vorschau-Umgebung) gibt es keine gegenseitigen Punkte; das ist
 * weniger, aber nichts Falsches.
 */
async function mutualStrongPoints(
  viewerUserId: string,
  candidateUserId: string,
  outgoing: DirectedMatch,
  distances: readonly ThemeDistance[],
): Promise<string[]> {
  const eigene = outgoing.themes.filter(
    (theme) => theme.importance > 0 && ERFUELLT.has(theme.verdict),
  );
  // Ohne eigene Treffer gibt es nichts, was gegenseitig sein könnte - und
  // dann muss auch niemandes Suche gelesen werden.
  if (eigene.length === 0) return [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return [];

  const privileged = createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await privileged.rpc("discovery_preferences_for_match", {
    p_viewer: viewerUserId,
    p_candidate: candidateUserId,
  });
  if (error || !data) return [];

  const fremde: ThemePreference[] = (
    data as { theme_id: string; direction: string; importance: number }[]
  )
    .filter((row) => THEME_IDS.includes(row.theme_id))
    .map((row) =>
      normalizePreference({
        themeId: row.theme_id,
        direction: row.direction as Direction,
        importance: row.importance as Importance,
      }),
    );

  // Dieselben Abstände, der andere Wunsch. `judgeAll` ist dieselbe Funktion
  // wie für die eigene Richtung - ein zweites Urteil mit eigenen Regeln wäre
  // die Stelle, an der beide Seiten auseinanderlaufen.
  const incoming = judgeAll(fremde, distances);

  return eigene
    .filter((theme) => {
      const gegen = incoming.themes.find((entry) => entry.themeId === theme.themeId);
      return Boolean(gegen && gegen.importance > 0 && ERFUELLT.has(gegen.verdict));
    })
    .map((theme) => theme.themeId);
}
