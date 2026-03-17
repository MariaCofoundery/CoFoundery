import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { CopyLinkButton } from "@/features/dashboard/CopyLinkButton";
import { DashboardDevSection } from "@/features/dashboard/DashboardDevSection";
import { DashboardHeroConstellation } from "@/features/dashboard/DashboardHeroConstellation";
import { DailyQuote } from "@/features/dashboard/DailyQuote";
import { DashboardJourneyLine } from "@/features/dashboard/DashboardJourneyLine";
import { DashboardViewSwitch } from "@/features/dashboard/DashboardViewSwitch";
import { DAILY_QUOTES } from "@/features/dashboard/dailyQuotes";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { SentInvitationLinkToggle } from "@/features/dashboard/SentInvitationLinkToggle";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { AlignmentRadarChart } from "@/features/reporting/AlignmentRadarChart";
import { FOUNDER_DIMENSION_META, FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";
import { KeyInsights } from "@/features/reporting/KeyInsights";
import {
  debug_invitation_readiness,
  finalizeInvitationIfReady,
  getInvitationDashboardRows,
  getLatestSelfAlignmentReport,
  type InvitationDashboardRow,
  type InvitationReadinessDebug,
} from "@/features/reporting/actions";
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

const INVITE_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const REPORT_CTA_CLASS =
  "inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-accent)]/25 bg-[color:var(--brand-accent)]/8 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-[color:var(--brand-accent)]/14";
const UTILITY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";
const PRIMARY_SURFACE_CLASS =
  "dashboard-card rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]";
const SECONDARY_SURFACE_CLASS =
  "dashboard-card rounded-2xl border border-slate-200/80 bg-slate-50/70 shadow-[0_10px_24px_rgba(15,23,42,0.035)]";
const SELF_RADAR_LABELS = Object.fromEntries(
  FOUNDER_DIMENSION_ORDER.map((dimension) => [dimension, FOUNDER_DIMENSION_META[dimension].shortLabel])
) as Record<string, string>;

function getDayOfYear(date: Date) {
  const startOfYearUtc = Date.UTC(date.getUTCFullYear(), 0, 0);
  const currentUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((currentUtc - startOfYearUtc) / 86_400_000);
}

function staggerStyle(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
  };
}

