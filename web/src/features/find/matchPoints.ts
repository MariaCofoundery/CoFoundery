import { THEME_IDS } from "@/features/find/discoveryThemes";
import type { ThemeResult } from "@/features/find/discoveryMatch";

/**
 * Was auf einer Ergebniskarte steht — „warum könnte das interessant sein?"
 *
 * ---------------------------------------------------------------------------
 * SÄTZE STATT EINER ZAHL
 * ---------------------------------------------------------------------------
 *
 * Spec, Abschnitt 14: keine öffentliche Kompatibilitäts-Prozentzahl. „87 %"
 * beantwortet die Frage, die man hat, mit einer Zahl, die niemand prüfen kann
 * — und sie wird als Auswahlkriterium benutzt, sobald sie existiert.
 *
 * Stattdessen benannte Punkte: Bei welchem Thema geht etwas auf, und warum.
 * Jeder Punkt lässt sich gegen die eigenen Angaben prüfen.
 *
 * ---------------------------------------------------------------------------
 * KEIN „SCHLECHTER MATCH"
 * ---------------------------------------------------------------------------
 *
 * Die Spec verbietet vier Wörter ausdrücklich: inkompatibel, schlechter
 * Match, Risiko, Problem. Der vierte Befund heißt deshalb „hier lohnt sich ein
 * genauerer Blick" — das ist keine Beschönigung: Ein Unterschied bei einem
 * Thema, das jemandem wichtig ist, IST ein Grund hinzusehen und kein Urteil
 * über einen Menschen.
 */

export const MATCH_POINT_KINDS = [
  /** Beide haben das Thema gewichtet, und für beide geht es auf. */
  "mutual_strong",
  /** Ähnlichkeit gewünscht und gefunden. */
  "strong_match",
  /** Ergänzung gewünscht und gefunden. */
  "interesting_complement",
  /** Der Wunsch ist nicht erfüllt. */
  "worth_a_look",
  /** Unterschied vorhanden, aber nicht als wichtig markiert. */
  "difference_without_weight",
] as const;
export type MatchPointKind = (typeof MATCH_POINT_KINDS)[number];

export type MatchPoint = {
  themeId: string;
  kind: MatchPointKind;
};

/**
 * Die Reihenfolge ist die Aussagekraft.
 *
 * Zuerst, was für beide aufgeht, dann was für einen aufgeht, dann was einen
 * Blick wert ist. Der Unterschied ohne Gewicht steht zuletzt: Er ist eine
 * Beobachtung und keine Antwort auf „warum ist das interessant".
 */
const RANG: Record<MatchPointKind, number> = {
  mutual_strong: 0,
  strong_match: 1,
  interesting_complement: 2,
  worth_a_look: 3,
  difference_without_weight: 4,
};

const KIND_OF_VERDICT: Partial<Record<ThemeResult["verdict"], MatchPointKind>> = {
  strong_match: "strong_match",
  interesting_complement: "interesting_complement",
  worth_a_look: "worth_a_look",
  difference_without_weight: "difference_without_weight",
};

/**
 * Welche Punkte eine Ergebniskarte zeigt.
 *
 * `insufficient_data` und `unremarkable` erzeugen KEINEN Punkt. „Dazu haben
 * wir noch nicht genug Angaben" ist eine Auskunft über den Umfang der
 * Antworten und nicht über die Passung — sie gehört in die Zählung, nicht
 * zwischen die Gründe.
 */
export function matchPoints(
  themes: readonly ThemeResult[],
  mutualStrongPoints: readonly string[],
  limit?: number,
): MatchPoint[] {
  const gegenseitig = new Set(mutualStrongPoints);
  const reihenfolge = new Map(THEME_IDS.map((themeId, index) => [themeId, index]));

  const punkte = themes.flatMap((theme): MatchPoint[] => {
    const kind = gegenseitig.has(theme.themeId)
      ? "mutual_strong"
      : KIND_OF_VERDICT[theme.verdict];
    return kind ? [{ themeId: theme.themeId, kind }] : [];
  });

  const gewicht = new Map(themes.map((theme) => [theme.themeId, theme.importance]));
  punkte.sort(
    (a, b) =>
      RANG[a.kind] - RANG[b.kind] ||
      // Bei gleichem Rang zuerst, was der Person wichtiger ist.
      (gewicht.get(b.themeId) ?? 0) - (gewicht.get(a.themeId) ?? 0) ||
      (reihenfolge.get(a.themeId) ?? 0) - (reihenfolge.get(b.themeId) ?? 0),
  );

  return limit === undefined ? punkte : punkte.slice(0, limit);
}
