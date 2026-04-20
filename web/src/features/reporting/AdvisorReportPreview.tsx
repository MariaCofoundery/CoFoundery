import type { ReactNode } from "react";
import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import {
  FOUNDER_DIMENSION_META,
  getFounderDimensionPoleLabels,
} from "@/features/reporting/founderDimensionMeta";
import type { AdvisorReportPreviewCase } from "@/features/reporting/advisorReportPreviewData";
import type {
  AdvisorClassification,
  AdvisorDimensionAssessment,
  AdvisorReportData,
} from "@/features/reporting/advisor-report/advisorReportTypes";

type Props = {
  preview?: AdvisorReportPreviewCase;
  participantAName?: string;
  participantBName?: string;
  report?: AdvisorReportData;
  title?: string;
  summary?: string | null;
  eyebrow?: string;
  topActions?: ReactNode;
  appendix?: ReactNode;
  debug?: boolean;
};

function formatFlag(value: boolean) {
  return value ? "ja" : "nein";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0]?.slice(0, 1) ?? ""}${parts[1]?.slice(0, 1) ?? ""}`.toUpperCase();
}

function badgeTone(value: AdvisorClassification) {
  if (value === "risk") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "chance") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function scaleTone(value: AdvisorClassification) {
  if (value === "chance") return "border-emerald-200 bg-emerald-50/70 text-emerald-800";
  if (value === "risk") return "border-amber-200 bg-amber-50/80 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function summaryTone(value: AdvisorClassification) {
  if (value === "chance") return "Produktive Differenz";
  if (value === "risk") return "Moderationsrelevant";
  return "Aktuell stabil";
}

function getClassificationTooltip(dimension: AdvisorDimensionAssessment) {
  if (dimension.classification === "chance") {
    return "Unterschied kann produktiv genutzt werden, wenn Rollen, Timing und Entscheidungslogik klar sind.";
  }

  if (dimension.classification === "neutral") {
    return "Aktuell stabil – wenig Spannungsdruck in dieser Dimension.";
  }

  if (dimension.hasSharedBlindSpotRisk) {
    return "Kann auf fehlende Spannung oder blinde Flecken hinweisen – wichtige Perspektiven werden nicht ausreichend hinterfragt.";
  }

  if (
    dimension.jointState === "OPPOSITE" ||
    dimension.intensity === "high" ||
    (typeof dimension.distanceValue === "number" && dimension.distanceValue >= 40)
  ) {
    return "Kann zu Reibung oder blockierten Entscheidungen fuehren, wenn Unterschiede nicht aktiv moderiert werden.";
  }

  return "Unterschied wird relevant, sobald Entscheidungsdruck oder Abstimmungsbedarf steigt.";
}

function ClassificationBadge({
  dimension,
  tone = "default",
}: {
  dimension: AdvisorDimensionAssessment;
  tone?: "default" | "scale";
}) {
  const className = tone === "scale" ? scaleTone(dimension.classification) : badgeTone(dimension.classification);
  const tooltip = getClassificationTooltip(dimension);
  const showBlindSpotHint = dimension.classification === "risk" && dimension.hasSharedBlindSpotRisk;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${className}`}
        title={tooltip}
        aria-label={`${dimension.classification}: ${tooltip}`}
      >
        {dimension.classification}
      </span>
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500"
        title={tooltip}
        aria-hidden="true"
      >
        {showBlindSpotHint ? "!" : "i"}
      </span>
    </span>
  );
}

function stripRepeatedLead(summary: string, title: string) {
  const prefix = `${title}:`;
  return summary.startsWith(prefix) ? summary.slice(prefix.length).trim() : summary;
}

