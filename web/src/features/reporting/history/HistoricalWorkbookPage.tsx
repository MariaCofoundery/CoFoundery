import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { currentTeamForInvitation } from "@/features/teams/currentJourneyData";
import { buildAdvisorReportHref } from "@/features/reporting/advisorTeamTargets";
import { getFounderAlignmentWorkbookPageData } from "@/features/reporting/founderAlignmentWorkbookData";
import { HistoricalValue } from "@/features/reporting/history/HistoricalValue";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";

export type HistoricalWorkbookParams = { invitationId?: string; teamContext?: string; advisorContext?: string; advisorToken?: string; deepDiveStep?: string };
export async function HistoricalWorkbookPage({ params, print = false }: { params: HistoricalWorkbookParams; print?: boolean }) {
  const id = params.invitationId?.trim();
  if (params.advisorToken) redirect(`/advisor/invite/${encodeURIComponent(params.advisorToken)}`);
  if (!id) redirect("/connections");
  const context = params.teamContext === "existing_team" ? "existing_team" : "pre_founder";
  if (["1", "true"].includes(params.advisorContext ?? "")) redirect(buildAdvisorReportHref(id, context));
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/founder-alignment/workbook?invitationId=${id}`)}`);
  const client = await createClient();
  const { data: invitation } = await client.from("invitations").select("inviter_user_id,invitee_user_id").eq("id", id).maybeSingle();
  if (!invitation || ![invitation.inviter_user_id, invitation.invitee_user_id].includes(user.id)) {
    // Preserve the existing advisor bridge/redirect, without granting workbook access.
    const legacy = await getFounderAlignmentWorkbookPageData(id, context);
    if (legacy.status === "ready" && legacy.currentUserRole === "advisor") redirect(buildAdvisorReportHref(id, legacy.teamContext));
    notFound();
  }
  const [{ data: workbook, error }, teamId, t] = await Promise.all([
    client.from("founder_alignment_workbooks").select("payload,updated_at,team_context").eq("invitation_id", id).maybeSingle(),
    currentTeamForInvitation(client, user.id, id),
    getTranslations("workbook.history"),
  ]);
  if (error) throw new Error("historical_workbook_unavailable");
  const currentHref = teamId ? `/teams/${teamId}/setup` : "/connections";
  if (!workbook) redirect(currentHref);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 print:max-w-none print:p-0">
    <header className="rounded-2xl border border-slate-200 p-6">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-3 leading-7">{t("notice")}</p>
      <p className="mt-2 text-sm">{t("updated")}: {workbook.updated_at}</p>
      <nav className="mt-4 flex flex-wrap gap-4 print:hidden" aria-label={t("navigation")}>
        <Link className="underline" href={currentHref}>{teamId ? t("setup") : t("connections")}</Link>
        {teamId ? <Link className="underline" href={`/teams/${teamId}/workstyle`}>{t("report")}</Link> : null}
        {print ? <PrintReportButton /> : <Link className="underline" href={`/founder-alignment/workbook/print?invitationId=${encodeURIComponent(id)}`}>{t("print")}</Link>}
      </nav>
    </header>
    <section className="min-w-0 rounded-2xl border border-slate-200 p-5" aria-label={t("content")}>
      <HistoricalValue value={workbook.payload} labels={t.raw("fields") as Record<string, string>} />
    </section>
  </main>;
}
