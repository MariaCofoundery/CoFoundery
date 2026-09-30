import {
  DISCOVERY_THEMES,
  stepOf,
  stepsOf,
  type Direction,
  type DiscoveryTheme,
  type Importance,
} from "@/features/find/discoveryThemes";

/**
 * Die Matchlogik der Suche.
 *
 * ---------------------------------------------------------------------------
 * WAS SIE IST UND WAS SIE NICHT IST
 * ---------------------------------------------------------------------------
 *
 * Eine heuristische Produktentscheidung, keine validierte Erfolgsformel. Das
 * steht so in der Spec (Abschnitt 9) und es steht hier, weil eine Zahl, die
 * lange genug existiert, irgendwann als Beleg behandelt wird.
 *
 * Deshalb gibt dieses Modul KEINE öffentliche Prozentzahl heraus. Es liefert
 * je Thema einen Befund und dazu die Zahlen, aus denen er entstanden ist;
 * einen Rankingwert über alle Themen gibt es, und er heißt `rankingScore` -
 * intern, für die Reihenfolge einer Liste, nicht für einen Bildschirm.
 *
 * ---------------------------------------------------------------------------
 * ALLES RECHNET IN EINE RICHTUNG
 * ---------------------------------------------------------------------------
 *
 * „Wie gut passt B zu dem, was A sucht?" ist eine andere Frage als „wie gut
 * passt A zu dem, was B sucht?". Die Abstände sind dieselben, die Wünsche
 * nicht. Wer beides zu einer Aussage verschmilzt, behauptet Einigkeit, wo
 * zwei verschiedene Suchen nebeneinanderstehen.
 */

/** Was jemand bei einem Thema sucht. */
export type ThemePreference = {
  themeId: string;
  direction: Direction;
  importance: Importance;
};

/** Eine Antwort, so weit die Rechnung sie braucht. */
export type Answer = { optionId?: string | null; missingCode?: string | null };
export type Answers = Readonly<Record<string, Answer | undefined>>;

// ---------------------------------------------------------------------------
// Die zwei Zahlen, die die Spec nicht nennt
// ---------------------------------------------------------------------------
//
// Abschnitt 15 unterscheidet „starker Matchpunkt", „spannende Ergänzung",
// „Unterschied ohne grosses Gewicht" und „hier lohnt sich ein genauerer
// Blick" - aber nirgends steht, ab welchem Wert ein Wunsch als erfuellt gilt.
// Ohne eine Grenze gaebe es die vier Befunde nicht, also steht sie hier, an
// einer Stelle, benannt und begruendet.

/**
 * Ab wann ein Wunsch als erfüllt gilt.
 *
 * Auf einer Skala mit fünf Stufen sind die möglichen Abstände 0, 0.25, 0.5,
 * 0.75 und 1. Bei gewünschter Ähnlichkeit heißt 0.75 damit: gleiche Antwort
 * oder eine Stufe daneben. Bei gewünschter Ergänzung: genau zwei Stufen
 * Unterschied - das ist die „moderate, nicht maximale Distanz" aus Abschnitt
 * 9, in Zahlen.
 *
 * NICHT AUS DER SPEC. Eine Produktentscheidung, die Maria kennen muss.
 */
export const STRONG_FIT = 0.75;

/**
 * Ab wann überhaupt von einem Unterschied die Rede ist.
 *
 * Für den Befund „Unterschied ohne großes Gewicht": Ohne diese Grenze wäre
 * jede Abweichung von null ein Unterschied, auch eine halbe Stufe über vier
 * Fragen hinweg.
 *
 * NICHT AUS DER SPEC. Eine Stufe auf fünf.
 */
export const NOTICEABLE_DISTANCE = 0.25;

/** Mindestens die Hälfte der Fragen eines Themas muss vergleichbar sein. */
export const MIN_COVERAGE = 0.5;

/** Die Zielentfernung bei gewünschter Ergänzung. */
export const TARGET_DISTANCE = 0.5;

// ---------------------------------------------------------------------------
// Abstand und Passung je Frage
// ---------------------------------------------------------------------------

/**
 * Der Abstand zweier Antworten auf einer geordneten Skala — 0 bis 1.
 *
 * `d = |a - b| / (k - 1)`, also 0 bei gleicher Antwort und 1 bei den beiden
 * Enden. Durch `k - 1` geteilt, damit Skalen verschiedener Länge vergleichbar
 * bleiben: Zwei Stufen auf einer Vierer-Skala sind weiter auseinander als
 * zwei auf einer Fünfer-Skala.
 */
