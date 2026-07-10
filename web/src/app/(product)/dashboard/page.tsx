import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { DashboardDevSection } from "@/features/dashboard/DashboardDevSection";
import { DashboardHeroConstellation } from "@/features/dashboard/DashboardHeroConstellation";
import { DashboardJourneyLine } from "@/features/dashboard/DashboardJourneyLine";
import { DeleteAccountSection } from "@/features/dashboard/DeleteAccountSection";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { signOutAllSessionsAction } from "@/app/(product)/dashboard/actions";
import { SentInvitationLinkToggle } from "@/features/dashboard/SentInvitationLinkToggle";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { normalizeProfileRoles, profileRoleLabel } from "@/features/profile/profileRoles";
import {
  computeProfileCompletion,
  getPrimaryProfileRoleLabel,
  isCoreProfileComplete,
} from "@/features/profile/profileCompletion";
import {
  FOUNDER_DIMENSION_META,
  FOUNDER_DIMENSION_ORDER,
  getFounderDimensionPoleLabels,
} from "@/features/reporting/founderDimensionMeta";
import { sanitizeFounderAlignmentWorkbookPayload } from "@/features/reporting/founderAlignmentWorkbook";
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
import {
  buildWorkbookHref,
  buildWorkbookIntroHref,
  deriveWorkbookNavigationState,
} from "@/features/reporting/workbookNavigation";
import { createClient } from "@/lib/supabase/server";

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
  payload: unknown;
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

type WorkbookDashboardRow = {
  invitation_id: string;
  updated_at: string;
  payload: unknown;
};

type DashboardT = Awaited<ReturnType<typeof getTranslations>>;

const INVITE_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const REPORT_CTA_CLASS =
  "inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const UTILITY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";
const PRIMARY_SURFACE_CLASS =
  "dashboard-card rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]";
const SECONDARY_SURFACE_CLASS =
  "dashboard-card rounded-2xl border border-slate-200/80 bg-slate-50/70 shadow-[0_10px_24px_rgba(15,23,42,0.035)]";
