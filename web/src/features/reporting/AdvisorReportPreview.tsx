import type { ReactNode } from "react";
import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import {
  getFounderDimensionPoleLabels,
  getLocalizedFounderDimensionMeta,
} from "@/features/reporting/founderDimensionMeta";
import type { AdvisorReportPreviewCase } from "@/features/reporting/advisorReportPreviewData";
import type {
  AdvisorClassification,
  AdvisorDimensionAssessment,
  AdvisorReportData,
} from "@/features/reporting/advisor-report/advisorReportTypes";
import { normalizeLocale, type AppLocale } from "@/i18n/config";

export type AdvisorReportPreviewCopy = {
  teamProfile: string;
  dimensionsEyebrow: string;
  dimensionsTitle: string;
  dimensionsText: string;
  conversationTopicsEyebrow: string;
  conversationTopicsTitle: string;
  observations: string;
  conversationPrompts: string;
  additionalContext: string;
  details: string;
  detailsTitle: string;
  optional: string;
  intensity: string;
  intensityLow: string;
  intensityMedium: string;
  intensityHigh: string;
  observation: string;
  possibleContribution: string;
  revisitWhen: string;
  conversationQuestion: string;
  responseContext: string;
  reviewTogether: string;
  classificationContext: string;
  keepInMind: string;
  internalPreview: string;
};

