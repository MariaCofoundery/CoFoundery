import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { DashboardDevSection } from "@/features/dashboard/DashboardDevSection";
import { DashboardHeroConstellation } from "@/features/dashboard/DashboardHeroConstellation";
import { DashboardJourneyLine } from "@/features/dashboard/DashboardJourneyLine";
import { DashboardConnectionCards } from "@/features/dashboard/DashboardConnectionCards";
import { DashboardSpotlight } from "@/features/dashboard/DashboardSpotlight";
import {
  DashboardTaskList,
  type DashboardTaskPresentation,
} from "@/features/dashboard/DashboardTaskList";
import { DeleteAccountSection } from "@/features/dashboard/DeleteAccountSection";
import { getFounderDashboardTasks } from "@/features/dashboard/founderDashboardTaskData";
import { getFounderDashboardConnectionsV2 } from "@/features/dashboard/founderDashboardConnectionData";
import { buildFounderDashboardConnections } from "@/features/dashboard/founderDashboardConnections";
import type { FounderDashboardTask } from "@/features/dashboard/founderDashboardTasks";
import {
  resolveDiscoveryFoundationState,
  resolveFounderAlignmentFoundationState,
  resolveValuesFoundationState,
} from "@/features/dashboard/founderDashboardV2";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { signOutAllSessionsAction } from "@/app/(product)/dashboard/actions";
import { SentInvitationLinkToggle } from "@/features/dashboard/SentInvitationLinkToggle";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { isCoreProfileComplete } from "@/features/profile/profileCompletion";
import { getOwnDiscoveryProfile } from "@/features/discovery/discoveryData";
import {
  debug_invitation_readiness,
  finalizeInvitationIfReady,
  getInvitationDashboardRows,
  getLatestSelfAlignmentReport,
  type InvitationDashboardRow,
  type InvitationReadinessDebug,
} from "@/features/reporting/actions";
import {
  buildInvitationDashboardHref,
  buildInvitationResumeHref,
} from "@/features/onboarding/invitationFlow";
import { createClient } from "@/lib/supabase/server";
import { getFounderTeamDashboardSummaries } from "@/features/teams/founderTeamHomebaseData";
import { getResearchConsentState } from "@/features/research/consent";
import { ResearchConsentSettings } from "@/features/research/ResearchConsentSettings";
import type { SupabaseClient } from "@supabase/supabase-js";

type DashboardSearchParams = {
  error?: string;
  valuesStatus?: string;
  invite?: string;
  invitationId?: string;
};

type ReportRunRow = {
  id: string;
  invitation_id: string;
  modules: string[];
  created_at: string;
  invitations:
    | {
        id: string;
        label: string | null;
        invitee_email: string;
        status: string;
        created_at: string;
      }
    | Array<{
        id: string;
        label: string | null;
        invitee_email: string;
        status: string;
        created_at: string;
      }>
    | null;
};

type AssessmentProgressRow = {
  id: string;
  module: "base" | "values";
  submitted_at: string | null;
  created_at: string;
};

type DashboardT = Awaited<ReturnType<typeof getTranslations>>;

const REPORT_CTA_CLASS =
  "inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
const UTILITY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
const PRIMARY_SURFACE_CLASS =
  "dashboard-card rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]";
const SECONDARY_SURFACE_CLASS =
  "dashboard-card rounded-2xl border border-slate-200/80 bg-slate-50/70 shadow-[0_10px_24px_rgba(15,23,42,0.035)]";
