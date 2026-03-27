import Link from "next/link";
import { redirect } from "next/navigation";
import { FounderMatchingView } from "@/features/reporting/FounderMatchingView";
import {
  createReportRunOnCompletion,
  getFounderMatchingLiveData,
  getReportRunSnapshotForSession,
} from "@/features/reporting/actions";
import {
  FOUNDER_DIMENSION_ORDER,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import {
  buildFounderMatchingSelection,
} from "@/features/reporting/founderMatchingSelection";
import {
  compareFounders,
  type FounderScores,
} from "@/features/reporting/founderMatchingEngine";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { ReportAutoRefresh } from "@/features/reporting/ReportAutoRefresh";
import { type TeamScoringResult } from "@/features/scoring/founderScoring";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

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

export default async function ReportPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/report/${sessionId}`);
  }

  let snapshot = await getReportRunSnapshotForSession(sessionId);
  if (!snapshot) {
    snapshot = await createReportRunOnCompletion(sessionId);
  }

  const { data: invitationContextRow } = await supabase
    .from("invitations")
    .select("team_context")
    .eq("id", snapshot?.invitationId ?? sessionId)
    .maybeSingle();
  const teamContext =
    (invitationContextRow as { team_context?: "pre_founder" | "existing_team" | null } | null)
      ?.team_context ?? null;

  if (!snapshot) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
          <ResearchPageTracker eventName="report_page_viewed" invitationId={sessionId} />
          <ReportAutoRefresh />
          <h1 className="text-2xl font-semibold text-slate-900">Report noch nicht verfügbar</h1>
          <p className="mt-3 text-sm text-slate-700">
            Für diese Einladung gibt es noch keinen renderbaren Matching-Report.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Wir prüfen den Status automatisch im Hintergrund.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </Link>
        </section>
      </main>
    );
  }

  const liveMatchingData = await getFounderMatchingLiveData(snapshot.invitationId);
  const founderScoring = liveMatchingData?.founderScoring ?? snapshot.founderScoring;

  if (!founderScoring) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
          <ResearchPageTracker
            eventName="report_page_viewed"
            invitationId={snapshot.invitationId}
            teamContext={teamContext}
            properties={{
              state: "rendering_in_progress",
              modules: snapshot.modules,
              reportType: snapshot.reportType,
            }}
          />
          <ReportAutoRefresh />
          <h1 className="text-2xl font-semibold text-slate-900">Report wird gerade erstellt</h1>
          <p className="mt-3 text-sm text-slate-700">
            Der neue Founder-Matching-Report ist noch nicht vollständig verfügbar. Bitte prüft den
            Report in wenigen Momenten erneut.
          </p>
          <p className="mt-1 text-xs text-slate-500">Invitation: {snapshot.invitationId}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </Link>
        </section>
      </main>
    );
  }

  const participantAName =
    liveMatchingData?.participantAName || snapshot.report?.participantAName || "Person A";
  const participantBName =
    liveMatchingData?.participantBName || snapshot.report?.participantBName || "Person B";
  const compareResult = compareFounders(
    toFounderScores(founderScoring, "A"),
    toFounderScores(founderScoring, "B")
  );
  const selection = buildFounderMatchingSelection(compareResult);

  return (
    <main className="report-print-root mx-auto min-h-screen w-full max-w-6xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <ResearchPageTracker
        eventName="report_page_viewed"
        invitationId={snapshot.invitationId}
        teamContext={teamContext}
        properties={{
          state: "ready",
          modules: snapshot.modules,
          reportType: snapshot.reportType,
          renderMode: "founder_matching_live",
        }}
      />

      <div className="no-print mb-8 flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Zurück zum Dashboard
        </Link>
        <PrintReportButton
          invitationId={snapshot.invitationId}
          teamContext={teamContext}
          properties={{ reportType: snapshot.reportType, renderMode: "founder_matching_live" }}
        />
      </div>

      <FounderMatchingView
        participantAName={participantAName}
        participantBName={participantBName}
        compareResult={compareResult}
        selection={selection}
        valuesProfileA={liveMatchingData?.valuesProfileA ?? null}
        valuesProfileB={liveMatchingData?.valuesProfileB ?? null}
      />
    </main>
  );
}
