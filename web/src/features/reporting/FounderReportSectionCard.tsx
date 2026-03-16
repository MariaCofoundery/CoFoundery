import { getFounderDimensionMeta } from "@/features/reporting/founderDimensionMeta";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type StructuredTension = {
  topic: string;
  explanation: string;
};

type FounderReportSectionCardProps = {
  title: string;
  interpretation: string;
  everydaySignals: string;
  potentialTensions: StructuredTension[];
  conversationPrompts: string[];
  scoreA?: number | null;
  scoreB?: number | null;
  founderAName?: string | null;
  founderBName?: string | null;
  fitCategory?: "very_high" | "high" | "mixed" | "low" | "insufficient_data";
  tensionCategory?: "low" | "moderate" | "elevated" | "insufficient_data";
  isComplementaryDynamic?: boolean;
};

export function FounderReportSectionCard({
  title,
  interpretation,
  everydaySignals,
  potentialTensions,
  conversationPrompts,
  scoreA = null,
  scoreB = null,
  founderAName = null,
  founderBName = null,
  fitCategory = "insufficient_data",
  tensionCategory = "insufficient_data",
  isComplementaryDynamic = false,
}: FounderReportSectionCardProps) {
  const showComparisonAxis =
    scoreA != null &&
    scoreB != null &&
    founderAName != null &&
    founderAName.trim().length > 0 &&
    founderBName != null &&
    founderBName.trim().length > 0;

  return (
    <article className="rounded-[30px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Dimension</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{t(title)}</h2>
      {showComparisonAxis ? (
        <DimensionComparisonAxis
          dimension={title}
          scoreA={scoreA}
          scoreB={scoreB}
          founderAName={founderAName}
          founderBName={founderBName}
          fitCategory={fitCategory}
          tensionCategory={tensionCategory}
          isComplementaryDynamic={isComplementaryDynamic}
        />
      ) : null}
      <p className="mt-5 text-sm leading-7 text-slate-700">{t(interpretation)}</p>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
        <h3 className="text-sm font-semibold text-slate-900">So kann sich das im Alltag zeigen</h3>
        <p className="mt-2 text-sm leading-7 text-slate-700">{t(everydaySignals)}</p>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-slate-900">{t("Moegliche Spannungsfelder")}</h3>
          {potentialTensions.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {potentialTensions.map((tension) => (
                <li key={tension.topic} className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">{t(tension.topic)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{t(tension.explanation)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t("Aktuell zeigen sich in dieser Dimension keine hervorzuhebenden Spannungsfelder.")}
            </p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-slate-900">{t("Gespraechsimpulse")}</h3>
          <ul className="mt-3 space-y-3">
            {conversationPrompts.map((prompt, index) => (
              <li key={`${title}-prompt-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm leading-6 text-slate-700">{t(prompt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

function DimensionComparisonAxis({
  dimension,
  scoreA,
  scoreB,
  founderAName,
  founderBName,
  fitCategory,
  tensionCategory,
  isComplementaryDynamic,
}: {
  dimension: string;
  scoreA: number;
  scoreB: number;
  founderAName: string;
  founderBName: string;
  fitCategory: "very_high" | "high" | "mixed" | "low" | "insufficient_data";
  tensionCategory: "low" | "moderate" | "elevated" | "insufficient_data";
  isComplementaryDynamic: boolean;
}) {
  const positionA = markerPosition(scoreA);
  const positionB = markerPosition(scoreB);
  const overlap = Math.abs(positionA - positionB) < 10;
  const poles = spectrumPoles(dimension);
  const tone = qualitativeTone({ fitCategory, tensionCategory, isComplementaryDynamic });

  return (
    <div className={`mt-6 rounded-[24px] border p-5 ${tone.bandClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Spektrum</p>
          <p className={`mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.badgeClass}`}>
            {t(tone.label)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
          <LegendBadge name={founderAName} tone="primary" />
          <LegendBadge name={founderBName} tone="secondary" />
        </div>
      </div>

      <div className="mt-5">
        <div className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="relative h-[96px] overflow-hidden">
            <div className={`absolute left-0 right-0 top-[46px] h-3 rounded-full ${tone.railClass}`} />
            <div className="absolute left-0 right-0 top-[47px] h-[1px] bg-slate-400/60" />
            <div className="absolute left-1/2 top-[35px] h-7 w-px -translate-x-1/2 bg-slate-300" />
            <svg
              viewBox="0 0 100 96"
              className="absolute inset-0 z-20 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <AxisMarker
                position={positionA}
                initials={initials(founderAName)}
                label={founderAName}
                tone="primary"
                overlapOffset={overlap ? -10 : 0}
              />
              <AxisMarker
                position={positionB}
                initials={initials(founderBName)}
                label={founderBName}
                tone="secondary"
                overlapOffset={overlap ? 10 : 0}
              />
            </svg>
          </div>
        </div>

        <div className="mt-5 grid min-h-8 grid-cols-3 gap-2 px-1 text-[11px] text-slate-600">
          <span className="self-start text-left">{t(poles.left)}</span>
          <span className="self-start text-center">{t(poles.mid)}</span>
          <span className="self-start text-right">{t(poles.right)}</span>
        </div>
      </div>
    </div>
  );
}

function AxisMarker({
  position,
  initials,
  label,
  tone,
  overlapOffset,
}: {
  position: number;
  initials: string;
  label: string;
  tone: "primary" | "secondary";
  overlapOffset: number;
}) {
  const markerColor = tone === "primary" ? "#67e8f9" : "#7c3aed";
  const markerTextColor = tone === "primary" ? "#0f172a" : "#ffffff";
  const cy = 48 + overlapOffset;

  return (
    <g>
      <title>{label}</title>
      <circle
        cx={position}
        cy={cy}
        r="7.5"
        fill={markerColor}
        stroke="white"
        strokeWidth="1.8"
      />
      <text
        x={position}
        y={cy + 0.9}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="3.8"
        fontWeight="700"
        fill={markerTextColor}
      >
        {initials}
      </text>
    </g>
  );
}

function LegendBadge({
  name,
  tone,
}: {
  name: string;
  tone: "primary" | "secondary";
}) {
  const dotClass =
    tone === "primary" ? "bg-[color:var(--brand-primary)]" : "bg-[color:var(--brand-accent)]";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
      <span>{name}</span>
    </span>
  );
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function markerPosition(value: number) {
  const clamped = clampScore(value);
  return Math.max(7, Math.min(93, clamped));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function spectrumPoles(dimension: string) {
  const meta = getFounderDimensionMeta(dimension);
  if (!meta) {
    return { left: "", mid: "balanciert", right: "" };
  }

  return {
    left: meta.leftPole,
    mid: meta.centerLabel,
    right: meta.rightPole,
  };
}

function qualitativeTone({
  fitCategory,
  tensionCategory,
  isComplementaryDynamic,
}: {
  fitCategory: "very_high" | "high" | "mixed" | "low" | "insufficient_data";
  tensionCategory: "low" | "moderate" | "elevated" | "insufficient_data";
  isComplementaryDynamic: boolean;
}) {
  if (isComplementaryDynamic) {
    return {
      label: "PRODUKTIVE ERGAENZUNG",
      bandClass: "border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/5",
      railClass: "bg-[color:var(--brand-accent)]/16",
      badgeClass:
        "border border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]",
    };
  }

  if (
    (fitCategory === "very_high" || fitCategory === "high") &&
    (tensionCategory === "low" || tensionCategory === "insufficient_data")
  ) {
    return {
      label: "HOHE PASSUNG",
      bandClass: "border-[color:var(--brand-primary)]/20 bg-[color:var(--brand-primary)]/5",
      railClass: "bg-[color:var(--brand-primary)]/16",
      badgeClass:
        "border border-[color:var(--brand-primary)]/20 bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)]",
    };
  }

  return {
    label: "BRAUCHT BEWUSSTE ABSTIMMUNG",
    bandClass: "border-slate-200/80 bg-slate-50/80",
    railClass: "bg-slate-200",
    badgeClass: "border border-stone-300 bg-stone-100 text-stone-700",
  };
}
