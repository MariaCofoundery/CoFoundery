import { currentTeamForInvitation } from "@/features/teams/currentJourneyData";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import Link from "next/link";
import { QuoteOfTheDay } from "@/features/dashboard/QuoteOfTheDay";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { DashboardDevSection } from "@/features/dashboard/DashboardDevSection";
import { DashboardConnectionCards } from "@/features/dashboard/DashboardConnectionCards";
import {
  DashboardTaskList,
  type DashboardTaskPresentation,
} from "@/features/dashboard/DashboardTaskList";
import { getFounderDashboardTasks } from "@/features/dashboard/founderDashboardTaskData";
import { getFounderDashboardConnectionsV2 } from "@/features/dashboard/founderDashboardConnectionData";
import { buildFounderDashboardConnections } from "@/features/dashboard/founderDashboardConnections";
import type { FounderDashboardTask } from "@/features/dashboard/founderDashboardTasks";
import {
  resolveDashboardPrimaryAction,
  resolveDiscoveryFoundationState,
} from "@/features/dashboard/founderDashboardV2";
import { founderWorkProfileHref } from "@/features/dashboard/founderWorkProfileState";
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
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getFounderTeamDashboardSummaries } from "@/features/teams/founderTeamHomebaseData";
import { VersionArchiveCard } from "@/features/instruments/v21/VersionArchiveCard";
import { getDashboardVersionState } from "@/features/instruments/v21/dashboardVersionData";
import {
  AlignVentureActions,
  AlignWorkstyleStatus,
  alignWorkProfileState,
} from "@/features/instruments/align/AlignCard";
import { getAlignDashboardState } from "@/features/instruments/align/dashboardData";
import { CURRENT_INSTRUMENT_ID } from "@/features/instruments/instruments";