function staggerStyle(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const supabase = await createClient();
  const [t, teamsT, setupT] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("teams.dashboard"),
    getTranslations("teams.setup"),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  if (params.invitationId) {
    await finalizeInvitationIfReady(params.invitationId);
  }

  const [
    selfReport,
    profileData,
    initialInvitationRows,
    initialRunsResult,
    roleViews,
    founderTeams,
    discoveryProfile,
    assessmentProgressResult,
    researchConsentState,
  ] =
    await Promise.all([
      getLatestSelfAlignmentReport(),
      getProfileBasicsRow(supabase, user.id).catch(() => null),
      getInvitationDashboardRows(),
      supabase
        .from("report_runs")
        .select(
          "id, invitation_id, modules, created_at, invitations:invitation_id(id, label, invitee_email, status, created_at)"
        )
        .order("created_at", { ascending: false })
        .limit(20),
      getDashboardRoleViews(user.id),
      getFounderTeamDashboardSummaries(user.id, supabase).catch((error) => {
        console.error("dashboard founder teams load failed", error);
        return [];
      }),
      getOwnDiscoveryProfile(user.id, supabase).catch((error) => {
        console.error("dashboard discovery profile load failed", error);
        return null;
      }),
      supabase
        .from("assessments")
        .select("id, module, submitted_at, created_at")
        .eq("user_id", user.id)
        .in("module", ["base", "values"])
        .order("created_at", { ascending: false }),
      getResearchConsentState(supabase as unknown as SupabaseClient, user.id),
    ]);

  if (!roleViews.hasFounder && roleViews.hasAdvisor) {
    redirect("/advisor/dashboard");
  }

  let invitationRows = initialInvitationRows;
  let runsResult = initialRunsResult;

  const pendingFinalizeIds = invitationRows
    .filter((invitation) => invitation.isReadyForMatching && !invitation.isReportReady)
    .map((invitation) => invitation.id);
  if (pendingFinalizeIds.length > 0) {
    const finalizeResults = await Promise.all(
      pendingFinalizeIds.map((invitationId) => finalizeInvitationIfReady(invitationId))
    );
    finalizeResults.forEach((result, index) => {
      if (!result.ok && result.reason !== "waiting_for_answers") {
        console.error("dashboard finalizeInvitationIfReady failed", {
          invitationId: pendingFinalizeIds[index],
          reason: result.reason,
          detail: result.detail ?? null,
        });
      }
    });

    [invitationRows, runsResult] = await Promise.all([
      getInvitationDashboardRows(),
      supabase
        .from("report_runs")
        .select(
          "id, invitation_id, modules, created_at, invitations:invitation_id(id, label, invitee_email, status, created_at)"
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  }

  if (runsResult.error) {
    console.error("dashboard report runs load failed", runsResult.error);
    return <main className="p-8">{t("hero.loadError")}</main>;
  }

  const reportRuns = (runsResult.data ?? []) as ReportRunRow[];
  const needsOnboarding = !isCoreProfileComplete(profileData);
  const sentInvites = invitationRows.filter((row) => row.direction === "sent");
  const receivedInvites = invitationRows.filter((row) => row.direction === "incoming");
  const sentInvitesSorted = sortInvitationsByCreatedAtDesc(sentInvites);
  const receivedInvitesSorted = sortInvitationsByCreatedAtDesc(receivedInvites);
  const isDev = process.env.NODE_ENV !== "production";
  const debugByInvitationId = isDev
    ? new Map<string, InvitationReadinessDebug>(
        await Promise.all(
          invitationRows.map(async (invitation) => [
            invitation.id,
            await debug_invitation_readiness(invitation.id, { attemptFinalize: true }),
          ] as const)
        )
      )
    : new Map<string, InvitationReadinessDebug>();

  const hasSubmittedBase = Boolean(selfReport);
  const hasSubmittedValues = selfReport?.valuesModuleStatus === "completed";
  const assessmentProgress = assessmentProgressResult.error
    ? []
    : ((assessmentProgressResult.data ?? []) as AssessmentProgressRow[]);
  const latestBaseAssessment = assessmentProgress.find((row) => row.module === "base") ?? null;
  const latestValuesAssessment = assessmentProgress.find((row) => row.module === "values") ?? null;
  const hasStartedBase = Boolean(latestBaseAssessment);
  const hasStartedValues = Boolean(latestValuesAssessment && !latestValuesAssessment.submitted_at);
  const readyReports = reportRuns.slice(0, 3);
  const invitationById = new Map(invitationRows.map((invitation) => [invitation.id, invitation]));
  const displayName =
    profileData?.display_name?.trim() || user.email?.split("@")[0]?.trim() || "Founder";
  const actionableIncomingInvites = receivedInvitesSorted.filter((invite) => !invite.isReportReady);
  const prioritizedIncomingInvite =
    actionableIncomingInvites.find((invite) => invite.status === "accepted") ??
    actionableIncomingInvites[0] ??
    null;
  const contextualInvitationId = params.invitationId?.trim() || prioritizedIncomingInvite?.id || null;
  const contextualInvitation = contextualInvitationId
    ? invitationById.get(contextualInvitationId) ?? null
    : null;
  const contextualDashboardHref = contextualInvitationId
    ? buildInvitationDashboardHref(contextualInvitationId)
    : "/dashboard";
  const contextualMatchingHref = contextualInvitation
    ? contextualInvitation.isReportReady
      ? `/report/${encodeURIComponent(contextualInvitation.id)}`
      : `/dashboard?invitationId=${encodeURIComponent(contextualInvitation.id)}`
    : null;
  const contextualBaseHref = contextualInvitationId
    ? `/me/base?invitationId=${encodeURIComponent(contextualInvitationId)}`
    : "/me/base";
  const contextualValuesHref = contextualInvitationId
    ? `/me/values?invitationId=${encodeURIComponent(contextualInvitationId)}`
    : "/me/values";
  const founderAlignmentState = resolveFounderAlignmentFoundationState({
    submitted: hasSubmittedBase,
    started: hasStartedBase,
  });
  const valuesFoundationState = resolveValuesFoundationState({
    submitted: hasSubmittedValues,
    started: hasStartedValues,
  });
  const discoveryFoundationState = resolveDiscoveryFoundationState(discoveryProfile?.status);
  const connectionOverview = await getFounderDashboardConnectionsV2({
    currentUserId: user.id,
    teams: founderTeams,
    invitations: invitationRows,
    client: supabase,
  }).catch((error) => {
    console.error("dashboard connection overview load failed", error);
    return buildFounderDashboardConnections({
      currentUserId: user.id,
      teams: founderTeams,
      invitations: [],
      signals: {
        relationships: [],
        reports: [],
        commitmentLabs: [],
        relationshipAdvisors: [],
        setupItems: [],
        counterpartNames: new Map(),
      },
    });
  });
  const dashboardTasks = await getFounderDashboardTasks({
    currentUserId: user.id,
    invitations: invitationRows,
    founderAlignmentStarted: hasStartedBase,
    founderAlignmentSubmitted: hasSubmittedBase,
    valuesStarted: hasStartedValues,
    valuesSubmitted: hasSubmittedValues,
    teams: founderTeams,
    client: supabase,
  }).catch((error) => {
    console.error("dashboard tasks load failed", error);
    return [];
  });
  const taskPresentations = dashboardTasks.map((task) =>
    presentDashboardTask(task, t, setupT)
  );
  const collaborationSpotlightHref = founderTeams[0]?.id
    ? `/teams/${encodeURIComponent(founderTeams[0].id)}#collaboration-lab`
    : "/connections";
  const supportEmail = "hello@cofoundery.de";
  const profileAvatarId = profileData?.avatar_id?.trim() || null;
  const profileImageUrl = profileAvatarId
    ? null
    : profileData?.avatar_url?.trim() || null;
  const quoteOfTheDay = getQuoteOfTheDay(t);

  const selfReportDebug = selfReport
    ? {
        baseAssessmentId: selfReport.selfAssessmentMeta?.baseAssessmentId ?? selfReport.sessionId,
        valuesAssessmentId: selfReport.selfAssessmentMeta?.valuesAssessmentId ?? null,
        valuesAnsweredA: selfReport.valuesAnsweredA,
        valuesTotal: selfReport.valuesTotal,
        scoresA: selfReport.scoresA,
      }
    : null;
  const invitationDebugEntries = invitationRows.map((invitation) => ({
    id: invitation.id,
    debug: debugByInvitationId.get(invitation.id) ?? null,
  }));
  const reportRunSummaries = reportRuns.map((run) => ({
    id: run.id,
    invitationId: run.invitation_id,
    modules: run.modules ?? [],
    createdAt: run.created_at,
  }));
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12 md:px-10 xl:px-12">
      {contextualInvitation ? (
        <ProductNavigationOverride
          matchingHref={contextualMatchingHref}
          activeView="founder"
          contextLabel={t("hero.contextLabel")}
        />
      ) : null}
      <DashboardJourneyLine
        label={t("sectionNavigation.label")}
        sections={[
          { id: "dashboard-block-tasks", label: t("sectionNavigation.tasks") },
          { id: "dashboard-block-foundation", label: t("sectionNavigation.foundation") },
          { id: "dashboard-block-connections", label: t("sectionNavigation.connections") },
          { id: "dashboard-block-explore", label: t("sectionNavigation.explore") },
          { id: "dashboard-block-outlook", label: t("sectionNavigation.outlook") },
        ]}
      />

      {params.error ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("hero.error")}
        </p>
      ) : null}

      <section data-dashboard-hero className="relative isolate mb-10 lg:mb-12">
        <div className="relative rounded-[32px]">
          <DashboardHeroConstellation />
          <div className="relative z-10">
            <section className="dashboard-panel dashboard-fade-up rounded-[28px] border border-slate-200/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-6" style={staggerStyle(40)}>
              <div className="flex items-center gap-3.5">
                <DashboardProfileAvatar displayName={displayName} avatarId={profileAvatarId} imageUrl={profileImageUrl} />
                <div className="min-w-0 max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("hero.eyebrow")}</p>
                  <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight text-slate-950 sm:text-[2.15rem]">
                    {t("hero.greeting", { name: displayName })}
                  </h1>
                </div>
              </div>

              <div className="mt-5">
                <article className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(135deg,rgba(103,232,249,0.07),rgba(255,255,255,0.94)_52%,rgba(124,58,237,0.04))] px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/85 text-slate-600"><QuoteIcon className="h-4 w-4" /></span>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{t("hero.quoteEyebrow")}</p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">„{quoteOfTheDay.text}“</p>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section
        id="dashboard-block-tasks"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6"
        style={staggerStyle(80)}
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
          {t("tasks.eyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("tasks.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          {t("tasks.description")}
        </p>
        <DashboardTaskList
          tasks={taskPresentations}
          emptyTitle={t("tasks.empty.title")}
          emptyText={t("tasks.empty.text")}
        />
      </section>

      <section id="dashboard-block-foundation" className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6" style={staggerStyle(90)}>
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("foundation.eyebrow")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("foundation.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t("foundation.description")}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <FoundationCard
            title={t("foundation.alignment.title")}
            description={t("foundation.alignment.description")}
            status={t(`foundation.alignment.states.${founderAlignmentState}`)}
            href={founderAlignmentState === "result_available" ? "/me/report" : contextualBaseHref}
            action={t(`foundation.alignment.actions.${founderAlignmentState}`)}
          />
          <FoundationCard
            title={t("foundation.values.title")}
            description={t("foundation.values.description")}
            status={t(`foundation.values.states.${valuesFoundationState}`)}
            badge={t("foundation.values.optionalBadge")}
            href={valuesFoundationState === "completed" ? "/me/report" : contextualValuesHref}
            action={t(`foundation.values.actions.${valuesFoundationState}`)}
          />
          <FoundationCard
            title={t("foundation.discovery.title")}
            eyebrow={t("foundation.discovery.eyebrow")}
            description={t("foundation.discovery.description")}
            status={t(`foundation.discovery.states.${discoveryFoundationState}`)}
            href="/discovery/profile"
            action={t("foundation.discovery.action")}
          />
        </div>
      </section>

      <section
        id="dashboard-block-connections"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-6"
        style={staggerStyle(120)}
      >
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
              <ConnectionsIcon className="h-4 w-4" />
            </span>
            {t("team.eyebrow")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {t("team.title")}
          </h2>
        </div>

        <article className={`${PRIMARY_SURFACE_CLASS} mt-5 p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                {teamsT("eyebrow")}
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">
                {teamsT("title")}
              </h3>
            </div>
            <Link href="/connections" className={UTILITY_CTA_CLASS}>
              {teamsT("allConnections")}
            </Link>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {teamsT("description")}
          </p>

          <DashboardConnectionCards overview={connectionOverview} />
        </article>

        <div className={`${SECONDARY_SURFACE_CLASS} mt-4 flex flex-wrap items-center justify-between gap-4 p-4`}>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t("team.inviteTitle")}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("team.inviteText")}
            </p>
          </div>
          <Link href="/invite/new" className={UTILITY_CTA_CLASS}>
            {t("actions.inviteCofounder")}
          </Link>
        </div>

        <details className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t("team.detailsTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {t("team.detailsText")}
              </p>
            </div>
            <span className="text-sm text-slate-500">{t("team.expand")}</span>
          </summary>

          <div className="mt-5 grid gap-4">
            <article className={`${SECONDARY_SURFACE_CLASS} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{t("team.invitations")}</h3>
                <span className="text-xs tracking-[0.08em] text-slate-500">
                  {actionableIncomingInvites.length + sentInvitesSorted.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {actionableIncomingInvites.length > 0 ? (
                  actionableIncomingInvites.map((invite) => (
                    <div key={invite.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      {renderCompactIncomingInvitationRow(invite, t)}
                    </div>
                  ))
                ) : sentInvitesSorted.length > 0 ? (
                  sentInvitesSorted.map((invite) => (
                    <div key={invite.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      {renderCompactSentInvitationRow(invite, t)}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-slate-500">{t("team.noInvitations")}</p>
                )}
              </div>
            </article>

            <article className={`${SECONDARY_SURFACE_CLASS} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{t("team.reports")}</h3>
                <span className="text-xs tracking-[0.08em] text-slate-500">{readyReports.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {readyReports.length > 0 ? (
                  readyReports.map((run) => (
                    <div key={run.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      {renderCompactReportRow(run, t)}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-slate-500">
                    {t("team.noReports")}
                  </p>
                )}
              </div>
            </article>
          </div>
        </details>
      </section>

      <section
        id="dashboard-block-explore"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6"
        style={staggerStyle(130)}
        aria-labelledby="dashboard-explore-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("explore.eyebrow")}</p>
            <h2 id="dashboard-explore-title" className="mt-2 text-2xl font-semibold text-slate-950">{t("explore.title")}</h2>
          </div>
          <Link
            href="/founder-library"
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 sm:max-w-sm"
          >
            <span className="block text-sm font-semibold text-slate-900">{t("explore.libraryLink.title")}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">{t("explore.libraryLink.text")}</span>
          </Link>
        </div>

        <DashboardSpotlight
          items={[
            {
              id: "founder-library",
              title: t("explore.items.library.title"),
              text: t("explore.items.library.text"),
              action: t("explore.items.library.action"),
              href: "/founder-library",
            },
            {
              id: "discovery",
              title: t("explore.items.discovery.title"),
              text: t("explore.items.discovery.text"),
              action: t("explore.items.discovery.action"),
              href: "/discovery",
            },
            {
              id: "collaboration",
              title: t("explore.items.collaboration.title"),
              text: t("explore.items.collaboration.text"),
              action: t("explore.items.collaboration.action"),
              href: collaborationSpotlightHref,
            },
          ]}
          previousLabel={t("explore.controls.previous")}
          nextLabel={t("explore.controls.next")}
          indicatorsLabel={t("explore.controls.indicators")}
          positionLabel={t.raw("explore.controls.position")}
        />
      </section>

      <section id="dashboard-block-profile" className="dashboard-fade-up mb-8 grid gap-3 md:grid-cols-2" style={staggerStyle(130)} aria-label={t("utilities.title")}>
        <details id="dashboard-block-profile-data" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white/88 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]" open={needsOnboarding}>
          <summary className="cursor-pointer rounded-lg text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
            {needsOnboarding ? t("utilities.profileCreate") : t("utilities.profileEdit")}
          </summary>
          <p className="mt-2 text-xs leading-5 text-slate-500">{t("utilities.profileHelp")}</p>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <ProfileBasicsForm
              mode={needsOnboarding ? "onboarding" : "edit"}
              initialValues={{
                display_name: profileData?.display_name ?? null,
                focus_skill: profileData?.focus_skill ?? null,
                intention: profileData?.intention ?? null,
                roles: profileData?.roles ?? null,
                avatar_id: profileData?.avatar_id ?? null,
                avatar_url: profileData?.avatar_url ?? null,
              }}
              submitLabel={needsOnboarding ? t("actions.saveProfile") : t("actions.updateProfile")}
              onSuccessRedirectTo={contextualDashboardHref}
              variant={needsOnboarding ? "accent" : undefined}
              fallbackAvatarUrl={profileImageUrl}
            />
          </div>
        </details>

        <details id="dashboard-block-account" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
          <summary className="cursor-pointer rounded-lg text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
            {t("utilities.account")}
          </summary>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("account.emailLabel")}</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{user.email ?? t("account.emailUnavailable")}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{t("account.magicLinkText")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(t("account.supportSubject"))}`} className={UTILITY_CTA_CLASS}>{t("actions.contactSupport")}</a>
              <form action={signOutAllSessionsAction}><button type="submit" className={UTILITY_CTA_CLASS}>{t("actions.signOutAll")}</button></form>
            </div>
            <ResearchConsentSettings initialState={researchConsentState} />
            <DeleteAccountSection />
          </div>
        </details>
      </section>

      <section
        id="dashboard-block-outlook"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-2xl border border-slate-200/70 bg-slate-50/76 p-6 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
        style={staggerStyle(140)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
                <ReportIcon className="h-4 w-4" />
              </span>
              {t("outlook.eyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{t("outlook.title")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {t("outlook.text")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200/80 bg-white/88 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("outlook.items.collaborationTitle")}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {t("outlook.inDevelopment")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("outlook.items.collaborationText")}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/80 bg-white/88 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("outlook.items.checkInsTitle")}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {t("outlook.inDevelopment")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("outlook.items.checkInsText")}
            </p>
          </article>
        </div>
      </section>

      <DashboardDevSection
        enabled={isDev}
        selfReportDebug={selfReportDebug}
        invitationDebugEntries={invitationDebugEntries}
        reportRuns={reportRunSummaries}
      />
    </main>
  );
}

function presentDashboardTask(
  task: FounderDashboardTask,
  t: DashboardT,
  setupT: DashboardT
): DashboardTaskPresentation {
  const context = task.contextLabel ?? t("tasks.context.connection");
  const eyebrow = t(`tasks.kinds.${task.kind}`);
  switch (task.type) {
    case "incoming_invitation":
      return {
        ...task,
        eyebrow,
        title: task.personLabel
          ? t("tasks.items.incomingInvitation.titleWithName", { name: task.personLabel })
          : t("tasks.items.incomingInvitation.title"),
        text: t("tasks.items.incomingInvitation.text"),
        action: t("tasks.items.incomingInvitation.action"),
      };
    case "discovery_intro":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.discoveryIntro.title"),
        text: t("tasks.items.discoveryIntro.text"),
        action: t("tasks.items.discoveryIntro.action"),
      };
    case "relationship_advisor_consent":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.relationshipAdvisor.title"),
        text: t("tasks.items.relationshipAdvisor.text", { context }),
        action: t("tasks.items.relationshipAdvisor.action"),
      };
    case "setup_advisor_consent":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.setupAdvisor.title", { context }),
        text: t("tasks.items.setupAdvisor.text"),
        action: t("tasks.items.setupAdvisor.action"),
      };
    case "setup_confirmation": {
      const topic = task.itemKey
        ? setupT(`items.${task.itemKey}.title`)
        : t("tasks.context.setupTopic");
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.setupConfirmation.title", { context }),
        text: t("tasks.items.setupConfirmation.text", { topic }),
        action: t("tasks.items.setupConfirmation.action"),
      };
    }
    case "founder_alignment_continue":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.founderAlignment.title"),
        text: t("tasks.items.founderAlignment.text"),
        action: t("tasks.items.founderAlignment.action"),
      };
    case "values_continue":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.values.title"),
        text: t("tasks.items.values.text"),
        action: t("tasks.items.values.action"),
      };
    case "read_my_mind_invitation":
      return {
        ...task,
        eyebrow,
        title: (task.packCount ?? 1) > 1 ? t("tasks.items.readMyMindInvitation.multipleTitle") : t("tasks.items.readMyMindInvitation.title"),
        text: (task.packCount ?? 1) > 1
          ? t("tasks.items.readMyMindInvitation.multipleText", { name: task.personLabel ?? t("tasks.context.connection"), count: task.packCount ?? 1 })
          : task.personLabel
            ? t("tasks.items.readMyMindInvitation.textWithName", { name: task.personLabel })
            : t("tasks.items.readMyMindInvitation.text"),
        action: t("tasks.items.readMyMindInvitation.action"),
      };
    case "read_my_mind_continue":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.readMyMindContinue.title"),
        text: t("tasks.items.readMyMindContinue.text", { context }),
        action: t("tasks.items.readMyMindContinue.action"),
      };
    case "read_my_mind_reveal":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.readMyMindReveal.title"),
        text: t("tasks.items.readMyMindReveal.text"),
        action: t("tasks.items.readMyMindReveal.action"),
      };
    case "founder_in_the_wild_handoff":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.founderInTheWildHandoff.title"),
        text: task.started
          ? t("tasks.items.founderInTheWildHandoff.continueText")
          : task.personLabel
            ? t("tasks.items.founderInTheWildHandoff.textWithName", { name: task.personLabel })
            : t("tasks.items.founderInTheWildHandoff.text"),
        action: task.started
          ? t("tasks.items.founderInTheWildHandoff.continueAction")
          : t("tasks.items.founderInTheWildHandoff.action"),
      };
    case "founder_in_the_wild_reveal":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.founderInTheWildReveal.title"),
        text: t("tasks.items.founderInTheWildReveal.text"),
        action: t("tasks.items.founderInTheWildReveal.action"),
      };
    case "commitment_lab_continue":
      return {
        ...task,
        eyebrow,
        title: task.personLabel
          ? t("tasks.items.commitmentLab.titleWithName", { name: task.personLabel })
          : t("tasks.items.commitmentLab.title"),
        text: t("tasks.items.commitmentLab.text", { context }),
        action: t("tasks.items.commitmentLab.action"),
      };
    case "founder_setup_continue": {
      const topic = task.itemKey
        ? setupT(`items.${task.itemKey}.title`)
        : t("tasks.context.setupTopic");
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.founderSetup.title", { context }),
        text: t("tasks.items.founderSetup.text", { topic }),
        action: t("tasks.items.founderSetup.action"),
      };
    }
  }
}

function FoundationCard({
  title,
  eyebrow,
  description,
  status,
  badge,
  href,
  action,
}: {
  title: string;
  eyebrow?: string;
  description: string;
  status: string;
  badge?: string;
  href: string;
  action: string;
}) {
  return (
    <article className="flex min-h-64 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
      {eyebrow ? <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p> : null}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        {badge ? <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-600">{badge}</span> : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-4 text-xs font-medium text-slate-700">{status}</p>
      <div className="mt-auto pt-5">
        <Link href={href} className={UTILITY_CTA_CLASS}>{action}</Link>
      </div>
    </article>
  );
}

function formatDate(value: string | null | undefined, t: DashboardT) {
  if (!value) return t("date.unknown");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("date.unknown");
  return date.toLocaleDateString(t("date.locale"));
}

function resolveIncomingInviterName(invite: InvitationDashboardRow) {
  const inviterDisplayName = invite.inviterDisplayName?.trim();
  if (inviterDisplayName) return inviterDisplayName;
  const inviterEmail = invite.inviterEmail?.trim();
  if (inviterEmail) return inviterEmail;
  return "Co-Founder";
}

function formatIncomingInviteTitle(invite: InvitationDashboardRow, t: DashboardT) {
  return t("team.invitedBy", { name: resolveIncomingInviterName(invite) });
}

function getIncomingInviteStatusLabel(invite: InvitationDashboardRow, t: DashboardT) {
  if (invite.isReportReady) return t("team.statuses.reportReady");
  if (invite.isReadyForMatching) return t("team.statuses.matchingReady");
  const requiresValues = invite.requiredModules.includes("values");
  const inviteeHasAllRequired =
    invite.inviteeBaseSubmitted && (!requiresValues || invite.inviteeValuesSubmitted);
  return inviteeHasAllRequired ? t("team.statuses.waitingForPartner") : t("team.statuses.questionnaireOpen");
}

function getSentInviteStatusLabel(invite: InvitationDashboardRow, t: DashboardT) {
  if (invite.isReportReady) return t("team.statuses.reportReady");
  if (invite.isReadyForMatching) return t("team.statuses.matchingReady");
  const requiresValues = invite.requiredModules.includes("values");
  const inviterHasAllRequired =
    invite.inviterBaseSubmitted && (!requiresValues || invite.inviterValuesSubmitted);
  const inviteeHasAllRequired =
    invite.inviteeBaseSubmitted && (!requiresValues || invite.inviteeValuesSubmitted);
  if (!inviterHasAllRequired) return t("team.statuses.yourAnswersMissing");
  return inviteeHasAllRequired ? t("team.statuses.matchingReady") : t("team.statuses.waitingForPartner");
}

function formatInvitationModules(modules: string[], t: DashboardT) {
  const moduleKeys = (modules ?? []).filter((value): value is string => Boolean(value));
  if (moduleKeys.length === 0) return t("team.moduleLabels.base");

  const labels = moduleKeys.map((key) => {
    if (key === "base") return t("team.moduleLabels.base");
    if (key === "values") return t("team.moduleLabels.values");
    return key;
  });
  return [...new Set(labels)].join(", ");
}

function sortInvitationsByCreatedAtDesc(invites: InvitationDashboardRow[]) {
  return [...invites].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return rightTime - leftTime;
  });
}

