import Link from "next/link";
import {
  versionFacts,
  CHOICE_CONSEQUENCES,
  MIXED_COMPARISON_WARNING,
} from "@/features/instruments/v21/versionChoiceV21";

/**
 * Die Wahl zwischen den Fassungen.
 *
 * ---------------------------------------------------------------------------
 * ES GIBT KEINE EMPFOHLENE ANTWORT
 * ---------------------------------------------------------------------------
 *
 * Kein Knopf ist hervorgehoben, keine Wahl steht links. Die neue Fassung ist
 * im Test und hat noch keine Auswertung - sie zu empfehlen wäre unredlich, sie
 * zu verstecken auch.
 *
 * Und der unangenehme Satz steht oben: Wer wechselt, während sein Mitgründer
 * bleibt, kann sich mit ihm nicht vergleichen. Das erst unten zu schreiben
 * hieße, auf die Leute zu setzen, die nicht zu Ende lesen.
 */

type Props = {
  /** Hat die Person die bisherige Fassung schon abgegeben? */
  hasPrevious: boolean;
  /** Und die neue? */
  hasNext: boolean;
};

export function VersionChoiceView({ hasPrevious, hasNext }: Props) {
  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {MIXED_COMPARISON_WARNING}
      </p>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Was sich unterscheidet</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium"> </th>
                <th className="px-4 py-2 font-medium">bisher</th>
                <th className="px-4 py-2 font-medium">neu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {versionFacts().map((fact) => (
                <tr key={fact.aspect} className="align-top">
                  <td className="px-4 py-3 text-slate-500">{fact.aspect}</td>
                  <td className="px-4 py-3 text-slate-900">{fact.previous}</td>
                  <td className="px-4 py-3 text-slate-900">{fact.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Choice
          title="Bei der bisherigen Fassung bleiben"
          consequence={CHOICE_CONSEQUENCES.keep_previous}
          action={
            hasPrevious ? (
              <p className="text-sm text-slate-500">Das ist der Stand — du musst nichts tun.</p>
            ) : (
              <Link href="/me/base" className="text-sm text-slate-900 underline">
                Zur bisherigen Fassung
              </Link>
            )
          }
        />
        <Choice
          title="Die neue Fassung ausfüllen"
          consequence={CHOICE_CONSEQUENCES.retake}
          action={
            <Link href="/founder-alignment/pilot" className="text-sm text-slate-900 underline">
              {hasNext ? "Weiter ausfüllen" : "Zur neuen Fassung"}
            </Link>
          }
        />
      </section>

      {/* DIE DRITTE MÖGLICHKEIT, DIE OFT VERGESSEN WIRD. Beides zu machen ist
          erlaubt und kostet nichts als Zeit - wer es nicht dazuschreibt,
          erzeugt eine Entweder-oder-Frage, die es nicht gibt. */}
      <p className="text-sm text-slate-600">
        Du kannst auch beides ausfüllen. Die beiden Fragebögen laufen getrennt
        voneinander: Mit Leuten bei der bisherigen Fassung vergleichst du dich über
        deinen bisherigen Report, mit Leuten bei der neuen über den neuen.
      </p>
    </div>
  );
}

function Choice({
  title,
  consequence,
  action,
}: {
  title: string;
  consequence: { keeps: string[]; costs: string[] };
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-medium text-slate-900">{title}</h3>

      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        {consequence.keeps.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {/* DER PREIS STEHT DA, NICHT NUR DER NUTZEN. Eine Wahl ohne Preis ist
          keine Wahl, sondern eine Werbung. */}
      <ul className="mt-3 space-y-1 text-sm text-slate-500">
        {consequence.costs.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="mt-4">{action}</div>
    </div>
  );
}
