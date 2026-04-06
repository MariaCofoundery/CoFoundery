import { redirect } from "next/navigation";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { FounderAlignmentWorkbookIntro } from "@/features/reporting/FounderAlignmentWorkbookIntro";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { getFounderAlignmentWorkbookPageData } from "@/features/reporting/founderAlignmentWorkbookData";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import {
  buildWorkbookHref,
  buildWorkbookIntroHref,
  countWorkbookContentSignals,
} from "@/features/reporting/workbookNavigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
};

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

export default async function FounderAlignmentWorkbookIntroPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const requestedTeamContext = resolveTeamContext(params.teamContext);

  if (!invitationId) {
    redirect("/dashboard");
  }

  const introHref = buildWorkbookIntroHref(invitationId, requestedTeamContext);
  const reportHref = `/report/${encodeURIComponent(invitationId)}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(introHref)}`);
  }

  const data = await getFounderAlignmentWorkbookPageData(invitationId, requestedTeamContext);

  if (data.status !== "ready") {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <ProductNavigationOverride matchingHref={reportHref} workbookHref={introHref} />
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200/80 bg-white/95 p-10 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Workbook</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {t("Workbook aktuell noch nicht verfuegbar")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {t(
              "Das Workbook setzt auf einem vorhandenen Matching-Report auf. Sobald euer Match vollstaendig bereit ist, koennt ihr hier in die gemeinsame Arbeit starten."
            )}
          </p>
          <div className="mt-8 flex justify-center">
            <ReportActionButton href={reportHref} variant="utility">
              {t("Zum Matching-Report")}
            </ReportActionButton>
          </div>
        </div>
      </main>
    );
  }

  if (countWorkbookContentSignals(data.workbook) > 0) {
    redirect(buildWorkbookHref(data.invitationId ?? invitationId, data.teamContext));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_28%,#f8fafc_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <ProductNavigationOverride
        matchingHref={reportHref}
        workbookHref={introHref}
        feedbackInvitationId={data.invitationId ?? invitationId}
      />
      <ResearchPageTracker
        eventName="workbook_intro_viewed"
        invitationId={data.invitationId}
        teamContext={data.teamContext}
        properties={{
          role: data.currentUserRole,
          source: data.source,
          suggestedTopics: data.highlights.prioritizedStepIds.slice(0, 2),
        }}
      />
      <FounderAlignmentWorkbookIntro
        reportHref={reportHref}
        workbookHref={buildWorkbookHref(data.invitationId ?? invitationId, data.teamContext)}
        highlights={data.highlights}
      />
    </main>
  );
}