const INVITATION_ERROR_KEYS = new Set(["expired", "revoked", "invitation_not_found"]);

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
  } = await getRequestUser();

  const params = await searchParams;
  if (!user) {
    // Phase 12C.1C: mit Kontext (z. B. invitationId) zurueck zum Dashboard.
    redirect(buildLoginRedirectPath("/dashboard", params as Record<string, string | undefined>));
  }
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
        .eq("instrument_id", CURRENT_INSTRUMENT_ID)
        .order("created_at", { ascending: false }),
    ]);

  if (!roleViews.hasFounder) {
    if (roleViews.hasAdvisor) redirect("/advisor/dashboard");
    const { data: hasConnect } = await supabase.rpc("is_network_member");
    redirect(hasConnect === true ? "/connect" : "/start");
  }
  // Erst hier, nicht oben im grossen Promise.all: Wer kein Founder ist, wird
  // vorher weitergeleitet und soll diese Abfragen nicht bezahlen.
  const versionState = await getDashboardVersionState(user.id);
  const alignState = await getAlignDashboardState(user.id);

  let invitationRows = initialInvitationRows;
  let runsResult = initialRunsResult;

  const currentTeamEntries = await Promise.all(invitationRows.filter(i => i.status === "accepted").map(async i => [i.id, await currentTeamForInvitation(supabase, user.id, i.id)] as const));
  const currentTeamByInvitation = new Map(currentTeamEntries);
  const pendingFinalizeIds = invitationRows
    .filter((invitation) => !currentTeamByInvitation.get(invitation.id) && invitation.isReadyForMatching && !invitation.isReportReady)
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
  const contextualTeam = contextualInvitation ? currentTeamByInvitation.get(contextualInvitation.id) : null;
  const contextualMatchingHref = contextualTeam ? `/teams/${contextualTeam}/workstyle` : contextualInvitation
    ? contextualInvitation.isReportReady
      ? `/report/${encodeURIComponent(contextualInvitation.id)}`
      : `/dashboard?invitationId=${encodeURIComponent(contextualInvitation.id)}`
    : null;
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
    founderAlignmentStarted: alignState.profile.started,
    founderAlignmentSubmitted: alignState.profile.submitted,
    valuesStarted: hasStartedValues,
    valuesSubmitted: hasSubmittedValues,
    teams: founderTeams,
    client: supabase,
  }).catch((error) => {
    console.error("dashboard tasks load failed", error);
    return [];
  });
  // Legacy invitation tasks remain actionable; generic old questionnaires are
  // no longer promoted as current personal modules.
  const taskPresentations = dashboardTasks.filter((task) =>
    task.id !== "personal:founder-alignment" && task.id !== "personal:values"
  ).map((task) =>
    presentDashboardTask(task, t, setupT)
  );
  const supportEmail = "hello@cofoundery.de";
  const profileAvatarId = profileData?.avatar_id?.trim() || null;
  const profileImageUrl = profileAvatarId
    ? null
    : profileData?.avatar_url?.trim() || null;
  // Hoechstens eine Hauptaktion; alles, was andere betrifft, steht unter
  // "Was gerade ansteht". Ist das Arbeitsprofil nicht lesbar, keine Aktion.
  const workProfileState = alignState.show ? alignWorkProfileState(alignState) : "completed";
  const primaryAction = resolveDashboardPrimaryAction({ needsOnboarding, workProfileState });
  const primaryActionHref =
    primaryAction === "complete_profile" ? "#dashboard-block-profile-data" : founderWorkProfileHref(workProfileState);
  const hasHistory =
    readyReports.length > 0 || hasSubmittedBase || alignState.knowsPrevious || versionState.next.started;

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
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 md:px-10 xl:px-12">
      {contextualInvitation ? (
        <ProductNavigationOverride
          matchingHref={contextualMatchingHref}
          activeView="founder"
          contextLabel={t("hero.contextLabel")}
        />
      ) : null}

      {params.error ? (
        <p role="alert" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {/* Phase 12C.1C: Einladungsgruende aus /join/start benennen statt
              "bitte erneut versuchen" - ein neuer Versuch hilft dort nicht. */}
          {INVITATION_ERROR_KEYS.has(params.error)
            ? t(`hero.invitationErrors.${params.error}`)
            : t("hero.error")}
        </p>
      ) : null}

      {/* -----------------------------------------------------------------
          PHASE 9.4A: VIER FRAGEN, VIER BEREICHE
          -----------------------------------------------------------------

          1. Begruessung (hoechstens eine Hauptaktion)
          2. Was wartet auf mich?          -> Was gerade ansteht
          3. Woran arbeite ich mit wem?    -> Deine Teams & Verbindungen
          4. Wo pflege ich mein Profil?    -> Über dich
          Danach nur noch Eingeklapptes: fruehere Auswertungen und Konto.

          Zitat, Ausblick, Karussell, Netzwerk-Box und die Abschnittsleiste
          sind weg - sie standen gleichrangig neben dem, was ansteht, und
          machten die Seite laenger, nicht klarer. Menschen suchen geht ueber
          FIND in der Leiste, Connect hat dort seinen Zaehler. */}
      <section data-dashboard-hero className="mb-8">
        <div className="dashboard-panel dashboard-fade-up rounded-[28px] border border-slate-200/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-6" style={staggerStyle(40)}>
          <div className="flex items-center gap-3.5">
            <DashboardProfileAvatar displayName={displayName} avatarId={profileAvatarId} imageUrl={profileImageUrl} />
            <div className="min-w-0 max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("hero.eyebrow")}</p>
              <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight text-slate-950 sm:text-[2.15rem]">
                {t("hero.greeting", { name: displayName })}
              </h1>
            </div>
          </div>
          {primaryAction ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={primaryActionHref}
                className="brand-here inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition"
              >
                {t(`hero.primary.${primaryAction}`)}
              </Link>
              <p className="text-sm leading-6 text-slate-600">{t(`hero.primaryText.${primaryAction}`)}</p>
            </div>
          ) : null}
          {/* Phase 11.5: klein unter der Begruessung, kein eigener Hero. */}
          <QuoteOfTheDay className="mt-5 max-w-2xl" />
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

      <section
        id="dashboard-block-connections"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-6"
        style={staggerStyle(120)}
        aria-labelledby="dashboard-connections-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
                <ConnectionsIcon className="h-4 w-4" />
              </span>
              {t("team.eyebrow")}
            </p>
            <h2 id="dashboard-connections-title" className="mt-2 text-xl font-semibold text-slate-950">
              {t("team.title")}
            </h2>
          </div>
          <Link href="/connections" className={UTILITY_CTA_CLASS}>
            {teamsT("allConnections")}
          </Link>
        </div>

        <DashboardConnectionCards overview={connectionOverview} />

        <div className="mt-5">
          <AlignVentureActions state={alignState} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
          <Link href="/invite/new" className={UTILITY_CTA_CLASS}>
            {t("actions.inviteCofounder")}
          </Link>
          {/* Team-Intake bleibt erreichbar - Founder koennen Teilnehmende
              sein. Aber leise und nicht als eigener Bereich: angelegt werden
              Intakes im Advisor-Kontext, dort steht es in der Leiste. */}
          <p className="text-xs leading-5 text-slate-500">
            {t("team.teamIntakeText")}{" "}
            <Link href="/team-intake" className="underline hover:text-slate-900">
              {t("team.teamIntakeLink")}
            </Link>
          </p>
        </div>

        {actionableIncomingInvites.length + sentInvitesSorted.length > 0 ? (
          <details className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t("team.invitationsSummary")}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{t("team.invitationsSummaryText")}</p>
              </div>
              <span className="text-xs tracking-[0.08em] text-slate-500">
                {actionableIncomingInvites.length + sentInvitesSorted.length}
              </span>
            </summary>
            <div className="mt-4 space-y-2">
              {actionableIncomingInvites.length > 0
                ? actionableIncomingInvites.map((invite) => (
                    <div key={invite.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      {renderCompactIncomingInvitationRow(invite, t, currentTeamByInvitation.get(invite.id))}
                    </div>
                  ))
                : sentInvitesSorted.map((invite) => (
                    <div key={invite.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      {renderCompactSentInvitationRow(invite, t, currentTeamByInvitation.get(invite.id))}
                    </div>
                  ))}
            </div>
          </details>
        ) : null}
      </section>

      <section
        id="dashboard-block-profile"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6"
        style={staggerStyle(130)}
        aria-labelledby="dashboard-about-title"
      >
        <h2 id="dashboard-about-title" className="text-xl font-semibold text-slate-950">{t("aboutYou.title")}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t("aboutYou.text")}</p>

        {needsOnboarding ? (
          <details id="dashboard-block-profile-data" className="mt-4 scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white/88 p-4" open>
            <summary className="cursor-pointer rounded-lg text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
              {t("utilities.profileCreate")}
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">{t("utilities.profileHelp")}</p>
            <div className="mt-4 border-t border-slate-200 pt-4">
              {/* Der Erststart bleibt hier: ein Einstieg ist etwas anderes als
                  ein Editor. Wer das Basisprofil ausgefuellt hat, geht auf
                  /profile. */}
              {needsOnboarding ? (
                <ProfileBasicsForm
                  mode="onboarding"
                  initialValues={{
                    display_name: profileData?.display_name ?? null,
                    focus_skill: profileData?.focus_skill ?? null,
                    intention: profileData?.intention ?? null,
                    roles: profileData?.roles ?? null,
                    avatar_id: profileData?.avatar_id ?? null,
                    avatar_url: profileData?.avatar_url ?? null,
                  }}
                  submitLabel={t("actions.saveProfile")}
                  onSuccessRedirectTo={contextualDashboardHref}
                  variant="accent"
                  fallbackAvatarUrl={profileImageUrl}
                />
              ) : null}
            </div>
          </details>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">{t("aboutYou.ownProfile.title")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("aboutYou.ownProfile.text")}</p>
            <Link href="/me/profile" className="mt-3 inline-block text-sm text-slate-900 underline">
              {t("aboutYou.ownProfile.action")}
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <AlignWorkstyleStatus state={alignState} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">{t("aboutYou.find.title")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t(`foundation.discovery.states.${discoveryFoundationState}`)}
            </p>
            <Link href="/discovery/profile" className="mt-3 inline-block text-sm text-slate-900 underline">
              {t("foundation.discovery.action")}
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">{t("aboutYou.edit.title")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("utilities.profileEntryHelp")}</p>
            <Link href="/profile" className="mt-3 inline-block text-sm text-slate-900 underline">
              {t("aboutYou.edit.action")}
            </Link>
          </div>
        </div>
      </section>

      {/* Fruehere Auswertungen: erhalten und erreichbar, aber eingeklappt und
          nur, wenn es etwas gibt. Sie sind Rueckblick, nicht der aktuelle Weg. */}
      {hasHistory ? (
        <details className="mb-4 rounded-2xl border border-slate-200 bg-white/80 p-4" aria-labelledby="dashboard-legacy-title">
          <summary className="cursor-pointer rounded-lg text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
            <h2 id="dashboard-legacy-title" className="inline text-sm font-semibold text-slate-900">{t("legacy.title")}</h2>
            <span className="mt-1 block pl-4 text-xs font-normal leading-5 text-slate-600">{t("legacy.description")}</span>
          </summary>
          <div className="mt-4 space-y-3 text-sm">
            {readyReports.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("team.reports")}</h3>
                {readyReports.map((run) => (
                  <div key={run.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    {renderCompactReportRow(run, t)}
                  </div>
                ))}
              </div>
            ) : null}
            {hasSubmittedBase && <Link href="/me/report" className="inline-block underline">{t("legacy.report")}</Link>}
            {hasSubmittedBase && hasSubmittedValues && <p className="text-slate-600">{t("legacy.values")}</p>}
            {(alignState.knowsPrevious || versionState.next.started) && (
              <div>
                <Link href="/founder-alignment/versionen" className="inline-block underline">{t("legacy.answers")}</Link>
                {versionState.next.started && (
                  <VersionArchiveCard
                    decision={versionState.decision}
                    previous={versionState.previous}
                    next={versionState.next}
                    connectionsNext={versionState.connectionsNext}
                    archived={versionState.archived}
                  />
                )}
              </div>
            )}
          </div>
        </details>
      ) : null}

      {/* Konto: /account bietet Support und "alle Sitzungen abmelden" nicht an,
          deshalb bleibt beides hier - eingeklappt am Ende. */}
      <details id="dashboard-block-account" className="mb-8 scroll-mt-28 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
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
            <Link href="/account" className={UTILITY_CTA_CLASS}>{t("account.manage")}</Link>
          </div>
        </div>
      </details>

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
    case "network_contact":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.connectContact.title"),
        text: t("tasks.items.connectContact.text", {
          name: task.personLabel ?? t("tasks.items.connectContact.someone"),
          listing: task.contextLabel ?? t("tasks.items.connectContact.listing"),
        }),
        action: t("tasks.items.connectContact.action"),
      };
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
      if (task.discoveryStage === "joint_check_consent") {
        return {
          ...task,
          eyebrow,
          title: t("tasks.items.discoveryJointCheck.title"),
          text: task.personLabel
            ? t("tasks.items.discoveryJointCheck.textWithName", {
                name: task.personLabel,
              })
            : t("tasks.items.discoveryJointCheck.text"),
          action: t("tasks.items.discoveryJointCheck.action"),
        };
      }
      if (task.discoveryStage === "own_inputs_missing") {
        return {
          ...task,
          eyebrow,
          title: t("tasks.items.discoveryOwnInputs.title"),
          text: t("tasks.items.discoveryOwnInputs.text"),
          action: t("tasks.items.discoveryOwnInputs.action"),
        };
      }
      if (task.discoveryStage === "alignment_ready") {
        return {
          ...task,
          eyebrow,
          title: t("tasks.items.discoveryAlignmentReady.title"),
          text: t("tasks.items.discoveryAlignmentReady.text"),
          action: t("tasks.items.discoveryAlignmentReady.action"),
        };
      }
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.discoveryIntro.title"),
        text: task.personLabel
          ? t("tasks.items.discoveryIntro.textWithName", { name: task.personLabel })
          : t("tasks.items.discoveryIntro.text"),
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

