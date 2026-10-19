import type { RegistryItemV22 } from "@/features/instruments/align/registries";
import type { AnswerTextContext } from "@/features/modules/ventureBeta/answerText";
import type { CompareCell, PairGap } from "@/features/modules/ventureBeta/compare";

/**
 * Die Grafiken des Teamreports: beschreibend, symmetrisch, ohne Wert.
 *
 * Jede Person ist ein Punkt mit Anfangsbuchstaben (Farbe UND Buchstabe - nie nur Farbe). Es gibt keine
 * Rangfolge, keine Punktzahl, kein Radar und keine Ampel: Die Grafik zeigt, WO jede Person steht und WO ihr
 * euch trefft. Die Unterschiede sind Gespraechsstoff, nicht Befund.
 *
 *   OptionRows    Einfachauswahl: eine Zeile je Antwort, die Personen als Punkte am Zeilenende.
 *   ChoiceMatrix  Mehrfachauswahl: Antworten als Zeilen, Personen als Spalten; gemeinsam gewaehlte Zeilen sind getoent.
 *   HoursChart    Stunden: Balken = was jemand einplant, Strich = was jemand von den anderen erwartet.
 *   NumberBars    Eine Zahl je Person (z. B. Monate), als Balken.
 *
 * Reine Darstellung: Die Komponenten bekommen fertige Zellen und lesen nichts nach.
 */
// Die Farben der Personen: vier weiche Verlaeufe aus der Markenwelt (Violett, Himmelblau, Rosa, Smaragd). Alle
// tragen weisse Schrift gut lesbar, und Orange bleibt dem „Gespraech lohnt" vorbehalten - eine Personenfarbe ist nie
// eine Aussage. Der Buchstabe im Punkt traegt die Zuordnung, die Farbe unterstuetzt sie nur.
const TONES = [
  "bg-gradient-to-br from-violet-600 to-indigo-700",
  "bg-gradient-to-br from-sky-600 to-blue-700",
  "bg-gradient-to-br from-pink-600 to-rose-700",
  "bg-gradient-to-br from-emerald-600 to-teal-700",
] as const;

export function personInitial(name: string, isViewer: boolean): string {
  return isViewer ? "Du".charAt(0) : name.trim().charAt(0).toUpperCase() || "?";
}

