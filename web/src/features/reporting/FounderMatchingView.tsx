import { useTranslations } from "next-intl";
import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";
import type { FounderAlignmentReport } from "@/features/reporting/buildFounderAlignmentReport";
import {
  FOUNDER_DIMENSION_META,
  getLocalizedFounderDimensionMeta,
  getFounderDimensionPoleLabels,
} from "@/features/reporting/founderDimensionMeta";
import {
  getReportContent,
  type ReportContent,
  type ReportDimensionContentKey,
} from "@/features/reporting/content/reportContent";
import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type {
  FounderMatchingSelection,
  MatchingDimensionStatus,
} from "@/features/reporting/founderMatchingSelection";
import { buildFounderValuesBlockFromProfiles } from "@/features/reporting/founderValuesTextBuilder";
import type { SelfValuesProfile } from "@/features/reporting/types";
import type { AppLocale } from "@/i18n/config";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  participantAName: string;
  participantBName: string;
  compareResult: CompareFoundersResult;
  selection: FounderMatchingSelection;
  valuesProfileA?: SelfValuesProfile | null;
  valuesProfileB?: SelfValuesProfile | null;
  founderReport?: FounderAlignmentReport | null;
  workbookHref: string;
  teamContext?: TeamContext | null;
  reportContext?: "invitation" | "matching_session";
  showUnlockSection?: boolean;
  reportAccessNotice?: "locked" | "free_beta" | "session_snapshot" | null;
  contentLocale?: AppLocale;
};

type FounderReportSection = FounderAlignmentReport["sections"][keyof FounderAlignmentReport["sections"]];
type DimensionMatch = CompareFoundersResult["dimensions"][number];

const SECTION_ORDER: Array<{
  key: keyof FounderAlignmentReport["sections"];
  label: ReportDimensionContentKey;
}> = [
  { key: "vision", label: "Unternehmenslogik" },
  { key: "decisionLogic", label: "Entscheidungslogik" },
  { key: "riskOrientation", label: "Risikoorientierung" },
  { key: "workStructure", label: "Arbeitsstruktur & Zusammenarbeit" },
  { key: "commitment", label: "Commitment" },
  { key: "conflictStyle", label: "Konfliktstil" },
];

