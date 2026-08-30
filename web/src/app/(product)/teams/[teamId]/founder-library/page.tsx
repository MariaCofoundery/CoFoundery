import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  FOUNDER_LIBRARY_CATEGORY_KEYS,
  FOUNDER_LIBRARY_TERMS,
  type FounderLibraryCategoryKey,
  type LocalizedFounderLibraryTerm,
} from "@/features/founderLibrary/founderLibraryRegistry";
import { FounderLibraryGlossary } from "@/features/founderLibrary/FounderLibraryGlossary";
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

  const [t, setupT, navigationT, locale] = await Promise.all([
    getTranslations("founderLibrary"),
    getTranslations("teams.setup"),
    getTranslations("teams.teamNavigation"),
    getLocale(),
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

      <FounderLibraryGlossary
        teamId={teamId}
        locale={locale}
        terms={FOUNDER_LIBRARY_TERMS.map((entry) => ({
          ...entry,
          term: t(`terms.${entry.id}.term`),
          shortDefinition: t(`terms.${entry.id}.shortDefinition`),
        })) satisfies LocalizedFounderLibraryTerm[]}
        setupTopicLabels={Object.fromEntries(
          FOUNDER_LIBRARY_TERMS.flatMap((entry) => entry.setupTopicKeys ?? []).map((topicKey) => [topicKey, setupT(`items.${topicKey}.title`)]),
        )}
        labels={{
          searchLabel: t("search.label"),
          searchPlaceholder: t("search.placeholder"),
          filtersLabel: t("filters.label"),
          allCategories: t("filters.all"),
          categories: Object.fromEntries(
            FOUNDER_LIBRARY_CATEGORY_KEYS.map((key) => [key, t(`categories.${key}`)]),
          ) as Record<FounderLibraryCategoryKey, string>,
          shortExplanation: t("shortExplanation"),
          noResults: t("search.noResults"),
          noResultsHint: t("search.noResultsHint"),
          setupPrompt: t("setupPrompt"),
          openInSetup: t.raw("openInSetup"),
        }}
      />
    </main>
  );
}
