import type { ExpectationResult } from "@/features/instruments/v21/expectationsV21";

/**
 * Erwartungsdifferenzen - der konkreteste Teil des Vergleichs.
 *
 * ---------------------------------------------------------------------------
 * ZWEI ZAHLEN NEBENEINANDER, UND DER SATZ DAZU
 * ---------------------------------------------------------------------------
 *
 * „Maria kann 12 Stunden pro Woche einplanen. Alex erwartet von ihr 25." Das
 * ist etwas anderes als „ihr habt unterschiedliche Arbeitsstile" - es ist eine
 * Zahl, über die sich am Dienstag reden lässt.
 *
 * WAS HIER NICHT STEHEN DARF: „geringes Commitment". Das ist der Satz, gegen
 * den dieser ganze Abschnitt gebaut ist. Eine Vereinbarung kann die Erwartung
 * ändern, und sie kann die Zusage ändern. Was hier steht, ist der heutige
 * Abstand zwischen zwei Sätzen.
 *
 * Die Differenz wird gezeigt, aber nicht betont: keine große Zahl, keine
 * Farbe. Sie ist eine Beschreibung und kein Alarm.
 */

type Props = { result: ExpectationResult; nameA: string; nameB: string };

export function ExpectationGapsView({ result, nameA, nameB }: Props) {
  const nameOf = (side: "a" | "b") => (side === "a" ? nameA : nameB);
  const otherOf = (side: "a" | "b") => (side === "a" ? nameB : nameA);

  if (result.gaps.length === 0 && result.unmatched.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Zeit: Zusage und Erwartung</h2>

      {result.gaps.length > 0 && (
        <ul className="mt-3 space-y-4">
          {result.gaps.map((gap, index) => (
            <li key={index}>
              <p className="text-base text-slate-900">
                {otherOf(gap.from)} kann {gap.offered} {gap.unit} einplanen.{" "}
                {nameOf(gap.from)} erwartet von {gap.recipientLabel} {gap.expected} {gap.unit}.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Das sind {gap.shortfall} {gap.unit} Unterschied zwischen dem, was zugesagt
                ist, und dem, was erwartet wird. Das beschreibt zwei Angaben, nicht die
                Einsatzbereitschaft — eine Vereinbarung kann beides ändern.
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Klärt, ob Rolle, Ziel oder Erwartung angepasst werden sollen.
              </p>
            </li>
          ))}
        </ul>
      )}

      {result.unmatched.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            {/* HIER WIRD NICHT GERATEN, und das steht dabei. Eine falsch
                zugeordnete Erwartung stellt jemandem eine Forderung vor, die
                einem Dritten galt. */}
            Diese Erwartungen lassen sich nicht sicher zuordnen:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {result.unmatched.map((entry, index) => (
              <li key={index}>
                {nameOf(entry.from)} erwartet von {entry.recipientLabel}
                {entry.expected !== null ? ` ${entry.expected} ${entry.unit}` : ""} —{" "}
                <span className="text-slate-500">
                  {entry.why === "several_entries"
                    ? "es sind mehrere Personen genannt, und die Namen sind frei geschrieben"
                    : entry.why === "no_offer"
                      ? "dazu liegt keine Zusage vor"
                      : "die Einheiten passen nicht zusammen"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
