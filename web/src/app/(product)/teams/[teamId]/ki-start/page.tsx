import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { AiStartView } from "@/features/aiStart/AiStartView";
import { getTeamAiStart } from "@/features/aiStart/aiStartData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

type Props = { params: Promise<{ teamId: string }>; searchParams?: Promise<{ gespeichert?: string; fehler?: string }> };

/**
 * "So startet ihr KI-nativ": Checkliste, Werkzeuge und Ablaeufe des Teams (20270412120000). Nur Mitglieder des Teams sehen
 * sie - eine Organisation gibt hoechstens einen Hinweis mit, nie Einblick.
 */
export default async function AiStartPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/ki-start`)}`);
  const setup = await getFounderSetup(teamId, user.id, supabase);
  if (!setup) return <TeamUnavailable teamId={teamId} />;
  const [t, setupT, teamLabel, data] = await Promise.all([getTranslations("teams.aiStart"), getTranslations("teams.setup"), getTeamLabel(supabase, teamId), getTeamAiStart(supabase, teamId)]);
  const members = setup.members.map((member, index) => ({ userId: member.userId, name: member.displayName ?? setupT("founderFallback", { index: index + 1 }) }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <TeamPageHeader teamId={teamId} active="overview" title={t("title")} teamLabel={teamLabel} hideTitle />
      <section className="brand-panel mt-5 rounded-[28px] p-6 sm:p-8" aria-labelledby="ai-start-title">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{t("eyebrow")}</p>
        <h1 id="ai-start-title" className="mt-2 text-3xl font-semibold leading-tight">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white">{t("intro")}</p>
      </section>
      {query.fehler === "1" ? <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("error")}</p> : query.gespeichert === "1" ? <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("saved")}</p> : null}
      <AiStartView teamId={teamId} members={members} items={data.items} tools={data.tools} flows={data.flows} />
    </main>
  );
}
