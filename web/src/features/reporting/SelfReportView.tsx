import {
  ACTIONABLE_PLAYBOOK,
  DIMENSION_EXTREMES,
  DIMENSION_INTERPRETATIONS,
} from "@/features/reporting/constants";
import { DIMENSION_DEFINITIONS_DE } from "@/features/reporting/report_texts.de";
import { AlignmentRadarChart } from "@/features/reporting/AlignmentRadarChart";
import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import { ConversationGuide } from "@/features/reporting/ConversationGuide";
import { KeyInsights } from "@/features/reporting/KeyInsights";
import { SelfValuesProfileSection } from "@/features/reporting/SelfValuesProfileSection";
import {
  SELF_DEVELOPMENT_COPY,
  SELF_DIMENSION_COPY,
} from "@/features/reporting/self_report_texts.de";
import {
  REPORT_DIMENSIONS,
  type ReportDimension,
  type SessionAlignmentReport,
} from "@/features/reporting/types";

type Props = {
  report: SessionAlignmentReport;
};

type ScoredDimension = {
  dimension: ReportDimension;
  score: number;
};

export function SelfReportView({ report }: Props) {
  const scoredDimensions = REPORT_DIMENSIONS.map((dimension) => ({
    dimension,
    score: report.scoresA[dimension],
  })).filter((entry): entry is ScoredDimension => entry.score != null);

  const { topDimensions, bottomDimensions } = getTopAndBottomDimensions(report.scoresA);

  const conversationGuideQuestions =
    report.conversationGuideQuestions.length > 0
      ? report.conversationGuideQuestions
      : [...bottomDimensions, ...topDimensions].map(({ dimension }) =>
          selfReflectionQuestionForDimension(dimension)
        );

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Profil-Snapshot (Basis)</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Dein Profil basiert auf den beantworteten Basisfragen und zeigt aktuelle Tendenzen in den
            sechs Entscheidungsdimensionen.
          </p>
          <div className="mt-5">
            <AlignmentRadarChart
              participants={[
                {
                  id: "self",
                  label: report.participantAName || "Du",
                  color: "#00BFA5",
                  scores: report.scoresA,
                },
              ]}
            />
          </div>
        </article>

        <KeyInsights insights={report.keyInsights} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dimensionen im Detail</h3>
        <div className="mt-6 grid gap-5">
          {scoredDimensions.length === 0 ? (
            <article className="rounded-xl border border-slate-200/80 bg-white p-5">
              <p className="text-sm leading-7 text-slate-600">
                Für die Detailinterpretation liegen aktuell noch nicht genügend numerische Antworten vor.
              </p>
            </article>
          ) : null}

          {scoredDimensions.map(({ dimension, score }) => {
            const zone = scoreToZone(score, dimension);
            const profile = resolveDimensionProfile(dimension, score);
            const playbook = ACTIONABLE_PLAYBOOK[dimension][zone];
            const lowLabel = DIMENSION_EXTREMES[dimension].low;
            const highLabel = DIMENSION_EXTREMES[dimension].high;
            const watchBullets = buildDimensionWatchBullets(dimension, playbook.warning, lowLabel, highLabel);

            return (
              <article key={dimension} className="rounded-xl border border-slate-200/80 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold tracking-[0.08em] text-slate-900">
                    {DIMENSION_DEFINITIONS_DE[dimension].name}
                  </h4>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                    {profile.title}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-7 text-slate-700">{dimensionDescription(dimension)}</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  Aktuell zeigt dein Profil hier eine {profile.title}-Tendenz: {profile.text}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{playbook.superpower}</p>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Worauf achten?
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                    {watchBullets.map((bullet) => (
                      <li key={`${dimension}-${bullet}`}>{bullet}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <ComparisonScale
                    scoreA={score}
                    scoreB={null}
                    markerA="Du"
                    markerB=""
                    participantAName={report.participantAName || "Du"}
                    participantBName=""
                    lowLabel={lowLabel}
                    highLabel={highLabel}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Potenzielle Entwicklungsfelder</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Diese Felder basieren auf deinen aktuell niedrigsten zwei Dimensionswerten und geben dir
          pragmatische nächste Schritte für deinen Gründeralltag.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {bottomDimensions.length === 0 ? (
            <article className="rounded-xl border border-slate-200/80 bg-white p-5">
              <p className="text-sm leading-7 text-slate-600">
                Noch nicht genügend Daten für eine belastbare Auswahl von Entwicklungsfeldern.
              </p>
            </article>
          ) : null}

          {bottomDimensions.map(({ dimension }) => {
            const developmentCopy = SELF_DEVELOPMENT_COPY[dimension];
            return (
              <article key={`dev-${dimension}`} className="rounded-xl border border-slate-200/80 bg-white p-5">
                <h4 className="text-sm font-semibold tracking-[0.08em] text-slate-900">
                  {DIMENSION_DEFINITIONS_DE[dimension].name}
                </h4>
                <p className="mt-3 text-sm leading-7 text-slate-700">{developmentCopy.whyItMatters}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Nächste Schritte
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                  {developmentCopy.nextSteps.map((step) => (
                    <li key={`${dimension}-${step}`}>{step}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SelfValuesProfileSection report={report} />

        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Stabile Muster</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Diese Bereiche sind aktuell am stärksten ausgeprägt und können als bewusst eingesetzte
            Führungshebel in deiner Co-Founder-Suche dienen.
          </p>
          <ul className="mt-4 space-y-3">
            {topDimensions.length === 0 ? (
              <li className="text-sm leading-7 text-slate-600">
                Noch nicht genügend Daten für stabile Muster.
              </li>
            ) : (
              topDimensions.map(({ dimension }) => (
                <li key={`top-${dimension}`} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold">{DIMENSION_DEFINITIONS_DE[dimension].name}:</span>{" "}
                  {(() => {
                    const score = report.scoresA[dimension];
                    const zone = score != null ? scoreToZone(score, dimension) : "mid";
                    return ACTIONABLE_PLAYBOOK[dimension][zone].superpower;
                  })()}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="mt-6">
        <ConversationGuide questions={conversationGuideQuestions} enabled mode="self" />
      </div>
    </>
  );
}

function resolveDimensionProfile(dimension: ReportDimension, score: number) {
  const pack = DIMENSION_INTERPRETATIONS[dimension];
  if (score <= 2.5) return pack.low;
  if (score >= 4.5) return pack.high;
  return pack.mid;
}

function scoreToZone(score: number, dimension: ReportDimension): "low" | "mid" | "high" {
  const thresholds = DIMENSION_DEFINITIONS_DE[dimension].thresholds;
  if (score <= thresholds.lowMax) return "low";
  if (score >= thresholds.highMin) return "high";
  return "mid";
}

export function getTopAndBottomDimensions(scoresA: SessionAlignmentReport["scoresA"]) {
  const scored = REPORT_DIMENSIONS.map((dimension) => ({
    dimension,
    score: scoresA[dimension],
  })).filter((entry): entry is ScoredDimension => entry.score != null);

  const topDimensions = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const topSet = new Set(topDimensions.map((entry) => entry.dimension));
  const bottomDimensions = [...scored]
    .sort((a, b) => a.score - b.score)
    .filter((entry) => !topSet.has(entry.dimension))
    .slice(0, 2);

  return {
    topDimensions,
    bottomDimensions,
  };
}

function dimensionDescription(dimension: ReportDimension) {
  return SELF_DIMENSION_COPY[dimension].intro;
}

function selfReflectionQuestionForDimension(dimension: ReportDimension) {
  return SELF_DIMENSION_COPY[dimension].reflectionQuestion;
}

function buildDimensionWatchBullets(
  dimension: ReportDimension,
  warning: string,
  lowLabel: string,
  highLabel: string
) {
  return [
    warning,
    `Reflexionsfrage: ${selfReflectionQuestionForDimension(dimension)}`,
    `Halte die Balance zwischen ${lowLabel} und ${highLabel} bewusst im Blick.`,
  ];
}