function tightenPreviewCopy(text: string) {
  return text
    .replace("bleibt zu lange unkommentiert", "bleibt lange unkommentiert")
    .replace("wird mehrfach neu bewertet", "wird wiederholt neu aufgerollt")
    .replace("wird mehrfach gefuehrt", "wird wiederholt gefuehrt")
    .replace("wirkt nicht offen gegensaetzlich, aber auch nicht selbsterklaerend deckungsgleich", "ist nicht offen strittig, aber auch nicht klar abgestimmt")
    .replace("nicht selbsterklaerend deckungsgleich", "nicht klar abgestimmt")
    .replace("wird wiederholt neu bewertet", "wird wiederholt neu aufgerollt")
    .replace("kann aber auch", "kann aber")
    .replace("Dadurch werden", "Dadurch wirken")
    .replace("Dadurch koennen", "Dadurch wirken")
    .trim();
}

function shortenStabilityRationale(text: string) {
  return tightenPreviewCopy(
    text
      .replace("Diese Dimension entlastet das Team derzeit, weil ", "")
      .replace("Diese Dimension traegt derzeit, weil ", "")
      .replace("Diese Dimension entlastet das Team, weil ", "")
  );
}

function shortenStabilityConstraint(text: string) {
  return tightenPreviewCopy(
    text
      .replace("Stabil bleibt das nur, solange ", "")
      .replace("Stabil bleibt das nur, wenn ", "")
      .replace("Tragfaehig bleibt das nur, wenn ", "")
  );
}

function renderDebugMeta(dimension: AdvisorDimensionAssessment) {
  return [
    `Priority ${dimension.clusteredPriorityScore}`,
    `Stability ${dimension.stabilityScore}`,
    `Joint ${dimension.jointState ?? "-"}`,
    `Risk ${dimension.riskLevel ?? "-"}`,
    `Blind Spot ${formatFlag(dimension.hasSharedBlindSpotRisk)}`,
  ].join(" · ");
}

function DimensionScaleCard({
  dimension,
  participantAName,
  participantBName,
  debug,
}: {
  dimension: AdvisorDimensionAssessment;
  participantAName: string;
  participantBName: string;
  debug: boolean;
}) {
  const meta = FOUNDER_DIMENSION_META[dimension.dimensionKey];
  const poles = getFounderDimensionPoleLabels(dimension.dimensionKey, "report");

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{meta.shortLabel}</h3>
          <p className="mt-1 text-xs text-slate-500">{summaryTone(dimension.classification)}</p>
        </div>
        <ClassificationBadge dimension={dimension} tone="scale" />
      </div>

      <div className="mt-4">
        <ComparisonScale
          scoreA={dimension.founderAScore}
          scoreB={dimension.founderBScore}
          markerA={initials(participantAName)}
          markerB={initials(participantBName)}
          participantAName={participantAName}
          participantBName={participantBName}
          lowLabel={poles?.left ?? meta.reportLeftPole}
          highLabel={poles?.right ?? meta.reportRightPole}
          valueScale="founder_percent"
          compact
        />
      </div>

      {debug ? (
        <p className="mt-3 font-mono text-[11px] leading-5 text-slate-500">{renderDebugMeta(dimension)}</p>
      ) : null}
    </article>
  );
}

