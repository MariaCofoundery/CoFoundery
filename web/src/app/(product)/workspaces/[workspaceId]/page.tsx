import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getMatchingWorkspaceAgreementForWorkspace } from "@/features/matchingCore/matchingWorkspaceAgreementData";
import { HistoricalValue } from "@/features/reporting/history/HistoricalValue";

export default async function HistoricalMatchingWorkspace({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/workspaces/${workspaceId}`)}`);
  // The existing reader enforces active session participation. Reading never creates a draft.
  const summary = await getMatchingWorkspaceAgreementForWorkspace(workspaceId, user.id);
  if (!summary) notFound();
  const client = await createClient();
  const { data: relationship } = await client.from("relationships").select("founder_team_id").eq("id", summary.workspace.relationshipId).maybeSingle();
  const teamId = relationship?.founder_team_id;
  const { data: membership } = teamId ? await client.from("founder_team_members").select("team_id").eq("team_id", teamId).eq("user_id", user.id).maybeSingle() : { data: null };
  const t = await getTranslations("workspace.history");
  const fields = await getTranslations("workspace.agreement.editor.sections");
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 print:max-w-none print:p-0">
    <header className="rounded-2xl border border-slate-200 p-6"><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="mt-3 leading-7">{t("notice")}</p>
      <nav className="mt-4 flex flex-wrap gap-4 print:hidden">
        {membership ? <><Link className="underline" href={`/teams/${teamId}/setup`}>{t("setup")}</Link><Link className="underline" href={`/teams/${teamId}/workstyle`}>{t("report")}</Link></> : <Link className="underline" href="/connections">{t("connections")}</Link>}
      </nav>
    </header>
    {summary.agreement ? Object.entries(summary.agreement.sections).map(([key, section]) => <section key={key} className="rounded-xl border border-slate-200 p-5"><h2 className="mb-4 text-xl font-semibold">{fields(`${key}.title`)}</h2><HistoricalValue value={section} labels={t.raw("fields") as Record<string,string>} /></section>) : <p>{t("empty")}</p>}
  </main>;
}
