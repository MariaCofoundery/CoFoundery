import { buildExecutiveSummary } from "@/features/reporting/buildExecutiveSummary";
import { getFounderScoringDebug } from "@/features/scoring/founderScoringDebug";

type PageSearchParams = {
  invitationId?: string;
};

export default async function FounderScoringDebugPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const result = await getFounderScoringDebug(invitationId);
  const executiveSummary = result.scoring
    ? buildExecutiveSummary({
        scoringResult: result.scoring,
        teamContext: "pre_founder",
      })
    : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Debug</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Founder Scoring</h1>
        <p className="mt-3 text-sm text-slate-600">
          {invitationId
            ? `Invitation ID: ${invitationId}`
            : "Fuege ?invitationId=... an die URL an, um zwei reale Assessments zu laden."}
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">Executive Summary</h2>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(executiveSummary, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
