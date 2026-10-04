import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getRequestLocale } from "@/i18n/getLocale";
import { redirect } from "next/navigation";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { FounderMatchingView } from "@/features/reporting/FounderMatchingView";
import {
  localizeFounderAlignmentReport,
  type FounderAlignmentReportPayload,
} from "@/features/reporting/founderAlignmentReportPayload";
import {
  FOUNDER_DIMENSION_ORDER,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { compareFounders, type FounderScores } from "@/features/reporting/founderMatchingEngine";
import { buildFounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import { type TeamScoringResult } from "@/features/scoring/founderScoring";
import { getMatchingReportRunForSession } from "@/features/matchingCore/matchingCoreReportData";
import {
  resolveMatchingWorkspaceFeedback,
} from "@/features/matchingCore/matchingWorkspaceFeedback";
import { getMatchingWorkspaceForSession } from "@/features/matchingCore/matchingWorkspaceData";
import type { MatchingWorkspaceSummary } from "@/features/matchingCore/matchingWorkspaceTypes";
import { currentTeamForPeople } from "@/features/teams/currentJourneyData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ matchingSessionId: string }>;
  searchParams?: Promise<{
    workspaceResult?: string | string[];
    workspaceError?: string | string[];
  }>;
};

type ReportT = Awaited<ReturnType<typeof getTranslations>>;

const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}


function isFounderDimensionKey(value: string): value is FounderDimensionKey {
  return (FOUNDER_DIMENSION_ORDER as readonly string[]).includes(value);
}

function emptyFounderScores(): FounderScores {
  return {
    Unternehmenslogik: null,
    Entscheidungslogik: null,
    Risikoorientierung: null,
    "Arbeitsstruktur & Zusammenarbeit": null,
    Commitment: null,
    Konfliktstil: null,
  };
}

function toFounderScores(scoring: TeamScoringResult, person: "A" | "B"): FounderScores {
  const founderScores = emptyFounderScores();

  for (const dimension of scoring.dimensions) {
    if (!isFounderDimensionKey(dimension.dimension)) continue;
    founderScores[dimension.dimension] = person === "A" ? dimension.scoreA : dimension.scoreB;
  }

  return founderScores;
}

function isFounderAlignmentReportPayload(
  payload: Record<string, unknown>
): payload is FounderAlignmentReportPayload {
  return (
    payload.reportType === "founder_alignment_v1" &&
    typeof payload.report === "object" &&
    payload.report !== null &&
    typeof payload.founderScoring === "object" &&
    payload.founderScoring !== null
  );
}

function EmptyReportState({ matchingSessionId, t }: { matchingSessionId: string; t: ReportT }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <ProductNavigationOverride matchingHref={`/matching/${matchingSessionId}/report`} />
      <section className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <Link
          href="/discovery/intros"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          {t("common.backToIntros")}
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-slate-950">
          {t("session.emptyTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("session.emptyText")}
        </p>
        <div className="mt-6">
          <Link
            href="/discovery/intros"
            className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t("common.backToIntros")}
          </Link>
        </div>
      </section>
    </main>
  );
}