function resolveInvitationTeamName(label: string | null | undefined, inviteeEmail: string | null | undefined) {
  const normalizedLabel = label?.trim();
  if (!normalizedLabel) return null;

  const normalizedInviteeEmail = inviteeEmail?.trim().toLowerCase();
  if (normalizedInviteeEmail && normalizedLabel.toLowerCase() === normalizedInviteeEmail) {
    return null;
  }

  const inviteeLocalPart = normalizedInviteeEmail?.split("@")[0]?.trim();
  if (inviteeLocalPart && normalizedLabel.toLowerCase() === inviteeLocalPart) {
    return null;
  }

  return normalizedLabel;
}

function renderCompactSentInvitationRow(invite: InvitationDashboardRow, t: DashboardT) {
  const teamName = resolveInvitationTeamName(invite.label, invite.inviteeEmail);
  const title = teamName || invite.inviteeEmail;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{title}</p>
        {teamName ? (
          <p className="mt-1 text-xs text-slate-500">
            {t("team.partner", { email: invite.inviteeEmail })}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-slate-600">
          {t("team.status", { status: getSentInviteStatusLabel(invite, t) })}
        </p>
        <p className="text-xs text-slate-500">
          {t("team.modulesAndExpiry", {
            modules: formatInvitationModules(invite.requiredModules, t),
            date: formatDate(invite.expiresAt, t),
          })}
        </p>
      </div>

      <div className="shrink-0">
        {invite.isReportReady ? (
          <Link href={`/report/${invite.id}`} className={REPORT_CTA_CLASS}>
            {t("actions.open")}
          </Link>
        ) : (
          <SentInvitationLinkToggle invitationId={invite.id} status={invite.status} />
        )}
      </div>
    </div>
  );
}

function renderCompactIncomingInvitationRow(invite: InvitationDashboardRow, t: DashboardT) {
  const action = buildIncomingInvitationAction(invite, t);
  const helperText = null;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{formatIncomingInviteTitle(invite, t)}</p>
        <p className="mt-1 text-sm text-slate-600">
          {t("team.status", { status: getIncomingInviteStatusLabel(invite, t) })}
        </p>
        <p className="text-xs text-slate-500">
          {t("team.modulesAndCreated", {
            modules: formatInvitationModules(invite.requiredModules, t),
            date: formatDate(invite.createdAt, t),
          })}
        </p>
        {helperText ? <p className="mt-1 text-xs text-amber-700">{helperText}</p> : null}
      </div>

      <a
        href={action.href}
        className={action.className}
      >
        {action.label}
      </a>
    </div>
  );
}

