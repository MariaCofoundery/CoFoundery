import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { FounderMatchingView } from "@/features/reporting/FounderMatchingView";
import type { FounderAlignmentReportPayload } from "@/features/reporting/founderAlignmentReportPayload";
import {
  FOUNDER_DIMENSION_ORDER,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { compareFounders, type FounderScores } from "@/features/reporting/founderMatchingEngine";
import { buildFounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import { type TeamScoringResult } from "@/features/scoring/founderScoring";
import { getMatchingReportRunForSession } from "@/features/matchingCore/matchingCoreReportData";
import { startWorkspaceFromMatchingSessionAction } from "@/features/matchingCore/matchingWorkspaceActions";
import { getMatchingWorkspaceForSession } from "@/features/matchingCore/matchingWorkspaceData";
import type { MatchingWorkspaceSummary } from "@/features/matchingCore/matchingWorkspaceTypes";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ matchingSessionId: string }>;
  searchParams?: Promise<{
    workspaceMessage?: string | string[];
    workspaceOk?: string | string[];
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

function workspaceResultUrl(
  matchingSessionId: string,
  result: { ok: boolean; message?: string },
  fallbackMessage: string
) {
  const params = new URLSearchParams();
  params.set("workspaceMessage", result.message ?? fallbackMessage);
  params.set("workspaceOk", result.ok ? "1" : "0");
  return `/matching/${matchingSessionId}/report?${params.toString()}`;
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

function WorkspacePanel({
  matchingSessionId,
  workspace,
  t,
}: {
  matchingSessionId: string;
  workspace: MatchingWorkspaceSummary | null;
  t: ReportT;
}) {
  const workspaceProcessedMessage = t("session.workspaceProcessed");

  async function startWorkspace() {
    "use server";
    const result = await startWorkspaceFromMatchingSessionAction(matchingSessionId);
    redirect(workspaceResultUrl(matchingSessionId, result, workspaceProcessedMessage));
  }

  if (workspace) {
    return (
      <section className="no-print mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {t("session.workspaceEyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {t("session.workspaceReadyTitle")}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-950">
          {t("session.workspaceReadyText")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/workspaces/${workspace.workspace.id}`} className={PRIMARY_CTA_CLASS}>
            {t("session.openWorkspace")}
          </Link>
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            {t("common.backToIntros")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="no-print mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {t("common.nextStep")}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        {t("session.prepareWorkspaceTitle")}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        {t("session.prepareWorkspaceText")}
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        {t("session.prepareWorkspaceSafety")}
      </p>
      <div className="mt-5">
        <form action={startWorkspace}>
          <button type="submit" className={PRIMARY_CTA_CLASS}>
            {t("session.startWorkspace")}
          </button>
        </form>
      </div>
    </section>
  );
}

export default async function MatchingSessionReportPage({ params, searchParams }: PageProps) {
  const { matchingSessionId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const t = await getTranslations("report");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/matching/${matchingSessionId}/report`)}`);
  }

  const summary = await getMatchingReportRunForSession(matchingSessionId, user.id);
  if (!summary || !isFounderAlignmentReportPayload(summary.reportRun.payload)) {
    return <EmptyReportState matchingSessionId={matchingSessionId} t={t} />;
  }
  const workspace = await getMatchingWorkspaceForSession(matchingSessionId, user.id);
  const workspaceMessage = searchParamValue(resolvedSearchParams.workspaceMessage) ?? null;
  const workspaceOk = searchParamValue(resolvedSearchParams.workspaceOk) !== "0";

  const payload = summary.reportRun.payload;
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

      <PageMessage message={workspaceMessage} ok={workspaceOk} />
      <WorkspacePanel matchingSessionId={matchingSessionId} workspace={workspace} t={t} />

      <FounderMatchingView
        participantAName={participantAName}
        participantBName={participantBName}
        compareResult={compareResult}
        selection={selection}
        valuesProfileA={null}
        valuesProfileB={null}
        founderReport={payload.founderReport}
        workbookHref="#"
        teamContext={payload.teamContext}
        reportContext="matching_session"
        showUnlockSection={false}
      />
    </main>
  );
}
