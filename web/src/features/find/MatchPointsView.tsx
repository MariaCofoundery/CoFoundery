import Link from "next/link";

import type { MatchPoint, MatchPointKind } from "@/features/find/matchPoints";

export type MatchPointsCopy = {
  title: string;
  themeTitle: (themeId: string) => string;
  kindTitle: (kind: MatchPointKind) => string;
  kindText: (kind: MatchPointKind, name: string) => string;
  noPreferences: string;
  noPreferencesCta: string;
};

/**
 * „Warum könnte das interessant sein?"
 *
 * Heißt `MatchPointsView` und nicht `MatchPoints`: Die Auswahl der Punkte
 * steht in `matchPoints.ts`, und zwei Dateien, die sich nur in der Groß- und
 * Kleinschreibung unterscheiden, sind auf einem Mac dieselbe Datei.
 *
 * ---------------------------------------------------------------------------
 * DIE FARBE SAGT, WELCHE ART VON PUNKT — NIE, WIE GUT DIE PERSON IST
 * ---------------------------------------------------------------------------
 *
 * Bernstein steht bei „hier lohnt sich ein genauerer Blick", und das ist die
 * Farbe für „hinsehen" und nicht für „Warnung". Es gibt kein Rot: Ein
 * Unterschied bei einem Thema, das jemandem wichtig ist, ist ein Grund für ein
 * Gespräch und kein Fehler.
 *
 * Verboten sind ausserdem vier Wörter (Spec, Abschnitt 15): inkompatibel,
 * schlechter Match, Risiko, Problem. Sie stehen in keinem der Texte.
 */
const TON: Record<MatchPointKind, string> = {
  mutual_strong: "border-emerald-200 bg-emerald-50/70",
  strong_match: "border-emerald-100 bg-emerald-50/40",
  interesting_complement: "border-violet-100 bg-violet-50/40",
  worth_a_look: "border-amber-200 bg-amber-50/50",
  difference_without_weight: "border-slate-200 bg-slate-50/70",
};

export function MatchPointsView({
  points,
  candidateName,
  copy,
  hasPreferences,
}: {
  points: readonly MatchPoint[];
  candidateName: string;
  copy: MatchPointsCopy;
  /**
   * Hat die suchende Person selbst etwas festgelegt?
   *
   * Ohne eigene Auswahl gibt es nichts zu sagen — und dann steht hier der Weg
   * dorthin statt eines leeren Kastens. Das ist eine Aussage über die eigene
   * Suche, nicht über die andere Person.
   */
  hasPreferences: boolean;
}) {
  if (!hasPreferences) {
    return (
      <section className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-sm leading-6 text-slate-600">{copy.noPreferences}</p>
        <Link
          href="/discovery/suche"
          className="mt-2 inline-flex text-sm font-medium text-slate-900 underline"
        >
          {copy.noPreferencesCta}
        </Link>
      </section>
    );
  }

  if (points.length === 0) return null;

  return (
    <section className="mt-5 border-t border-slate-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {copy.title}
      </p>
      <ul className="mt-3 space-y-2">
        {points.map((point) => (
          <li
            key={point.themeId}
            className={`rounded-xl border px-4 py-3 ${TON[point.kind]}`}
          >
            <p className="text-sm font-semibold text-slate-900">
              {copy.kindTitle(point.kind)}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              <span className="font-medium">{copy.themeTitle(point.themeId)}:</span>{" "}
              {copy.kindText(point.kind, candidateName)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
