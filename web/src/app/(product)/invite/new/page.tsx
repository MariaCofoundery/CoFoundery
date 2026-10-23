import { redirect } from "next/navigation";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
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
    if (!team) return <TeamUnavailable teamId={teamId} />;
    if (team.members.length >= 4) redirect(`/teams/${teamId}`);
    targetTeam = { id: team.id, name: team.name ?? team.members.map(m => m.displayName ?? "Founder").join(" + "), context: team.teamContext };
  }

  // Phase 10: Kein Hinweis "du laedst in die bisherige Fassung ein" mehr -
  // jede Einladung fuehrt ueber /join/start in den aktuellen Weg
  // (resolveInvitationContinueTarget), unabhaengig von der Fassung der
  // einladenden Person.

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-10 sm:py-14">
      {/* Phase 12C.1C: Aus dem Team heraus geoeffnet fuehrt der Weg zurueck ins Team. */}
      <a
        href={targetTeam ? `/teams/${encodeURIComponent(targetTeam.id)}` : "/dashboard"}
        className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
      >
        {"\u2190 "}{targetTeam ? t("backToTeam") : t("backToDashboard")}
      </a>
      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
          {targetTeam ? t("leadTeam", { name: targetTeam.name }) : t("lead")}
        </p>
      </header>
      <div className="mt-8">
        <CoFounderInviteForm targetTeam={targetTeam} />
        {!targetTeam && <MatchingStartBlock />}
      </div>
    </main>
  );
}