function DimensionInsightCard({
  dimension,
  debug,
}: {
  dimension: AdvisorDimensionAssessment;
  debug: boolean;
}) {
  const meta = FOUNDER_DIMENSION_META[dimension.dimensionKey];

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{meta.canonicalName}</h3>
          <p className="mt-1 text-xs text-slate-500">Intensitaet: {dimension.intensity}</p>
        </div>
        <ClassificationBadge dimension={dimension} />
      </div>

      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
        <div>
          <p className="font-medium text-slate-950">Spannungsrisiko</p>
          <p>{tightenPreviewCopy(dimension.tensionRisk)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-950">Tragfaehigkeit</p>
          <p>{tightenPreviewCopy(dimension.strengthPotential)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-950">Kipppunkt</p>
          <p>{tightenPreviewCopy(dimension.tippingPoint)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-950">Moderationsfrage</p>
          <p>{dimension.moderationQuestion}</p>
        </div>
      </div>

      {debug ? (
        <p className="mt-4 border-t border-slate-200 pt-3 font-mono text-[11px] leading-5 text-slate-500">
          {renderDebugMeta(dimension)}
        </p>
      ) : null}
    </article>
  );
}

export function AdvisorReportPreview({
  preview,
  participantAName: participantANameProp,
  participantBName: participantBNameProp,
  report: reportProp,
  title: titleProp,
  summary: summaryProp,
  eyebrow: eyebrowProp,
  topActions,
  appendix,
  debug = false,
}: Props) {
  const participantAName = preview?.participantAName ?? participantANameProp ?? null;
  const participantBName = preview?.participantBName ?? participantBNameProp ?? null;
  const report = preview?.report ?? reportProp ?? null;
  const title =
    titleProp ??
    (preview ? `${preview.title}: ${preview.participantAName} + ${preview.participantBName}` : null);
  const summary = summaryProp ?? preview?.summary ?? null;
  const eyebrow = eyebrowProp ?? (preview ? "Interne Preview · Advisor Report" : "Advisor Report");

  if (!participantAName || !participantBName || !report) {
    return null;
  }

  return (
    <div className="space-y-8">
      {topActions ? <div>{topActions}</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
          {eyebrow}
        </p>
        {title ? (
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h1>
        ) : null}
        {summary ? (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{summary}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Team-Kurzprofil</p>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-900">
          {report.teamSummary.leadStatement}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {report.teamSummary.topPatternKeys.map((dimension) => (
            <span
              key={dimension}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {dimension}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">6 Dimensionen im Vergleich</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Wo die beiden Founder pro Dimension liegen</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Unterschiede sind nicht automatisch gut oder schlecht: Naehe kann Stabilitaet bringen
              oder blinde Flecken erzeugen. Unterschiede koennen Reibung erzeugen oder produktiv
              wirken. Die Einordnung `risk / chance / neutral` zeigt, wie moderationsrelevant die
              jeweilige Konstellation aktuell ist.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.dimensions.map((dimension) => (
            <DimensionScaleCard
              key={dimension.dimensionKey}
              dimension={dimension}
              participantAName={participantAName}
              participantBName={participantBName}
              debug={debug}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Top 3 Spannungsfelder</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">Priorisierte Moderationsfelder</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {report.topTensions.map((item) => (
            <article key={item.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                <ClassificationBadge
                  dimension={
                    report.dimensions.find((dimension) => dimension.dimensionKey === item.dimensionKey) ??
                    report.dimensions[0]!
                  }
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {tightenPreviewCopy(stripRepeatedLead(item.summary, item.title))}
              </p>
              <dl className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <div>
                  <dt className="font-medium text-slate-950">Kipprisiko</dt>
                  <dd>{tightenPreviewCopy(item.tippingPoint)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-950">Moderationsfrage</dt>
                  <dd>{item.moderationQuestion}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Beobachtungspunkte</p>
          <ul className="mt-4 space-y-3">
            {report.observationPoints.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-950">{tightenPreviewCopy(item.marker)}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {item.dimensionKey}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {tightenPreviewCopy(item.whyItMatters)}
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Interventionen</p>
          <div className="mt-4 space-y-4">
            {report.interventions.map((item) => (
              <div key={item.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                  {debug ? (
                    <span className="font-mono text-xs text-slate-500">{item.priorityScore}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {item.interventionType}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.objective}</p>
                <p className="mt-3 text-sm leading-6 text-slate-900">{item.prompt}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Stabilitaetsfaktoren</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {report.stabilityFactors.map((item) => (
            <div key={item.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                {debug ? (
                  <span className="font-mono text-xs text-slate-500">{item.stabilityScore}</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {shortenStabilityRationale(item.rationale)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Blind Spot: {shortenStabilityConstraint(item.constraintNote)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Vertiefung</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              Detaillierte Lesart je Dimension anzeigen
            </h2>
          </div>
          <span className="text-sm text-slate-500">Optional</span>
        </summary>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.dimensions.map((dimension) => (
            <DimensionInsightCard key={dimension.dimensionKey} dimension={dimension} debug={debug} />
          ))}
        </div>
      </details>
      {appendix}
    </div>
  );
}
