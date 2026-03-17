import type { ReactNode } from "react";
import { AlignmentRadarChart } from "@/features/reporting/AlignmentRadarChart";
import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import {
  FOUNDER_DIMENSION_ORDER,
  FOUNDER_DIMENSION_META,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { SELF_DEVELOPMENT_COPY, SELF_DIMENSION_COPY } from "@/features/reporting/self_report_texts.de";
import {
  getSelfDimensionTendency,
  getSelfOrientationStrength,
  isMeaningfullyOrientedScore,
} from "@/features/reporting/selfReportScoring";
import { type SelfAlignmentReport, type SelfKeyInsight } from "@/features/reporting/selfReportTypes";
import { SelfValuesProfileSection } from "@/features/reporting/SelfValuesProfileSection";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  report: SelfAlignmentReport;
};

type ScoredDimension = {
  dimension: FounderDimensionKey;
  score: number;
  orientationStrength: number;
};

const RADAR_LABELS = Object.fromEntries(
  FOUNDER_DIMENSION_ORDER.map((dimension) => [dimension, FOUNDER_DIMENSION_META[dimension].shortLabel])
) as Record<FounderDimensionKey, string>;

export function SelfReportView({ report }: Props) {
  const markerLabel = buildMarkerLabel(report.participantAName);
  const scoredDimensions = FOUNDER_DIMENSION_ORDER.map((dimension) => {
    const score = report.scoresA[dimension];
    if (score == null) return null;

    return {
      dimension,
      score,
      orientationStrength: getSelfOrientationStrength(score) ?? 0,
    };
  }).filter((entry): entry is ScoredDimension => entry != null);

  const { topDimensions, bottomDimensions, isBalancedProfile } = getTopAndBottomDimensions(report.scoresA);
  const displayedInsights = buildDisplayedInsights(report.keyInsights, report.scoresA);
  const complementParagraph = buildComplementParagraph(topDimensions, report.scoresA);
  const selfReflectionQuestions = buildSelfReflectionQuestions({
    topDimensions,
    bottomDimensions,
    displayedInsights,
    hasValuesProfile: Boolean(report.selfValuesProfile),
  });
  const coFounderConversationQuestions = buildCoFounderConversationQuestions({
    topDimensions,
    bottomDimensions,
    displayedInsights,
    hasValuesProfile: Boolean(report.selfValuesProfile),
  });

  return (
    <>
      <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">1. Einstieg / Orientierung</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Dein aktuelles Founder-Profil</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {t(
                "Dieser Report zeigt, welche Muster in deinen Gründerentscheidungen aktuell sichtbar werden. Er beschreibt keine festen Eigenschaften, sondern beobachtbare Präferenzen in Strategie, Entscheidungen und Zusammenarbeit."
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge label="Basisprofil abgeschlossen" tone="neutral" />
              <StatusBadge
                label={
                  report.valuesModuleStatus === "completed"
                    ? "Werteprofil abgeschlossen"
                    : report.valuesModuleStatus === "in_progress"
                      ? "Werteprofil in Bearbeitung"
                      : "Werteprofil optional"
                }
                tone={report.valuesModuleStatus === "completed" ? "accent" : "soft"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">2. Profil-Snapshot</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Radar der sechs Founder-Dimensionen</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {t(
                "Das Profil zeigt deine aktuelle Tendenz in sechs Founder-Dimensionen. Unterschiede zwischen Foundern sind hier keine Stärke oder Schwäche, sondern unterschiedliche Arbeits- und Entscheidungslogiken."
              )}
            </p>
            <div className="mt-5">
              <AlignmentRadarChart
                participants={[
                  {
                    id: "self",
                    label: report.participantAName || "Du",
                    color: "#00B8D9",
                    scores: report.scoresA,
                  },
                ]}
                dimensions={FOUNDER_DIMENSION_ORDER}
                labels={RADAR_LABELS}
                valueScale="founder_percent"
              />
            </div>
          </div>

          <div className="card-block rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 print:rounded-xl print:border print:border-slate-200 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Aktuelle Orientierung
            </p>
            <ul className="mt-4 space-y-3">
              {topDimensions.length === 0 ? (
                <li className="text-sm leading-7 text-slate-600">
                  {t(
                    isBalancedProfile
                      ? "Dein Profil bleibt über mehrere Founder-Dimensionen hinweg vergleichsweise ausgewogen. Es zeigt eher Balance als einen einzelnen dominanten Schwerpunkt."
                      : "Noch nicht genügend Antworten für eine belastbare Einordnung."
                  )}
                </li>
              ) : (
                topDimensions.map(({ dimension }) => {
                  const tendency = getSelfDimensionTendency(dimension, report.scoresA[dimension]);
                  return (
                    <li
                      key={`top-${dimension}`}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      <span className="font-semibold">{FOUNDER_DIMENSION_META[dimension].canonicalName}:</span>{" "}
                      {t(tendency?.label ?? FOUNDER_DIMENSION_META[dimension].centerLabel)}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">3. Zentrale Profil-Insights</p>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Drei Bereiche, die dein Profil aktuell besonders prägen</h3>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {displayedInsights.map((insight) => {
            const shortLabel =
              insight.dimension === "profile"
                ? "Profilbild"
                : FOUNDER_DIMENSION_META[insight.dimension].shortLabel;

            return (
              <article key={`${insight.dimension}-${insight.priority}`} className="card-block rounded-xl border border-slate-200/80 bg-white p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {shortLabel}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{t(insight.text)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">4. Dimensionen im Detail</p>
        <div className="mt-6 grid gap-5">
          {scoredDimensions.length === 0 ? (
            <article className="card-block rounded-xl border border-slate-200/80 bg-white p-5">
              <p className="text-sm leading-7 text-slate-600">
                {t("Fuer die Detailinterpretation liegen aktuell noch nicht genuegend numerische Antworten vor.")}
              </p>
            </article>
          ) : null}

          {scoredDimensions.map(({ dimension, score }) => {
            const meta = FOUNDER_DIMENSION_META[dimension];
            const tendency = getSelfDimensionTendency(dimension, score);
            const tendencyText = resolveTendencyText(dimension, tendency?.tendency ?? "center");

            return (
              <article key={dimension} className="card-block rounded-xl border border-slate-200/80 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-slate-900">{meta.canonicalName}</h4>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                    {t(tendency?.label ?? meta.centerLabel)}
                  </span>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div>
                    <SectionBlock
                      title="Die Dimension"
                      content={<p className="text-sm leading-7 text-slate-700">{t(SELF_DIMENSION_COPY[dimension].intro)}</p>}
                    />

                    <SectionBlock
                      title="Deine aktuelle Tendenz"
                      content={<p className="text-sm leading-7 text-slate-700">{t(tendencyText)}</p>}
                      variant="emphasis"
                      className="mt-5"
                    />

                    <SectionBlock
                      title="Im Gründeralltag zeigt sich das vor allem hier"
                      content={
                        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                          {SELF_DIMENSION_COPY[dimension].everydaySignals.map((signal) => (
                            <li key={`${dimension}-${signal}`}>{t(signal)}</li>
                          ))}
                        </ul>
                      }
                      className="mt-5"
                    />
                  </div>

                  <div className="card-block rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 print:rounded-xl print:border print:border-slate-200 print:bg-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Verortung</p>
                    <div className="mt-4">
                      <ComparisonScale
                        scoreA={score}
                        scoreB={null}
                        markerA={markerLabel}
                        markerB=""
                        participantAName={report.participantAName || "Du"}
                        participantBName=""
                        lowLabel={t(meta.leftPole)}
                        highLabel={t(meta.rightPole)}
                        valueScale="founder_percent"
                      />
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      Warum das relevant ist
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {t(SELF_DEVELOPMENT_COPY[dimension].whyItMatters)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {t("5. Wo du andere Founder besonders gut ergaenzt")}
        </p>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">{t("Typische Ergaenzungen zu deinem Profil")}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{t(complementParagraph)}</p>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("6. Bereiche für bewusste Klärung")}</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          {t(
            "In diesen Bereichen lohnt es sich besonders, früh klare Erwartungen zu formulieren. Es geht nicht um Schwächen, sondern um Themen, bei denen spätere Zusammenarbeit schnell von expliziter Abstimmung profitiert."
          )}
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {bottomDimensions.length === 0 ? (
            <article className="card-block rounded-xl border border-slate-200/80 bg-white p-5">
              <p className="text-sm leading-7 text-slate-600">
                  {t(
                    isBalancedProfile
                      ? "Dein Profil wirkt aktuell eher ausgewogen. Statt einzelner klarer Klärungsfelder lohnt sich vor allem, in realen Entscheidungssituationen früh zu benennen, welche Priorität dir dann am wichtigsten ist."
                      : "Noch nicht genügend Daten für eine belastbare Auswahl von Klärungsfeldern."
                  )}
                </p>
              </article>
          ) : null}

          {bottomDimensions.map(({ dimension }) => {
            const developmentCopy = SELF_DEVELOPMENT_COPY[dimension];
            return (
              <article key={`dev-${dimension}`} className="card-block rounded-xl border border-slate-200/80 bg-white p-5">
                <h4 className="text-sm font-semibold text-slate-900">{FOUNDER_DIMENSION_META[dimension].canonicalName}</h4>
                <p className="mt-3 text-sm leading-7 text-slate-700">{t(firstSentence(developmentCopy.whyItMatters))}</p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                  {developmentCopy.nextSteps.slice(0, 2).map((step) => (
                    <li key={`${dimension}-${step}`}>{t(step)}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("7. Werteprofil")}</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          {t(
            "Während dein Basisprofil zeigt, wie du strategisch arbeitest, beschreibt dein Werteprofil, welche inneren Prioritäten deine Entscheidungen zusätzlich prägen."
          )}
        </p>
        <div className="mt-6">
          <SelfValuesProfileSection report={report} />
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("8. Reflexionsfragen für dein Founder-Profil")}</p>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">{t("Strategische Reflexionsfragen für dich als Founder")}</h3>
        <div className="mt-6 space-y-6">
          <div className="card-block rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{t("Reflexionsfragen für dich selbst")}</p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-slate-700">
              {selfReflectionQuestions.map((question) => (
                <li key={question}>{t(question)}</li>
              ))}
            </ul>
          </div>

          <div className="card-block rounded-xl border border-slate-200 bg-slate-50/70 p-5 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              {t("Reflexionsfragen für Gespräche mit potenziellen Co-Foundern")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {t(
                "Diese Fragen helfen dir, dein Profil nicht nur für dich selbst zu schärfen, sondern in frühen Founder-Gesprächen schneller auf reale Unterschiede in Entscheidungen, Zusammenarbeit und Erwartungen zu kommen."
              )}
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-slate-700">
              {coFounderConversationQuestions.map((question) => (
                <li key={question}>{t(question)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

export function getTopAndBottomDimensions(scoresA: SelfAlignmentReport["scoresA"]) {
  const scored = FOUNDER_DIMENSION_ORDER.map((dimension) => {
    const score = scoresA[dimension];
    if (score == null) return null;

    return {
      dimension,
      score,
      orientationStrength: getSelfOrientationStrength(score) ?? 0,
    };
  }).filter((entry): entry is ScoredDimension => entry != null);

  const topDimensions = [...scored]
    .filter((entry) => isMeaningfullyOrientedScore(entry.score))
    .sort((left, right) => right.orientationStrength - left.orientationStrength)
    .slice(0, 2);

  const topSet = new Set(topDimensions.map((entry) => entry.dimension));
  const bottomDimensions = [...scored]
    .sort((left, right) => left.orientationStrength - right.orientationStrength)
    .filter((entry) => !topSet.has(entry.dimension))
    .filter((entry) => !isMeaningfullyOrientedScore(entry.score))
    .slice(0, 3);

  return {
    topDimensions,
    bottomDimensions,
    isBalancedProfile: scored.length > 0 && topDimensions.length === 0,
  };
}

function buildDisplayedInsights(
  insights: SelfKeyInsight[],
  scores: SelfAlignmentReport["scoresA"]
): SelfKeyInsight[] {
  return insights.slice(0, 3).map((insight, index) => {
    if (insight.dimension === "profile") {
      return insight;
    }

    const meta = FOUNDER_DIMENSION_META[insight.dimension];
    const tendency = getSelfDimensionTendency(insight.dimension, scores[insight.dimension]);

    if (insight.title.toLowerCase().includes("bewusst")) {
      return {
        ...insight,
        text: `In ${meta.shortLabel.toLowerCase()} lohnt sich für dich frühe Klärung besonders. Gerade in späteren Teamkonstellationen hilft es, Erwartungen hier nicht still vorauszusetzen, sondern bewusst zu benennen.`,
      };
    }

    if (index === 0) {
      return {
        ...insight,
        text:
          tendency?.tendency === "center"
            ? `In ${meta.shortLabel.toLowerCase()} wirkst du derzeit vergleichsweise balanciert. Das kann in Teams stabilisierend wirken, weil du unterschiedliche Perspektiven oft gut einordnen kannst.`
            : `In ${meta.shortLabel.toLowerCase()} gibst du Teams häufig eine klare Linie. Diese Präferenz kann besonders dann wertvoll sein, wenn in dynamischen Phasen Richtung und Tempo gebraucht werden.`,
      };
    }

    if (index === 1) {
      return {
        ...insight,
        text:
          tendency?.tendency === "center"
            ? `Gerade in der Zusammenarbeit kann diese ausgewogene Haltung hilfreich sein, weil du nicht sofort auf einen Extrempol festgelegt wirkst. Entscheidend ist dann, in wichtigen Situationen trotzdem früh Position zu beziehen.`
            : `In Teamdynamiken wird diese Tendenz oft schnell sichtbar. Sie kann produktiv sein, wenn andere Founder eine komplementäre Perspektive einbringen und ihr früh klärt, wann mehr Gegenperspektive sinnvoll ist.`,
      };
    }

    return {
      ...insight,
      text:
        tendency?.tendency === "center"
          ? `In ${meta.shortLabel.toLowerCase()} wirkst du derzeit vergleichsweise ausgewogen. Das schafft Anschlussfähigkeit, braucht aber in wichtigen Momenten bewusste Priorisierung.`
          : `In ${meta.shortLabel.toLowerCase()} tendierst du aktuell eher zu ${tendency?.label ?? meta.centerLabel}. Im Gründeralltag kann das Teams klare Orientierung geben. Wichtig ist jedoch, früh zu klären, wann es in diesem Feld mehr Gegenperspektive oder bewusstere Abstimmung braucht.`,
    };
  });
}

function buildComplementParagraph(
  topDimensions: Array<{ dimension: FounderDimensionKey; score: number; orientationStrength: number }>,
  scores: SelfAlignmentReport["scoresA"]
) {
  const [primary, secondary] = topDimensions;
  if (!primary) {
    return "Sobald mehr Antworten vorliegen, laesst sich belastbarer einordnen, welche Founder-Profile dein eigenes Profil besonders gut ergaenzen koennen.";
  }

  const primaryMeta = FOUNDER_DIMENSION_META[primary.dimension];
  const primaryTendency = getSelfDimensionTendency(primary.dimension, scores[primary.dimension]);
  const secondaryMeta = secondary ? FOUNDER_DIMENSION_META[secondary.dimension] : null;

  const counterpart =
    primaryTendency?.tendency === "right"
      ? primaryMeta.leftPole
      : primaryTendency?.tendency === "left"
        ? primaryMeta.rightPole
        : "komplementaere Gegenperspektiven";

  if (!secondaryMeta) {
    return `Founder mit deinem Profil ergänzen oft besonders gut Personen, die in ${primaryMeta.shortLabel.toLowerCase()} stärker ${counterpart} arbeiten. In solchen Konstellationen entsteht häufig eine produktive Balance zwischen deiner klaren Präferenz und einer zweiten Perspektive, die Entscheidungen im Alltag stabiler macht.`;
  }

  return `Founder mit deinem Profil ergaenzen oft besonders gut Personen, die in ${primaryMeta.shortLabel.toLowerCase()} staerker ${counterpart} arbeiten und in ${secondaryMeta.shortLabel.toLowerCase()} eine andere Arbeitslogik einbringen. Gerade dort kann aus Unterschiedlichkeit produktive Spannung entstehen, wenn Rollen, Entscheidungsregeln und Erwartungen frueh geklaert sind.`;
}

function resolveTendencyText(dimension: FounderDimensionKey, tendency: "left" | "center" | "right") {
  return SELF_DIMENSION_COPY[dimension].tendency[tendency];
}

function buildSelfReflectionQuestions(input: {
  topDimensions: Array<{ dimension: FounderDimensionKey; score: number; orientationStrength: number }>;
  bottomDimensions: Array<{ dimension: FounderDimensionKey; score: number; orientationStrength: number }>;
  displayedInsights: SelfKeyInsight[];
  hasValuesProfile: boolean;
}) {
  const primary = input.topDimensions[0]?.dimension ?? "Vision & Unternehmenshorizont";
  const secondary = input.topDimensions[1]?.dimension ?? "Entscheidungslogik";
  const clarification = input.bottomDimensions[0]?.dimension ?? "Arbeitsstruktur & Zusammenarbeit";
  const primaryMeta = FOUNDER_DIMENSION_META[primary];
  const secondaryMeta = FOUNDER_DIMENSION_META[secondary];
  const clarificationMeta = FOUNDER_DIMENSION_META[clarification];

  const questions = [
    `Welche Entscheidung wuerde heute am deutlichsten zeigen, welche Haltung du in ${primaryMeta.shortLabel.toLowerCase()} wirklich in ein Unternehmen einbringen willst?`,
    `Wo hilft dir deine aktuelle Tendenz in ${secondaryMeta.shortLabel.toLowerCase()} im Alltag wirklich weiter und wo macht sie Entscheidungen eher einseitig?`,
    `Welche Erwartung in ${clarificationMeta.shortLabel.toLowerCase()} solltest du kuenftig frueher aussprechen, statt darauf zu hoffen, dass andere Founder sie von selbst verstehen?`,
    input.hasValuesProfile
      ? "Welche deiner inneren Prioritaeten beeinflusst wichtige Founder-Entscheidungen staerker, als es im Alltag auf den ersten Blick sichtbar ist?"
      : `Welche Art von Co-Founder wuerde deine aktuelle Orientierung sinnvoll ergaenzen, ohne dass du deine klare Haltung in ${primaryMeta.shortLabel.toLowerCase()} verwässerst?`,
  ];

  return uniqueQuestions(questions).slice(0, 4);
}

function buildCoFounderConversationQuestions(input: {
  topDimensions: Array<{ dimension: FounderDimensionKey; score: number; orientationStrength: number }>;
  bottomDimensions: Array<{ dimension: FounderDimensionKey; score: number; orientationStrength: number }>;
  displayedInsights: SelfKeyInsight[];
  hasValuesProfile: boolean;
}) {
  const primary = input.topDimensions[0]?.dimension ?? "Entscheidungslogik";
  const secondary = input.topDimensions[1]?.dimension ?? "Risikoorientierung";
  const clarification = input.bottomDimensions[0]?.dimension ?? "Commitment";
  const secondClarification = input.bottomDimensions[1]?.dimension ?? "Konfliktstil";
  const primaryMeta = FOUNDER_DIMENSION_META[primary];
  const secondaryMeta = FOUNDER_DIMENSION_META[secondary];
  const clarificationMeta = FOUNDER_DIMENSION_META[clarification];
  const secondClarificationMeta = FOUNDER_DIMENSION_META[secondClarification];

  const questions = [
    `Welche Entscheidung unter Unsicherheit wuerde bei uns sofort zeigen, ob wir in ${primaryMeta.shortLabel.toLowerCase()} wirklich gut zusammenarbeiten koennen?`,
    `Wie unterschiedlich wuerden wir bei Risiko, Tempo oder Chancen in ${secondaryMeta.shortLabel.toLowerCase()} handeln und woran wuerden wir das frueh merken?`,
    `Welche konkreten Erwartungen an ${clarificationMeta.shortLabel.toLowerCase()} sollten wir vor einer Zusammenarbeit offen aussprechen, damit spaeter kein stiller Konflikt entsteht?`,
    input.hasValuesProfile
      ? `Wenn Druck entsteht: Woran wuerden wir merken, dass nicht nur Arbeitsstile, sondern auch unterschiedliche innere Prioritaeten in ${secondClarificationMeta.shortLabel.toLowerCase()} aufeinanderprallen?`
      : `Wie wuerden wir Spannungen oder Irritationen in ${secondClarificationMeta.shortLabel.toLowerCase()} konkret ansprechen, bevor daraus persoenliche Reibung wird?`,
  ];

  return uniqueQuestions(questions).slice(0, 4);
}

function uniqueQuestions(questions: string[]) {
  return [...new Set(questions.map((question) => question.trim()).filter(Boolean))];
}

function buildMarkerLabel(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "DU";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function firstSentence(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^.*?[.!?](?:\s|$)/);
  return match?.[0]?.trim() ?? trimmed;
}

function SectionBlock({
  title,
  content,
  variant = "default",
  className = "",
}: {
  title: string;
  content: ReactNode;
  variant?: "default" | "emphasis";
  className?: string;
}) {
  const shellClass =
    variant === "emphasis"
      ? "rounded-2xl border border-[color:var(--brand-primary)]/22 bg-[linear-gradient(135deg,rgba(34,211,238,0.1),rgba(255,255,255,0.98))] px-5 py-5 shadow-[0_10px_28px_rgba(34,211,238,0.08)]"
      : "";
  const titleClass =
    variant === "emphasis"
      ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900"
      : "text-xs font-semibold uppercase tracking-[0.12em] text-slate-600";
  const contentClass = variant === "emphasis" ? "mt-3 text-[15px] leading-7 text-slate-800" : "mt-3";

  return (
    <div className={`${shellClass} ${className}`.trim()}>
      <p className={titleClass}>{t(title)}</p>
      <div className={contentClass}>{content}</div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "neutral" | "accent" | "soft" }) {
  const className =
    tone === "accent"
      ? "border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 text-slate-700"
      : tone === "soft"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${className}`}>
      {t(label)}
    </span>
  );
}
