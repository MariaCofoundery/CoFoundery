import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  FOUNDER_LIBRARY_CATEGORY_KEYS,
  getFounderLibraryResourcesByCategory,
} from "@/features/founderLibrary/founderLibraryRegistry";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ teamId: string }> };

export default async function FounderLibraryPage({ params }: Props) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = `/teams/${encodeURIComponent(teamId)}/founder-library`;
  if (!user) redirect(`/login?next=${encodeURIComponent(pathname)}`);
  const team = await getFounderTeamHomebase(teamId, user.id, supabase);
  if (!team) notFound();

  const [t, setupT, navigationT] = await Promise.all([
    getTranslations("founderLibrary"),
    getTranslations("teams.setup"),
    getTranslations("teams.teamNavigation"),
  ]);
  const teamLabel = team.name ?? team.members
    .map((member, index) => member.displayName ?? t("founderFallback", { index: index + 1 }))
    .join(" + ");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${encodeURIComponent(teamId)}`} className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">{t("back")}</Link>
      <header className="mt-6 border-b border-slate-200 pb-7 sm:pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950">{t("title")}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{t("intro")}</p>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-500">{t("professionalNote")}</p>
      </header>

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

      <div className="mt-8 space-y-9">
        {FOUNDER_LIBRARY_CATEGORY_KEYS.map((category) => {
          const resources = getFounderLibraryResourcesByCategory(category);
          return (
            <section key={category} aria-labelledby={`library-category-${category}`}>
              <h2 id={`library-category-${category}`} className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">{t(`categories.${category}`)}</h2>
              <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                {resources.map((resource) => (
                  <article key={resource.id} className="min-w-0 py-5 sm:py-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-xl font-semibold text-slate-950">{t(`resources.${resource.id}.title`)}</h3>
                      <span className="text-xs font-medium text-slate-500">{t(`statuses.${resource.status}`)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{t(`resources.${resource.id}.description`)}</p>
                    {(resource.setupTopicKeys?.length ?? 0) > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                        {resource.setupTopicKeys?.map((topicKey) => (
                          <Link key={topicKey} href={`/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(topicKey)}`} className="rounded-sm text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">{t("openInSetup", { topic: setupT(`items.${topicKey}.title`) })}</Link>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