export function itemDistance(a: number, b: number, steps: number): number {
  if (steps < 2) throw new Error("scale_too_short");
  return Math.abs(a - b) / (steps - 1);
}

/** Ähnlichkeit gewünscht: je näher, desto besser. */
export function fitSimilar(distance: number): number {
  return 1 - distance;
}

/**
 * Ergänzung gewünscht: moderate Distanz, nicht maximale.
 *
 * `1 - 2 * |d - 0.5|`, auf 0 bis 1 begrenzt. Das Gegenteil zu suchen ist
 * nicht dasselbe wie eine andere Perspektive zu suchen — die Spec sagt es in
 * Abschnitt 5.3 selbst: „Unterschiedlich bedeutet dabei nicht automatisch
 * möglichst gegensätzlich."
 */
export function fitComplementary(distance: number): number {
  return Math.min(1, Math.max(0, 1 - 2 * Math.abs(distance - TARGET_DISTANCE)));
}

// ---------------------------------------------------------------------------
// Passung je Thema
// ---------------------------------------------------------------------------

export const THEME_VERDICTS = [
  /** Ähnlichkeit gewünscht und gefunden. */
  "strong_match",
  /** Ergänzung gewünscht und gefunden. */
  "interesting_complement",
  /** Unterschied vorhanden, aber nicht als wichtig markiert. */
  "difference_without_weight",
  /** Der Wunsch ist nicht erfüllt. */
  "worth_a_look",
  /** Nichts Auffälliges: kein nennenswerter Unterschied, kein Wunsch. */
  "unremarkable",
  /** Zu wenig gemeinsame Grundlage für eine Aussage. */
  "insufficient_data",
] as const;
export type ThemeVerdict = (typeof THEME_VERDICTS)[number];

export type ThemeResult = {
  themeId: string;
  direction: Direction;
  importance: Importance;
  verdict: ThemeVerdict;
  /**
   * Die Passung — `null`, wenn die Grundlage zu dünn ist.
   *
   * ABSICHTLICH NICHT `0`. Eine 0 wäre die Aussage „passt nicht"; hier ist
   * nichts gemessen worden.
   */
  fit: number | null;
  /** Der mittlere Abstand, unabhängig vom Wunsch. */
  distance: number | null;
  /** Wie viele Fragen des Themas vergleichbar waren, und wie viele es gibt. */
  comparable: number;
  of: number;
};

/**
 * Wie gut passt `other` zu dem, was `self` bei diesem Thema sucht?
 *
 * Gerichtet: Der Wunsch kommt von `self`, die Abstände sind symmetrisch.
 */
/**
 * Der mittlere Abstand eines Themas — schon ausgerechnet.
 *
 * Zwei Wege führen hierher, und sie müssen dasselbe Urteil ergeben: aus
 * beiden Antwortsätzen im Speicher (`themeFit`) oder aus der Datenbank, wenn
 * die andere Person ihre Antworten nicht herausgeben darf
 * (`discovery_theme_distances`). Gerechnet wird deshalb nur einmal — hier
 * darunter.
 */
export type ThemeDistance = {
  themeId: string;
  comparable: number;
  of: number;
  meanDistance: number | null;
};

/** Der Abstand eines Themas aus zwei Antwortsätzen. */
export function themeDistance(theme: DiscoveryTheme, self: Answers, other: Answers): ThemeDistance {
  const numeric = theme.items.filter((item) => item.numeric);
  const distances: number[] = [];

  for (const item of numeric) {
    const a = stepOf(item, self[item.itemId]);
    const b = stepOf(item, other[item.itemId]);
    // Ein Paar zählt nur, wenn BEIDE eine Stufe haben. Fehlt eine Seite, ist
    // der Abstand nicht gross, sondern unbekannt.
    if (a === null || b === null) continue;
    distances.push(itemDistance(a, b, stepsOf(item)));
  }

  return {
    themeId: theme.themeId,
    comparable: distances.length,
    of: numeric.length,
    meanDistance: distances.length
      ? distances.reduce((sum, value) => sum + value, 0) / distances.length
      : null,
  };
}

