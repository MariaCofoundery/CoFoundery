import { redirect } from "next/navigation";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { getTranslations } from "next-intl/server";
import { FounderLibraryView } from "@/features/founderLibrary/FounderLibraryView";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<{ view?: string }>;
};

export default async function FounderLibraryPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const view = (await searchParams)?.view === "updates" ? "updates" : "glossary";
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  const pathname = `/teams/${encodeURIComponent(teamId)}/founder-library`;
  if (!user) redirect(`/login?next=${encodeURIComponent(pathname)}`);

  const team = await getFounderTeamHomebase(teamId, user.id, supabase);
  if (!team) return <TeamUnavailable teamId={teamId} />;

  const [t, teamLabel] = await Promise.all([
    getTranslations("founderLibrary"),
    getTeamLabel(supabase, teamId),
  ]);

  // Phase 11.7B.1: gemeinsamer Teamkopf statt eigenem Rueckweg und Leiste.
  return (
    <FounderLibraryView
      view={view}
      pathname={pathname}
      teamId={teamId}
      teamHeader={<TeamPageHeader teamId={teamId} active="library" title={view === "glossary" ? t("eyebrow") : t("updates.eyebrow")} teamLabel={teamLabel} />}
    />
  );
}