function normalizeMetadataName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const supabase = await createClient();
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
  const needsOnboarding =
    !profileData?.display_name?.trim() || !profileData?.focus_skill || !profileData?.intention;
  const sentInvites = invitationRows.filter((row) => row.direction === "sent");
  const receivedInvites = invitationRows.filter((row) => row.direction === "incoming");
  const sentInvitesSorted = sortInvitationsByCreatedAtDesc(sentInvites);
  const latestSentInvite = sentInvitesSorted[0] ?? null;
  const olderSentInvites = sentInvitesSorted.slice(1);
  const receivedInvitesSorted = sortInvitationsByCreatedAtDesc(receivedInvites);
  const latestReceivedInvite = receivedInvitesSorted[0] ?? null;
  const olderReceivedInvites = receivedInvitesSorted.slice(1);
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
  const reportRuns = (runsResult.data ?? []) as ReportRunRow[];
  const hasSubmittedBase = Boolean(selfReport);
  const hasSubmittedValues = selfReport?.valuesModuleStatus === "completed";
  const dayOfYear = getDayOfYear(new Date());
  const quoteIndex = DAILY_QUOTES.length > 0 ? (dayOfYear - 1) % DAILY_QUOTES.length : 0;
  const quoteOfDay = DAILY_QUOTES[quoteIndex] ?? "Klarheit schlägt Zufall.";
  const displayName =
    profileData?.display_name?.trim() ||
    normalizeMetadataName(user.user_metadata?.display_name) ||
    normalizeMetadataName(user.user_metadata?.full_name) ||
    user.email?.split("@")[0] ||
    "Founder";
  const valuesStatus = selfReport?.valuesModuleStatus ?? "not_started";
  const valuesSummary =
    selfReport?.selfValuesProfile?.summary?.trim() ||
    selfReport?.valuesModulePreview?.trim() ||
    "Das Werteprofil ergänzt dein Basisprofil um die Frage, welche inneren Leitplanken deine Entscheidungen prägen.";
  const profileCompletionLabel = hasSubmittedBase
    ? `Basisprofil abgeschlossen (${selfReport?.basisAnsweredA ?? 0}/${selfReport?.basisTotal ?? 0})`
    : "Basisprofil noch offen";
  const valuesCompletionLabel =
    selfReport?.valuesTotal && selfReport.valuesTotal > 0
      ? `${selfReport.valuesAnsweredA}/${selfReport.valuesTotal} Wertefragen beantwortet`
      : "Werteprofil optional";
  const primaryAction = !hasSubmittedBase
    ? { href: "/me/base", label: "Basisprofil starten" }
    : !hasSubmittedValues
      ? { href: "/me/values", label: "Werteprofil abschließen" }
      : { href: "/me/report", label: "Individuellen Report öffnen" };
  const valuesAction = hasSubmittedValues
    ? { href: "/me/report#werteprofil", label: "Werteprofil öffnen" }
    : {
        href: "/me/values",
        label: valuesStatus === "in_progress" ? "Werteprofil fortsetzen" : "Werteprofil starten",
      };
  const matchingAction = hasSubmittedBase
    ? { href: "/invite/new", label: "Co-Founder einladen" }
    : null;
  const nextStepHeadline = !hasSubmittedBase
    ? "Starte mit deinem Basisprofil."
    : !hasSubmittedValues
      ? "Ergänze als Nächstes dein Werteprofil."
      : sentInvitesSorted.length > 0 || receivedInvitesSorted.length > 0
        ? "Dein Profil ist bereit für Matching und Gespräche."
        : "Dein Profil ist bereit für den nächsten Matching-Schritt.";
  const nextStepText = !hasSubmittedBase
    ? "Der Basisfragebogen legt dein Founder-Profil an und macht Radar, Insights und Report erst sinnvoll nutzbar."
    : !hasSubmittedValues
      ? "Mit dem Werteprofil ergänzt du dein Basisprofil um innere Prioritäten und Leitplanken für spätere Entscheidungen."
      : "Lies deinen Report, schärfe dein Profil weiter und nutze es als Grundlage für Co-Founder-Gespräche und Matching.";
  const readyReports = reportRuns.slice(0, 3);
  const hasMatchingActivity =
    sentInvitesSorted.length > 0 || receivedInvitesSorted.length > 0 || readyReports.length > 0;
  const dashboardJourneyItems = [
    { id: "dashboard-journey-profile", label: "Profil", completed: hasSubmittedBase },
    { id: "dashboard-journey-values", label: "Werteprofil", completed: hasSubmittedValues },
    { id: "dashboard-journey-matching", label: "Matching", completed: hasMatchingActivity },
    { id: "dashboard-journey-conversation", label: "Gespräch", completed: readyReports.length > 0 },
    { id: "dashboard-journey-workbook", label: "Workbook", completed: false },
  ];
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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-16 md:px-10 xl:px-12">
      <DashboardJourneyLine items={dashboardJourneyItems} />
      <section data-dashboard-hero className="relative isolate mb-8">
        <div className="relative rounded-[32px]">
        <DashboardHeroConstellation />
        <div className="relative z-10">
          <div className="dashboard-fade-up" style={staggerStyle(10)}>
            <DailyQuote displayName={profileData?.display_name ?? null} quote={quoteOfDay} />
          </div>
          <header className="dashboard-fade-up mb-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Founder-Plattform</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">Dein Founder Dashboard</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Hier laufen dein Profil, dein Werte-Layer und deine Matching-Schritte zusammen.
          </p>
          {profileData?.focus_skill && profileData?.intention ? (
            <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">
              Fokus: {profileData.focus_skill} · Intention: {profileData.intention}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <DashboardViewSwitch
            activeView="founder"
            hasFounder={roleViews.hasFounder}
            hasAdvisor={roleViews.hasAdvisor}
          />
          <form action={signOutAction}>
            <button
              type="submit"
              className={UTILITY_CTA_CLASS}
            >
              Abmelden
            </button>
          </form>
        </div>
          </header>

          <section className="mb-6">
        {needsOnboarding ? (
          <ProfileBasicsForm
            mode="onboarding"
            initialValues={{
              display_name: profileData?.display_name ?? null,
              focus_skill: profileData?.focus_skill ?? null,
              intention: profileData?.intention ?? null,
              roles: profileData?.roles ?? null,
            }}
            submitLabel="Profil speichern"
            onSuccessRedirectTo="/dashboard"
            variant="accent"
          />
        ) : (
          <details className="rounded-2xl border border-slate-200/80 bg-white/95 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Profil-Basics bearbeiten
            </summary>
            <div className="mt-4">
              <ProfileBasicsForm
                mode="edit"
                initialValues={{
                  display_name: profileData?.display_name ?? null,
                  focus_skill: profileData?.focus_skill ?? null,
                  intention: profileData?.intention ?? null,
                  roles: profileData?.roles ?? null,
                }}
                submitLabel="Profil aktualisieren"
                onSuccessRedirectTo="/dashboard"
              />
            </div>
          </details>
        )}
          </section>

          {params.error ? (
            <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Hinweis: {params.error}
            </p>
          ) : null}

          <section className="dashboard-panel dashboard-fade-up mb-8 rounded-[28px] border border-slate-200/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] lg:p-8" style={staggerStyle(40)}>
        <div className="grid gap-8 xl:grid-cols-[1.05fr_1.15fr]">
          <div className="space-y-5">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <span className="dashboard-icon-chip h-8 w-8 border-none bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)] shadow-none">
                  <ProfileIcon className="h-4 w-4" />
                </span>
                Profilzentrale
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">Hallo {displayName}</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                Das ist dein persönlicher Startpunkt im Founder-System. Hier siehst du dein Basisprofil,
                dein Werteprofil und die nächsten sinnvollen Schritte für Report und Matching.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-slate-700">
                {profileCompletionLabel}
              </span>
              <span className="inline-flex rounded-full border border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/8 px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-slate-700">
                {hasSubmittedValues ? "Werteprofil abgeschlossen" : valuesCompletionLabel}
              </span>
            </div>

            <article
              id="dashboard-journey-profile"
              className={`${PRIMARY_SURFACE_CLASS} dashboard-fade-up scroll-mt-28 p-5`}
              style={staggerStyle(90)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                      <CompassIcon className="h-4 w-4" />
                    </span>
                    Basisprofil
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {hasSubmittedBase ? "Dein Founder-Profil ist angelegt." : "Dein Founder-Profil wartet auf den Start."}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  hasSubmittedBase
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {hasSubmittedBase ? "abgeschlossen" : "offen"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {hasSubmittedBase
                  ? "Dein Basisprofil zeigt, wie du in Strategie, Entscheidungen und Zusammenarbeit aktuell tendierst."
                  : "Mit dem Basisprofil legst du den Ausgangspunkt für Radar, Insights und deinen individuellen Founder Report."}
              </p>
            </article>

            <article
              id="dashboard-journey-values"
              className={`${PRIMARY_SURFACE_CLASS} dashboard-fade-up scroll-mt-28 border-[color:var(--brand-accent)]/16 bg-[color:var(--brand-accent)]/5 p-5`}
              style={staggerStyle(140)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
                      <ValuesIcon className="h-4 w-4" />
                    </span>
                    Werteprofil
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {hasSubmittedValues ? "Dein zweiter Profil-Layer ist bereit." : "Das Werteprofil ergänzt dein Founder-Profil."}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  hasSubmittedValues
                    ? "bg-[color:var(--brand-accent)]/10 text-slate-700"
                    : valuesStatus === "in_progress"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                }`}>
                  {hasSubmittedValues ? "bereit" : valuesStatus === "in_progress" ? "in Bearbeitung" : "optional"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{valuesSummary}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={valuesAction.href} className={SECONDARY_CTA_CLASS}>
                  {valuesAction.label}
                </a>
                {hasSubmittedValues ? (
                  <a href="/me/report#werteprofil" className={UTILITY_CTA_CLASS}>
                    Im Report ansehen
                  </a>
                ) : null}
              </div>
            </article>

            <article className={`${SECONDARY_SURFACE_CLASS} dashboard-fade-up p-5`} style={staggerStyle(190)}>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                  <NextStepIcon className="h-4 w-4" />
                </span>
                Nächster sinnvoller Schritt
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{nextStepHeadline}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{nextStepText}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={primaryAction.href} className={`${INVITE_CTA_CLASS} shadow-[0_12px_24px_rgba(34,211,238,0.18)]`}>
                  {primaryAction.label}
                </a>
                {matchingAction ? (
                  <a href={matchingAction.href} className={UTILITY_CTA_CLASS}>
                    {matchingAction.label}
                  </a>
                ) : null}
              </div>
            </article>

            {!needsOnboarding ? (
              <details className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Profil-Basics bearbeiten
                </summary>
                <div className="mt-4">
                  <ProfileBasicsForm
                    mode="edit"
                    initialValues={{
                      display_name: profileData?.display_name ?? null,
                      focus_skill: profileData?.focus_skill ?? null,
                      intention: profileData?.intention ?? null,
                      roles: profileData?.roles ?? null,
                    }}
                    submitLabel="Profil aktualisieren"
                    onSuccessRedirectTo="/dashboard"
                  />
                </div>
              </details>
            ) : null}
          </div>

          <div className="space-y-6">
            {selfReport ? (
              <>
                <article className={`${PRIMARY_SURFACE_CLASS} dashboard-fade-up overflow-hidden bg-white/95 p-6`} style={staggerStyle(120)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                          <ReportIcon className="h-4 w-4" />
                        </span>
                        Profil-Snapshot
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">Dein aktuelles Founder-Profil</h3>
                    </div>
                    <a href="/me/report" className={UTILITY_CTA_CLASS}>
                      Report lesen
                    </a>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Das Radar zeigt deine aktuelle Tendenz in sechs Founder-Dimensionen. Unterschiede zu anderen Founder-Profilen sind hier keine Stärke oder Schwäche, sondern unterschiedliche Präferenzen.
                  </p>
                  <div className="dashboard-radar-shell mt-5 rounded-[24px] border border-slate-100/80 p-2">
                    <AlignmentRadarChart
                      participants={[
                        {
                          id: "self",
                          label: selfReport.participantAName || "Du",
                          color: "#22d3ee",
                          scores: selfReport.scoresA,
                        },
                      ]}
                      dimensions={FOUNDER_DIMENSION_ORDER}
                      labels={SELF_RADAR_LABELS}
                      valueScale="founder_percent"
                    />
                  </div>
                </article>
                <div className="dashboard-fade-up" style={staggerStyle(170)}>
                  <KeyInsights insights={selfReport.keyInsights} />
                </div>
              </>
            ) : (
              <article className={`${PRIMARY_SURFACE_CLASS} dashboard-fade-up bg-white/95 p-6`} style={staggerStyle(120)}>
                <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                    <ReportIcon className="h-4 w-4" />
                  </span>
                  Profil-Snapshot
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Dein Founder-Profil entsteht mit dem Basisfragebogen</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Sobald du das Basisprofil ausfüllst, erscheinen hier dein Radar, zentrale Insights und der Einstieg in deinen individuellen Report.
                </p>
              </article>
            )}
          </div>
        </div>
          </section>
        </div>
        </div>
      </section>

      <section
        id="dashboard-journey-matching"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.04)] lg:p-8"
        style={staggerStyle(80)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
                <MatchingIcon className="h-4 w-4" />
              </span>
              Matching
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Einladungen, laufende Matches und Reports</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Hier behältst du den Überblick darüber, welche Gespräche laufen, welche Einladungen offen sind und welche Matching-Reports bereits bereitstehen.
            </p>
          </div>
          <Link href="/invite/new" className={hasSubmittedBase ? INVITE_CTA_CLASS : UTILITY_CTA_CLASS}>
            Co-Founder einladen
          </Link>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          <article className={`${SECONDARY_SURFACE_CLASS} dashboard-fade-up p-5`} style={staggerStyle(120)}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Aktive Einladungen</h3>
              <span className="text-xs tracking-[0.08em] text-slate-500">{sentInvitesSorted.length}</span>
            </div>
            <div className="mt-4">
              {latestSentInvite ? (
                <ul className="space-y-3">
                  <li className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    {renderInvitationCard({
                      invite: latestSentInvite,
                      isDev: false,
                      debug: null,
                    })}
                  </li>
                </ul>
              ) : (
                <p className="text-sm leading-7 text-slate-500">
                  {hasSubmittedBase
                    ? "Noch keine aktiven Einladungen. Sobald du jemanden einlädst, siehst du den Status hier."
                    : "Sobald dein Basisprofil steht, kannst du von hier aus Co-Founder einladen."}
                </p>
              )}

              {olderSentInvites.length > 0 ? (
                <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-700">
                    Weitere Einladungen ({olderSentInvites.length})
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {olderSentInvites.map((invite) => (
                      <li key={invite.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                        {renderInvitationCard({
                          invite,
                          isDev: false,
                          debug: null,
                        })}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </article>

          <article className={`${SECONDARY_SURFACE_CLASS} dashboard-fade-up p-5`} style={staggerStyle(160)}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Eingehende Einladungen</h3>
              <span className="text-xs tracking-[0.08em] text-slate-500">{receivedInvitesSorted.length}</span>
            </div>
            <div className="mt-4">
              {latestReceivedInvite ? (
                <ul className="space-y-3">
                  <li className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    {renderIncomingInvitationCard({
                      invite: latestReceivedInvite,
                      isDev: false,
                      debug: null,
                    })}
                  </li>
                </ul>
              ) : (
                <p className="text-sm leading-7 text-slate-500">
                  Noch keine Einladungen an dich. Neue Matching-Anfragen tauchen hier auf.
                </p>
              )}

              {olderReceivedInvites.length > 0 ? (
                <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-700">
                    Weitere Einladungen ({olderReceivedInvites.length})
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {olderReceivedInvites.map((invite) => (
                      <li key={invite.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                        {renderIncomingInvitationCard({
                          invite,
                          isDev: false,
                          debug: null,
                        })}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </article>

          <article
            id="dashboard-journey-conversation"
            className={`${SECONDARY_SURFACE_CLASS} dashboard-fade-up scroll-mt-28 p-5`}
            style={staggerStyle(200)}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Bereite Matching-Reports</h3>
              <span className="text-xs tracking-[0.08em] text-slate-500">{readyReports.length}</span>
            </div>
            <div className="mt-4">
              {readyReports.length > 0 ? (
                <ul className="space-y-3">
                  {readyReports.map((run) => {
                    const invitation = Array.isArray(run.invitations)
                      ? run.invitations[0] ?? null
                      : run.invitations;
                    return (
                      <li key={run.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">
                          {invitation?.label ?? invitation?.invitee_email ?? run.invitation_id}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Module: {formatInvitationModules(run.modules ?? [])}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Erstellt: {formatDate(run.created_at)}</p>
                        <a href={`/report/${run.invitation_id}`} className={`mt-3 ${REPORT_CTA_CLASS}`}>
                          Report öffnen
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm leading-7 text-slate-500">
                  {hasMatchingActivity
                    ? "Sobald aus euren Einladungen fertige Matches werden, erscheinen die Reports hier."
                    : "Noch keine Matching-Reports vorhanden. Sie erscheinen, sobald beide Seiten ihre Profile abgeschlossen haben."}
                </p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section
        id="dashboard-journey-workbook"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white/95 p-6"
        style={staggerStyle(120)}
      >
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-900">
          <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
            <LayersIcon className="h-4 w-4" />
          </span>
          Ausblick
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Weitere Module wie Stress & Belastung, Rollenverständnis oder Team-Reports bauen auf demselben Founder-Profil auf und werden hier später als zusätzliche Layer ergänzt.
        </p>
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

function formatDate(value: string | null | undefined) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}

function resolveIncomingInviterName(invite: InvitationDashboardRow) {
  const inviterDisplayName = invite.inviterDisplayName?.trim();
  if (inviterDisplayName) return inviterDisplayName;
  const inviterEmail = invite.inviterEmail?.trim();
  if (inviterEmail) return inviterEmail;
  return "Co-Founder";
}

function formatIncomingInviteTitle(invite: InvitationDashboardRow) {
  return `${resolveIncomingInviterName(invite)} hat dich eingeladen`;
}

function getIncomingInviteStatusLabel(invite: InvitationDashboardRow) {
  if (invite.isReportReady) return "Report bereit";
  if (invite.isReadyForMatching) return "Report wird erstellt";
  const requiresValues = invite.requiredModules.includes("values");
  const inviteeHasAllRequired =
    invite.inviteeBaseSubmitted && (!requiresValues || invite.inviteeValuesSubmitted);
  return inviteeHasAllRequired ? "Warte auf Co-Founder" : "Fragebogen offen";
}

function getSentInviteStatusLabel(invite: InvitationDashboardRow) {
  if (invite.isReportReady) return "Report bereit";
  if (invite.isReadyForMatching) return "Report wird erstellt";
  const requiresValues = invite.requiredModules.includes("values");
  const inviterHasAllRequired =
    invite.inviterBaseSubmitted && (!requiresValues || invite.inviterValuesSubmitted);
  const inviteeHasAllRequired =
    invite.inviteeBaseSubmitted && (!requiresValues || invite.inviteeValuesSubmitted);
  if (!inviterHasAllRequired) return "Deine Antworten fehlen";
  return inviteeHasAllRequired ? "Report wird erstellt" : "Warte auf Antworten";
}

function formatInvitationModules(modules: string[]) {
  const moduleKeys = (modules ?? []).filter((value): value is string => Boolean(value));
  if (moduleKeys.length === 0) return "Basis";

  const labels = moduleKeys.map((key) => {
    if (key === "base") return "Basis";
    if (key === "values") return "Werte";
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

function renderInvitationCard(params: {
  invite: InvitationDashboardRow;
  isDev: boolean;
  debug: InvitationReadinessDebug | null;
}) {
  const { invite, isDev, debug } = params;
  const title = invite.label ?? invite.inviteeEmail;
  return (
    <>
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1">Status: {getSentInviteStatusLabel(invite)}</p>
      <p className="text-xs text-slate-500">Module: {formatInvitationModules(invite.requiredModules)}</p>
      <p className="text-xs text-slate-500">Ablauf: {formatDate(invite.expiresAt)}</p>
      <SentInvitationLinkToggle invitationId={invite.id} status={invite.status} />
      {invite.isReportReady ? (
        <a
          href={`/report/${invite.id}`}
          className={`mt-2 ${REPORT_CTA_CLASS}`}
        >
          Report öffnen
        </a>
      ) : null}
      {isDev ? (
        <details className="mt-2 rounded-md border border-slate-200 bg-slate-50/70 p-2">
          <summary className="cursor-pointer text-xs text-slate-600">Debug anzeigen</summary>
          <pre className="mt-2 overflow-auto text-[11px] leading-5 text-slate-700">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      ) : null}
    </>
  );
}

function renderIncomingInvitationCard(params: {
  invite: InvitationDashboardRow;
  isDev: boolean;
  debug: InvitationReadinessDebug | null;
}) {
  const { invite, isDev, debug } = params;
  const requiresValues = invite.requiredModules.includes("values");
  const inviteeHasAllRequired =
    invite.inviteeBaseSubmitted && (!requiresValues || invite.inviteeValuesSubmitted);
  const completeQuestionnaireHref = `/join?invitationId=${encodeURIComponent(invite.id)}`;
  const completionStatusHref = `/invite/${encodeURIComponent(invite.id)}/done`;
  const reportHref = `/report/${invite.id}`;
  const actionHref = invite.isReportReady
    ? reportHref
    : inviteeHasAllRequired
      ? completionStatusHref
      : completeQuestionnaireHref;

  return (
    <>
      <p className="font-medium text-slate-900">{formatIncomingInviteTitle(invite)}</p>
      <p className="mt-1">Status: {getIncomingInviteStatusLabel(invite)}</p>
      <p className="text-xs text-slate-500">Module: {formatInvitationModules(invite.requiredModules)}</p>
      <p className="text-xs text-slate-500">Erstellt: {formatDate(invite.createdAt)}</p>

      <div className="mt-2 flex flex-wrap items-start gap-2">
        <a
          href={actionHref}
          className={
            invite.isReportReady
              ? REPORT_CTA_CLASS
              : "inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
          }
        >
          {invite.isReportReady ? "Report öffnen" : inviteeHasAllRequired ? "Status ansehen" : "Jetzt ausfüllen"}
        </a>
        <CopyLinkButton url={actionHref} />
      </div>

      {inviteeHasAllRequired && !invite.isReportReady ? (
        <p className="mt-2 text-xs text-slate-500">
          Alles ausgefüllt. Der Report wird automatisch erstellt, sobald beide fertig sind.
        </p>
      ) : null}
      {isDev ? (
        <details className="mt-2 rounded-md border border-slate-200 bg-slate-50/70 p-2">
          <summary className="cursor-pointer text-xs text-slate-600">Debug anzeigen</summary>
          <pre className="mt-2 overflow-auto text-[11px] leading-5 text-slate-700">{JSON.stringify(debug, null, 2)}</pre>
        </details>
      ) : null}
    </>
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

function ValuesIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25s-6.75-4.24-6.75-10.09A3.66 3.66 0 0112 7.78a3.66 3.66 0 016.75 2.38C18.75 16.01 12 20.25 12 20.25z" />
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

function NextStepIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12h13.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.5L18.75 12l-4.5 4.5" />
    </svg>
  );
}

function LayersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5l8.25 4.5L12 13.5 3.75 9 12 4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12.75L12 16.5l6.75-3.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 16.5L12 20.25l6.75-3.75" />
    </svg>
  );
}
