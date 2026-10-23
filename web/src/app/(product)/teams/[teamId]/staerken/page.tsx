import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { getPersonStrengths } from "@/features/capability/strengthData";
import { getDirectionStatements } from "@/features/direction/directionStatementData";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { TeamStrengthsView } from "@/features/teams/TeamStrengthsView";
import { getTeamStrengthsOverview } from "@/features/teams/teamStrengthsData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Stärken und Antrieb im Team.
 *
 * EINE EIGENE FREIGABE, getrennt von Arbeitsweise und Fähigkeiten (`team_shares`), von Werte & Zielkonflikten und
 * von allem, was Advisors, FIND oder Forschung betrifft. Die Datenbank entscheidet, was gelesen werden darf
 * (`get_team_strengths_overview`); die Seite setzt nichts zusammen. Wer nicht geteilt hat, erscheint nicht.
 */
export default async function TeamStrengthsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ freigabe?: string }>;
}) {
  const { teamId } = await params;
  const { freigabe } = await searchParams;
  const pathname = `/teams/${encodeURIComponent(teamId)}/staerken`;

  const [supabase, userResult] = await Promise.all([createClient(), getRequestUser()]);
  const user = userResult.data.user;
  if (!user) redirect(`/login?next=${encodeURIComponent(pathname)}`);

  const team = await getFounderTeamHomebase(teamId, user.id, supabase);
  if (!team) return <TeamUnavailable teamId={teamId} />;

  const [t, overview, teamLabel, ownStrengths, ownDirection] = await Promise.all([
    getTranslations("teams.strengthsShare"),
    getTeamStrengthsOverview(supabase, teamId),
    getTeamLabel(supabase, teamId),
    getPersonStrengths(supabase).catch(() => []),
    getDirectionStatements(supabase).catch(() => []),
  ]);
  if (!overview) return <TeamUnavailable teamId={teamId} />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <TeamPageHeader teamId={teamId} active="strengths" title={t("pageTitle")} teamLabel={teamLabel} hideTitle />
      <section className="brand-panel mt-5 rounded-[28px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{teamLabel}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{t("pageTitle")}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white">{t("pageText")}</p>
      </section>
      <TeamStrengthsView
        teamId={teamId}
        overview={overview}
        status={freigabe ?? null}
        hasOwnContent={ownStrengths.length > 0 || ownDirection.length > 0}
      />
    </main>
  );
}
