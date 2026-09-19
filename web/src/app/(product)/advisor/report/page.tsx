import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { AdvisorReportProductView } from "@/features/reporting/AdvisorReportProductView";
import {
  buildAdvisorReportHref,
  normalizeAdvisorTeamContext,
} from "@/features/reporting/advisorTeamTargets";
import {
  getAdvisorReportPageData,
  saveAdvisorSectionImpulse,
} from "@/features/reporting/advisorReportPageData";
import {
  ADVISOR_IMPULSE_SECTION_ORDER,
  type AdvisorImpulseSectionKey,
} from "@/features/reporting/advisorSectionImpulses";
import { getRequestLocale } from "@/i18n/getLocale";
import { AdvisorFounderSetupSection } from "@/features/teams/AdvisorFounderSetupSection";

function isAdvisorImpulseSectionKey(value: string): value is AdvisorImpulseSectionKey {
  return (ADVISOR_IMPULSE_SECTION_ORDER as readonly string[]).includes(value);
}

export default async function AdvisorReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    invitationId?: string;
    teamContext?: string;
    saved?: string;
  }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("advisor");
  const locale = await getRequestLocale();
  const invitationId = params.invitationId?.trim() ?? "";
  const requestedTeamContext = params.teamContext
    ? normalizeAdvisorTeamContext(params.teamContext)
    : null;
  if (!invitationId) {
    redirect("/advisor/dashboard");
  }

  const data = await getAdvisorReportPageData(invitationId, locale);
  const savedSectionKey = isAdvisorImpulseSectionKey(params.saved ?? "")
    ? (params.saved as AdvisorImpulseSectionKey)
    : null;

  async function saveImpulseAction(formData: FormData) {
    "use server";

    const invitationId = String(formData.get("invitationId") ?? "").trim();
    const teamContextRaw = String(formData.get("teamContext") ?? "").trim();
    const sectionKeyRaw = String(formData.get("sectionKey") ?? "").trim();
    const text = String(formData.get("text") ?? "");
    const teamContext = teamContextRaw ? normalizeAdvisorTeamContext(teamContextRaw) : null;

    if (!invitationId || !isAdvisorImpulseSectionKey(sectionKeyRaw)) {
      redirect(
        invitationId ? buildAdvisorReportHref(invitationId, teamContext) : "/advisor/dashboard"
      );
    }

    const result = await saveAdvisorSectionImpulse({
      invitationId,
      sectionKey: sectionKeyRaw,
      text,
    });

    revalidatePath("/advisor/report");

    if (!result.ok) {
      redirect(`${buildAdvisorReportHref(invitationId, teamContext)}#advisor-impulses`);
    }

    redirect(
      `${buildAdvisorReportHref(invitationId, teamContext)}&saved=${encodeURIComponent(
        sectionKeyRaw
      )}#advisor-impulses`
    );
  }

  if (data.status === "not_authenticated") {
    redirect(
      `/login?next=${encodeURIComponent(buildAdvisorReportHref(invitationId, requestedTeamContext))}`
    );
  }

  if (data.status === "forbidden" || data.status === "not_found") {
    redirect("/advisor/dashboard");
  }

  if (data.status === "missing_report") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 md:px-10">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-10 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {t("report.eyebrow")}
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {t("report.missingTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
            {t("report.missingText")}
          </p>
        </section>
      </main>
    );
  }

  if (data.status !== "ready") {
    redirect("/advisor/dashboard");
  }

  const reportHref = buildAdvisorReportHref(data.invitationId, data.teamContext);

  return (
    <>
      <ProductNavigationOverride
        activeView="advisor"
        contextLabel={t("report.context")}
        matchingHref={reportHref}
      />
      <AdvisorReportProductView
        invitationId={data.invitationId}
        teamContext={data.teamContext}
        participantAName={data.participantAName}
        participantBName={data.participantBName}
        report={data.report}
        impulses={data.impulses}
        snapshotHref={data.snapshotHref}
        savedSectionKey={savedSectionKey}
        saveAction={saveImpulseAction}
        locale={locale}
        founderSetupSection={
          <AdvisorFounderSetupSection
            items={data.founderSetupItems}
            access={data.founderSetupAccess}
            locale={locale}
          />
        }
        copy={{
          backToDashboard: t("report.backToDashboard"),
          openWorkbook: t("report.openWorkbook"),
          exportSnapshot: t("report.exportSnapshot"),
          impulsesEyebrow: t("report.impulsesEyebrow"),
          impulsesTitle: t("report.impulsesTitle"),
          impulsesText: t("report.impulsesText"),
          saved: t("report.saved"),
          lastSaved: (date) => t("report.lastSaved", { date }),
          noImpulse: t("report.noImpulse"),
          save: t("report.save"),
          eyebrow: t("report.eyebrow"),
          preview: {
            teamProfile: t("report.preview.teamProfile"),
            dimensionsEyebrow: t("report.preview.dimensionsEyebrow"),
            dimensionsTitle: t("report.preview.dimensionsTitle"),
            dimensionsText: t("report.preview.dimensionsText"),
            conversationTopicsEyebrow: t("report.preview.conversationTopicsEyebrow"),
            conversationTopicsTitle: t("report.preview.conversationTopicsTitle"),
            observations: t("report.preview.observations"),
            conversationPrompts: t("report.preview.conversationPrompts"),
            additionalContext: t("report.preview.additionalContext"),
            details: t("report.preview.details"),
            detailsTitle: t("report.preview.detailsTitle"),
            optional: t("report.preview.optional"),
            intensity: t("report.preview.intensity"),
            intensityLow: t("report.preview.intensityLow"),
            intensityMedium: t("report.preview.intensityMedium"),
            intensityHigh: t("report.preview.intensityHigh"),
            observation: t("report.preview.observation"),
            possibleContribution: t("report.preview.possibleContribution"),
            revisitWhen: t("report.preview.revisitWhen"),
            conversationQuestion: t("report.preview.conversationQuestion"),
            responseContext: t("report.preview.responseContext"),
            reviewTogether: t("report.preview.reviewTogether"),
            classificationContext: t("report.preview.classificationContext"),
            keepInMind: t("report.preview.keepInMind"),
            internalPreview: t("report.preview.internalPreview"),
          },
        }}
      />
    </>
  );
}