/**
 * Das Urteil zu einem Thema — aus Abstand und Wunsch.
 *
 * DIE EINZIGE STELLE, AN DER GEURTEILT WIRD. Wo die Abstände herkommen, ist
 * ihr gleich.
 */
export function judgeTheme(preference: ThemePreference, distances: ThemeDistance): ThemeResult {
  const base = {
    themeId: distances.themeId,
    direction: preference.direction,
    importance: preference.importance,
    comparable: distances.comparable,
    of: distances.of,
  };

  // MINDESTABDECKUNG. Ein Thema aus vier Fragen, von denen eine vergleichbar
  // ist, ergibt eine Zahl - aber keine, auf die man jemanden ansprechen will.
  if (
    distances.of === 0 ||
    distances.meanDistance === null ||
    distances.comparable / distances.of < MIN_COVERAGE
  ) {
    return { ...base, verdict: "insufficient_data", fit: null, distance: null };
  }

  const distance = distances.meanDistance;
  const fit =
    preference.direction === "similar"
      ? fitSimilar(distance)
      : preference.direction === "complementary"
        ? fitComplementary(distance)
        : null;

  return { ...base, verdict: verdictOf(preference, fit, distance), fit, distance };
}

export function themeFit(
  theme: DiscoveryTheme,
  preference: ThemePreference,
  self: Answers,
  other: Answers,
): ThemeResult {
  return judgeTheme(preference, themeDistance(theme, self, other));
}

function verdictOf(
  preference: ThemePreference,
  fit: number | null,
  distance: number,
): ThemeVerdict {
  // OHNE WUNSCH KEIN URTEIL. Wer ein Thema nicht als wichtig markiert hat,
  // bekommt keinen Treffer und keinen Fehltreffer - höchstens den Hinweis,
  // dass es hier einen Unterschied gibt.
  if (preference.direction === "neutral" || preference.importance === 0) {
    return distance >= NOTICEABLE_DISTANCE ? "difference_without_weight" : "unremarkable";
  }
  if (fit !== null && fit >= STRONG_FIT) {
    return preference.direction === "similar" ? "strong_match" : "interesting_complement";
  }
  return "worth_a_look";
}

// ---------------------------------------------------------------------------
// Beide Richtungen
// ---------------------------------------------------------------------------

export type DirectedMatch = {
  themes: ThemeResult[];
  /**
   * Der gewichtete Mittelwert — INTERN, für die Reihenfolge einer Liste.
   *
   * `sum(fit * importance) / sum(importance)` über die Themen mit
   * ausreichender Grundlage. `null`, wenn keins davon gewichtet ist: Wer
   * nichts als wichtig markiert hat, bekommt keine Reihenfolge nach
   * Arbeitsweise, sondern eine ohne.
   *
   * NICHT AUF EINEN BILDSCHIRM. Die Spec, Abschnitt 14: keine öffentliche
   * Kompatibilitäts-Prozentzahl.
   */
  rankingScore: number | null;
  /** Wie viele Themen gewichtet waren und eine Grundlage hatten. */
  weightedThemes: number;
};

/** Kein Wunsch ist nicht dasselbe wie „egal“ — aber es rechnet sich gleich. */
const OHNE_WUNSCH = (themeId: string): ThemePreference => ({
  themeId,
  direction: "neutral",
  importance: 0,
});

export function directedMatch(
  preferences: readonly ThemePreference[],
  self: Answers,
  other: Answers,
): DirectedMatch {
  return judgeAll(
    preferences,
    DISCOVERY_THEMES.map((theme) => themeDistance(theme, self, other)),
  );
}

/**
 * Dasselbe Urteil, wenn die Abstände aus der Datenbank kommen.
 *
 * Die Suche darf die Antworten der anderen Person nicht lesen — die Freigabe
 * von Antworten läuft über `alignment_shares` und ist eine ausdrückliche
 * Entscheidung. `discovery_theme_distances` sieht beide Seiten und gibt je
 * Thema nur drei Zahlen heraus; geurteilt wird hier, mit denselben Regeln.
 */
