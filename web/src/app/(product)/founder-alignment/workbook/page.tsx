import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { FounderAlignmentWorkbookClient } from "@/features/reporting/FounderAlignmentWorkbookClient";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import {
  buildAdvisorReportHref,
  buildAdvisorWorkbookHref,
} from "@/features/reporting/advisorTeamTargets";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { getFounderAlignmentWorkbookPageData } from "@/features/reporting/founderAlignmentWorkbookData";
import {
  buildWorkbookHref,
  buildWorkbookIntroHref,
} from "@/features/reporting/workbookNavigation";
import { isWorkbookDeepDivePilotStep } from "@/features/reporting/workbookDeepDivePilot";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import { createClient } from "@/lib/supabase/server";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
  advisorContext?: string;
  // Legacy fallback for old links. Productive access no longer uses query tokens.
  advisorToken?: string;
  deepDiveStep?: string;
};

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function isAdvisorContext(value: string | undefined) {
  return value === "1" || value === "true";
}

function resolveUnavailableCopyKey(
  status: "missing_invitation" | "forbidden" | "in_progress"
) {
  switch (status) {
    case "missing_invitation":
      return "unavailable.statuses.missingInvitation" as const;
    case "forbidden":
      return "unavailable.statuses.forbidden" as const;
    case "in_progress":
      return "unavailable.statuses.inProgress" as const;
  }
}

export default async function FounderAlignmentWorkbookPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const t = await getTranslations("workbook");
  const invitationId = params.invitationId?.trim() || null;
  const requestedTeamContext = resolveTeamContext(params.teamContext);
  const advisorContext = isAdvisorContext(params.advisorContext);
  const legacyAdvisorToken = params.advisorToken?.trim() || null;
  const requestedDeepDiveStep =
    params.deepDiveStep && isWorkbookDeepDivePilotStep(params.deepDiveStep)
      ? params.deepDiveStep
      : null;

  if (legacyAdvisorToken) {
    redirect(`/advisor/invite/${encodeURIComponent(legacyAdvisorToken)}`);
  }

  if (!invitationId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = requestedDeepDiveStep
      ? `${buildWorkbookHref(invitationId, requestedTeamContext)}&deepDiveStep=${encodeURIComponent(requestedDeepDiveStep)}`
      : buildWorkbookHref(invitationId, requestedTeamContext);
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const data = await getFounderAlignmentWorkbookPageData(invitationId, requestedTeamContext, {
    advisorContext,
  });

  if (data.status !== "ready") {
    const fallbackWorkbookHref = advisorContext
      ? buildAdvisorWorkbookHref(invitationId, requestedTeamContext)
      : buildWorkbookHref(invitationId, requestedTeamContext);
    const fallbackReportHref = advisorContext
      ? buildAdvisorReportHref(invitationId, requestedTeamContext)
      : `/report/${encodeURIComponent(invitationId)}`;
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <ProductNavigationOverride
          matchingHref={fallbackReportHref}
          workbookHref={fallbackWorkbookHref}
          activeView={advisorContext ? "advisor" : "founder"}
          contextLabel={advisorContext ? t("common.advisorContext") : t("common.founderContext")}
        />
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200/80 bg-white/95 p-10 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {t("common.workbook")}
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {t("unavailable.title")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {t("unavailable.description")}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {t(resolveUnavailableCopyKey(data.status))}
          </p>
          <div className="mt-8 flex justify-center">
            <ReportActionButton href={fallbackReportHref} variant="utility">
              {advisorContext ? t("common.advisorReport") : t("common.matchingReport")}
            </ReportActionButton>
          </div>
        </div>
      </main>
    );
  }

  const resolvedInvitationId = data.invitationId ?? invitationId;
  const advisorReportHref = buildAdvisorReportHref(resolvedInvitationId, data.teamContext);
  const founderReportHref = `/report/${encodeURIComponent(resolvedInvitationId)}`;
  const resolvedWorkbookHref =
    data.currentUserRole === "advisor" || advisorContext
      ? buildAdvisorWorkbookHref(resolvedInvitationId, data.teamContext)
      : buildWorkbookHref(resolvedInvitationId, data.teamContext);
  const deepDiveTopicsHref = buildWorkbookIntroHref(resolvedInvitationId, data.teamContext);
  const initialWorkbook = requestedDeepDiveStep
    ? { ...data.workbook, currentStepId: requestedDeepDiveStep }
    : data.workbook;

  return (
    <main>
      <ProductNavigationOverride
        matchingHref={
          data.currentUserRole === "advisor" ? advisorReportHref : founderReportHref
        }
        workbookHref={resolvedWorkbookHref}
        feedbackInvitationId={data.invitationId ?? invitationId}
        activeView={data.currentUserRole === "advisor" ? "advisor" : "founder"}
        contextLabel={data.currentUserRole === "advisor" ? t("common.advisorContext") : t("common.founderContext")}
      />
      <ResearchPageTracker
        eventName="workbook_page_viewed"
        invitationId={data.invitationId}
        teamContext={data.teamContext}
        properties={{ role: data.currentUserRole, source: data.source }}
      />
      <div className="px-4 pt-6 sm:px-6 lg:px-8 print:hidden">
        <div className="mx-auto flex max-w-7xl justify-end">
          {data.currentUserRole !== "advisor" ? (
            <Link
              href={`/report/${encodeURIComponent(data.invitationId ?? invitationId)}`}
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              {t("common.backToMatchingReport")}
            </Link>
          ) : null}
        </div>
      </div>

      {data.currentUserRole === "advisor" ? (
        <section className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8 print:hidden">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {t("common.advisorLegacyTitle")}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t("common.advisorLegacyDescription")}
            </p>
          </div>
        </section>
      ) : null}

      {data.currentUserRole === "advisor" ? (
        <FounderAlignmentWorkbookClient
          invitationId={data.invitationId}
          relationshipId={data.relationshipId}
          teamContext={data.teamContext}
          founderAName={data.founderAName}
          founderBName={data.founderBName}
          founderAAvatarId={data.founderAAvatarId}
          founderBAvatarId={data.founderBAvatarId}
          founderAAvatarUrl={data.founderAAvatarUrl}
          founderBAvatarUrl={data.founderBAvatarUrl}
          currentUserRole={data.currentUserRole}
          initialWorkbook={initialWorkbook}
          highlights={data.highlights}
          stepMarkersByStep={data.stepMarkersByStep}
          advisorInvite={data.advisorInvite}
          advisorEntries={data.advisorEntries}
          advisorImpulses={data.advisorImpulses}
          canSave={data.canSave}
          persisted={data.persisted}
          updatedAt={data.updatedAt}
          source={data.source}
          storedTeamContext={data.storedTeamContext}
          hasTeamContextMismatch={data.hasTeamContextMismatch}
          showValuesStep={data.showValuesStep}
          deepDiveHandoff={data.deepDiveHandoff}
          deepDiveTopicsHref={deepDiveTopicsHref}
        />
      ) : (
        <FounderAlignmentWorkbookClient
          invitationId={data.invitationId}
          relationshipId={data.relationshipId}
          teamContext={data.teamContext}
          founderAName={data.founderAName}
          founderBName={data.founderBName}
          founderAAvatarId={data.founderAAvatarId}
          founderBAvatarId={data.founderBAvatarId}
          founderAAvatarUrl={data.founderAAvatarUrl}
          founderBAvatarUrl={data.founderBAvatarUrl}
          currentUserRole={data.currentUserRole}
          initialWorkbook={initialWorkbook}
          highlights={data.highlights}
          stepMarkersByStep={data.stepMarkersByStep}
          advisorInvite={data.advisorInvite}
          advisorEntries={data.advisorEntries}
          advisorImpulses={data.advisorImpulses}
          canSave={data.canSave}
          persisted={data.persisted}
          updatedAt={data.updatedAt}
          source={data.source}
          storedTeamContext={data.storedTeamContext}
          hasTeamContextMismatch={data.hasTeamContextMismatch}
          showValuesStep={data.showValuesStep}
          deepDiveHandoff={data.deepDiveHandoff}
          deepDiveTopicsHref={deepDiveTopicsHref}
        />
      )}
    </main>
  );
}
