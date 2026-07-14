import { DimensionScale } from "@/features/reporting/DimensionScale";
import { getDimensionOverviewContent } from "@/features/reporting/dimensionOverviewContent";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

type Props = {
  scores: SelfAlignmentReport["scoresA"];
  locale?: string | null;
};

export function DimensionOverview({ scores, locale }: Props) {
  const overview = getDimensionOverviewContent(scores, locale);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/80 p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {overview.eyebrow}
        </p>
        <h3 className="mt-2 text-base font-semibold text-slate-900">{overview.title}</h3>
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-4 md:grid-cols-2">
        {overview.rows.map((row) => (
          <DimensionOverviewRow
            key={row.dimension}
            score={row.score}
            label={row.label}
            leftLabel={row.leftLabel}
            rightLabel={row.rightLabel}
          />
        ))}
      </div>
    </section>
  );
}

function DimensionOverviewRow({
  score,
  label,
  leftLabel,
  rightLabel,
}: {
  score: number | null;
  label: string;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200/70 bg-slate-50/55 px-4 py-3">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <DimensionScale
        score={score}
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        compact
        showPoleLabels
        className="mt-2"
      />
    </article>
  );
}
