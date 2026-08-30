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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link href={`/teams/${encodeURIComponent(teamId)}`} className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">{t("back")}</Link>
      <header className="mt-6 overflow-hidden rounded-[30px] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-slate-50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t("title")}</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">{t("intro")}</p>
        <p className="mt-4 max-w-3xl border-l-2 border-amber-300 pl-4 text-sm leading-7 text-slate-600">{t("professionalNote")}</p>
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

      <div className="mt-8 space-y-10">
        {FOUNDER_LIBRARY_CATEGORY_KEYS.map((category) => {
          const resources = getFounderLibraryResourcesByCategory(category);
          return (
            <section key={category} aria-labelledby={`library-category-${category}`}>
              <h2 id={`library-category-${category}`} className="text-2xl font-semibold tracking-tight text-slate-950">{t(`categories.${category}`)}</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {resources.map((resource) => (
                  <article key={resource.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.035)] sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {resource.resourceTypes.map((type) => <span key={type} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">{t(`resourceTypes.${type}`)}</span>)}
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{t(`statuses.${resource.status}`)}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-slate-950">{t(`resources.${resource.id}.title`)}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{t(`resources.${resource.id}.description`)}</p>
                    <div className="mt-4 flex flex-wrap gap-2" aria-label={t("phaseLabel")}>
                      {resource.phases.map((phase) => <span key={phase} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{t(`phases.${phase}`)}</span>)}
                    </div>
                    {resource.setupTopicKeys.length > 0 ? (
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("setupConnection")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {resource.setupTopicKeys.map((topicKey) => (
                            <Link key={topicKey} href={`/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(topicKey)}`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">{t("openInSetup", { topic: setupT(`items.${topicKey}.title`) })}</Link>
                          ))}
                        </div>
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