function buildIncomingInvitationAction(invite: InvitationDashboardRow, t: DashboardT) {
  const requiresValues = invite.requiredModules.includes("values");
  const inviteeHasAllRequired =
    invite.inviteeBaseSubmitted && (!requiresValues || invite.inviteeValuesSubmitted);
  const isAccepted = invite.status === "accepted";
  const resumeHref = buildInvitationResumeHref(invite.id);
  const canOpenCompletionStatus = isAccepted && (invite.isReadyForMatching || inviteeHasAllRequired);
  const needsBaseQuestionnaire = !invite.inviteeBaseSubmitted;
  const needsValuesQuestionnaire =
    invite.inviteeBaseSubmitted && requiresValues && !invite.inviteeValuesSubmitted;

  return {
    href: resumeHref,
    label: invite.isReportReady
      ? t("actions.open")
      : canOpenCompletionStatus
        ? t("team.incomingActions.openStatus")
        : isAccepted
          ? needsBaseQuestionnaire
            ? invite.inviteeBaseStarted
              ? t("team.incomingActions.continueNow")
              : t("team.incomingActions.startNow")
            : needsValuesQuestionnaire
              ? t("team.incomingActions.openValues")
              : t("team.incomingActions.openStatus")
          : t("team.incomingActions.startMatching"),
    className: invite.isReportReady
      ? REPORT_CTA_CLASS
      : "inline-flex shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700",
    canOpenCompletionStatus,
  };
}

