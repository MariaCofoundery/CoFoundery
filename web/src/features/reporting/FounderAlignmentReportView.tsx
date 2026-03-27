import Link from "next/link";
import { type CSSProperties } from "react";
import { type FounderAlignmentReport } from "@/features/reporting/buildFounderAlignmentReport";
import { getFounderDimensionMeta } from "@/features/reporting/founderDimensionMeta";
import { FounderReportRadar } from "@/features/reporting/FounderReportRadar";
import { FounderReportSectionCard } from "@/features/reporting/FounderReportSectionCard";
import { FounderTeamDynamicMap } from "@/features/reporting/FounderTeamDynamicMap";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import {
  normalizeDimensionName,
  type TeamScoringResult,
} from "@/features/scoring/founderScoring";

type Props = {
  invitationId?: string | null;
  report: FounderAlignmentReport;
  scoringResult: TeamScoringResult;
  founderAName: string | null;
  founderBName: string | null;
  workbookHref: string;
  backHref?: string | null;
};

function reportContextMeta(teamContext: FounderAlignmentReport["teamContext"]) {
  if (teamContext === "existing_team") {
    return {
      badge: "Bestehendes Gründerteam",
    };
  }

  return {
    badge: "Mögliche Gründungspartnerschaft",
  };
}

function radarLabel(dimension: string) {
  return getFounderDimensionMeta(dimension)?.shortLabel ?? dimension;
}

function buildRadarSummaryGroups(
  dimensions: Array<{
    dimension: string;
    fitCategory: "very_high" | "high" | "mixed" | "low" | "insufficient_data";
    tensionCategory: "low" | "moderate" | "elevated" | "insufficient_data";
    isComplementaryDynamic: boolean;
    hasHiddenDifferences: boolean;
  }>
) {
  const hiddenDifferences = dimensions
    .filter((dimension) => dimension.hasHiddenDifferences)
    .map((dimension) => dimension.dimension);

  const highPassung = dimensions
    .filter(
      (dimension) =>
        !dimension.hasHiddenDifferences &&
        !dimension.isComplementaryDynamic &&
        (dimension.fitCategory === "very_high" || dimension.fitCategory === "high") &&
        (dimension.tensionCategory === "low" || dimension.tensionCategory === "insufficient_data")
    )
    .map((dimension) => dimension.dimension);

  const productiveErgaenzung = dimensions
    .filter((dimension) => dimension.isComplementaryDynamic)
    .map((dimension) => dimension.dimension);

  const bewussteAbstimmung = dimensions
    .filter(
      (dimension) =>
        !dimension.isComplementaryDynamic &&
        !dimension.hasHiddenDifferences &&
        (dimension.tensionCategory === "moderate" ||
          dimension.tensionCategory === "elevated" ||
          dimension.fitCategory === "mixed" ||
          dimension.fitCategory === "low")
    )
    .map((dimension) => dimension.dimension);

  return [
    {
      title: "Verdeckte Unterschiede",
      dimensions: hiddenDifferences,
    },
    {
      title: "Hohe Passung",
      dimensions: highPassung,
    },
    {
      title: "Produktive Ergänzung",
      dimensions: productiveErgaenzung,
    },
    {
      title: "Braucht bewusste Abstimmung",
      dimensions: bewussteAbstimmung,
    },
  ].filter((group) => group.dimensions.length > 0);
}

function getDimensionScores(
  dimensions: Array<{ dimension: string; scoreA: number | null; scoreB: number | null }>,
  targetDimension: string
) {
  const normalizedTarget = normalizeDimensionName(targetDimension);
  const match = dimensions.find(
    (dimension) => normalizeDimensionName(dimension.dimension) === normalizedTarget
  );

  return {
    scoreA: match?.scoreA ?? null,
    scoreB: match?.scoreB ?? null,
  };
}

