import Link from "next/link";
import { redirect } from "next/navigation";
import { type CSSProperties } from "react";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  resolveFounderAlignmentWorkbookSteps,
  workbookContextIntro,
} from "@/features/reporting/founderAlignmentWorkbook";
import { getFounderAlignmentWorkbookPageData } from "@/features/reporting/founderAlignmentWorkbookData";
import { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

const DECISION_RULES_STEP_ID = "decision_rules";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
  // Legacy fallback for old links. Productive access no longer uses query tokens.
  advisorToken?: string;
};

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

export default async function FounderAlignmentWorkbookPrintPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const requestedTeamContext = resolveTeamContext(params.teamContext);
  const legacyAdvisorToken = params.advisorToken?.trim() || null;

  if (!invitationId) {
    redirect("/dashboard");
  }

  if (legacyAdvisorToken) {
    redirect(`/advisor/invite/${encodeURIComponent(legacyAdvisorToken)}`);
  }

  const data = await getFounderAlignmentWorkbookPageData(invitationId, requestedTeamContext);

  if (data.status !== "ready") {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200/80 bg-white/95 p-10 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Founder Alignment Workbook
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {t("Druckversion aktuell noch nicht verfuegbar")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {t(
              "Die druckbare Arbeitsversion baut auf einem vorhandenen Founder-Alignment-Ergebnis auf. Sobald beide Base-Assessments vollstaendig vorliegen, kann das Arbeitsblatt erzeugt werden."
            )}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Status: {data.status}
            {data.reason ? ` · ${data.reason}` : ""}
          </p>
        </div>
      </main>
    );
  }

  const founderALabel = data.founderAName?.trim() || "Founder A";
  const founderBLabel = data.founderBName?.trim() || "Founder B";
  const founderPairLabel = `${founderALabel} × ${founderBLabel}`;
  const hasActiveAdvisor = Boolean(
    data.workbook.advisorId || data.advisorInvite.advisorLinked
  );
  const visibleSteps = resolveFounderAlignmentWorkbookSteps(data.showValuesStep, hasActiveAdvisor);
  const documentDate = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
  }).format(data.updatedAt ? new Date(data.updatedAt) : new Date());
  const workbookHref = data.invitationId
    ? `/founder-alignment/workbook?invitationId=${data.invitationId}&teamContext=${data.teamContext}`
    : `/founder-alignment/workbook?teamContext=${data.teamContext}`;

  return (
    <main
      className="print-document-root min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_35%,#f5fbff_100%)] text-slate-950 print:min-h-0 print:bg-white"
      style={
        {
          "--brand-primary": "#67e8f9",
          "--brand-accent": "#7c3aed",
        } as CSSProperties
      }
    >
      <div className="px-4 pt-6 sm:px-6 lg:px-8 print:hidden">
        <div className="mx-auto flex max-w-5xl justify-between gap-3">
          <Link href={workbookHref} className="text-sm text-slate-500 transition hover:text-slate-900">
            {t("Zurueck zum Arbeitsdokument")}
          </Link>
          <PrintReportButton
            label="Als PDF speichern"
            eventName="workbook_print_clicked"
            invitationId={data.invitationId}
            teamContext={data.teamContext}
            properties={{ role: data.currentUserRole, source: "print_page" }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none">
          <header className="border-b border-slate-200 pb-8 print:pb-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <object
                  data="/cofoundery-align-logo.svg"
                  type="image/svg+xml"
                  aria-label="CoFoundery Align Logo"
                  className="h-9 w-auto max-w-[190px] print:h-7"
                >
                  <span className="text-sm font-semibold tracking-[0.08em] text-slate-900">
                    CoFoundery Align
                  </span>
                </object>
                <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Founder Alignment Workbook
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-950">
                  Founder Alignment Workbook
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-700">{founderPairLabel}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 print:min-w-[160px]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Datum</p>
                <p className="mt-2 font-medium text-slate-700">{documentDate}</p>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-700">
              {t(
                "Dieses Dokument enthaelt die strukturierte Arbeitsversion eurer Founder Alignment Session und ist fuer Workshops, persoenliche Treffen oder Offline-Arbeit gedacht."
              )}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              {t(workbookContextIntro(data.teamContext))}
            </p>
          </header>

          <div className="mt-8 space-y-8 print:mt-6">
            {visibleSteps.map((step, index) => {
              const content = WORKBOOK_STEP_CONTENT[step.id];
              const isDecisionRulesStep = step.id === DECISION_RULES_STEP_ID;
              const structuredOutputFields = content.outputFields ?? null;
              const isStructuredOutputStep = Boolean(
                structuredOutputFields && structuredOutputFields.length > 0
              );
              const sectionAccent =
                index % 2 === 0
                  ? "border-[color:var(--brand-primary)]/16 bg-[linear-gradient(180deg,rgba(103,232,249,0.08)_0%,rgba(255,255,255,0.96)_100%)]"
                  : "border-[color:var(--brand-accent)]/14 bg-[linear-gradient(180deg,rgba(124,58,237,0.06)_0%,rgba(255,255,255,0.96)_100%)]";

              return (
                <section
                  key={step.id}
                  className={`rounded-[28px] border p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)] print:break-inside-avoid print:rounded-none print:border-x-0 print:border-t-0 print:px-0 print:py-7 print:shadow-none ${sectionAccent}`}
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Schritt {index + 1}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">{step.title}</h2>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6">
                    <p className="text-sm font-semibold text-slate-900">Warum dieses Thema wichtig ist</p>
                    <div className="mt-3 space-y-3">
                      {content.context.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-7 text-slate-700">
                          {t(paragraph)}
                        </p>
                      ))}
                    </div>
                  </div>

                  {isStructuredOutputStep && content.scenario ? (
                    <div className="mt-5 rounded-3xl border border-[color:var(--brand-accent)]/16 bg-white/90 p-6">
                      <p className="text-sm font-semibold text-slate-900">
                        {t("Realitaetsszenario")}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{t(content.scenario)}</p>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white/90 p-6">
                    <p className="text-sm font-semibold text-slate-900">
                      {t(isStructuredOutputStep ? "Konkrete Entscheidungsfragen" : "Fragen fuer eure Diskussion")}
                    </p>
                    <ol className="mt-4 space-y-3">
                      {step.prompts.map((prompt, promptIndex) => (
                        <li
                          key={prompt}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-700"
                        >
                          {promptIndex + 1}. {t(prompt)}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {step.id === "advisor_closing" ? (
                    <div className="mt-5 grid gap-5">
                      <WorksheetField
                        title={t("Wichtigste Beobachtungen")}
                        minHeightClass="min-h-[220px]"
                        lineCount={6}
                      />
                      <WorksheetField
                        title={t("Offene Rueckfragen an die Founder")}
                        minHeightClass="min-h-[220px]"
                        lineCount={6}
                      />
                      <WorksheetField
                        title={t("Empfohlene naechste Schritte / To-dos")}
                        highlight
                        minHeightClass="min-h-[220px]"
                        lineCount={6}
                      />
                      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6">
                        <p className="text-sm font-semibold text-slate-900">{t("Founder-Reaktion")}</p>
                        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-700">
                          <CheckboxLine label={t("verstanden")} />
                          <CheckboxLine label={t("offen")} />
                          <CheckboxLine label={t("wird geklaert")} />
                        </div>
                        <div className="mt-5">
                          <WorksheetField
                            title={t("Kurzer gemeinsamer Kommentar")}
                            minHeightClass="min-h-[160px]"
                            lineCount={4}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 grid gap-5 xl:grid-cols-2">
                        <WorksheetField title={`Perspektive ${founderALabel}`} />
                        <WorksheetField title={`Perspektive ${founderBLabel}`} />
                      </div>

                      {isStructuredOutputStep && structuredOutputFields ? (
                        <>
                          <div className="mt-5 rounded-3xl border border-slate-200 bg-white/90 p-6">
                            <p className="text-sm font-semibold text-slate-900">
                              {t(isDecisionRulesStep ? "Entscheidungs-Output" : "Verbindlicher Output")}
                            </p>
                            <div className="mt-5 grid gap-5">
                              {structuredOutputFields.map((field) => (
                                <WorksheetField
                                  key={field.key}
                                  title={t(field.title)}
                                  highlight={field.highlight === true}
                                  minHeightClass={field.highlight ? "min-h-[180px]" : "min-h-[160px]"}
                                  lineCount={field.highlight ? 5 : 4}
                                />
                              ))}
                            </div>
                          </div>

                          {content.riskHint ? (
                            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50/70 p-6">
                              <p className="text-sm font-semibold text-slate-900">
                                {t("Risiko-Hinweis")}
                              </p>
                              <p className="mt-3 text-sm leading-7 text-slate-700">
                                {t(content.riskHint)}
                              </p>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="mt-5">
                          <WorksheetField title="Gemeinsame Vereinbarung" highlight minHeightClass="min-h-[260px]" lineCount={8} />
                        </div>
                      )}

                      <div className="mt-5 rounded-3xl border border-slate-200 bg-white/90 p-6">
                        <p className="text-sm font-semibold text-slate-900">Status</p>
                        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-700">
                          <CheckboxLine label={t("Noch offen")} />
                          <CheckboxLine label={t("Teilweise geklaert")} />
                          <CheckboxLine label={t("Klar vereinbart")} />
                        </div>
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function WorksheetField({
  title,
  highlight = false,
  minHeightClass = "min-h-[240px]",
  lineCount = 7,
}: {
  title: string;
  highlight?: boolean;
  minHeightClass?: string;
  lineCount?: number;
}) {
  return (
    <section
      className={`rounded-3xl border p-6 ${
        highlight
          ? "border-[color:var(--brand-primary)]/20 bg-[color:var(--brand-primary)]/6"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className={`mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/95 p-5 ${minHeightClass}`}>
        <div className="flex h-full flex-col justify-between gap-6">
          {Array.from({ length: lineCount }).map((_, index) => (
            <div key={`${title}-${index}`} className="h-px bg-slate-200" />
          ))}
        </div>
      </div>
    </section>
  );
}

function CheckboxLine({ label }: { label: string }) {
  return (
    <label className="inline-flex items-center gap-3">
      <span className="inline-block h-4 w-4 rounded-[4px] border border-slate-400 bg-white" />
      <span>{label}</span>
    </label>
  );
}