function PageMessage({ message, ok }: { message: string | null; ok: boolean }) {
  if (!message) {
    return null;
  }

  return (
    <section
      className={`no-print mb-6 rounded-3xl border p-4 ${
        ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className={`text-sm font-semibold ${ok ? "text-emerald-900" : "text-amber-900"}`}>
        {message}
      </p>
    </section>
  );
}

function WorkspacePanel({ workspace, t }: { workspace: MatchingWorkspaceSummary | null; t: ReportT }) {
  return workspace ? <details className="my-5 rounded-xl border border-slate-200 p-4"><summary>{t("session.historicalWorkspace")}</summary><Link className="mt-3 inline-block underline" href={`/workspaces/${workspace.workspace.id}`}>{t("session.historicalWorkspace")}</Link></details> : null;
}

export default async function MatchingSessionReportPage({ params, searchParams }: PageProps) {
  const { matchingSessionId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const t = await getTranslations("report");
  const {
    data: { user },
  } = await getRequestUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/matching/${matchingSessionId}/report`)}`);
  }

  // Dieselbe Absicherung wie auf der Vorbereitungsseite, und aus demselben
  // Grund: Beide Ladefunktionen `throw`en bei jedem Datenbankfehler, und ein
  // ungefangener Wurf in einer Serverkomponente ist eine weisse Fehlerseite.
  // Der leere Zustand steht hier ohnehin schon fuer den Fall "noch kein
  // Report" - er traegt den Fall "gerade nicht ladbar" mit.
  let summary: Awaited<ReturnType<typeof getMatchingReportRunForSession>> = null;
  let workspace: Awaited<ReturnType<typeof getMatchingWorkspaceForSession>> = null;
  try {
    summary = await getMatchingReportRunForSession(matchingSessionId, user.id);
    if (summary && isFounderAlignmentReportPayload(summary.reportRun.payload)) {
      workspace = await getMatchingWorkspaceForSession(matchingSessionId, user.id);
    }
  } catch (error) {
    console.error("[matching-report] load_failed", {
      operation: "load_matching_report",
      reason: error instanceof Error ? error.message : "unknown",
    });
    return <EmptyReportState matchingSessionId={matchingSessionId} t={t} />;
  }

  if (!summary || !isFounderAlignmentReportPayload(summary.reportRun.payload)) {
    return <EmptyReportState matchingSessionId={matchingSessionId} t={t} />;
  }
  const workspaceFeedback = resolveMatchingWorkspaceFeedback({
    result: searchParamValue(resolvedSearchParams.workspaceResult),
    error: searchParamValue(resolvedSearchParams.workspaceError),
  });
  const workspaceFeedbackMessage = workspaceFeedback
    ? t(workspaceFeedback.messageKey)
    : null;

  const client = await createClient();
  const { data: participants } = await client.from("matching_session_participants")
    .select("user_id").eq("matching_session_id", matchingSessionId).eq("status", "active").eq("role", "founder");
  const other = participants?.find((person) => person.user_id !== user.id);
  const teamId = other ? await currentTeamForPeople(client, user.id, other.user_id) : null;
  const currentHref = teamId ? `/teams/${teamId}/setup` : "/connections";

  const payload = summary.reportRun.payload;
  // Die Sprache der LESENDEN Person, nicht die, in der gebaut wurde: Zwei
  // Menschen teilen sich einen Report, und wer ihn ausgeloest hat, entscheidet
  // sonst ueber die Sprache der anderen.
  const { founderReport, locale: reportLocale } = localizeFounderAlignmentReport(
    payload,
    await getRequestLocale()
  );
  const founderScoring = payload.founderScoring;
  const compareResult = compareFounders(
    toFounderScores(founderScoring, "A"),
    toFounderScores(founderScoring, "B")
  );
  const selection = buildFounderMatchingSelection(compareResult);
  const participantAName = payload.report.participantAName || "Person A";
  const participantBName = payload.report.participantBName || "Person B";

  return (
    <main className="report-print-root mx-auto min-h-screen w-full max-w-6xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <ProductNavigationOverride matchingHref={`/matching/${matchingSessionId}/report`} />

      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/discovery/intros"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          {t("common.backToIntros")}
        </Link>
        <p className="text-xs font-medium text-slate-500">
          {t("session.snapshotHint")}
        </p>
      </div>

      <PageMessage
        message={workspaceFeedbackMessage}
        ok={workspaceFeedback?.ok ?? false}
      />
      <nav className="no-print mb-6 flex flex-wrap gap-3">
        <Link className={PRIMARY_CTA_CLASS} href={currentHref}>{t("legacy.workbookCta")}</Link>
        {teamId ? <Link className={SECONDARY_CTA_CLASS} href={`/teams/${teamId}/workstyle`}>{t("session.currentReport")}</Link> : null}
      </nav>
      <WorkspacePanel workspace={workspace} t={t} />

      <FounderMatchingView
        participantAName={participantAName}
        participantBName={participantBName}
        compareResult={compareResult}
        selection={selection}
        valuesProfileA={null}
        valuesProfileB={null}
        founderReport={founderReport}
        workbookHref={currentHref}
        teamContext={payload.teamContext}
        reportContext="matching_session"
        showUnlockSection={false}
        contentLocale={reportLocale}
      />
    </main>
  );
}