export function FounderAlignmentReportView({
  invitationId = null,
  report,
  scoringResult,
  founderAName,
  founderBName,
  workbookHref,
  backHref = null,
}: Props) {
  const radarData = scoringResult.dimensions.map((dimension) => ({
    key: dimension.dimension,
    label: radarLabel(dimension.dimension),
    scoreA: dimension.scoreA,
    scoreB: dimension.scoreB,
  }));
  const radarSummaryGroups = buildRadarSummaryGroups(scoringResult.dimensions);
  const founderPairLabel = [founderAName, founderBName].filter(Boolean).join(" × ");
  const contextMeta = reportContextMeta(report.teamContext);
  const visionScores = getDimensionScores(scoringResult.dimensions, report.sections.vision.dimension);
  const decisionLogicScores = getDimensionScores(
    scoringResult.dimensions,
    report.sections.decisionLogic.dimension
  );
  const riskScores = getDimensionScores(
    scoringResult.dimensions,
    report.sections.riskOrientation.dimension
  );
  const workScores = getDimensionScores(
    scoringResult.dimensions,
    report.sections.workStructure.dimension
  );
  const commitmentScores = getDimensionScores(
    scoringResult.dimensions,
    report.sections.commitment.dimension
  );
  const conflictScores = getDimensionScores(
    scoringResult.dimensions,
    report.sections.conflictStyle.dimension
  );

  return (
    <main
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-950"
      style={
        {
          "--brand-primary": "#67e8f9",
          "--brand-accent": "#7c3aed",
        } as CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-12">
        {backHref ? (
          <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
            <Link
              href={backHref}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Zurück
            </Link>
            <PrintReportButton
              eventName="report_print_clicked"
              invitationId={invitationId}
              teamContext={report.teamContext}
              properties={{ reportType: "founder_alignment_v1" }}
            />
          </div>
        ) : null}

        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] md:p-10">
          <div className="relative flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            {!backHref ? (
              <div className="self-end md:absolute md:right-0 md:top-0">
                <PrintReportButton
                  eventName="report_print_clicked"
                  invitationId={invitationId}
                  teamContext={report.teamContext}
                  properties={{ reportType: "founder_alignment_v1" }}
                />
              </div>
            ) : null}

            <div className="max-w-4xl">
              <object
                data="/cofoundery-align-logo.svg"
                type="image/svg+xml"
                aria-label="CoFoundery Align Logo"
                className="h-10 w-auto max-w-[190px]"
              >
                <span className="text-sm font-semibold tracking-[0.08em] text-slate-900">
                  CoFoundery Align
                </span>
              </object>
              <h1 className="mt-6 text-3xl font-semibold tracking-[0.02em] text-slate-950 md:text-4xl">
                Founder Alignment Report
              </h1>
              <div className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
                {contextMeta.badge}
              </div>
              <p className="mt-3 text-lg font-medium text-slate-800">
                {founderPairLabel || "Founder A × Founder B"}
              </p>
              <p className="mt-3 text-base leading-7 text-slate-700">
                Einblick in eure mögliche Zusammenarbeit als Gründerteam
              </p>
            </div>

            <div className="flex flex-col items-start gap-4 pt-14 md:min-w-[220px] md:items-end md:pt-12">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:max-w-sm">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Analyse basiert auf
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <li>• Basisdimensionen der Zusammenarbeit</li>
                  <li>• Vergleich zweier Founderprofile</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-[color:var(--brand-primary)]/25 bg-[linear-gradient(135deg,rgba(103,232,249,0.10),rgba(124,58,237,0.05))] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">So nutzt ihr den Report</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-6 text-slate-700">
              Beginnt mit der Executive Summary und gleicht euer erstes Gesamtbild ab.
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-6 text-slate-700">
              Nutzt Archetyp, Radar und Team-Map, um Muster und Unterschiede gemeinsam einzuordnen.
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-6 text-slate-700">
              Besprecht die sechs Dimensionssektionen nacheinander und macht Erwartungen konkret.
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-6 text-slate-700">
              Die nächsten Schritte sind: Workbook starten, Vereinbarungen festhalten, Report sichern.
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/70 bg-white/72 p-4 text-sm leading-7 text-slate-700">
            Dieser Report beschreibt aktuelle Muster eurer Zusammenarbeit. Er ist keine feste
            Typisierung und keine Prognose über den langfristigen Erfolg eures Teams, sondern vor
            allem ein Arbeitsinstrument, das Unterschiede, gemeinsame Stärken und sinnvolle
            Gesprächsthemen sichtbar macht.
          </div>
        </section>

        <section className="mt-10">
          <article className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Executive Summary
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              {report.executiveSummary.headline}
            </h2>
            <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-700">
              {report.executiveSummary.summaryIntro}
            </p>

            <div className="mt-8 grid gap-4">
              <SummaryMessage title="Stärke" text={report.executiveSummary.topMessages.strength} />
              <SummaryMessage
                title="Ergänzende Dynamik"
                text={report.executiveSummary.topMessages.complementaryDynamic}
              />
              <SummaryMessage
                title="Mögliches Spannungsfeld"
                text={report.executiveSummary.topMessages.tension}
              />
            </div>

            <div className="mt-10">
              <h3 className="text-sm font-semibold text-slate-900">Empfohlene Fokusfragen</h3>
              <ul className="mt-3 grid gap-3">
                {report.executiveSummary.recommendedFocus.map((item, index) => (
                  <li
                    key={`focus-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </section>

        {report.teamArchetype ? (
          <section className="mt-10">
            <article className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Teamdynamik eurer Zusammenarbeit
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[0.01em] text-slate-950 md:text-[2.15rem]">
                Welche Grunddynamik eure Zusammenarbeit aktuell prägt
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                Der Archetyp verdichtet eure gemeinsame Arbeitslogik zu einem übersichtlichen Gesamtbild.
                Er zeigt, was eure Zusammenarbeit trägt und an welchen Stellen bewusste Abstimmung
                besonders wirksam wird.
              </p>

              <div className="mt-6 rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.95))] p-7 md:p-9">
                <div className="max-w-4xl">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Team-Archetyp
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-[0.01em] text-slate-950 md:text-4xl">
                    {report.teamArchetype.label}
                  </h3>
                  <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-700">
                    {report.teamArchetype.description}
                  </p>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <section>
                    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-6">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Profilstaerken
                      </p>
                      <h4 className="mt-3 text-lg font-semibold text-slate-950">
                        Typische Stärken dieser Dynamik
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Diese Aspekte können eurer Zusammenarbeit besonders Stabilität und Qualität geben.
                      </p>
                      <ul className="mt-5 space-y-3">
                        {report.teamArchetype.strengths.map((strength, index) => (
                          <li
                            key={`archetype-strength-${index}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
                          >
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section>
                    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-6">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Abstimmung
                      </p>
                      <h4 className="mt-3 text-lg font-semibold text-slate-950">
                        Bereiche für bewusste Abstimmung
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Hier lohnt sich ein klarer gemeinsamer Rahmen, damit Unterschiede konstruktiv wirken.
                      </p>
                      <ul className="mt-5 space-y-3">
                        {report.teamArchetype.alignmentTopics.map((topic, index) => (
                          <li
                            key={`archetype-topic-${index}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
                          >
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        <section className="mt-10">
          <article className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Radar</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Vergleich eurer Profile</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Die Grafik zeigt, in welchen Bereichen eure Profile ähnlich sind und wo sich Unterschiede zeigen.
            </p>
            <div className="mt-10">
              <FounderReportRadar
                data={radarData}
                labelA={founderAName || "Founder A"}
                labelB={founderBName || "Founder B"}
              />
            </div>
            <p className="mt-8 text-sm leading-7 text-slate-600">
              Diese Übersicht zeigt auf einen Blick, in welchen Bereichen eure Profile näher
              beieinander liegen und wo sich Unterschiede zeigen. Die genauere Einordnung pro
              Dimension folgt darunter in den jeweiligen Spektren und Reportabschnitten.
            </p>

            {radarSummaryGroups.length > 0 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {radarSummaryGroups.map((group) => (
                  <section
                    key={group.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                      {group.dimensions.map((dimension) => (
                        <li key={`${group.title}-${dimension}`}>{dimension}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : null}
          </article>
        </section>

        <section className="mt-10">
          <article className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Teamdynamik</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Verdichtete Übersicht eurer Zusammenarbeit
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Diese Map zeigt vereinfacht, wie sich eure Zusammenarbeit zwischen Tempo, Umgang mit Unsicherheit, Struktur und Abstimmung einordnet.
            </p>
            <div className="mt-8">
              <FounderTeamDynamicMap
                dimensions={scoringResult.dimensions}
                founderAName={founderAName}
                founderBName={founderBName}
              />
            </div>
          </article>
        </section>

        <section className="mt-10 grid gap-6">
          <FounderReportSectionCard
            title={report.sections.vision.dimension}
            interpretation={report.sections.vision.interpretation}
            everydaySignals={report.sections.vision.everydaySignals}
            potentialTensions={report.sections.vision.potentialTensions}
            conversationPrompts={report.sections.vision.conversationPrompts}
            scoreA={visionScores.scoreA}
            scoreB={visionScores.scoreB}
            founderAName={founderAName}
            founderBName={founderBName}
            fitCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.vision.dimension))?.fitCategory}
            tensionCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.vision.dimension))?.tensionCategory}
            isComplementaryDynamic={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.vision.dimension))?.isComplementaryDynamic}
            hasHiddenDifferences={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.vision.dimension))?.hasHiddenDifferences}
            itemDistance={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.vision.dimension))?.itemDistance}
          />
          <FounderReportSectionCard
            title={report.sections.decisionLogic.dimension}
            interpretation={report.sections.decisionLogic.interpretation}
            everydaySignals={report.sections.decisionLogic.everydaySignals}
            potentialTensions={report.sections.decisionLogic.potentialTensions}
            conversationPrompts={report.sections.decisionLogic.conversationPrompts}
            scoreA={decisionLogicScores.scoreA}
            scoreB={decisionLogicScores.scoreB}
            founderAName={founderAName}
            founderBName={founderBName}
            fitCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.decisionLogic.dimension))?.fitCategory}
            tensionCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.decisionLogic.dimension))?.tensionCategory}
            isComplementaryDynamic={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.decisionLogic.dimension))?.isComplementaryDynamic}
            hasHiddenDifferences={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.decisionLogic.dimension))?.hasHiddenDifferences}
            itemDistance={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.decisionLogic.dimension))?.itemDistance}
          />
          <FounderReportSectionCard
            title={report.sections.riskOrientation.dimension}
            interpretation={report.sections.riskOrientation.interpretation}
            everydaySignals={report.sections.riskOrientation.everydaySignals}
            potentialTensions={report.sections.riskOrientation.potentialTensions}
            conversationPrompts={report.sections.riskOrientation.conversationPrompts}
            scoreA={riskScores.scoreA}
            scoreB={riskScores.scoreB}
            founderAName={founderAName}
            founderBName={founderBName}
            fitCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.riskOrientation.dimension))?.fitCategory}
            tensionCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.riskOrientation.dimension))?.tensionCategory}
            isComplementaryDynamic={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.riskOrientation.dimension))?.isComplementaryDynamic}
            hasHiddenDifferences={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.riskOrientation.dimension))?.hasHiddenDifferences}
            itemDistance={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.riskOrientation.dimension))?.itemDistance}
          />
          <FounderReportSectionCard
            title={report.sections.workStructure.dimension}
            interpretation={report.sections.workStructure.interpretation}
            everydaySignals={report.sections.workStructure.everydaySignals}
            potentialTensions={report.sections.workStructure.potentialTensions}
            conversationPrompts={report.sections.workStructure.conversationPrompts}
            scoreA={workScores.scoreA}
            scoreB={workScores.scoreB}
            founderAName={founderAName}
            founderBName={founderBName}
            fitCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.workStructure.dimension))?.fitCategory}
            tensionCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.workStructure.dimension))?.tensionCategory}
            isComplementaryDynamic={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.workStructure.dimension))?.isComplementaryDynamic}
            hasHiddenDifferences={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.workStructure.dimension))?.hasHiddenDifferences}
            itemDistance={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.workStructure.dimension))?.itemDistance}
          />
          <FounderReportSectionCard
            title={report.sections.commitment.dimension}
            interpretation={report.sections.commitment.interpretation}
            everydaySignals={report.sections.commitment.everydaySignals}
            potentialTensions={report.sections.commitment.potentialTensions}
            conversationPrompts={report.sections.commitment.conversationPrompts}
            scoreA={commitmentScores.scoreA}
            scoreB={commitmentScores.scoreB}
            founderAName={founderAName}
            founderBName={founderBName}
            fitCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.commitment.dimension))?.fitCategory}
            tensionCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.commitment.dimension))?.tensionCategory}
            isComplementaryDynamic={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.commitment.dimension))?.isComplementaryDynamic}
            hasHiddenDifferences={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.commitment.dimension))?.hasHiddenDifferences}
            itemDistance={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.commitment.dimension))?.itemDistance}
          />
          <FounderReportSectionCard
            title={report.sections.conflictStyle.dimension}
            interpretation={report.sections.conflictStyle.interpretation}
            everydaySignals={report.sections.conflictStyle.everydaySignals}
            potentialTensions={report.sections.conflictStyle.potentialTensions}
            conversationPrompts={report.sections.conflictStyle.conversationPrompts}
            scoreA={conflictScores.scoreA}
            scoreB={conflictScores.scoreB}
            founderAName={founderAName}
            founderBName={founderBName}
            fitCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.conflictStyle.dimension))?.fitCategory}
            tensionCategory={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.conflictStyle.dimension))?.tensionCategory}
            isComplementaryDynamic={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.conflictStyle.dimension))?.isComplementaryDynamic}
            hasHiddenDifferences={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.conflictStyle.dimension))?.hasHiddenDifferences}
            itemDistance={scoringResult.dimensions.find((dimension) => normalizeDimensionName(dimension.dimension) === normalizeDimensionName(report.sections.conflictStyle.dimension))?.itemDistance}
          />
        </section>

        <section className="mt-12 rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Abschluss</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">
            Dieser Report ist kein Urteil, sondern ein Arbeitsinstrument
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-700">
            Die eigentliche Qualitaet eurer Zusammenarbeit entsteht nicht durch eine einzelne Auswertung,
            sondern dadurch, wie klar ihr die zentralen Themen jetzt miteinander besprecht. Nutzt den
            Report als Grundlage, um Erwartungen, Unterschiede und gemeinsame Regeln konkret im
            Workbook festzuhalten.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrintReportButton
              eventName="report_print_clicked"
              invitationId={invitationId}
              teamContext={report.teamContext}
              properties={{ reportType: "founder_alignment_v1" }}
            />
            <ReportActionButton variant="secondary" href={workbookHref}>
              Workbook starten
            </ReportActionButton>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryMessage({ title, text }: { title: string; text: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">
        {text ?? "Für diesen Bereich liegt aktuell noch keine hervorgehobene Aussage vor."}
      </p>
    </div>
  );
}
