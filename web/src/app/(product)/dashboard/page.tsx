import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardDevSection } from "@/features/dashboard/DashboardDevSection";
import { DashboardHeroConstellation } from "@/features/dashboard/DashboardHeroConstellation";
import { DashboardJourneyLine } from "@/features/dashboard/DashboardJourneyLine";
import { DailyQuote } from "@/features/dashboard/DailyQuote";
import { DAILY_QUOTES } from "@/features/dashboard/dailyQuotes";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { SentInvitationLinkToggle } from "@/features/dashboard/SentInvitationLinkToggle";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import {
  FOUNDER_DIMENSION_META,
  FOUNDER_DIMENSION_ORDER,
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

  const needsOnboarding =
    !profileData?.display_name?.trim() || !profileData?.focus_skill || !profileData?.intention;
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
  const dayOfYear = getDayOfYear(new Date());
  const quoteIndex = DAILY_QUOTES.length > 0 ? (dayOfYear - 1) % DAILY_QUOTES.length : 0;
  const quoteOfDay = DAILY_QUOTES[quoteIndex] ?? "Klarheit schlägt Zufall.";
  const valuesStatus = selfReport?.valuesModuleStatus ?? "not_started";
  const profileCompletionLabel = hasSubmittedBase
    ? `Basisprofil abgeschlossen (${selfReport?.basisAnsweredA ?? 0}/${selfReport?.basisTotal ?? 0})`
    : "Basisprofil noch offen";
  const readyReports = reportRuns.slice(0, 3);
  const readyReportInvitationIds = new Set(readyReports.map((report) => report.invitation_id));
  const hasMatchingActivity =
    sentInvitesSorted.length > 0 || receivedInvitesSorted.length > 0 || readyReports.length > 0;
  const invitationById = new Map(invitationRows.map((invitation) => [invitation.id, invitation]));
  const workbookRows = ((workbookResult.data ?? []) as WorkbookDashboardRow[])
    .map((row) => {
      const invitation = invitationById.get(row.invitation_id) ?? null;
      const payload = sanitizeFounderAlignmentWorkbookPayload(row.payload);
      const contentSignals = countWorkbookContentSignals(payload);
      const hasStarted = contentSignals > 0;
      const isCompleted = payload.founderReaction.status !== null || contentSignals >= 8;
      return {
        invitationId: row.invitation_id,
        title: formatDashboardInvitationTitle(invitation),
        updatedAt: row.updated_at,
        href: buildWorkbookHref(row.invitation_id, invitation?.teamContext ?? null),
        hasStarted,
        isCompleted,
      };
    })
    .filter((row) => row.hasStarted || readyReportInvitationIds.has(row.invitationId));
  const activeWorkbooks = workbookRows.filter((row) => row.hasStarted);
  const activeWorkbookByInvitationId = new Map(
    activeWorkbooks.map((workbook) => [workbook.invitationId, workbook])
  );
  const latestReadyReport = readyReports[0] ?? null;
  const latestActiveWorkbook = activeWorkbooks[0] ?? null;
  const workbookEntryPointHref = latestActiveWorkbook
    ? latestActiveWorkbook.href
    : latestReadyReport
      ? buildWorkbookHref(
          latestReadyReport.invitation_id,
          invitationById.get(latestReadyReport.invitation_id)?.teamContext ?? null
        )
      : null;
  const reportsWithoutWorkbook = readyReports.filter(
    (report) => !activeWorkbookByInvitationId.has(report.invitation_id)
  );

  const basisStatus = hasSubmittedBase ? "abgeschlossen" : "offen";
  const valuesStatusLabel = hasSubmittedValues
    ? "abgeschlossen"
    : valuesStatus === "in_progress"
      ? "gestartet"
      : "offen";
  const matchingStatus = readyReports.length > 0 ? "abgeschlossen" : hasMatchingActivity ? "gestartet" : "offen";
  const workbookStatus = activeWorkbooks.some((workbook) => workbook.isCompleted)
    ? "abgeschlossen"
    : activeWorkbooks.length > 0
      ? "gestartet"
      : readyReports.length > 0
        ? "offen"
        : "offen";

  const heroPrimaryAction = !hasSubmittedBase
    ? {
        href: "/me/base",
        label: "Profil vervollständigen",
        title: "Lege zuerst dein Founder-Profil an.",
        text: "Ohne Basisprofil bleiben Werteprofil, Matching und Report nur angedeutet. Dieser Schritt schafft die Grundlage für alles Weitere.",
      }
    : !hasSubmittedValues
      ? {
          href: "/me/values",
          label: valuesStatus === "in_progress" ? "Werteprofil fortsetzen" : "Werteprofil abschließen",
          title: "Schärfe jetzt dein Werteprofil.",
          text: "Damit wird dein Profil belastbarer und spätere Matching- und Workbook-Entscheidungen werden deutlich präziser.",
        }
      : latestActiveWorkbook
        ? {
            href: latestActiveWorkbook.href,
            label: "Weiterarbeiten",
            title: "Ein Workbook ist bereits in Arbeit.",
            text: "Öffne den aktuellen Stand und führe die Vereinbarungen weiter, statt den Flow erneut von vorn zu beginnen.",
          }
        : latestReadyReport
          ? {
              href:
                workbookEntryPointHref ??
                buildWorkbookHref(
                  latestReadyReport.invitation_id,
                  invitationById.get(latestReadyReport.invitation_id)?.teamContext ?? null
                ),
            label: "Workbook starten",
            title: "Macht aus dem Report konkrete Regeln.",
            text: "Der Matching-Report zeigt eure Dynamik. Im Workbook haltet ihr jetzt fest, wie ihr konkret zusammenarbeitet und was in den nächsten 90 Tagen gelten soll.",
          }
        : !hasMatchingActivity
            ? {
                href: "/invite/new",
                label: "Co-Founder einladen",
                title: "Bring jetzt eine zweite Person in den Flow.",
                text: "Dein Profil steht. Der sinnvollste nächste Schritt ist jetzt ein echter Matching-Kontext mit Einladung, Report und anschließendem Workbook.",
              }
            : {
                href: "/dashboard#dashboard-block-active",
                label: "Übersicht ansehen",
                title: "Behalte laufende Einladungen und Reports im Blick.",
                text: "Sobald Einladungen, Reports oder Workbooks aktiv sind, findest du hier den operativen Einstieg ohne doppelte Umwege.",
              };

  const progressCards = [
    {
      id: "dashboard-status-profile",
      label: "Basisprofil",
      status: basisStatus,
      isCurrent: !hasSubmittedBase,
      isCompleted: hasSubmittedBase,
      text: hasSubmittedBase
        ? "Profil steht als Grundlage für Report, Matching und Workbook."
        : "Noch offen.",
      href: hasSubmittedBase ? "/me/report" : "/me/base",
      actionLabel: hasSubmittedBase ? "Profil ansehen" : "Vervollständigen",
    },
    {
      id: "dashboard-status-values",
      label: "Werteprofil",
      status: valuesStatusLabel,
      isCurrent: hasSubmittedBase && !hasSubmittedValues,
      isCompleted: hasSubmittedValues,
      text: hasSubmittedValues
        ? "Der Werte-Layer ergänzt dein Profil um Entscheidungsprioritäten."
        : valuesStatus === "in_progress"
          ? "Bereits begonnen."
          : "Optionaler Vertiefungsschritt.",
      href: hasSubmittedValues ? "/me/report#werteprofil" : "/me/values",
      actionLabel:
        hasSubmittedValues ? "Werteprofil öffnen" : valuesStatus === "in_progress" ? "Fortsetzen" : "Starten",
    },
    {
      id: "dashboard-block-status-matching",
      label: "Matching",
      status: matchingStatus,
      isCurrent: hasSubmittedBase && hasSubmittedValues && !latestReadyReport && !latestActiveWorkbook,
      isCompleted: readyReports.length > 0,
      text:
        readyReports.length > 0
          ? "Ein fertiger Matching-Report ist verfügbar."
          : hasMatchingActivity
            ? "Einladungen oder laufende Matching-Kontexte sind aktiv."
            : "Noch kein Matching gestartet.",
      href: readyReports[0]
        ? `/report/${readyReports[0].invitation_id}`
        : hasSubmittedBase
          ? "/invite/new"
          : "/me/base",
      actionLabel: readyReports[0] ? "Report ansehen" : hasSubmittedBase ? "Einladen" : "Starten",
    },
    {
      id: "dashboard-status-workbook",
      label: "Workbook",
      status: workbookStatus,
      isCurrent: Boolean(latestReadyReport || latestActiveWorkbook),
      isCompleted: workbookStatus === "abgeschlossen",
      text:
        activeWorkbooks.length > 0
          ? "Ein Workbook ist bereits in aktiver Bearbeitung."
          : readyReports.length > 0
            ? "Der nächste Schritt nach dem Report."
            : "Sobald ein Report vorliegt, wird das Workbook relevant.",
      href: workbookEntryPointHref ?? "/dashboard#dashboard-block-active",
      actionLabel:
        activeWorkbooks.length > 0
          ? "Weiterarbeiten"
          : readyReports.length > 0
            ? "Workbook starten"
            : "Matching prüfen",
    },
  ] as const;
  const primaryWorkbook =
    latestActiveWorkbook ??
    (latestReadyReport
      ? {
          invitationId: latestReadyReport.invitation_id,
          title:
            (Array.isArray(latestReadyReport.invitations)
              ? latestReadyReport.invitations[0]?.label ?? latestReadyReport.invitations[0]?.invitee_email
              : latestReadyReport.invitations?.label ?? latestReadyReport.invitations?.invitee_email) ??
            latestReadyReport.invitation_id,
          updatedAt: latestReadyReport.created_at,
          href: buildWorkbookHref(
            latestReadyReport.invitation_id,
            invitationById.get(latestReadyReport.invitation_id)?.teamContext ?? null
          ),
          hasStarted: false,
          isCompleted: false,
        }
      : null);
  const secondaryWorkbooks = activeWorkbooks.filter(
    (workbook) => workbook.invitationId !== primaryWorkbook?.invitationId
  );
  const actionableIncomingInvites = receivedInvitesSorted.filter((invite) => !invite.isReportReady);

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
      <DashboardJourneyLine />

      <section data-dashboard-hero className="relative isolate mb-10 lg:mb-12">
        <div className="relative rounded-[32px]">
          <DashboardHeroConstellation />
          <div className="relative z-10">
            <div className="dashboard-fade-up" style={staggerStyle(10)}>
              <DailyQuote displayName={profileData?.display_name ?? null} quote={quoteOfDay} />
            </div>

            <header className="dashboard-fade-up mb-4 max-w-3xl">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Founder-Plattform</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">
                  Dein Founder Dashboard
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Profil, Matching und Workbook greifen hier als ein gemeinsamer Produktfluss ineinander.
                </p>
              </div>
            </header>

            {params.error ? (
              <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Hinweis: {params.error}
              </p>
            ) : null}

            <section
              className="dashboard-panel dashboard-fade-up max-w-3xl rounded-[28px] border border-slate-200/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] lg:p-6"
              style={staggerStyle(40)}
            >
              <div>
                <h2 className="text-2xl font-semibold text-slate-950 md:text-[2rem]">
                  {heroPrimaryAction.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  {heroPrimaryAction.text}
                </p>
                <div className="mt-5">
                  <Link
                    href={heroPrimaryAction.href}
                    className={`${INVITE_CTA_CLASS} shadow-[0_12px_24px_rgba(34,211,238,0.16)]`}
                  >
                    {heroPrimaryAction.label}
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section
        id="dashboard-block-progress"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/70 bg-slate-50/72 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)] lg:p-6"
        style={staggerStyle(80)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                <ProfileIcon className="h-4 w-4" />
              </span>
              Dein aktueller Stand
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Was ist fertig, was läuft gerade?</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {progressCards.map((card, index) => (
            <article
              key={card.id}
              id={card.id}
              className={`dashboard-fade-up scroll-mt-28 rounded-2xl border p-4 transition ${
                card.isCurrent
                  ? "border-[color:var(--brand-primary)]/30 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
                  : card.isCompleted
                    ? "border-slate-200/80 bg-white/65 shadow-[0_8px_20px_rgba(15,23,42,0.025)]"
                    : "border-slate-200/80 bg-white/82 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
              }`}
              style={staggerStyle(100 + index * 30)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{card.status}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              <div className="mt-3">
                <Link href={card.href} className={UTILITY_CTA_CLASS}>
                  {card.actionLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="dashboard-block-active"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-8"
        style={staggerStyle(120)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
                <MatchingIcon className="h-4 w-4" />
              </span>
              Aktive Themen
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Operativer Überblick</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Einladungen, Reports und Workbook werden hier als ruhige Arbeitsübersicht gebündelt.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <article
            id="dashboard-workbook-focus"
            className={`${PRIMARY_SURFACE_CLASS} dashboard-fade-up scroll-mt-28 p-6 lg:p-7`}
            style={staggerStyle(180)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Nächster Schritt</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Aktuelles Workbook</h3>
              </div>
              <span className="text-xs tracking-[0.08em] text-slate-500">
                {primaryWorkbook ? "aktiv" : "noch offen"}
              </span>
            </div>
            {primaryWorkbook ? (
              <div className="mt-4">
                <p className="font-medium text-slate-900">{primaryWorkbook.title}</p>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                  {primaryWorkbook.hasStarted
                    ? "Hier arbeitet ihr bereits an konkreten Regeln und Vereinbarungen. Das ist aktuell der wichtigste Arbeitsstand."
                    : "Zu diesem Match liegt ein Report vor. Das Workbook ist jetzt der sinnvollste nächste Schritt."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Letzte Aktivität: {formatDate(primaryWorkbook.updatedAt)}
                </p>
                <div className="mt-4">
                  <Link href={primaryWorkbook.href} className={INVITE_CTA_CLASS}>
                    {primaryWorkbook.hasStarted ? "Weiterarbeiten" : "Workbook starten"}
                  </Link>
                </div>
                {secondaryWorkbooks.length > 0 ? (
                  <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">
                      Weitere Workbooks ({secondaryWorkbooks.length})
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {secondaryWorkbooks.map((workbook) => (
                        <li
                          key={workbook.invitationId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{workbook.title}</p>
                            <p className="text-xs text-slate-500">
                              Aktualisiert: {formatDate(workbook.updatedAt)}
                            </p>
                          </div>
                          <Link href={workbook.href} className={REPORT_CTA_CLASS}>
                            Öffnen
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                Sobald ein Matching-Report in konkrete Vereinbarungen übersetzt wird, landet das Workbook hier als klarer nächster Schritt.
              </p>
            )}
          </article>

          <article className={`${SECONDARY_SURFACE_CLASS} dashboard-fade-up p-5`} style={staggerStyle(210)}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Bereite Reports</h3>
              <span className="text-xs tracking-[0.08em] text-slate-500">{reportsWithoutWorkbook.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {reportsWithoutWorkbook.length > 0 ? (
                reportsWithoutWorkbook.map((run) => (
                  <div key={run.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    {renderCompactReportRow(run)}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-slate-500">
                  {readyReports.length > 0
                    ? "Alle bereiten Reports sind bereits in Workbooks überführt."
                    : "Sobald Matching-Reports bereit sind, erscheinen sie hier."}
                </p>
              )}
            </div>
          </article>

          <article className={`${SECONDARY_SURFACE_CLASS} dashboard-fade-up p-5`} style={staggerStyle(240)}>
            <div className="space-y-6">
              {actionableIncomingInvites.length > 0 ? (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">Eingehende Einladungen</h3>
                    <span className="text-xs tracking-[0.08em] text-slate-500">{actionableIncomingInvites.length}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {actionableIncomingInvites.map((invite) => (
                      <div key={invite.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        {renderCompactIncomingInvitationRow(invite)}
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">Einladungen</h3>
                    <span className="text-xs tracking-[0.08em] text-slate-500">ruhig</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Aktuell gibt es keine neuen eingehenden Einladungen, die direkt deine Aufmerksamkeit brauchen.
                  </p>
                </section>
              )}

              <section className="border-t border-slate-200/80 pt-5">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Gesendete Einladungen ({sentInvitesSorted.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {sentInvitesSorted.length > 0 ? (
                      sentInvitesSorted.map((invite) => (
                        <div key={invite.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                          {renderCompactSentInvitationRow(invite)}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-slate-500">
                        Noch keine gesendeten Einladungen.
                      </p>
                    )}
                  </div>
                </details>
              </section>
            </div>
          </article>
        </div>
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
              Profil & Report
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Profil pflegen, Report bei Bedarf vertiefen</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Dieser Bereich bleibt bewusst ruhiger. Er zeigt deinen aktuellen Profilstand, ohne mit Hero oder Workbook um Aufmerksamkeit zu konkurrieren.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section
            id="dashboard-block-profile-data"
            className={`${PRIMARY_SURFACE_CLASS} dashboard-fade-up p-6`}
            style={staggerStyle(220)}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                    <CompassIcon className="h-4 w-4" />
                  </span>
                  Mein Profil
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  {needsOnboarding ? "Lege zuerst deine Basisdaten an" : "Pflege deine Profildaten an einer Stelle"}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-medium tracking-[0.08em] text-slate-600">
                <span className="rounded-full border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-3 py-1">
                  {profileCompletionLabel}
                </span>
                <span className="rounded-full border border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/8 px-3 py-1">
                  {hasSubmittedValues ? "Werteprofil abgeschlossen" : "Werteprofil optional"}
                </span>
              </div>
            </div>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              {needsOnboarding
                ? "Hier hinterlegst du die Basisdaten, ohne die Report, Matching und Workbook nicht sauber starten."
                : "Profiländerungen, Fokus und Rollen pflegst du an einer Stelle statt über mehrere Zugänge."}
            </p>

            <div className="mt-5">
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
                <details className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Profildaten bearbeiten
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
            </div>

            <div
              id="dashboard-block-account"
              className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Account & Zugang
              </p>
              <p className="mt-2 text-sm text-slate-700">{user.email ?? "E-Mail nicht verfügbar"}</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Weitere Account-Einstellungen docken hier später an. Für jetzt findest du hier deinen aktuellen Zugangspunkt.
              </p>
            </div>
          </section>

          <div className="space-y-6">
            {selfReport ? (
              <article
                className={`${SECONDARY_SURFACE_CLASS} dashboard-fade-up overflow-hidden bg-slate-50/78 p-6`}
                style={staggerStyle(240)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                        <ReportIcon className="h-4 w-4" />
                      </span>
                      Profil-Snapshot
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      Dein aktuelles Founder-Profil
                    </h3>
                  </div>
                  <Link href="/me/report" className={UTILITY_CTA_CLASS}>
                    Report öffnen
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Die Übersicht zeigt dir kompakt, wo du in den sechs Founder-Dimensionen aktuell stehst.
                </p>
                <div className="mt-5">
                  <FounderDimensionsOverview scores={selfReport.scoresA} />
                </div>
                <div className="mt-5 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3">
                  <p className="text-sm text-slate-600">Detaillierte Einordnung findest du im Report.</p>
                </div>
              </article>
            ) : (
              <article
                className={`${SECONDARY_SURFACE_CLASS} dashboard-fade-up bg-slate-50/78 p-6`}
                style={staggerStyle(240)}
              >
                <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <span className="dashboard-icon-chip text-[color:var(--brand-primary)]">
                    <ReportIcon className="h-4 w-4" />
                  </span>
                  Profil-Snapshot
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  Dein Founder-Profil entsteht mit dem Basisfragebogen
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Sobald du das Basisprofil ausfüllst, erscheinen hier deine Ergebnisdarstellung und der Einstieg in deinen individuellen Report.
                </p>
              </article>
            )}
          </div>
        </div>
      </section>

      <section
        id="dashboard-block-modules"
        className="dashboard-fade-up mb-8 scroll-mt-28 rounded-2xl border border-slate-200/70 bg-slate-50/62 p-5"
        style={staggerStyle(140)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <span className="dashboard-icon-chip text-[color:var(--brand-accent)]">
                <LayersIcon className="h-4 w-4" />
              </span>
              Weitere Module
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Strukturell offen für den nächsten Ausbau</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Dieses Dashboard bleibt nicht beim Erst-Matching stehen. Die Oberfläche ist jetzt so sortiert, dass spätere Re-Alignment-, Entwicklungs- oder Partner-Module sauber anschließen können.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200/70 bg-white/68 p-4">
            <p className="text-sm font-semibold text-slate-900">Re-Alignment</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Für spätere Check-ins, neue Spannungen und veränderte Rollen nach den ersten Arbeitsphasen.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/70 bg-white/68 p-4">
            <p className="text-sm font-semibold text-slate-900">Entwicklung</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Raum für vertiefende Module, Lernpfade und thematische Follow-ups auf Basis von Report und Workbook.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/70 bg-white/68 p-4">
            <p className="text-sm font-semibold text-slate-900">Programme & Partner</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Anschlussfähig für Accelerator-, Advisor- oder Investorenlogiken, ohne den Founder-Kernfluss zu zerreißen.
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

function buildWorkbookHref(
  invitationId: string,
  teamContext: InvitationDashboardRow["teamContext"] | null
) {
  const base = `/founder-alignment/workbook?invitationId=${encodeURIComponent(invitationId)}`;
  return teamContext ? `${base}&teamContext=${encodeURIComponent(teamContext)}` : base;
}

function formatDashboardInvitationTitle(invitation: InvitationDashboardRow | null) {
  if (!invitation) return "Workbook";
  return invitation.label?.trim() || invitation.inviteeEmail || invitation.id;
}

function countWorkbookContentSignals(
  payload: ReturnType<typeof sanitizeFounderAlignmentWorkbookPayload>
) {
  let count = 0;

  for (const step of Object.values(payload.steps)) {
    if (step.founderA.trim()) count += 1;
    if (step.founderB.trim()) count += 1;
    if (step.agreement.trim()) count += 1;
    if (step.advisorNotes.trim()) count += 1;
  }

  if (payload.advisorClosing.observations.trim()) count += 1;
  if (payload.advisorClosing.questions.trim()) count += 1;
  if (payload.advisorClosing.nextSteps.trim()) count += 1;
  if (payload.founderReaction.status) count += 1;
  if (payload.founderReaction.comment.trim()) count += 1;

  return count;
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
              <span>{meta.leftPole}</span>
              <span>{meta.rightPole}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderCompactSentInvitationRow(invite: InvitationDashboardRow) {
  const title = invite.label ?? invite.inviteeEmail;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-600">Status: {getSentInviteStatusLabel(invite)}</p>
        <p className="text-xs text-slate-500">
          Module: {formatInvitationModules(invite.requiredModules)} · Ablauf: {formatDate(invite.expiresAt)}
        </p>
      </div>

      <div className="shrink-0">
        {invite.isReportReady ? (
          <Link href={`/report/${invite.id}`} className={REPORT_CTA_CLASS}>
            Report ansehen
          </Link>
        ) : (
          <SentInvitationLinkToggle invitationId={invite.id} status={invite.status} />
        )}
      </div>
    </div>
  );
}

function renderCompactIncomingInvitationRow(invite: InvitationDashboardRow) {
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
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{formatIncomingInviteTitle(invite)}</p>
        <p className="mt-1 text-sm text-slate-600">Status: {getIncomingInviteStatusLabel(invite)}</p>
        <p className="text-xs text-slate-500">
          Module: {formatInvitationModules(invite.requiredModules)} · Erstellt: {formatDate(invite.createdAt)}
        </p>
      </div>

      <a
        href={actionHref}
        className={
          invite.isReportReady
            ? REPORT_CTA_CLASS
            : "inline-flex shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
        }
      >
        {invite.isReportReady ? "Report ansehen" : inviteeHasAllRequired ? "Status ansehen" : "Jetzt ausfüllen"}
      </a>
    </div>
  );
}

function renderCompactReportRow(run: ReportRunRow) {
  const invitation = Array.isArray(run.invitations) ? run.invitations[0] ?? null : run.invitations;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">
          {invitation?.label ?? invitation?.invitee_email ?? run.invitation_id}
        </p>
        <p className="mt-1 text-sm text-slate-600">Module: {formatInvitationModules(run.modules ?? [])}</p>
        <p className="text-xs text-slate-500">Erstellt: {formatDate(run.created_at)}</p>
      </div>

      <Link href={`/report/${run.invitation_id}`} className={REPORT_CTA_CLASS}>
        Report ansehen
      </Link>
    </div>
  );
}

function formatScoreValue(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function LayersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5l8.25 4.5L12 13.5 3.75 9 12 4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12.75L12 16.5l6.75-3.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 16.5L12 20.25l6.75-3.75" />
    </svg>
  );
}
