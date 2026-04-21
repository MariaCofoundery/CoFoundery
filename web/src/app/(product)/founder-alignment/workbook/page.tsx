import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { FounderAlignmentWorkbookClient } from "@/features/reporting/FounderAlignmentWorkbookClient";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { getFounderAlignmentWorkbookPageData } from "@/features/reporting/founderAlignmentWorkbookData";
import { buildWorkbookHref } from "@/features/reporting/workbookNavigation";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import { createClient } from "@/lib/supabase/server";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
  advisorContext?: string;
  // Legacy fallback for old links. Productive access no longer uses query tokens.
  advisorToken?: string;
};

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function isAdvisorContext(value: string | undefined) {
  return value === "1" || value === "true";
}

function buildAdvisorWorkbookHref(invitationId: string, teamContext: TeamContext) {
  return `${buildWorkbookHref(invitationId, teamContext)}&advisorContext=1`;
}

export default async function FounderAlignmentWorkbookPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const requestedTeamContext = resolveTeamContext(params.teamContext);
  const advisorContext = isAdvisorContext(params.advisorContext);
  const legacyAdvisorToken = params.advisorToken?.trim() || null;

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
    const nextPath = `/founder-alignment/workbook?invitationId=${encodeURIComponent(invitationId)}&teamContext=${encodeURIComponent(requestedTeamContext)}`;
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const data = await getFounderAlignmentWorkbookPageData(invitationId, requestedTeamContext);

  if (data.status !== "ready") {
    const fallbackWorkbookHref = advisorContext
      ? buildAdvisorWorkbookHref(invitationId, requestedTeamContext)
      : buildWorkbookHref(invitationId, requestedTeamContext);
    const fallbackReportHref = advisorContext
      ? `/advisor/report?invitationId=${encodeURIComponent(invitationId)}`
      : `/report/${encodeURIComponent(invitationId)}`;
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <ProductNavigationOverride
          matchingHref={fallbackReportHref}
          workbookHref={fallbackWorkbookHref}
          activeView={advisorContext ? "advisor" : "founder"}
          contextLabel={advisorContext ? "Advisor-Kontext" : "Founder-Kontext"}
        />
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200/80 bg-white/95 p-10 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Workbook
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {t("Workbook aktuell noch nicht verfuegbar")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {t(
              "Das Workbook knuepft an einen vorhandenen Matching-Report an. Sobald beide Basisprofile vollstaendig vorliegen und auswertbar sind, kann das Workbook daraus seine Schwerpunkte ableiten."
            )}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Status: {data.status}
            {data.reason ? ` · ${data.reason}` : ""}
          </p>
          <div className="mt-8 flex justify-center">
            <ReportActionButton href={fallbackReportHref} variant="utility">
              {advisorContext ? "Zum Advisor-Report" : "Zum Matching-Report"}
            </ReportActionButton>
          </div>
        </div>
      </main>
    );
  }

  const resolvedInvitationId = data.invitationId ?? invitationId;
  const advisorReportHref = `/advisor/report?invitationId=${encodeURIComponent(
    resolvedInvitationId
  )}`;
  const founderReportHref = `/report/${encodeURIComponent(resolvedInvitationId)}`;
  const resolvedWorkbookHref =
    data.currentUserRole === "advisor" || advisorContext
      ? buildAdvisorWorkbookHref(resolvedInvitationId, data.teamContext)
      : buildWorkbookHref(resolvedInvitationId, data.teamContext);

  return (
    <main>
      <ProductNavigationOverride
        matchingHref={
          data.currentUserRole === "advisor" ? advisorReportHref : founderReportHref
        }
        workbookHref={resolvedWorkbookHref}
        feedbackInvitationId={data.invitationId ?? invitationId}
        activeView={data.currentUserRole === "advisor" ? "advisor" : "founder"}
        contextLabel={data.currentUserRole === "advisor" ? "Advisor-Kontext" : "Founder-Kontext"}
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
              {t("Zurueck zum Matching-Report")}
            </Link>
          ) : null}
        </div>
      </div>

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
          initialWorkbook={data.workbook}
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
          initialWorkbook={data.workbook}
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
        />
      )}
    </main>
  );
}
