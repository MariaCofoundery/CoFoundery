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
  result, columnA, columnB,
}: {
  result: AlignmentComparison;
  /**
   * Die Spaltenueberschriften - hier darf "Du" stehen.
   *
   * IN DEN KARTEN NICHT. Die Bausteine aus Teil G sind in der dritten Person
   * geschrieben ("A sagt fuer die kommenden zwoelf Wochen ... zu"). Setzt man
   * dort "Du" ein, entsteht "Du sagt fuer die kommenden zwoelf Wochen" -
   * beim Durchklicken am 28.09.2026 genau so dagestanden. Die Karten bekommen
   * deshalb Namen in der dritten Person, die Tabelle die Anrede.
   */
  columnA: string;
  columnB: string;
}) {
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

        {/* KEINE TABELLE. Am 28.09.2026 beim Durchsehen aufgefallen: Drei
            Spalten mit langen Fragetexten sind auf einem Telefon unlesbar -
            entweder man scrollt seitwaerts oder jede Zelle wird zu einer
            Spalte aus einzelnen Woertern. Als Karten stapelt es sich von
            selbst, und die beiden Antworten stehen auf jedem Bildschirm
            nebeneinander, sobald Platz ist. */}
        <ul className="space-y-3">
          {result.comparisons.map((entry) => (
            <li key={entry.blockId} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-700">{entry.prompt}</p>
              {entry.markedBy.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">{t("compare.marked")}</p>
              )}
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{columnA}</dt>
                  <dd className="mt-1 text-sm text-slate-900">{cell(entry, entry.a, "a", t)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{columnB}</dt>
                  <dd className="mt-1 text-sm text-slate-900">{cell(entry, entry.b, "b", t)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
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
