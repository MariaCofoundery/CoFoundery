import { getTranslations } from "next-intl/server";
import type { AlignmentComparison } from "@/features/instruments/v2/alignmentComparisonData";
import type { BlockComparison } from "@/features/instruments/v2/alignmentComparison";
import type { ReadoutEntry } from "@/features/instruments/v2/alignmentReadout";
import { AGREEMENT_FIELDS } from "@/features/instruments/v2/conversationCardsV2";

/**
 * Zwei Menschen nebeneinander.
 *
 * ZWEI SPALTEN, KEINE DRITTE. Es gibt keine Spalte „Abweichung", keine
 * Prozentzahl, keinen Balken dazwischen. Was dort stünde, wäre erfunden - und
 * eine dritte Spalte liest sich immer wie das Ergebnis.
 *
 * Oben stehen die zwei bis vier Gesprächskarten, darunter alles Übrige zum
 * Nachschlagen. Teil G: „zwei bis vier vom Team ausgewählte Themen, nicht 20
 * Warnkarten auf einmal."
 */

export async function AlignmentComparisonView({
  result, nameA, nameB,
}: { result: AlignmentComparison; nameA: string; nameB: string }) {
  const t = await getTranslations("alignment");

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{t("compare.cardsTitle")}</h2>
        <p className="text-sm text-slate-600">{t("compare.cardsIntro")}</p>

        {result.cards.length === 0 && (
          <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
            {t("compare.nothingYet")}
          </p>
        )}

        {result.cards.map((card) => (
          <article key={`${card.id}-${card.blockId}`} className="rounded-xl border border-slate-200 bg-white p-5">
            {/* DER VIERSCHRITT, in dieser Reihenfolge und sichtbar getrennt. */}
            <p className="text-base text-slate-900">{card.observed}</p>
            <p className="mt-2 text-slate-600">{card.meaning}</p>
            <p className="mt-3 font-medium text-slate-900">{card.question}</p>

            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("compare.agreementTitle")}
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                {AGREEMENT_FIELDS.map((field) => (
                  <li key={field}>{field}: ___</li>
                ))}
              </ul>
              {/* „Betrags- und Zeitgrenzen legt das Team fest, nicht der
                  Fragebogen" - deshalb leere Felder und keine Vorschläge. */}
              <p className="mt-2 text-xs text-slate-500">{t("compare.agreementHint")}</p>
            </div>

            <p className="mt-3 text-xs text-slate-400">{card.source}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{t("compare.allTitle")}</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">{t("compare.question")}</th>
                <th className="px-4 py-2 font-medium">{nameA}</th>
                <th className="px-4 py-2 font-medium">{nameB}</th>
              </tr>
            </thead>
            <tbody>
              {result.comparisons.map((entry) => (
                <tr key={entry.blockId} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 text-slate-700">
                    {entry.prompt}
                    {entry.markedBy.length > 0 && (
                      <span className="mt-1 block text-xs text-slate-500">{t("compare.marked")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{cell(entry, entry.a, "a", t)}</td>
                  <td className="px-4 py-3 text-slate-900">{cell(entry, entry.b, "b", t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/**
 * Was in einer Zelle steht.
 *
 * VIER VERSCHIEDENE ZUSTAENDE, und sie duerfen nicht gleich aussehen: nicht
 * geteilt, mit Grund ausgelassen, noch nicht beantwortet, beantwortet. Ein
 * einheitliches „—" waere bequem und wuerde aus einer Entscheidung ein
 * Versaeumnis machen.
 */
function cell(
  comparison: BlockComparison,
  entry: ReadoutEntry | null,
  side: "a" | "b",
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const hidden = comparison.reason === `not_shared_${side}` || comparison.reason === "not_shared_both";
  if (hidden) return <span className="text-slate-500 italic">{t("compare.notShared")}</span>;
  if (!entry) return <span className="text-slate-400">{t("compare.noAnswerYet")}</span>;
  if (!entry.answered) {
    return <span className="text-slate-500">{entry.missing!.label ?? t("compare.noAnswerYet")}</span>;
  }
  return <span>{describe(entry)}</span>;
}

function describe(entry: ReadoutEntry): string {
  const value = entry.value!;
  switch (value.kind) {
    case "category": return value.label;
    case "choice": return value.labels.join(" · ");
    case "text": return value.text;
    case "fields": return value.fields.map((one) => `${one.label}: ${one.text}`).join(" · ");
    case "range": return `${value.min}${value.max != null ? `–${value.max}` : ""} ${value.unit}`;
    case "money": return `${value.min}${value.max != null ? `–${value.max}` : ""} ${value.currency}`;
    case "recipients":
      return value.per.map((one) => `${one.recipient}: ${one.min}${one.max != null ? `–${one.max}` : ""}`).join(" · ");
    case "windows": return value.windows.map((one) => `${one.days.join("/")} ${one.from}–${one.to}`).join(" · ");
    case "date": return value.date;
    case "case":
      return `${value.path.label} — ` + value.concerns.map((one) => `${one.label}: ${one.importance.label}`).join(", ");
  }
}
