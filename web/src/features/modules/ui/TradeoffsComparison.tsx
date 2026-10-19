import { getLocale, getTranslations } from "next-intl/server";

import { alignmentDisplayText } from "@/features/instruments/align/display";
import type { CompareCell, CompareRow, DifferenceKind } from "@/features/modules/tradeoffs/compare";
import type { AppLocale } from "@/i18n/config";

/**
 * Der gemeinsame Vergleich `path_and_weights` - `conversation_only`.
 *
 * Je Situation: was jede Person gewichtet und als ersten Weg gewaehlt hat,
 * nebeneinander. Darunter ein Satz dazu, ob Gewichte und Wege uebereinstimmen.
 *
 * KEINE WERTUNG. Kein Punktwert, kein Prozent, keine Ampel, keine Rangfolge, kein
 * „passt". Ein Unterschied ist ein Gespraechsanlass; Uebereinstimmung ist keine
 * Qualitaet, und `open` (ein Auslassungsgrund, „anderer Weg") sagt nichts, statt zu
 * raten. Es gibt keine erfundenen Gruende.
 *
 * Dieselbe Darstellung fuer jedes aktuelle Mitglied: Diese Komponente bekommt
 * nur den Vergleich, nie die Rolle der lesenden Person - bis auf das Wort
 * „Du" an der eigenen Spalte.
 */
function Cell({ cell, show, labels }: { cell: CompareCell; show: (text: string) => string; labels: Record<string, string> }) {
  const level = (text: string) => show(text);
  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-sm font-semibold text-slate-900">{cell.isViewer ? labels.you : cell.name}</p>
      {cell.missingLabel ? (
        <p className="mt-2 text-sm text-slate-600">{show(cell.missingLabel)}</p>
      ) : (
        <>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{labels.weightsLabel}</p>
          {cell.weights.length > 0 ? (
            <ul className="mt-1 space-y-1 text-sm leading-6 text-slate-800">
              {cell.weights.map((weight) => (
                <li key={weight.concern}>
                  {show(weight.concern)}: {level(weight.level)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">{labels.pathNone}</p>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{labels.pathLabel}</p>
          <p className="mt-1 text-sm leading-6 text-slate-800">
            {cell.path.kind === "chosen"
              ? show(cell.path.label)
              : cell.path.kind === "other"
                ? labels.pathOther
                : cell.path.kind === "unknown"
                  ? labels.pathUnknown
                  : labels.pathNone}
          </p>
        </>
      )}
    </li>
  );
}

export async function TradeoffsComparison({ rows }: { rows: readonly CompareRow[] }) {
  const [t, localeRaw] = await Promise.all([getTranslations("ventureTradeoffs"), getLocale()]);
  const locale = localeRaw as AppLocale;
  const show = (text: string) => alignmentDisplayText(text, locale);
  const labels = {
    you: t("compare.you"),
    weightsLabel: t("compare.weightsLabel"),
    pathLabel: t("compare.pathLabel"),
    pathOther: t("compare.pathOther"),
    pathUnknown: t("compare.pathUnknown"),
    pathNone: t("compare.pathNone"),
  };

  const weightSentence = (kind: DifferenceKind) =>
    kind === "same" ? t("compare.weights.same") : kind === "different" ? t("compare.weights.different") : null;
  const pathSentence = (kind: DifferenceKind) =>
    kind === "same" ? t("compare.paths.same") : kind === "different" ? t("compare.paths.different") : t("compare.paths.open");

  return (
    <div className="mt-6">
      <p className="max-w-2xl text-sm leading-7 text-slate-700">{t("compare.intro")}</p>
      <ul className="mt-6 space-y-5">
        {rows.map((row, index) => {
          const sentences = [weightSentence(row.weights), pathSentence(row.paths)].filter(Boolean) as string[];
          const talk = row.weights === "different" || row.paths === "different";
          return (
            <li key={row.itemId} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("compare.situation", { index: index + 1 })} · {t(`situations.${row.itemId}`)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{show(row.prompt)}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {row.cells.map((cell) => (
                  <Cell key={cell.personId} cell={cell} show={show} labels={labels} />
                ))}
              </ul>
              <ul className="mt-4 space-y-1 text-sm leading-6 text-slate-800">
                {sentences.map((sentence) => (
                  <li key={sentence}>{sentence}</li>
                ))}
              </ul>
              {talk ? <p className="mt-2 text-sm leading-6 text-slate-600">{t("compare.talk")}</p> : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-6 max-w-2xl text-xs leading-6 text-slate-500">{t("compare.closing")}</p>
    </div>
  );
}