function renderCompactSentInvitationRow(invite: InvitationDashboardRow, t: DashboardT, currentTeam?: string | null) {
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
          {/* Phase 10: keine "Module: Basis, Werte" mehr - neue Einladungen
              fuehren in den aktuellen Weg, der keine Module kennt. */}
          {t("team.expires", { date: formatDate(invite.expiresAt, t) })}
        </p>
      </div>

      <div className="shrink-0">
        {currentTeam || invite.isReportReady ? (
          <Link href={currentTeam ? `/teams/${currentTeam}/workstyle` : `/report/${invite.id}`} className={REPORT_CTA_CLASS}>
            {t("actions.open")}
          </Link>
        ) : (
          <SentInvitationLinkToggle invitationId={invite.id} status={invite.status} />
        )}
      </div>
    </div>
  );
}

function renderCompactIncomingInvitationRow(invite: InvitationDashboardRow, t: DashboardT, currentTeam?: string | null) {
  const action = currentTeam ? { href: `/teams/${currentTeam}/workstyle`, label: t("team.incomingActions.openTeamReport"), className: REPORT_CTA_CLASS, canOpenCompletionStatus: false } : buildIncomingInvitationAction(invite, t);
  const helperText = null;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{formatIncomingInviteTitle(invite, t)}</p>
        <p className="mt-1 text-sm text-slate-600">
          {t("team.status", { status: getIncomingInviteStatusLabel(invite, t) })}
        </p>
        <p className="text-xs text-slate-500">
          {t("team.created", { date: formatDate(invite.createdAt, t) })}
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

  return {
    href: resumeHref,
    // Phase 10: Die Beschriftung leitet sich nicht mehr aus dem Fortschritt im
    // frueheren Basis-/Werte-Fragebogen ab. /invite/:id/resume fuehrt ueber
    // /join/start in den aktuellen Weg; ein frueherer Bericht bleibt lesbar.
    label: invite.isReportReady
      ? t("actions.open")
      : canOpenCompletionStatus
        ? t("team.incomingActions.openStatus")
        : t("team.incomingActions.openInvitation"),
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


function ConnectionsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5l3.75 3.75-3.75 3.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 16.5L4.5 12.75 8.25 9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 11.25H8.25m7.5 1.5H4.5" />
    </svg>
  );
}