function renderCompactReportRow(run: ReportRunRow, t: DashboardT) {
  const invitation = Array.isArray(run.invitations) ? run.invitations[0] ?? null : run.invitations;
  const teamName = resolveInvitationTeamName(invitation?.label, invitation?.invitee_email);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">
          {teamName ?? invitation?.invitee_email ?? run.invitation_id}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {t("team.modules", { modules: formatInvitationModules(run.modules ?? [], t) })}
        </p>
        <p className="text-xs text-slate-500">
          {t("team.created", { date: formatDate(run.created_at, t) })}
        </p>
      </div>

      <Link href={`/report/${run.invitation_id}`} className={REPORT_CTA_CLASS}>
        {t("actions.open")}
      </Link>
    </div>
  );
}

function getQuoteOfTheDay(t: DashboardT) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  const quoteKey = `quotes.q${dayOfYear % 6}`;
  return {
    text: t(quoteKey),
  };
}

function DashboardProfileAvatar({
  displayName,
  avatarId,
  imageUrl,
}: {
  displayName: string;
  avatarId: string | null;
  imageUrl: string | null;
}) {
  return (
    <ProfileAvatar
      displayName={displayName}
      avatarId={avatarId}
      imageUrl={imageUrl}
      className="h-16 w-16 rounded-full border border-white/80 object-cover shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
      fallbackClassName="flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(135deg,rgba(103,232,249,0.16),rgba(255,255,255,0.9)_48%,rgba(124,58,237,0.08))] text-base font-semibold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
    />
  );
}

function ReportIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h6l3 3v12h-9A2.25 2.25 0 015.25 17.25V6.75A2.25 2.25 0 017.5 4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5v3h3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.75 12h6.5M8.75 15.5h4.5" />
    </svg>
  );
}

function ConnectionsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5l3.75 3.75-3.75 3.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 16.5L4.5 12.75 8.25 9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 11.25H8.25m7.5 1.5H4.5" />
    </svg>
  );
}

function QuoteIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.25 8.75c-1.56.72-2.34 1.95-2.34 3.7v1.08c0 .97.79 1.76 1.76 1.76h.83c.97 0 1.75-.78 1.75-1.75v-.9c0-.96-.78-1.75-1.75-1.75H7.66c.05-.93.57-1.71 1.59-2.34"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 8.75c-1.56.72-2.34 1.95-2.34 3.7v1.08c0 .97.79 1.76 1.76 1.76h.83c.97 0 1.75-.78 1.75-1.75v-.9c0-.96-.78-1.75-1.75-1.75h-1.84c.05-.93.57-1.71 1.59-2.34"
      />
    </svg>
  );
}
