import Link from "next/link";
import { redirect } from "next/navigation";
import { FounderAlignmentWorkbookClient } from "@/features/reporting/FounderAlignmentWorkbookClient";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { getFounderAlignmentWorkbookPageData } from "@/features/reporting/founderAlignmentWorkbookData";
import { createClient } from "@/lib/supabase/server";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
  advisorToken?: string;
};

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

export default async function FounderAlignmentWorkbookPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const requestedTeamContext = resolveTeamContext(params.teamContext);
  const advisorToken = params.advisorToken?.trim() || null;

  if (!invitationId) {
    redirect("/dashboard");
  }

  if (advisorToken) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const nextPath = `/founder-alignment/workbook?invitationId=${encodeURIComponent(invitationId ?? "")}&teamContext=${encodeURIComponent(requestedTeamContext)}&advisorToken=${encodeURIComponent(advisorToken)}`;
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }

  const data = await getFounderAlignmentWorkbookPageData(invitationId, requestedTeamContext, advisorToken);

  if (data.status !== "ready") {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200/80 bg-white/95 p-10 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Founder Alignment Session
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {t("Workbook aktuell noch nicht verfuegbar")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {t(
              "Das Workbook knuepft an ein vorhandenes Founder-Alignment-Ergebnis an. Sobald beide Base-Assessments vollstaendig vorliegen und auswertbar sind, kann die Session daraus ihre Schwerpunkte ableiten."
            )}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Status: {data.status}
            {data.reason ? ` · ${data.reason}` : ""}
          </p>
          <div className="mt-8 flex justify-center">
            <ReportActionButton href={`/report/${encodeURIComponent(invitationId)}`} variant="utility">
              Zur Report-Vorschau
            </ReportActionButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="px-4 pt-6 sm:px-6 lg:px-8 print:hidden">
        <div className="mx-auto flex max-w-7xl justify-end">
          {data.currentUserRole !== "advisor" ? (
            <Link
              href={`/report/${encodeURIComponent(data.invitationId ?? invitationId)}`}
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              {t("Zurueck zum Report")}
            </Link>
          ) : null}
        </div>
      </div>

      <FounderAlignmentWorkbookClient
        invitationId={data.invitationId}
        teamContext={data.teamContext}
        founderAName={data.founderAName}
        founderBName={data.founderBName}
        currentUserRole={data.currentUserRole}
        initialWorkbook={data.workbook}
        highlights={data.highlights}
        advisorInvite={data.advisorInvite}
        advisorToken={advisorToken}
        canSave={data.canSave}
        persisted={data.persisted}
        updatedAt={data.updatedAt}
        source={data.source}
        storedTeamContext={data.storedTeamContext}
        hasTeamContextMismatch={data.hasTeamContextMismatch}
        showValuesStep={data.showValuesStep}
        reportHeadline={data.report.executiveSummary.headline}
      />
    </main>
  );
}
