import {
  buildFounderDecisionEngine,
  type DecisionCardSeverity,
} from "@/features/reporting/founderDecisionEngine";
import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type { FounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  compareResult: CompareFoundersResult;
  selection: FounderMatchingSelection;
};

const SEVERITY_LABEL: Record<DecisionCardSeverity, string> = {
  critical: "Besonders relevant",
  important: "Wichtig zu klaeren",
  watch: "Im Blick behalten",
};

export function DecisionEngineSection({ compareResult, selection }: Props) {
  const cards = buildFounderDecisionEngine(compareResult, selection);

  if (cards.length === 0) return null;

  return (
    <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.94)_0%,rgba(255,255,255,0.98)_100%)] p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Was das fuer eure Zusammenarbeit bedeutet
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-[30px]">
          {t("Die entscheidenden Klaerungspunkte liegen nicht ueberall, sondern in wenigen Feldern mit echter Folgewirkung.")}
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-[15px] sm:leading-8">
          {t(
            "Diese Felder sind fuer euch nicht nur interessant, sondern entscheidungsrelevant: Hier zeigt sich frueh, ob Richtung, Verantwortung und Zusammenarbeit im selben System laufen."
          )}
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {cards.map((card, index) => {
          const compact = index === 2;

          return (
            <article
              key={card.id}
              className={[
                "rounded-[24px] border border-slate-200/80 bg-white/92",
                compact ? "px-5 py-5 lg:col-span-1" : "px-6 py-6 lg:min-h-[320px]",
              ].join(" ")}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {t(SEVERITY_LABEL[card.severity])}
              </p>
              <h3 className="mt-3 max-w-xl text-xl font-semibold tracking-[-0.02em] text-slate-950">
                {t(card.title)}
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {t(card.interpretation)} {t(card.consequence)}
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">{t("Relevant wird das")}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{t(card.relevanceMoment)}</p>
              <ul className="mt-5 space-y-2.5 text-sm leading-7 text-slate-700">
                {card.clarificationPoints.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-[11px] h-1.5 w-1.5 flex-none rounded-full bg-slate-300" />
                    <span>{t(point)}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