export function judgeAll(
  preferences: readonly ThemePreference[],
  distances: readonly ThemeDistance[],
): DirectedMatch {
  const byTheme = new Map(preferences.map((entry) => [entry.themeId, entry]));
  const byDistance = new Map(distances.map((entry) => [entry.themeId, entry]));

  // Die Reihenfolge kommt aus der Themenliste und nicht aus der Datenbank:
  // Ein Thema, zu dem nichts zurückkam, fehlt sonst stillschweigend.
  const themes = DISCOVERY_THEMES.map((theme) =>
    judgeTheme(
      byTheme.get(theme.themeId) ?? OHNE_WUNSCH(theme.themeId),
      byDistance.get(theme.themeId) ?? {
        themeId: theme.themeId,
        comparable: 0,
        of: theme.items.filter((item) => item.numeric).length,
        meanDistance: null,
      },
    ),
  );

  let weighted = 0;
  let weights = 0;
  let weightedThemes = 0;
  for (const result of themes) {
    if (result.fit === null || result.importance === 0) continue;
    weighted += result.fit * result.importance;
    weights += result.importance;
    weightedThemes += 1;
  }

  return {
    themes,
    rankingScore: weights > 0 ? weighted / weights : null,
    weightedThemes,
  };
}

// ---------------------------------------------------------------------------
// Zwei Menschen, zwei Suchen
// ---------------------------------------------------------------------------

export type MutualMatch = {
  /** Wie gut passt die andere Person zu dem, was diese Person sucht? */
  outgoing: DirectedMatch;
  /** Und umgekehrt — `null`, wenn die andere Person nichts festgelegt hat. */
  incoming: DirectedMatch | null;
  /**
   * Themen, die BEIDE als wichtig markiert haben und bei denen der jeweilige
   * Wunsch erfüllt ist.
   *
   * Nicht dasselbe wie „beide haben einen starken Matchpunkt": Die eine kann
   * Ähnlichkeit suchen und die andere Ergänzung. Erfüllt heißt hier: jede für
   * sich.
   */
  mutualStrongPoints: string[];
};

const MET: ReadonlySet<ThemeVerdict> = new Set(["strong_match", "interesting_complement"]);

export function mutualMatch(
  ownPreferences: readonly ThemePreference[],
  ownAnswers: Answers,
  otherPreferences: readonly ThemePreference[] | null,
  otherAnswers: Answers,
): MutualMatch {
  const outgoing = directedMatch(ownPreferences, ownAnswers, otherAnswers);
  // KEINE PRÄFERENZEN IST NICHT DASSELBE WIE LEERE PRÄFERENZEN. Wer nichts
  // festgelegt hat, bekommt hier `null` - und die Oberfläche sagt es, statt
  // sechsmal „neutral" anzuzeigen, als hätte die Person sich entschieden.
  const incoming = otherPreferences
    ? directedMatch(otherPreferences, otherAnswers, ownAnswers)
    : null;

  const mutualStrongPoints = incoming
    ? outgoing.themes
        .filter((theme) => theme.importance > 0 && MET.has(theme.verdict))
        .filter((theme) => {
          const gegen = incoming.themes.find((entry) => entry.themeId === theme.themeId);
          return Boolean(gegen && gegen.importance > 0 && MET.has(gegen.verdict));
        })
        .map((theme) => theme.themeId)
    : [];

  return { outgoing, incoming, mutualStrongPoints };
}

/**
 * Die Zählung für die Oberfläche — statt einer Prozentzahl.
 *
 * Die Spec, Abschnitt 14: „3 starke Matchpunkte · 1 spannende Ergänzung ·
 * 2 Themen neutral · 1 Thema noch offen." Zählwerte über Themen, keine Note.
 */
export function countVerdicts(match: DirectedMatch): Record<ThemeVerdict, number> {
  const counts = Object.fromEntries(THEME_VERDICTS.map((verdict) => [verdict, 0])) as Record<
    ThemeVerdict,
    number
  >;
  for (const theme of match.themes) counts[theme.verdict] += 1;
  return counts;
}

/**
 * Die Präferenz in einen widerspruchsfreien Zustand bringen.
 *
 * `neutral` und eine Wichtigkeit über 0 wären zwei Angaben, die sich
 * widersprechen; ebenso eine Richtung ohne Gewicht. Beides kann aus einer
 * halb ausgefüllten Maske kommen, und beides wird hier entschieden statt
 * später geraten.
 */
export function normalizePreference(preference: ThemePreference): ThemePreference {
  if (preference.direction === "neutral") {
    return { ...preference, importance: 0 };
  }
  if (preference.importance === 0) {
    return { ...preference, direction: "neutral" };
  }
  return preference;
}
