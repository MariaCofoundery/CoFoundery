import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";
import type { FounderAlignmentReport } from "@/features/reporting/buildFounderAlignmentReport";
import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type { FounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import type { SelfValuesProfile } from "@/features/reporting/types";
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
};

export function FounderMatchingView({
  participantAName,
  participantBName,
  founderReport,
  teamContext,
  reportContext = "invitation",
  showUnlockSection = true,
  reportAccessNotice,
}: Props) {
  const effectiveTeamContext = teamContext ?? "pre_founder";
  const isSessionReport = reportContext === "matching_session";
  const effectiveAccessNotice =
    reportAccessNotice ?? (showUnlockSection ? "locked" : isSessionReport ? "session_snapshot" : null);

  return (
    <>
      <section className="page-section rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {t(isSessionReport ? "Dynamik-Report" : "Matching-Report")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
            {t(isSessionReport ? "Euer Dynamik-Report ist fertig." : "Euer Alignment-Report ist fertig.")}
          </h1>
          <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-700">
            {t(
              isSessionReport
                ? "Dieser Snapshot zeigt euch erste gemeinsame Muster fuer ein gutes Gespraech ueber Zusammenarbeit."
                : "Hier ist ein erster kurzer Einblick in eure Zusammenarbeit."
            )}
          </p>
          <p className="mt-6 text-[12px] uppercase tracking-[0.16em] text-slate-500">
            {t(`${participantAName} und ${participantBName} · ${teamContextLabel(effectiveTeamContext)}`)}
          </p>
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-[22px] border border-emerald-200/80 bg-emerald-50/70 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              {t("Erster Eindruck")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {t("Ihr habt eine starke Uebereinstimmung in eurer Vision.")}
            </p>
          </article>

          <article className="rounded-[22px] border border-amber-200/80 bg-amber-50/70 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
              {t("Spannungsfeld")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {t("Gleichzeitig zeigen sich Unterschiede in eurem Entscheidungsstil.")}
            </p>
          </article>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-700">
          {t(
            isSessionReport
              ? "Nutzt diese Punkte als Ausgangspunkt fuer ein ruhiges Gespraech ueber Rollen, Erwartungen und Zusammenarbeit."
              : "Die entscheidenden Punkte fuer eure Zusammenarbeit seht ihr im vollstaendigen Report."
          )}
        </p>

        {effectiveAccessNotice === "locked" ? (
          <div id="report-paywall-placeholder" className="mt-8 rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t("Freischaltung")}
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {t("Dieser Team-Report ist noch nicht freigeschaltet.")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {t("Die Freischaltung fuer diesen Legacy-Report ist noch nicht aktiv.")}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              {t("Wenn ein Advisor oder Accelerator den Report fuer euch freischaltet, ist er fuer das Team verfuegbar.")}
            </p>
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {t("Freischaltung kommt bald. Bis dahin bleibt der PDF-Export fuer diesen Report deaktiviert.")}
            </p>
          </div>
        ) : effectiveAccessNotice === "free_beta" ? (
          <div className="mt-8 rounded-[24px] border border-emerald-200/80 bg-emerald-50/70 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              {t("Kostenlos verfuegbar in der Testphase")}
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {t("Dieser Report ist in der aktuellen Testphase vollstaendig geoeffnet.")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {t("Spaeter kann die Freischaltung ueber einen Team- oder Report-Zugang laufen.")}
            </p>
          </div>
        ) : effectiveAccessNotice === "session_snapshot" ? (
          <div className="mt-8 rounded-[24px] border border-emerald-200/80 bg-emerald-50/70 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              {t("Session-Snapshot")}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {t("Dieser Report wurde aus eurer Matching-Session erstellt. Er erzeugt keine Einladung, keine Relationship und kein Workbook.")}
            </p>
          </div>
        ) : null}
      </section>

      {effectiveAccessNotice === "locked" ? (
        <section className="page-section mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white/92 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {t("Vollstaendiger Report")}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {t("Der vollstaendige Report wird nach der Freischaltung sichtbar.")}
          </p>
        </section>
      ) : (
        <FounderMatchingReportSections founderReport={founderReport} />
      )}
    </>
  );
}

function teamContextLabel(teamContext: TeamContext) {
  return teamContext === "existing_team" ? "Bestehendes Team" : "Founder-Matching";
}

type FounderReportSection = FounderAlignmentReport["sections"][keyof FounderAlignmentReport["sections"]];

const SECTION_ORDER: Array<{
  key: keyof FounderAlignmentReport["sections"];
  label: string;
}> = [
  { key: "vision", label: "Unternehmenslogik" },
  { key: "decisionLogic", label: "Entscheidungslogik" },
  { key: "riskOrientation", label: "Risikoorientierung" },
  { key: "workStructure", label: "Arbeitsstruktur & Zusammenarbeit" },
  { key: "commitment", label: "Commitment" },
  { key: "conflictStyle", label: "Konfliktstil" },
];

function FounderMatchingReportSections({
  founderReport,
}: {
  founderReport?: FounderAlignmentReport | null;
}) {
  if (!founderReport) {
    return (
      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/92 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {t("Vollstaendiger Report")}
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          {t("Der Report ist freigeschaltet, aber die Detailauswertung ist fuer diesen alten Datensatz noch nicht renderbar.")}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {t("Executive Summary")}
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-slate-950">
          {t(founderReport.executiveSummary.headline)}
        </h2>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-700">
          {t(founderReport.executiveSummary.summaryIntro)}
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {summaryMessages(founderReport).map((message) => (
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
        {founderReport.executiveSummary.recommendedFocus.length > 0 ? (
          <div className="mt-8 rounded-[24px] border border-slate-200/80 bg-white p-6">
            <h3 className="text-base font-semibold text-slate-950">
              {t("Empfohlener Gespraechsfokus")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {founderReport.executiveSummary.recommendedFocus.map((prompt) => (
                <li key={prompt} className="flex gap-3">
                  <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-slate-400" />
                  <span>{t(prompt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="page-section mt-8 grid gap-6 print:mt-4">
        {SECTION_ORDER.map(({ key, label }) => (
          <FounderMatchingDimensionSection
            key={key}
            label={label}
            section={founderReport.sections[key]}
          />
        ))}
      </section>
    </>
  );
}

function summaryMessages(founderReport: FounderAlignmentReport) {
  return [
    { label: "Staerke", text: founderReport.executiveSummary.topMessages.strength },
    {
      label: "Ergaenzung",
      text: founderReport.executiveSummary.topMessages.complementaryDynamic,
    },
    { label: "Klaerungsfeld", text: founderReport.executiveSummary.topMessages.tension },
  ].filter((entry): entry is { label: string; text: string } => Boolean(entry.text));
}

function FounderMatchingDimensionSection({
  label,
  section,
}: {
  label: string;
  section: FounderReportSection;
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
            {t("Moegliche Spannungsfelder")}
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

      {section.conversationPrompts.length > 0 ? (
        <div className="mt-7 rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-6">
          <h3 className="text-base font-semibold text-slate-950">
            {t("Fragen fuer euer Gespraech")}
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            {section.conversationPrompts.map((prompt) => (
              <li key={prompt} className="flex gap-3">
                <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-slate-400" />
                <span>{t(prompt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
