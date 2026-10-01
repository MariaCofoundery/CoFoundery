import { DimensionScale } from "@/features/reporting/DimensionScale";
import { getDimensionOverviewContent } from "@/features/reporting/dimensionOverviewContent";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

type Props = {
  scores: SelfAlignmentReport["scoresA"];
  locale?: string | null;
  /** Fuer den Altbestand: keine Ueberschrift, die „aktuell" sagt. */
  title?: string;
};

export function DimensionOverview({ scores, locale, title }: Props) {
  const overview = getDimensionOverviewContent(scores, locale);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/80 p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {overview.eyebrow}
        </p>
        <h3 className="mt-2 text-base font-semibold text-slate-900">{title ?? overview.title}</h3>
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
    // `min-w-0`: Ein Rasterkind geht von sich aus nicht unter seine
    // Mindestinhaltsbreite. Auf „Das bist du" liegt diese Uebersicht tief
    // verschachtelt, und bei 320 px ragte sie zwei Pixel heraus.
    <article className="min-w-0 rounded-xl border border-slate-200/70 bg-slate-50/55 px-4 py-3">
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