const SELF_RADAR_LABELS = Object.fromEntries(
  FOUNDER_DIMENSION_ORDER.map((dimension) => [dimension, FOUNDER_DIMENSION_META[dimension].shortLabel])
) as Record<string, string>;

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
  const t = await getTranslations("dashboard");
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

  const [selfReport, profileData, initialInvitationRows, initialRunsResult, roleViews] =
    await Promise.all([
      getLatestSelfAlignmentReport(),
      getProfileBasicsRow(supabase, user.id).catch(() => null),
      getInvitationDashboardRows(),
      supabase
        .from("report_runs")
        .select(
          "id, invitation_id, modules, created_at, payload, invitations:invitation_id(id, label, invitee_email, status, created_at)"
        )
        .order("created_at", { ascending: false })
        .limit(20),
      getDashboardRoleViews(user.id),
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
          "id, invitation_id, modules, created_at, payload, invitations:invitation_id(id, label, invitee_email, status, created_at)"
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  }

  if (runsResult.error) {
    return <main className="p-8">Fehler beim Laden der Report-Runs: {runsResult.error.message}</main>;
  }

  const reportRuns = (runsResult.data ?? []) as ReportRunRow[];
  const relevantInvitationIds = [
    ...new Set([...invitationRows.map((invitation) => invitation.id), ...reportRuns.map((run) => run.invitation_id)]),
  ];
  const workbookResult =
    relevantInvitationIds.length > 0
      ? await supabase
          .from("founder_alignment_workbooks")
          .select("invitation_id, updated_at, payload")
          .in("invitation_id", relevantInvitationIds)
          .order("updated_at", { ascending: false })
      : { data: [] as WorkbookDashboardRow[], error: null };

  if (workbookResult.error) {
    return <main className="p-8">Fehler beim Laden der Workbooks: {workbookResult.error.message}</main>;
  }

  const profileCompletion = computeProfileCompletion(profileData);
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
  const valuesStatus = selfReport?.valuesModuleStatus ?? "not_started";
  const profileCompletionLabel = hasSubmittedBase
    ? t("profile.baseComplete", {
        answered: selfReport?.basisAnsweredA ?? 0,
        total: selfReport?.basisTotal ?? 0,
      })
    : t("profile.baseOpen");
  const profileCompletionBadge = t("profile.completion", { percent: profileCompletion.percent });
  const readyReports = reportRuns.slice(0, 3);
  const readyReportInvitationIds = new Set(readyReports.map((report) => report.invitation_id));
  const hasMatchingActivity =
    sentInvitesSorted.length > 0 || receivedInvitesSorted.length > 0 || readyReports.length > 0;
  const invitationById = new Map(invitationRows.map((invitation) => [invitation.id, invitation]));
  const workbookRows = ((workbookResult.data ?? []) as WorkbookDashboardRow[])
    .map((row) => {
      const invitation = invitationById.get(row.invitation_id) ?? null;
      const payload = sanitizeFounderAlignmentWorkbookPayload(row.payload);
      const navigationState = deriveWorkbookNavigationState(payload, invitation?.teamContext ?? null);
      return {
        invitationId: row.invitation_id,
        title: formatDashboardInvitationTitle(invitation),
        updatedAt: row.updated_at,
        href: buildWorkbookHref(row.invitation_id, invitation?.teamContext ?? null),
        hasStarted: navigationState.hasStarted,
        isCompleted: navigationState.isCompleted,
      };
    })
    .filter((row) => row.hasStarted || readyReportInvitationIds.has(row.invitationId));
  const activeWorkbooks = workbookRows.filter((row) => row.hasStarted);
  const latestReadyReport = readyReports[0] ?? null;
  const latestActiveWorkbook = activeWorkbooks[0] ?? null;
  const displayName =
    profileData?.display_name?.trim() || user.email?.split("@")[0]?.trim() || "Founder";
  const workbookEntryPointHref = latestActiveWorkbook
    ? latestActiveWorkbook.href
    : latestReadyReport
      ? buildWorkbookIntroHref(
          latestReadyReport.invitation_id,
          invitationById.get(latestReadyReport.invitation_id)?.teamContext ?? null
        )
      : null;
  const workbookPhase: "upcoming" | "ready_to_start" | "in_progress" | "done" =
    activeWorkbooks.some((workbook) => !workbook.isCompleted)
      ? "in_progress"
      : activeWorkbooks.some((workbook) => workbook.isCompleted)
        ? "done"
        : readyReports.length > 0
          ? "ready_to_start"
          : "upcoming";
  const shouldPrioritizeInviteCta =
    hasSubmittedBase &&
    hasSubmittedValues &&
    !hasMatchingActivity &&
    workbookPhase === "upcoming" &&
    !latestReadyReport &&
    !latestActiveWorkbook;
  const heroExpectationText = shouldPrioritizeInviteCta
    ? t("hero.expectation")
    : null;
  const actionableIncomingInvites = receivedInvitesSorted.filter((invite) => !invite.isReportReady);
  const prioritizedIncomingInvite =
    actionableIncomingInvites.find((invite) => invite.status === "accepted") ??
    actionableIncomingInvites[0] ??
    null;
  const workbookFocusHref =
    workbookEntryPointHref ??
    (latestReadyReport
      ? buildWorkbookIntroHref(
          latestReadyReport.invitation_id,
          invitationById.get(latestReadyReport.invitation_id)?.teamContext ?? null
        )
      : null);
  const contextualInvitationId = params.invitationId?.trim() || prioritizedIncomingInvite?.id || null;
  const contextualInvitation = contextualInvitationId
    ? invitationById.get(contextualInvitationId) ?? null
    : null;
  const contextualDashboardHref = contextualInvitationId
    ? buildInvitationDashboardHref(contextualInvitationId)
    : "/dashboard";
  const contextualWorkbook = contextualInvitation
    ? workbookRows.find((row) => row.invitationId === contextualInvitation.id) ?? null
    : null;
  const contextualMatchingHref = contextualInvitation
    ? contextualInvitation.isReportReady
      ? `/report/${encodeURIComponent(contextualInvitation.id)}`
      : `/dashboard?invitationId=${encodeURIComponent(contextualInvitation.id)}`
    : null;
  const contextualWorkbookHref = contextualInvitation
    ? contextualWorkbook?.href ??
      buildWorkbookIntroHref(contextualInvitation.id, contextualInvitation.teamContext)
    : null;
  const contextualBaseHref = contextualInvitationId
    ? `/me/base?invitationId=${encodeURIComponent(contextualInvitationId)}`
    : "/me/base";
  const contextualValuesHref = contextualInvitationId
    ? `/me/values?invitationId=${encodeURIComponent(contextualInvitationId)}`
    : "/me/values";
  const heroIncomingInvite =
    contextualInvitation?.direction === "incoming" ? contextualInvitation : prioritizedIncomingInvite;
  const currentStep: "basis" | "values" | "matching" | "workbook" = !hasSubmittedBase
    ? "basis"
    : !hasSubmittedValues && !hasMatchingActivity && workbookPhase === "upcoming"
      ? "values"
      : workbookPhase === "ready_to_start" || workbookPhase === "in_progress"
        ? "workbook"
        : "matching";
  const heroPrimaryAction = heroIncomingInvite
    ? buildHeroIncomingInvitationAction(heroIncomingInvite, t)
    : !hasSubmittedBase
    ? {
        href: contextualBaseHref,
        label: t("actions.startProfile"),
        title: t("heroPanel.startProfileTitle"),
        text: t("heroPanel.startProfileText"),
      }
    : !hasSubmittedValues && !hasMatchingActivity
      ? {
          href: contextualValuesHref,
          label:
            valuesStatus === "in_progress" ? t("actions.continueValues") : t("actions.startValues"),
          title:
            valuesStatus === "in_progress"
              ? t("heroPanel.continueValuesTitle")
              : t("heroPanel.startValuesTitle"),
          text: t("heroPanel.valuesText"),
        }
      : latestActiveWorkbook
        ? {
            href: latestActiveWorkbook.href,
            label: t("actions.continueWorkbook"),
            title: t("heroPanel.continueWorkbookTitle"),
            text: t("heroPanel.continueWorkbookText"),
          }
        : latestReadyReport
          ? {
              href:
                workbookEntryPointHref ??
                buildWorkbookIntroHref(
                    latestReadyReport.invitation_id,
                    invitationById.get(latestReadyReport.invitation_id)?.teamContext ?? null
                ),
            label: t("actions.startWorkbook"),
            title: t("heroPanel.startWorkbookTitle"),
            text: t("heroPanel.startWorkbookText"),
          }
        : !hasMatchingActivity
            ? {
                href: "/invite/new",
                label: t("actions.inviteCofounder"),
                title: t("heroPanel.inviteTitle"),
                text: t("heroPanel.inviteText"),
              }
            : {
                href: "/dashboard#dashboard-block-active",
                label: t("actions.trackMatching"),
                title: t("heroPanel.trackTitle"),
                text: t("heroPanel.trackText"),
              };
  const heroCta = workbookFocusHref
    ? {
        href: workbookFocusHref,
        label: latestActiveWorkbook ? t("actions.continueWorkbook") : t("actions.startWorkbook"),
        text: latestActiveWorkbook
          ? t("heroPanel.continueWorkbookText")
          : t("heroPanel.reportReadyWorkbookText"),
      }
    : heroPrimaryAction;
  const heroValuesCta =
    hasSubmittedBase && !hasSubmittedValues && heroCta.href !== contextualValuesHref
      ? {
          href: contextualValuesHref,
          label:
            valuesStatus === "in_progress" ? t("actions.continueValues") : t("actions.startValues"),
          text:
            valuesStatus === "in_progress"
              ? t("heroPanel.valuesContinueHint")
              : t("heroPanel.valuesStartHint"),
        }
      : null;
  const heroPanel = workbookFocusHref
    ? {
        href: heroCta.href,
        label: heroCta.label,
        title: latestActiveWorkbook ? t("heroPanel.continueWorkbookTitle") : t("heroPanel.startWorkbookTitle"),
        text: heroCta.text,
      }
    : heroPrimaryAction;

  const compactProgressItems = [
    {
      id: "basis",
      label: t("progress.basis.label"),
      state: hasSubmittedBase ? "done" : "active",
      detail: hasSubmittedBase ? t("progress.basis.done") : t("progress.basis.open"),
      description: t("progress.basis.description"),
    },
    {
      id: "values",
      label: t("progress.values.label"),
      state: hasSubmittedValues ? "done" : currentStep === "values" ? "active" : "upcoming",
      detail: hasSubmittedValues
        ? t("progress.values.done")
        : currentStep === "values"
          ? valuesStatus === "in_progress"
            ? t("progress.values.inProgress")
            : t("progress.values.open")
          : t("progress.values.optional"),
      description: t("progress.values.description"),
    },
    {
      id: "matching",
      label: t("progress.matching.label"),
      state:
        workbookPhase !== "upcoming" || readyReports.length > 0
          ? "done"
          : currentStep === "matching"
            ? "active"
            : "upcoming",
      detail:
        workbookPhase !== "upcoming" || readyReports.length > 0
          ? t("progress.matching.done")
          : hasMatchingActivity
            ? t("progress.matching.running")
            : t("progress.matching.open"),
      description: t("progress.matching.description"),
    },
    {
      id: "workbook",
      label: t("progress.workbook.label"),
      state:
        workbookPhase === "done"
          ? "done"
          : workbookPhase === "ready_to_start" || workbookPhase === "in_progress"
          ? "active"
          : "upcoming",
      detail:
        workbookPhase === "done"
          ? t("progress.workbook.done")
          : workbookPhase === "in_progress"
          ? t("progress.workbook.active")
          : workbookPhase === "ready_to_start"
            ? t("progress.workbook.ready")
            : t("progress.workbook.open"),
      description: t("progress.workbook.description"),
    },
  ] as const;
  const additionalRoles = normalizeProfileRoles(profileData?.roles ?? ["founder"]).slice(1);
  const profileInfoRows = [
    { label: t("profile.name"), value: profileData?.display_name?.trim() || t("profile.unset") },
    { label: t("profile.role"), value: getPrimaryProfileRoleLabel(profileData) },
    { label: t("profile.focus"), value: profileData?.focus_skill?.trim() || t("profile.unset") },
    { label: t("profile.intention"), value: profileData?.intention?.trim() || t("profile.unset") },
    ...(additionalRoles.length > 0
      ? [
          {
            label: t("profile.additionalModes"),
            value: additionalRoles.map((role) => profileRoleLabel(role)).join(", "),
          },
        ]
      : []),
  ] as const;
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
          workbookHref={contextualWorkbookHref}
          activeView="founder"
          contextLabel={t("hero.contextLabel")}
        />
      ) : null}
      <DashboardJourneyLine />

      <section data-dashboard-hero className="relative isolate mb-10 lg:mb-12">
        <div className="relative rounded-[32px]">
          <DashboardHeroConstellation />
          <div className="relative z-10">
            {params.error ? (
              <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t("hero.error", { error: params.error })}
              </p>
            ) : null}

            <section
              className="dashboard-panel dashboard-fade-up grid gap-5 rounded-[28px] border border-slate-200/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] lg:grid-cols-[minmax(0,0.94fr)_minmax(320px,0.86fr)] lg:p-6"
              style={staggerStyle(40)}
            >
              <div>
                <div className="flex items-center gap-3.5">
                  <DashboardProfileAvatar
                    displayName={displayName}
                    avatarId={profileAvatarId}
                    imageUrl={profileImageUrl}
                  />
                  <div className="min-w-0 max-w-xl">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      {t("hero.eyebrow")}
                    </p>
                    <h1 className="mt-1.5 text-[1.9rem] font-semibold leading-[1.04] text-slate-950 md:text-[2.55rem] md:leading-[1.02]">
                      {t("hero.greeting", { name: displayName })}
                    </h1>
                  </div>
                </div>

                <article className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(103,232,249,0.08),rgba(255,255,255,0.95)_45%,rgba(124,58,237,0.05))] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.035)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
                      <QuoteIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t("hero.quoteEyebrow")}
                      </p>
                      <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-700">
                        „{quoteOfTheDay.text}“
                      </p>
                    </div>
                  </div>
                </article>

                <article className="mt-5 rounded-[24px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.035)]">
                  <h2 className="text-xl font-semibold text-slate-950">{heroPanel.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                    {heroPanel.text}
                  </p>
                  {heroExpectationText && heroCta.href === heroPrimaryAction.href ? (
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                      {heroExpectationText}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={heroPanel.href}
                      className={`${INVITE_CTA_CLASS} shadow-[0_12px_24px_rgba(34,211,238,0.16)]`}
                    >
                      {heroPanel.label}
                    </Link>
                    {heroValuesCta ? (
                      <Link href={heroValuesCta.href} className={UTILITY_CTA_CLASS}>
                        {heroValuesCta.label}
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <DashboardProgressRoadmap items={compactProgressItems} />
                  </div>
                </article>
              </div>

              <article className={`${SECONDARY_SURFACE_CLASS} overflow-hidden p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                        <ReportIcon className="h-4 w-4" />
                      </span>
                      {t("profileSnapshot.eyebrow")}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">
                      {t("profileSnapshot.title")}
                    </h2>
                  </div>
                  {selfReport ? (
                    <Link href="/me/report" className={UTILITY_CTA_CLASS}>
                      {t("actions.openReport")}
                    </Link>
                  ) : null}
                </div>
                {selfReport ? (
                  <>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {t("profileSnapshot.text")}
                    </p>
                    <div className="mt-5">
                      <FounderDimensionsOverview scores={selfReport.scoresA} />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {t("profileSnapshot.empty")}
                  </p>
                )}
              </article>
            </section>
          </div>
        </div>
      </section>

      <section
        id="dashboard-block-active"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-6"
        style={staggerStyle(120)}
      >
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
              <MatchingIcon className="h-4 w-4" />
            </span>
            {t("team.eyebrow")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {t("team.title")}
          </h2>
        </div>

        <article className={`${PRIMARY_SURFACE_CLASS} mt-5 p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
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
        </article>

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
        id="dashboard-block-profile"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-2xl border border-slate-200/70 bg-white/88 p-6 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
        style={staggerStyle(130)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                <CompassIcon className="h-4 w-4" />
              </span>
              {t("profile.eyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {t("profile.title")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {t("profile.text")}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <section id="dashboard-block-profile-data" className={`${PRIMARY_SURFACE_CLASS} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                    <CompassIcon className="h-4 w-4" />
                  </span>
                  {t("profile.profileEyebrow")}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  {needsOnboarding ? t("profile.createTitle") : t("profile.currentTitle")}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-medium tracking-[0.08em] text-slate-600">
                <span className="rounded-full border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-3 py-1">
                  {profileCompletionLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/75 px-3 py-1">
                  {profileCompletionBadge}
                </span>
                <span className="rounded-full border border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/8 px-3 py-1">
                  {hasSubmittedValues ? t("profile.valuesComplete") : t("profile.valuesOptional")}
                </span>
                {profileCompletion.ctaLabel ? (
                  <span className="rounded-full border border-slate-200 bg-white/75 px-3 py-1">
                    {profileCompletion.ctaLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {profileInfoRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{row.label}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5">
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
              ) : (
                <details className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    {t("actions.editProfile")}
                  </summary>
                  <div className="mt-4">
                    <ProfileBasicsForm
                      mode="edit"
                      initialValues={{
                        display_name: profileData?.display_name ?? null,
                        focus_skill: profileData?.focus_skill ?? null,
                        intention: profileData?.intention ?? null,
                        roles: profileData?.roles ?? null,
                        avatar_id: profileData?.avatar_id ?? null,
                        avatar_url: profileData?.avatar_url ?? null,
                      }}
                      submitLabel={t("actions.updateProfile")}
                      onSuccessRedirectTo={contextualDashboardHref}
                      fallbackAvatarUrl={profileImageUrl}
                    />
                  </div>
                </details>
              )}
            </div>
          </section>

          <section id="dashboard-block-account" className={`${SECONDARY_SURFACE_CLASS} p-6`}>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
              <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
                <ProfileIcon className="h-4 w-4" />
              </span>
              {t("account.eyebrow")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{t("account.title")}</h3>

            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/92 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                {t("account.emailLabel")}
              </p>
              <div className="mt-3">
                <p className="text-sm font-medium text-slate-900">
                  {user.email ?? t("account.emailUnavailable")}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {t("account.magicLinkText")}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {t("account.securityText")}
                </p>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {t("account.supportText")}
                </p>
                <a
                  href={`mailto:${supportEmail}?subject=${encodeURIComponent(t("account.supportSubject"))}`}
                  className={`${UTILITY_CTA_CLASS} mt-4`}
                >
                  {t("actions.contactSupport")}
                </a>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <form action={signOutAllSessionsAction}>
                <button type="submit" className={UTILITY_CTA_CLASS}>
                  {t("actions.signOutAll")}
                </button>
              </form>
            </div>

            <DeleteAccountSection />
          </section>
        </div>
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

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200/80 bg-white/88 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("outlook.items.progressTitle")}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {t("outlook.comingSoon")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("outlook.items.progressText")}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/80 bg-white/88 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("outlook.items.deepeningTitle")}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {t("outlook.planned")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("outlook.items.deepeningText")}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/80 bg-white/88 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("outlook.items.investorTitle")}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {t("outlook.perspective")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("outlook.items.investorText")}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/80 bg-white/88 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("outlook.items.teamTitle")}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {t("outlook.later")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("outlook.items.teamText")}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/80 bg-white/88 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("outlook.items.libraryTitle")}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {t("outlook.expand")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("outlook.items.libraryText")}
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

function formatDashboardInvitationTitle(invitation: InvitationDashboardRow | null) {
  if (!invitation) return "Workbook";
  return (
    resolveInvitationTeamName(invitation.label, invitation.inviteeEmail) ||
    invitation.inviteeEmail ||
    invitation.id
  );
}

function FounderDimensionsOverview({
  scores,
}: {
  scores: Record<string, number | null | undefined>;
}) {
  return (
    <div className="space-y-3">
      {FOUNDER_DIMENSION_ORDER.map((dimension) => {
        const value = formatScoreValue(scores[dimension]);
        const meta = FOUNDER_DIMENSION_META[dimension];
        const uiPoles = getFounderDimensionPoleLabels(dimension, "ui");
        const reportPoles = getFounderDimensionPoleLabels(dimension, "report");
        return (
          <div key={dimension}>
            <div className="mb-1.5">
              <span className="text-sm font-medium text-slate-700">{SELF_RADAR_LABELS[dimension]}</span>
            </div>
            <div className="relative h-2 rounded-full bg-slate-100">
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white bg-[linear-gradient(180deg,rgba(34,211,238,0.95),rgba(124,58,237,0.75))] shadow-[0_8px_20px_rgba(34,211,238,0.18)]"
                style={{ left: `clamp(0px, calc(${value}% - 8px), calc(100% - 16px))` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-400">
              <span title={reportPoles?.left}>{uiPoles?.left ?? meta.uiLeftPole}</span>
              <span title={reportPoles?.right}>{uiPoles?.right ?? meta.uiRightPole}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
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

function buildHeroIncomingInvitationAction(invite: InvitationDashboardRow, t: DashboardT) {
  const action = buildIncomingInvitationAction(invite, t);
  const inviterName = resolveIncomingInviterName(invite);
  const needsBaseStart = !invite.inviteeBaseSubmitted && !invite.inviteeBaseStarted;
  const needsBaseContinue = !invite.inviteeBaseSubmitted && invite.inviteeBaseStarted;

  if (invite.isReportReady) {
    return {
      href: action.href,
      label: t("team.incomingHero.reportReadyLabel"),
      title: t("team.incomingHero.reportReadyTitle"),
      text: t("team.incomingHero.reportReadyText", { name: inviterName }),
    };
  }

  if (needsBaseStart) {
    return {
      href: action.href,
      label: t("team.incomingActions.startMatching"),
      title: t("team.incomingHero.baseStartTitle"),
      text: t("team.incomingHero.baseStartText", { name: inviterName }),
    };
  }

  if (needsBaseContinue) {
    return {
      href: action.href,
      label: t("team.incomingHero.baseContinueLabel"),
      title: t("team.incomingHero.baseContinueTitle"),
      text: t("team.incomingHero.baseContinueText", { name: inviterName }),
    };
  }

  if (action.canOpenCompletionStatus) {
    return {
      href: action.href,
      label: t("team.incomingHero.baseContinueLabel"),
      title: t("team.incomingHero.priorityTitle"),
      text: t("team.incomingHero.statusText", { name: inviterName }),
    };
  }

  return {
    href: action.href,
    label: t("team.incomingHero.baseContinueLabel"),
    title: t("team.incomingHero.priorityTitle"),
    text: t("team.incomingHero.flowText", { name: inviterName }),
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

function formatScoreValue(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function DashboardProgressRoadmap({
  items,
}: {
  items: ReadonlyArray<{
    id: string;
    label: string;
    state: "done" | "active" | "upcoming";
    detail: string;
    description: string;
  }>;
}) {
  const activeIndex = Math.max(
    items.findIndex((item) => item.state === "active"),
    items.findLastIndex((item) => item.state === "done")
  );
  const fillPercent =
    items.length > 1 && activeIndex >= 0 ? (activeIndex / (items.length - 1)) * 100 : 0;

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/78 px-3.5 py-4 sm:px-4 sm:py-[1.125rem] lg:px-5">
      <div className="relative hidden md:block">
        <div className="absolute left-[34px] right-[34px] top-4 h-px bg-slate-200/90" />
        <div
          className="absolute left-[34px] top-4 h-px bg-[linear-gradient(90deg,rgba(148,163,184,0.16),rgba(34,211,238,0.72),rgba(34,211,238,0.28))] transition-all duration-500"
          style={{ width: `calc((100% - 68px) * ${fillPercent / 100})` }}
        />

        <div className="relative grid grid-cols-4 gap-2.5 lg:gap-3">
          {items.map((item, index) => {
            const isDone = item.state === "done";
            const isActive = item.state === "active";

            return (
              <div key={item.id} className="group text-center" title={item.description}>
                <div className="flex justify-center">
                  <span className="relative z-10 inline-flex rounded-full bg-slate-50/95 p-1">
                    <span
                      className={`flex items-center justify-center rounded-full border transition-all duration-300 ${
                        isActive
                          ? "h-9 w-9 border-[color:var(--brand-primary)]/35 bg-[color:var(--brand-primary)]/16 text-slate-900 shadow-[0_10px_20px_rgba(34,211,238,0.12)]"
                          : isDone
                            ? "h-8 w-8 border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "h-8 w-8 border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {isDone ? (
                        <RoadmapCheckIcon className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-[10px] font-semibold">{index + 1}</span>
                      )}
                    </span>
                  </span>
                </div>
                <div className="mt-3 px-1">
                  <p
                    className={`text-[12px] font-medium leading-5 lg:text-[13px] ${
                      isActive ? "text-slate-950" : "text-slate-800"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:hidden">
        {items.map((item, index) => {
          const isDone = item.state === "done";
          const isActive = item.state === "active";

          return (
            <div
              key={item.id}
              title={item.description}
              className={`rounded-2xl border px-3 py-3 ${
                isActive
                  ? "border-[color:var(--brand-primary)]/30 bg-[color:var(--brand-primary)]/10"
                  : isDone
                    ? "border-slate-200/80 bg-white/88"
                    : "border-slate-200/80 bg-white/72"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full border ${
                    isActive
                      ? "h-[2.125rem] w-[2.125rem] border-[color:var(--brand-primary)]/35 bg-[color:var(--brand-primary)]/14 text-slate-900"
                      : isDone
                        ? "h-8 w-8 border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "h-8 w-8 border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {isDone ? (
                    <RoadmapCheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[10px] font-semibold">{index + 1}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium leading-5 text-slate-900 sm:text-[13px]">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    {item.detail}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a7.5 7.5 0 0115 0" />
    </svg>
  );
}

function CompassIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.9 9.1l-1.98 5.94-5.94 1.98 1.98-5.94 5.94-1.98z" />
    </svg>
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

function MatchingIcon({ className = "h-4 w-4" }: { className?: string }) {
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

function RoadmapCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12.75l3.5 3.5 7-8" />
    </svg>
  );
}