export function PersonDot({ index, cell, viewerLabel }: { index: number; cell: Pick<CompareCell, "name" | "isViewer">; viewerLabel: string }) {
  const name = cell.isViewer ? viewerLabel : cell.name;
  return (
    <span
      title={name}
      aria-label={name}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white ${TONES[index % TONES.length]} ${cell.isViewer ? "ring-2 ring-slate-900/30" : ""}`}
    >
      {cell.isViewer ? viewerLabel.charAt(0).toUpperCase() : personInitial(cell.name, false)}
    </span>
  );
}

/** Wer ist wer: eine Legende, damit die Punkte nie geraten werden muessen. */
export function PersonLegend({ cells, viewerLabel }: { cells: readonly CompareCell[]; viewerLabel: string }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legende">
      {cells.map((cell, index) => (
        <li key={cell.personId} className="inline-flex items-center gap-1.5">
          <PersonDot index={index} cell={cell} viewerLabel={viewerLabel} />
          {cell.isViewer ? viewerLabel : cell.name}
        </li>
      ))}
    </ul>
  );
}

export function OptionRows({
  item,
  cells,
  ctx,
  viewerLabel,
}: {
  item: RegistryItemV22;
  cells: readonly CompareCell[];
  ctx: AnswerTextContext;
  viewerLabel: string;
}) {
  return (
    <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200" data-chart="option-rows">
      {item.options.map((option) => {
        const here = cells
          .map((cell, index) => ({ cell, index }))
          .filter(({ cell }) => cell.answer.kind === "option" && cell.answer.optionId === option.optionId);
        const dates = here
          .map(({ cell }) => (cell.answer.kind === "option" && cell.answer.date ? ctx.formatDate(cell.answer.date) : null))
          .filter((value): value is string => value !== null);
        const shared = here.length > 1 && here.length === cells.length;
        return (
          <li
            key={option.optionId}
            data-option={option.optionId}
            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm ${here.length > 0 ? (shared ? "bg-teal-50" : "bg-violet-50/60") : "bg-white"}`}
          >
            <span className={here.length > 0 ? "font-medium text-slate-900" : "text-slate-500"}>
              {ctx.show(option.label)}
              {dates.length > 0 ? <span className="ml-2 text-xs font-normal text-slate-500">({dates.join(", ")})</span> : null}
            </span>
            <span className="flex shrink-0 -space-x-1.5">
              {here.map(({ cell, index }) => (
                <PersonDot key={cell.personId} index={index} cell={cell} viewerLabel={viewerLabel} />
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ChoiceMatrix({
  item,
  cells,
  ctx,
  viewerLabel,
}: {
  item: RegistryItemV22;
  cells: readonly CompareCell[];
  ctx: AnswerTextContext;
  viewerLabel: string;
}) {
  const chosen = (cell: CompareCell, optionId: string) => cell.answer.kind === "options" && cell.answer.optionIds.includes(optionId);
  const rows = item.options.filter((option) => cells.some((cell) => chosen(cell, option.optionId)));
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200" data-chart="choice-matrix">
      <table className="w-full min-w-[360px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs text-slate-500">
            <th scope="col" className="px-3.5 py-2 text-left font-medium" />
            {cells.map((cell, index) => (
              <th key={cell.personId} scope="col" className="w-14 px-1 py-2 text-center">
                <PersonDot index={index} cell={cell} viewerLabel={viewerLabel} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((option) => {
            const count = cells.filter((cell) => chosen(cell, option.optionId)).length;
            return (
              <tr key={option.optionId} data-option={option.optionId} className={`border-t border-slate-100 ${count === cells.length ? "bg-teal-50" : ""}`}>
                <th scope="row" className="px-3.5 py-2.5 text-left font-normal text-slate-800">
                  {ctx.show(option.label)}
                </th>
                {cells.map((cell) => (
                  <td key={cell.personId} className="text-center">
                    {chosen(cell, option.optionId) ? (
                      <span className="text-violet-600" aria-label="ja">●</span>
                    ) : (
                      <span className="text-slate-300" aria-label="nein">○</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function numberOf(cell: CompareCell): number | null {
  return cell.answer.kind === "number" ? (cell.answer.to ?? cell.answer.number) : null;
}

export function HoursChart({
  offered,
  expected,
  gaps,
  viewerLabel,
}: {
  offered: readonly CompareCell[];
  expected: readonly CompareCell[];
  gaps: readonly PairGap[];
  viewerLabel: string;
}) {
  const values = [...offered.map(numberOf), ...expected.map((cell) => (cell.answer.kind === "number" ? cell.answer.number : null))].filter(
    (value): value is number => value !== null
  );
  const max = Math.max(10, ...values);
  const pct = (value: number) => `${Math.min(100, Math.round((value / max) * 100))}%`;
  return (
    <ul className="mt-3 space-y-3" data-chart="hours">
      {offered.map((cell, index) => {
        const give = numberOf(cell);
        const want = expected[index]?.answer.kind === "number" ? (expected[index]!.answer as { number: number }).number : null;
        const hasGap = gaps.some((gap) => gap.expectedBy.personId === cell.personId || gap.offeredBy.personId === cell.personId);
        return (
          <li key={cell.personId} className="flex items-center gap-3">
            <PersonDot index={index} cell={cell} viewerLabel={viewerLabel} />
            <div className="relative h-5 flex-1 rounded-full bg-slate-100" role="img" aria-label={`${give ?? "–"} / ${want ?? "–"}`}>
              {give !== null ? <div className={`h-5 rounded-full ${TONES[index % TONES.length]}`} style={{ width: pct(give) }} /> : null}
              {want !== null ? <i className="absolute -bottom-1 -top-1 w-0.5 bg-slate-900" style={{ left: pct(want) }} /> : null}
            </div>
            <span className="w-28 shrink-0 text-xs text-slate-600">
              {give ?? "–"} · {want ?? "–"}
              {hasGap ? <span className="ml-1 text-amber-700">◆</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function NumberBars({ cells, unit, viewerLabel }: { cells: readonly CompareCell[]; unit: string; viewerLabel: string }) {
  const values = cells.map(numberOf);
  const max = Math.max(6, ...values.filter((value): value is number => value !== null));
  return (
    <ul className="mt-3 space-y-3" data-chart="number-bars">
      {cells.map((cell, index) => {
        const value = values[index];
        return (
          <li key={cell.personId} className="flex items-center gap-3">
            <PersonDot index={index} cell={cell} viewerLabel={viewerLabel} />
            <div className="h-5 flex-1 rounded-full bg-slate-100">
              {value !== null ? <div className={`h-5 rounded-full ${TONES[index % TONES.length]}`} style={{ width: `${Math.max(3, Math.round(((value ?? 0) / max) * 100))}%` }} /> : null}
            </div>
            <span className="w-28 shrink-0 text-xs text-slate-600">{value !== null ? `${value} ${unit}` : "–"}</span>
          </li>
        );
      })}
    </ul>
  );
}