export function FounderMatchingView({
  participantAName,
  participantBName,
  compareResult,
  selection,
  valuesProfileA,
  valuesProfileB,
  founderReport,
  workbookHref,
  teamContext,
  reportContext = "invitation",
  showUnlockSection = true,
  reportAccessNotice,
  contentLocale,
}: Props) {
  const rt = useTranslations("report");
  const reportContent = getReportContent(contentLocale);
  const effectiveTeamContext = teamContext ?? "pre_founder";
  const isSessionReport = reportContext === "matching_session";
  const effectiveAccessNotice =
    reportAccessNotice ?? (showUnlockSection ? "locked" : isSessionReport ? "session_snapshot" : null);
  const valuesBlock = buildFounderValuesBlockFromProfiles(valuesProfileA, valuesProfileB);

  return (
    <>
      <section className="page-section rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {isSessionReport ? rt("view.dynamicsReport") : rt("view.matchingReport")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
            {t(buildMatchHeadline(selection, isSessionReport, reportContent))}
          </h1>
          <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-700">
            {t(buildIntroSummary(selection, isSessionReport))}
          </p>
          <p className="mt-6 text-[12px] uppercase tracking-[0.16em] text-slate-500">
            {t(`${participantAName} und ${participantBName} · ${teamContextLabel(effectiveTeamContext)}`)}
          </p>
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {t(reportContent.headings.centralPatterns)}
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {buildCentralPatternSections(selection, reportContent).map((section) => (
            <article
              key={section.label}
              className="rounded-[22px] border border-slate-200/80 bg-white/80 px-5 py-5"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {t(section.label)}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t(section.body)}</p>
            </article>
          ))}
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-700">
          {isSessionReport
            ? rt("view.sessionCentralPatternHint")
            : rt("view.legacyCentralPatternHint")}
        </p>

        {effectiveAccessNotice === "locked" ? (
          <div id="report-paywall-placeholder" className="mt-8 rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {rt("legacy.lockedEyebrow")}
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {rt("legacy.lockedTitle")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {rt("legacy.lockedText")}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              {rt("legacy.lockedAdvisorText")}
            </p>
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {rt("legacy.lockedPdfText")}
            </p>
          </div>
        ) : effectiveAccessNotice === "free_beta" ? (
          <div className="mt-8 rounded-[24px] border border-emerald-200/80 bg-emerald-50/70 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              {rt("legacy.freeBetaEyebrow")}
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {rt("legacy.freeBetaTitle")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {rt("legacy.freeBetaText")}
            </p>
          </div>
        ) : effectiveAccessNotice === "session_snapshot" ? (
          <div className="mt-8 rounded-[24px] border border-emerald-200/80 bg-emerald-50/70 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              {rt("session.snapshotEyebrow")}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {rt("session.snapshotText")}
            </p>
          </div>
        ) : null}
      </section>

      {effectiveAccessNotice === "locked" ? (
        <section className="page-section mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white/92 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {rt("common.fullReport")}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {rt("legacy.lockedFullText")}
          </p>
        </section>
      ) : (
        <FounderMatchingReportSections
          founderReport={founderReport}
          compareResult={compareResult}
          selection={selection}
          participantAName={participantAName}
          participantBName={participantBName}
          valuesBlock={valuesBlock}
          workbookHref={workbookHref}
          isSessionReport={isSessionReport}
          contentLocale={contentLocale}
        />
      )}
    </>
  );
}

function FounderMatchingReportSections({
  founderReport,
  compareResult,
  selection,
  participantAName,
  participantBName,
  valuesBlock,
  workbookHref,
  isSessionReport,
  contentLocale,
}: {
  founderReport?: FounderAlignmentReport | null;
  compareResult: CompareFoundersResult;
  selection: FounderMatchingSelection;
  participantAName: string;
  participantBName: string;
  valuesBlock: ReturnType<typeof buildFounderValuesBlockFromProfiles>;
  workbookHref: string;
  isSessionReport: boolean;
  contentLocale?: AppLocale;
}) {
  const rt = useTranslations("report");
  const reportContent = getReportContent(contentLocale);
  const markerA = buildMarkerLabel(participantAName);
  const markerB = buildMarkerLabel(participantBName);
  const conversationPrompts = collectConversationPrompts(founderReport);

  if (!founderReport && compareResult.dimensions.length === 0) {
    return (
      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/92 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {rt("common.fullReport")}
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          {rt("legacy.unrenderableText")}
        </p>
      </section>
    );
  }

  return (
    <>
      {founderReport ? (
        <ExecutiveSummarySection founderReport={founderReport} reportContent={reportContent} />
      ) : null}

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {t(reportContent.headings.dynamicsOverview)}
        </p>
        <div className="mt-6 space-y-4">
          {compareResult.dimensions.map((dimension) => {
            const meta =
              getLocalizedFounderDimensionMeta(dimension.dimension, contentLocale) ??
              FOUNDER_DIMENSION_META[dimension.dimension];
            const reportPoles = getFounderDimensionPoleLabels(
              dimension.dimension,
              "report",
              contentLocale
            );
            const status = selection.dimensionStatuses.find(
              (entry) => entry.dimension === dimension.dimension
            );
            const dimensionLabel =
              "label" in meta && typeof meta.label === "string" ? meta.label : meta.canonicalName;

            return (
              <article
                key={`matching-overview-${dimension.dimension}`}
                className="rounded-[22px] border border-slate-200/70 bg-slate-50/60 px-5 py-4 sm:px-6 sm:py-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[15px] font-semibold text-slate-900">
                      {t(dimensionLabel)}
                    </h4>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {t(meta.description)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusTone(status?.status)}`}>
                    {t(statusLabel(status?.status, reportContent))}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {t(buildDimensionReading(dimension, status?.status ?? "nah", reportContent))}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t(buildDimensionBusinessMeaning(dimension.dimension, status?.status ?? "nah", reportContent))}
                </p>

                <div className="mt-4 max-w-3xl">
                  <ComparisonScale
                    scoreA={dimension.scoreA}
                    scoreB={dimension.scoreB}
                    markerA={markerA}
                    markerB={markerB}
                    participantAName={participantAName}
                    participantBName={participantBName}
                    lowLabel={t(reportPoles?.left ?? meta.reportLeftPole)}
                    highLabel={t(reportPoles?.right ?? meta.reportRightPole)}
                    valueScale="founder_percent"
                    compact
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {founderReport ? (
        <section className="page-section mt-8 grid gap-6 print:mt-4">
          {SECTION_ORDER.map(({ key, label }) => (
            <FounderMatchingDimensionSection
              key={key}
              label={reportContent.dimensions[label].canonicalName}
              section={founderReport.sections[key]}
              reportContent={reportContent}
            />
          ))}
        </section>
      ) : null}

      {valuesBlock ? (
        <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {t(reportContent.headings.valuesFocus)}
          </p>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-700">{t(valuesBlock.intro)}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              { label: reportContent.valuesLabels.sharedBasis, entry: valuesBlock.gemeinsameBasis },
              {
                label: reportContent.valuesLabels.differenceUnderPressure,
                entry: valuesBlock.unterschiedUnterDruck,
              },
              { label: reportContent.valuesLabels.guardrail, entry: valuesBlock.leitplanke },
            ].map(({ label, entry }) => (
              <article
                key={`${label}-${entry.title}`}
                className="rounded-[22px] border border-slate-200/80 bg-slate-50/60 px-5 py-5"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{t(label)}</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{t(entry.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{t(entry.body)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {conversationPrompts.length > 0 ? (
        <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {t(reportContent.headings.conversationPrompts)}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
            {t(reportContent.headings.conversationPromptsIntro)}
          </p>
          <ul className="mt-6 grid gap-3 lg:grid-cols-2">
            {conversationPrompts.map((prompt) => (
              <li
                key={prompt}
                className="rounded-[20px] border border-slate-200/80 bg-white/88 px-5 py-4 text-sm leading-7 text-slate-800"
              >
                {t(prompt)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!isSessionReport ? (
        <section className="page-section mt-8 rounded-[30px] border border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.07)_0%,rgba(255,255,255,0.99)_100%)] p-8 shadow-[0_18px_50px_rgba(124,58,237,0.08)] print:hidden">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {t(reportContent.headings.nextStep)}
          </p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">
            {rt("legacy.workbookTitle")}
          </h3>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
            {rt("legacy.workbookText")}
          </p>
          <div className="mt-6">
            <ReportActionButton href={workbookHref}>{rt("legacy.workbookCta")}</ReportActionButton>
          </div>
        </section>
      ) : null}
    </>
  );
}

function ExecutiveSummarySection({
  founderReport,
  reportContent,
}: {
  founderReport: FounderAlignmentReport;
  reportContent: ReportContent;
}) {
  return (
    <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {t(reportContent.headings.executiveSummary)}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-slate-950">
        {t(founderReport.executiveSummary.headline)}
      </h2>
      <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-700">
        {t(founderReport.executiveSummary.summaryIntro)}
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {summaryMessages(founderReport, reportContent).map((message) => (
          <article
            key={message.label}
            className="rounded-[22px] border border-slate-200/80 bg-slate-50/75 px-5 py-5"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t(message.label)}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{t(message.text)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FounderMatchingDimensionSection({
  label,
  section,
  reportContent,
}: {
  label: string;
  section: FounderReportSection;
  reportContent: ReportContent;
}) {
  return (
    <article className="rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t(label)}</p>
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
        {t(section.dimension)}
      </h2>
      <p className="mt-5 text-sm leading-7 text-slate-700">{t(section.interpretation)}</p>
      <p className="mt-4 text-sm leading-7 text-slate-600">{t(section.everydaySignals)}</p>

      {section.potentialTensions.length > 0 ? (
        <div className="mt-7 rounded-[24px] border border-amber-200/80 bg-amber-50/70 p-6">
          <h3 className="text-base font-semibold text-slate-950">
            {t(reportContent.sectionLabels.possibleTensionFields)}
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {section.potentialTensions.map((tension) => (
              <div key={tension.topic} className="rounded-2xl bg-white/75 p-4">
                <p className="text-sm font-semibold text-slate-900">{t(tension.topic)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {t(tension.explanation)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function summaryMessages(founderReport: FounderAlignmentReport, reportContent: ReportContent) {
  return [
    { label: reportContent.sectionLabels.strength, text: founderReport.executiveSummary.topMessages.strength },
    {
      label: reportContent.sectionLabels.complement,
      text: founderReport.executiveSummary.topMessages.complementaryDynamic,
    },
    {
      label: reportContent.sectionLabels.clarificationField,
      text: founderReport.executiveSummary.topMessages.tension,
    },
  ].filter((entry): entry is { label: string; text: string } => Boolean(entry.text));
}

function teamContextLabel(teamContext: TeamContext) {
  return teamContext === "existing_team" ? "Bestehendes Team" : "Founder-Matching";
}

function buildMarkerLabel(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function buildMatchHeadline(
  selection: FounderMatchingSelection,
  isSessionReport: boolean,
  reportContent: ReportContent
) {
  if (isSessionReport) {
    return reportContent.matchHeadlines.session;
  }

  return reportContent.matchHeadlines[selection.heroSelection.mode] ?? reportContent.matchHeadlines.alignment_led;
}

function buildIntroSummary(selection: FounderMatchingSelection, isSessionReport: boolean) {
  if (isSessionReport) {
    return "Dieser Snapshot zeigt euch eure gemeinsamen Muster, Unterschiede und Abstimmungspunkte als visuelle Momentaufnahme.";
  }

  switch (selection.heroSelection.mode) {
    case "tension_led":
      return "Die zentrale Reibung liegt weniger im Umgangston als in der Frage, woran ihr Richtung, Entscheidungen oder Zusammenarbeit bemesst.";
    case "complement_led":
      return "Euer Unterschied ist weder automatisch Problem noch automatisch Stärke. Er wird wertvoll, wenn klar ist, wann er euch erweitert und wann er Führung braucht.";
    case "coordination_led":
      return "Bei euch geht eher Energie in Nachziehen, Schleifen und stille Koordination als in offenen Grundsatzstreit.";
    case "blind_spot_watch":
      return "Bei euch liegt das Risiko nicht zuerst in offenem Gegensatz, sondern in einer gemeinsamen Tendenz, die zu spät bewusst wird.";
    case "alignment_led":
    default:
      return "Vieles ist bei euch anschlussfähig. Gerade deshalb lohnt sich ein genauer Blick darauf, wo gemeinsame Linie endet und klares Führen beginnt.";
  }
}

function buildCentralPatternSections(
  selection: FounderMatchingSelection,
  reportContent: ReportContent
) {
  const corePattern = selection.heroSelection.mode === "blind_spot_watch"
    ? selection.heroSelection.biggestRisk
      ? `Der Kern liegt in einer gemeinsamen Tendenz rund um ${selection.heroSelection.biggestRisk.dimension}. Gerade weil sie sich zunächst stabil anfühlen kann, braucht sie bewusste Aufmerksamkeit.`
      : "Der Kern liegt in einer gemeinsamen Tendenz, die sich zuerst tragend anfühlt und gerade deshalb leicht zu spät geprüft wird."
    : selection.biggestTension
      ? `${selection.biggestTension.dimension} ist der Punkt, an dem ihr nicht automatisch nach denselben Maßstäben schaut.`
      : selection.strongestComplement
        ? `Euer stärkster Unterschied liegt in ${selection.strongestComplement.dimension} und kann euch breiter machen, wenn ihr ihn bewusst führt.`
        : selection.stableBase
          ? `Eure gemeinsame Basis in ${selection.stableBase.dimension} ist tragfähig, aber kein Ersatz für klare Regeln an offenen Punkten.`
          : "Ihr habt genug gemeinsame Linie für Zusammenarbeit, aber nicht genug Gleichlauf für stilles Verständnis.";

  const everydayImpact = selection.biggestTension
    ? buildDimensionBusinessMeaning(
        selection.biggestTension.dimension,
        selection.biggestTension.status,
        reportContent
      )
    : selection.strongestComplement
      ? buildDimensionBusinessMeaning(
          selection.strongestComplement.dimension,
          selection.strongestComplement.status,
          reportContent
        )
      : "Im Alltag zeigt sich das weniger in großen Szenen, sondern in Prioritäten, Timing und unausgesprochenen Erwartungen.";

  const consequence = selection.agreementFocusDimensions[0]
    ? `Der wichtigste Arbeitsauftrag liegt aktuell bei ${selection.agreementFocusDimensions[0].dimension}. Dort braucht ihr eine explizite Vereinbarung.`
    : "Ohne bewusste Klärung entstehen unterschiedliche Maßstäbe genau dort, wo ihr gemeinsam tragen und entscheiden müsst.";

  return [
    { label: reportContent.centralPatternLabels.corePattern, body: corePattern },
    { label: reportContent.centralPatternLabels.everydayImpact, body: everydayImpact },
    { label: reportContent.centralPatternLabels.consequence, body: consequence },
  ];
}

function buildDimensionReading(
  dimension: DimensionMatch,
  status: MatchingDimensionStatus,
  reportContent: ReportContent
) {
  if (dimension.scoreA == null || dimension.scoreB == null) {
    return reportContent.dimensionReadings.insufficientData;
  }

  if (dimension.hasSharedBlindSpotRisk) {
    return reportContent.dimensionReadings.sharedBlindSpot;
  }

  return reportContent.dimensionReadings[status];
}

function buildDimensionBusinessMeaning(
  dimension: DimensionMatch["dimension"],
  status: MatchingDimensionStatus,
  reportContent: ReportContent
) {
  const copy = reportContent.dimensionBusinessMeanings[dimension];
  return status === "kritisch" ? copy.critical : copy.default;
}

function statusLabel(
  status: MatchingDimensionStatus | undefined,
  reportContent: ReturnType<typeof getReportContent>
) {
  return reportContent.statusLabels[status ?? "nah"];
}

function statusTone(status: MatchingDimensionStatus | undefined) {
  if (status === "kritisch") return "border border-rose-200 bg-rose-50 text-rose-700";
  if (status === "abstimmung_nötig") return "border border-amber-200 bg-amber-50 text-amber-700";
  if (status === "ergänzend") {
    return "border border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]";
  }
  return "border border-emerald-200 bg-emerald-50 text-emerald-700";
}

function collectConversationPrompts(founderReport?: FounderAlignmentReport | null) {
  if (!founderReport) return [];

  const prompts = [
    ...founderReport.executiveSummary.recommendedFocus,
    ...SECTION_ORDER.flatMap(({ key }) => founderReport.sections[key].conversationPrompts),
  ];

  return [...new Set(prompts.filter(Boolean))].slice(0, 8);
}
