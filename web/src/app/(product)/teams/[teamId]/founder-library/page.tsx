import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FounderLibraryView } from "@/features/founderLibrary/FounderLibraryView";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<{ view?: string }>;
};

export default async function FounderLibraryPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const view = (await searchParams)?.view === "updates" ? "updates" : "glossary";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = `/teams/${encodeURIComponent(teamId)}/founder-library`;
  if (!user) redirect(`/login?next=${encodeURIComponent(pathname)}`);

  const team = await getFounderTeamHomebase(teamId, user.id, supabase);
  if (!team) notFound();

  const [t, navigationT] = await Promise.all([
    getTranslations("founderLibrary"),
    getTranslations("teams.teamNavigation"),
  ]);
  const teamLabel = team.name ?? team.members
    .map((member, index) => member.displayName ?? t("founderFallback", { index: index + 1 }))
    .join(" + ");

  return (
    <FounderLibraryView
      view={view}
      pathname={pathname}
      backHref={`/teams/${encodeURIComponent(teamId)}`}
      backLabel={t("back")}
      teamId={teamId}
      contextNavigation={(
        <FounderTeamNavigation
          teamId={teamId}
          active="library"
          labels={{
            ariaLabel: navigationT("ariaLabel"),
            context: navigationT("context", { team: teamLabel }),
            overview: navigationT("overview"),
            setup: navigationT("setup"),
            library: navigationT("library"),
            alignment: navigationT("alignment"),
          }}
        />
      )}
    />
  );
}
