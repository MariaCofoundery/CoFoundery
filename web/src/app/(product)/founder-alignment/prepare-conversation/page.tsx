import Link from "next/link";
import { redirect } from "next/navigation";
import { type CSSProperties } from "react";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { type FounderAlignmentWorkbookStepId } from "@/features/reporting/founderAlignmentWorkbook";
import { getFounderAlignmentWorkbookPageData } from "@/features/reporting/founderAlignmentWorkbookData";
import { getReportRunSnapshotForSession } from "@/features/reporting/actions";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import {
  FOUNDER_CONVERSATION_GUIDE_CHAPTERS,
  FOUNDER_VALUES_CONVERSATION_BLOCK,
} from "@/features/reporting/founderConversationGuide";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
};

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function contextBadge(teamContext: TeamContext) {
  return teamContext === "existing_team"
    ? "Bestehendes Gruenderteam"
    : "Moegliche Gruendungspartnerschaft";
}

function isChapterPrioritized(
  chapterStepIds: FounderAlignmentWorkbookStepId[],
  prioritizedStepIds: FounderAlignmentWorkbookStepId[]
) {
  return chapterStepIds.some((stepId) => prioritizedStepIds.includes(stepId));
}

export default async function FounderAlignmentConversationGuidePage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const requestedTeamContext = resolveTeamContext(params.teamContext);

  if (!invitationId) {
    redirect("/dashboard");
  }

  const data = await getFounderAlignmentWorkbookPageData(invitationId, requestedTeamContext);

  if (data.status !== "ready") {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200/80 bg-white/95 p-10 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Founder Alignment Session
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {t("Gespraechsleitfaden aktuell noch nicht verfuegbar")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {t(
              "Der Leitfaden baut auf eurem Founder-Alignment-Report auf. Sobald beide Base-Assessments vollstaendig vorliegen und auswertbar sind, koennt ihr ihn fuer euer gemeinsames Gespraech nutzen."
            )}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Status: {data.status}
            {data.reason ? ` · ${data.reason}` : ""}
          </p>
          <div className="mt-8 flex justify-center">
            <ReportActionButton
              href={`/report/${encodeURIComponent(invitationId)}`}
              variant="secondary"
            >
              Zur Report-Vorschau
            </ReportActionButton>
          </div>
        </div>
      </main>
    );
  }

  const founderPairLabel = [data.founderAName, data.founderBName].filter(Boolean).join(" × ");
  const reportSnapshot = invitationId ? await getReportRunSnapshotForSession(invitationId) : null;
  const valuesReport = reportSnapshot?.report ?? null;
  const shouldShowValuesConversationBlock = Boolean(
    valuesReport &&
      valuesReport.valuesTotal > 0 &&
      valuesReport.valuesAnsweredA >= valuesReport.valuesTotal &&
      valuesReport.valuesAnsweredB >= valuesReport.valuesTotal
  );
  const workbookHref = data.invitationId
    ? `/founder-alignment/workbook?invitationId=${data.invitationId}&teamContext=${data.teamContext}`
    : `/founder-alignment/workbook?teamContext=${data.teamContext}`;
  const reportHref = `/report/${encodeURIComponent(data.invitationId ?? invitationId)}`;
  const focusCards = [
    {
      title: t("Staerkste gemeinsame Grundlage"),
      text: data.highlights.topStrength,
    },
    {
      title: t("Wichtige ergaenzende Dynamik"),
      text:
        data.highlights.topComplementaryDynamic ??
        t("Aktuell wird keine einzelne ergaenzende Dynamik besonders hervorgehoben."),
    },
    {
      title: t("Wichtigstes Klaerungsthema"),
      text: data.highlights.topTension,
    },
  ];

  return (
    <main
      className="print-document-root min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#fbf8ff_28%,#ffffff_100%)] text-slate-950"
      style={
        {
          "--brand-primary": "#67e8f9",
          "--brand-accent": "#7c3aed",
        } as CSSProperties
      }
    >
      <ResearchPageTracker
        eventName="conversation_guide_viewed"
        invitationId={data.invitationId}
        teamContext={data.teamContext}
        properties={{ valuesBlock: shouldShowValuesConversationBlock }}
      />
      <div className="px-4 pt-6 sm:px-6 lg:px-8 print:hidden">
        <div className="mx-auto flex max-w-6xl justify-between gap-3">
          <Link
            href={reportHref}
            className="text-sm font-medium text-[color:var(--brand-accent)] transition hover:text-[#5f28c7]"
          >
            {t("Zurueck zum Report")}
          </Link>
          <div className="flex flex-wrap gap-3">
            <PrintReportButton
              label={t("Gespraechsleitfaden als PDF exportieren")}
              className=""
              eventName="conversation_guide_print_clicked"
              invitationId={data.invitationId}
              teamContext={data.teamContext}
              properties={{ valuesBlock: shouldShowValuesConversationBlock }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
        <section className="rounded-[36px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)] print:rounded-none print:border-none print:p-0 print:shadow-none">
          <div className="flex flex-col gap-8 border-b border-slate-200 pb-8 print:pb-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
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
                <h1 className="mt-6 text-3xl font-semibold text-slate-950 md:text-4xl">
                  {t("Gespraech vorbereiten")}
                </h1>
                <div className="mt-4 inline-flex rounded-full border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                  {t(contextBadge(data.teamContext))}
                </div>
                <p className="mt-3 text-lg font-medium text-slate-800">
                  {founderPairLabel || "Founder A × Founder B"}
                </p>
                <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-700">
                  {t(
                    "Dieser Gespraechsleitfaden hilft euch, die wichtigsten Erkenntnisse aus eurem Report gemeinsam zu reflektieren. Nehmt euch etwa 60–90 Minuten Zeit und besprecht die Fragen offen miteinander. Ziel ist nicht sofortige Einigung, sondern ein klares Verstaendnis eurer Perspektiven."
                  )}
                </p>
              </div>

              <div className="rounded-[28px] border border-[color:var(--brand-primary)]/20 bg-[linear-gradient(180deg,rgba(103,232,249,0.10)_0%,rgba(124,58,237,0.06)_100%)] p-5 md:max-w-sm">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  So nutzt ihr diese Session
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                  <li>{t("• Sprecht zunaechst offen ueber unterschiedliche Sichtweisen, ohne sofort Loesungen festzuhalten.")}</li>
                  <li>{t("• Haltet Punkte fest, bei denen ihr noch keine Einigkeit braucht, aber Klarheit ueber Unterschiede gewinnen wollt.")}</li>
                  <li>{t("• Nutzt das Arbeitsdokument danach, um aus dem Gespraech konkrete Vereinbarungen abzuleiten.")}</li>
                </ul>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {focusCards.map((card, index) => (
                <div
                  key={card.title}
                  className={`rounded-[24px] border p-5 ${
                    index === 0
                      ? "border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/8"
                      : index === 1
                        ? "border-slate-200 bg-slate-50/80"
                        : "border-[color:var(--brand-accent)]/16 bg-[color:var(--brand-accent)]/6"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {t(card.text ?? "Fuer diesen Bereich liegt aktuell noch keine hervorgehobene Aussage vor.")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 space-y-8 print:mt-8">
            {FOUNDER_CONVERSATION_GUIDE_CHAPTERS.map((chapter, index) => {
              const prioritized = isChapterPrioritized(
                chapter.relatedStepIds,
                data.highlights.prioritizedStepIds
              );
              const chapterContainerClass =
                index % 4 === 0
                  ? "border-[color:var(--brand-primary)]/22 bg-[linear-gradient(180deg,rgba(103,232,249,0.12)_0%,rgba(255,255,255,0.95)_100%)]"
                  : index % 4 === 2
                    ? "border-[color:var(--brand-accent)]/16 bg-[linear-gradient(180deg,rgba(124,58,237,0.10)_0%,rgba(255,255,255,0.95)_100%)]"
                    : "border-slate-200/90 bg-white/95";
              const chapterLabelColor =
                index % 4 === 2 ? "text-[color:var(--brand-accent)]" : "text-[color:var(--brand-primary)]";

              return (
                <section
                  key={chapter.id}
                  className={`rounded-[32px] border p-7 md:p-8 print:break-inside-avoid print:rounded-none print:border-x-0 print:border-t-0 print:px-0 ${chapterContainerClass}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <p className={`text-[11px] uppercase tracking-[0.22em] ${chapterLabelColor}`}>
                        Kapitel {index + 1}
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-slate-950 md:text-[30px]">
                        {t(chapter.title)}
                      </h2>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{t(chapter.context)}</p>
                    </div>

                    {prioritized ? (
                      <div className="rounded-full border border-[color:var(--brand-accent)]/20 bg-white/90 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                        Fokus aus eurem Report
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.92fr)]">
                    <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Reflexionsfragen
                      </p>
                      <ol className="mt-4 space-y-4">
                        {chapter.reflectionQuestions.map((question) => (
                          <li
                            key={question}
                            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-7 text-slate-700"
                          >
                            {t(question)}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="rounded-[28px] border-2 border-[color:var(--brand-accent)]/22 bg-[linear-gradient(180deg,rgba(124,58,237,0.12)_0%,rgba(255,255,255,0.96)_100%)] p-6 shadow-[0_12px_28px_rgba(124,58,237,0.08)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                        Entscheidungsfrage
                      </p>
                      <div className="mt-4 h-px w-16 bg-[color:var(--brand-accent)]/30" />
                      <p className="mt-4 text-base leading-8 text-slate-800">
                        {t(chapter.decisionQuestion)}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })}

            {shouldShowValuesConversationBlock ? (
              <section className="rounded-[32px] border border-[color:var(--brand-accent)]/16 bg-[linear-gradient(180deg,rgba(124,58,237,0.10)_0%,rgba(255,255,255,0.95)_100%)] p-7 md:p-8 print:break-inside-avoid print:rounded-none print:border-x-0 print:border-t-0 print:px-0">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--brand-accent)]">
                    Zusatz aus eurem Werte-Add-on
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950 md:text-[30px]">
                    {t(FOUNDER_VALUES_CONVERSATION_BLOCK.title)}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {t(FOUNDER_VALUES_CONVERSATION_BLOCK.intro)}
                  </p>
                </div>

                <div className="mt-8 rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Reflexionsfragen
                  </p>
                  <ol className="mt-4 space-y-4">
                    {FOUNDER_VALUES_CONVERSATION_BLOCK.questions.map((question) => (
                      <li
                        key={question}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-7 text-slate-700"
                      >
                        {t(question)}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            ) : null}
          </div>

          <section className="mt-10 rounded-[32px] border border-slate-200 bg-slate-50/80 p-8 print:mt-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              {t("Nach eurem Gespraech")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Die wichtigsten Vereinbarungen bewusst festhalten
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
              {t(
                "Wenn ihr eure wichtigsten Perspektiven geklaert habt, koennt ihr im naechsten Schritt konkrete Vereinbarungen fuer eure Zusammenarbeit festhalten."
              )}
            </p>

            <div className="mt-8 flex flex-wrap gap-3 print:hidden">
              <ReportActionButton
                href={workbookHref}
                className=""
              >
                {t("Arbeitsdokument starten")}
              </ReportActionButton>
              <PrintReportButton
                label={t("Gespraechsleitfaden als PDF exportieren")}
                className=""
                eventName="conversation_guide_print_clicked"
                invitationId={data.invitationId}
                teamContext={data.teamContext}
                properties={{ valuesBlock: shouldShowValuesConversationBlock }}
              />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
