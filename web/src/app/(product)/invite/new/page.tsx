import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoFounderInviteForm } from "@/features/dashboard/CoFounderInviteForm";
import { MatchingStartBlock } from "@/features/dashboard/MatchingStartBlock";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export default async function NewInvitePage({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const { team: teamId } = await searchParams;
  const t = await getTranslations("dashboard.coFounderInvitePage");
  const {
    data: { user },
  } = await getRequestUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(teamId ? `/invite/new?team=${teamId}` : "/invite/new")}`);
  }

  let targetTeam: { id: string; name: string; context: "pre_founder" | "existing_team" } | undefined;
  if (teamId) {
    const { getFounderTeamHomebase } = await import("@/features/teams/founderTeamHomebaseData");
    const team = await getFounderTeamHomebase(teamId, user.id, await createClient());
    if (!team) notFound();
    if (team.members.length >= 4) redirect(`/teams/${teamId}`);
    targetTeam = { id: team.id, name: team.name ?? team.members.map(m => m.displayName ?? "Founder").join(" + "), context: team.teamContext };
  }

  // Phase 10: Kein Hinweis "du laedst in die bisherige Fassung ein" mehr -
  // jede Einladung fuehrt ueber /join/start in den aktuellen Weg
  // (resolveInvitationContinueTarget), unabhaengig von der Fassung der
  // einladenden Person.

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <div className="mb-6">
        <a
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          {t("backToDashboard")}
        </a>
      </div>
      <div className="space-y-6">
        {!targetTeam && <MatchingStartBlock />}
        <CoFounderInviteForm targetTeam={targetTeam} />
      </div>
    </main>
  );
}