const DEFAULT_PREVIEW_COPY: AdvisorReportPreviewCopy = {
  teamProfile: "Team-Kurzprofil",
  dimensionsEyebrow: "6 Dimensionen im Vergleich",
  dimensionsTitle: "Die Angaben beider Founder je Dimension",
  dimensionsText: "Die Darstellung beschreibt Unterschiede und Ähnlichkeiten als Ausgangspunkt für ein gemeinsames Gespräch.",
  conversationTopicsEyebrow: "Gesprächsthemen",
  conversationTopicsTitle: "Themen für die gemeinsame Betrachtung",
  observations: "Beobachtungspunkte",
  conversationPrompts: "Gesprächsimpulse",
  additionalContext: "Zusätzlicher Kontext",
  details: "Vertiefung",
  detailsTitle: "Weitere Angaben je Dimension anzeigen",
  optional: "Optional",
  intensity: "Ausprägung",
  intensityLow: "geringer Abstand",
  intensityMedium: "mittlerer Abstand",
  intensityHigh: "größerer Abstand",
  observation: "Beobachtung",
  possibleContribution: "Möglicher Beitrag",
  revisitWhen: "Erneut betrachten, wenn",
  conversationQuestion: "Gesprächsfrage",
  responseContext: "Gesprächskontext",
  reviewTogether: "Gemeinsam betrachten",
  classificationContext: "Diese Einordnung dient als Gesprächsanlass und bewertet nicht die Qualität des Teams.",
  keepInMind: "Im Blick behalten",
  internalPreview: "Interne Vorschau · Advisor-Report",
};

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
  locale?: string;
  copy?: AdvisorReportPreviewCopy;
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
  void value;
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function scaleTone(value: AdvisorClassification) {
  void value;
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function ClassificationBadge({
  dimension,
  copy,
  tone = "default",
}: {
  dimension: AdvisorDimensionAssessment;
  copy: AdvisorReportPreviewCopy;
  tone?: "default" | "scale";
}) {
  const className = tone === "scale" ? scaleTone(dimension.classification) : badgeTone(dimension.classification);
  const tooltip = copy.classificationContext;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${className}`}
        title={tooltip}
        aria-label={tooltip}
      >
        {copy.reviewTogether}
      </span>
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500"
        title={tooltip}
        aria-hidden="true"
      >
        i
      </span>
    </span>
  );
}

function stripRepeatedLead(summary: string, title: string) {
  const prefix = `${title}:`;
  return summary.startsWith(prefix) ? summary.slice(prefix.length).trim() : summary;
}

function tightenPreviewCopy(text: string) {
  return text.trim();
}

function shortenStabilityRationale(text: string) {
  return tightenPreviewCopy(text);
}

function shortenStabilityConstraint(text: string) {
  return tightenPreviewCopy(text);
}

function intensityLabel(
  intensity: AdvisorDimensionAssessment["intensity"],
  copy: AdvisorReportPreviewCopy
) {
  if (intensity === "high") return copy.intensityHigh;
  if (intensity === "medium") return copy.intensityMedium;
  return copy.intensityLow;
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
  locale,
  copy,
}: {
  dimension: AdvisorDimensionAssessment;
  participantAName: string;
  participantBName: string;
  debug: boolean;
  locale: AppLocale;
  copy: AdvisorReportPreviewCopy;
}) {
  const meta = getLocalizedFounderDimensionMeta(dimension.dimensionKey, locale)!;
  const poles = getFounderDimensionPoleLabels(dimension.dimensionKey, "report", locale);

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{meta.shortLabel}</h3>
          <p className="mt-1 text-xs text-slate-500">{copy.responseContext}</p>
        </div>
        <ClassificationBadge dimension={dimension} copy={copy} tone="scale" />
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
  locale,
  copy,
}: {
  dimension: AdvisorDimensionAssessment;
  debug: boolean;
  locale: AppLocale;
  copy: AdvisorReportPreviewCopy;
}) {
  const meta = getLocalizedFounderDimensionMeta(dimension.dimensionKey, locale)!;

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{meta.label}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {copy.intensity}: {intensityLabel(dimension.intensity, copy)}
          </p>
        </div>
        <ClassificationBadge dimension={dimension} copy={copy} />
      </div>

      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
        <div>
          <p className="font-medium text-slate-950">{copy.observation}</p>
          <p>{tightenPreviewCopy(dimension.tensionRisk)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-950">{copy.possibleContribution}</p>
          <p>{tightenPreviewCopy(dimension.strengthPotential)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-950">{copy.revisitWhen}</p>
          <p>{tightenPreviewCopy(dimension.tippingPoint)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-950">{copy.conversationQuestion}</p>
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
  locale: localeProp = "de",
  copy: copyProp,
}: Props) {
  const locale = normalizeLocale(localeProp);
  const copy = copyProp ?? DEFAULT_PREVIEW_COPY;
  const participantAName = preview?.participantAName ?? participantANameProp ?? null;
  const participantBName = preview?.participantBName ?? participantBNameProp ?? null;
  const report = preview?.report ?? reportProp ?? null;
  const title =
    titleProp ??
    (preview ? `${preview.title}: ${preview.participantAName} + ${preview.participantBName}` : null);
  const summary = summaryProp ?? preview?.summary ?? null;
  const eyebrow = eyebrowProp ?? (preview ? copy.internalPreview : "Advisor Report");

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
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{copy.teamProfile}</p>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-900">
          {report.teamSummary.leadStatement}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {report.teamSummary.topPatternKeys.map((dimension) => (
            <span
              key={dimension}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {getLocalizedFounderDimensionMeta(dimension, locale)?.label ?? dimension}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{copy.dimensionsEyebrow}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">{copy.dimensionsTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {copy.dimensionsText}
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
              locale={locale}
              copy={copy}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{copy.conversationTopicsEyebrow}</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">{copy.conversationTopicsTitle}</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {report.topTensions.map((item) => (
            <article key={item.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  {getLocalizedFounderDimensionMeta(item.dimensionKey, locale)?.label ?? item.title}
                </h3>
                <ClassificationBadge
                  dimension={
                    report.dimensions.find((dimension) => dimension.dimensionKey === item.dimensionKey) ??
                    report.dimensions[0]!
                  }
                  copy={copy}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {tightenPreviewCopy(stripRepeatedLead(item.summary, item.title))}
              </p>
              <dl className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <div>
                  <dt className="font-medium text-slate-950">{copy.revisitWhen}</dt>
                  <dd>{tightenPreviewCopy(item.tippingPoint)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-950">{copy.conversationQuestion}</dt>
                  <dd>{item.moderationQuestion}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{copy.observations}</p>
          <ul className="mt-4 space-y-3">
            {report.observationPoints.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-950">{tightenPreviewCopy(item.marker)}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {getLocalizedFounderDimensionMeta(item.dimensionKey, locale)?.label ?? item.dimensionKey}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {tightenPreviewCopy(item.whyItMatters)}
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{copy.conversationPrompts}</p>
          <div className="mt-4 space-y-4">
            {report.interventions.map((item) => (
              <div key={item.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                  {debug ? (
                    <span className="font-mono text-xs text-slate-500">{item.priorityScore}</span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.objective}</p>
                <p className="mt-3 text-sm leading-6 text-slate-900">{item.prompt}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{copy.additionalContext}</p>
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
                {copy.keepInMind}: {shortenStabilityConstraint(item.constraintNote)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{copy.details}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              {copy.detailsTitle}
            </h2>
          </div>
          <span className="text-sm text-slate-500">{copy.optional}</span>
        </summary>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.dimensions.map((dimension) => (
            <DimensionInsightCard
              key={dimension.dimensionKey}
              dimension={dimension}
              debug={debug}
              locale={locale}
              copy={copy}
            />
          ))}
        </div>
      </details>
      {appendix}
    </div>
  );
}
