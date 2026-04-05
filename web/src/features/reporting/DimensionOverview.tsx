import {
  FOUNDER_DIMENSION_META,
  FOUNDER_DIMENSION_ORDER,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { DimensionScale } from "@/features/reporting/DimensionScale";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

type Props = {
  scores: SelfAlignmentReport["scoresA"];
};

export function DimensionOverview({ scores }: Props) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/80 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Übersicht</p>
          <h3 className="mt-2 text-base font-semibold text-slate-900">Dein aktueller Stand in 6 Dimensionen</h3>
        </div>
        <p className="max-w-xl text-xs leading-6 text-slate-600">
          Eine kompakte Orientierung über die sechs Felder, die deinen Arbeitsstil im Report tragen.
        </p>
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-4 md:grid-cols-2">
        {FOUNDER_DIMENSION_ORDER.map((dimension) => (
          <DimensionOverviewRow key={dimension} dimension={dimension} score={scores[dimension]} />
        ))}
      </div>
    </section>
  );
}

function DimensionOverviewRow({
  dimension,
  score,
}: {
  dimension: FounderDimensionKey;
  score: number | null;
}) {
  const meta = FOUNDER_DIMENSION_META[dimension];

  return (
    <article className="rounded-xl border border-slate-200/70 bg-slate-50/55 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{meta.shortLabel}</p>
        <span className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
          {score == null ? "offen" : `${Math.round(score)}`}
        </span>
      </div>
      <DimensionScale
        score={score}
        leftLabel={meta.reportLeftPole}
        rightLabel={meta.reportRightPole}
        compact
        showPoleLabels={false}
        className="mt-2"
      />
    </article>
  );
}
