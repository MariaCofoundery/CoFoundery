import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  FOUNDER_LIBRARY_CATEGORY_KEYS,
  FOUNDER_LIBRARY_TERMS,
  type FounderLibraryCategoryKey,
  type LocalizedFounderLibraryTerm,
} from "@/features/founderLibrary/founderLibraryRegistry";
import { FounderLibraryGlossary } from "@/features/founderLibrary/FounderLibraryGlossary";
import { FounderLibraryUpdates } from "@/features/founderLibrary/FounderLibraryUpdates";
import {
  FOUNDER_LIBRARY_OFFICIAL_SOURCES,
  FOUNDER_LIBRARY_UPDATES,
  type FounderLibraryUpdateCategory,
  type FounderLibraryUpdateJurisdiction,
  type FounderLibraryUpdateStatus,
  type LocalizedFounderLibraryUpdate,
} from "@/features/founderLibrary/founderLibraryUpdatesRegistry";

export type FounderLibraryViewKey = "glossary" | "updates";

type Props = {
  view: FounderLibraryViewKey;
  pathname: string;
  backHref: string;
  backLabel: string;
  teamId?: string;
  contextNavigation?: ReactNode;
};

export async function FounderLibraryView({
  view,
  pathname,
  backHref,
  backLabel,
  teamId,
  contextNavigation,
}: Props) {
  const [t, setupT, locale] = await Promise.all([
    getTranslations("founderLibrary"),
    getTranslations("teams.setup"),
    getLocale(),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={backHref} className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
        {backLabel}
      </Link>
      <header className="mt-6 border-b border-slate-200 pb-7 sm:pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{view === "glossary" ? t("eyebrow") : t("updates.eyebrow")}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950">{view === "glossary" ? t("title") : t("updates.title")}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{view === "glossary" ? t("intro") : t("updates.intro")}</p>
        {view === "glossary" ? <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-500">{t("professionalNote")}</p> : null}
      </header>

      {contextNavigation}

      <nav aria-label={t("views.label")} className="mt-7 border-b border-slate-200">
        <div className="flex gap-6">
          <Link
            href={pathname}
            aria-current={view === "glossary" ? "page" : undefined}
            className={`rounded-sm border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${view === "glossary" ? "border-slate-900 text-slate-950" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"}`}
          >
            {t("views.glossary")}
          </Link>
          <Link
            href={`${pathname}?view=updates`}
            aria-current={view === "updates" ? "page" : undefined}
            className={`rounded-sm border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${view === "updates" ? "border-slate-900 text-slate-950" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"}`}
          >
            {t("views.updates")}
          </Link>
        </div>
      </nav>

      {view === "glossary" ? (
        <FounderLibraryGlossary
          teamId={teamId}
          locale={locale}
          terms={FOUNDER_LIBRARY_TERMS.map((entry) => ({
            ...entry,
            term: t(`terms.${entry.id}.term`),
            shortDefinition: t(`terms.${entry.id}.shortDefinition`),
          })) satisfies LocalizedFounderLibraryTerm[]}
          setupTopicLabels={teamId ? Object.fromEntries(
            FOUNDER_LIBRARY_TERMS.flatMap((entry) => entry.setupTopicKeys ?? []).map((topicKey) => [topicKey, setupT(`items.${topicKey}.title`)]),
          ) : {}}
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
      ) : (
        <FounderLibraryUpdates
          locale={locale}
          updates={FOUNDER_LIBRARY_UPDATES.map((entry) => ({
            ...entry,
            title: t(`updates.entries.${entry.id}.title`),
            relevance: t(`updates.entries.${entry.id}.relevance`),
          })) satisfies LocalizedFounderLibraryUpdate[]}
          sources={FOUNDER_LIBRARY_OFFICIAL_SOURCES.map((source) => ({
            ...source,
            name: t(`updates.sources.${source.id}.name`),
            description: t(`updates.sources.${source.id}.description`),
          }))}
          labels={{
            updatesListLabel: t("updates.listLabel"),
            officialSourceLink: t("updates.officialSourceLink"),
            externalLink: t("updates.externalLink"),
            officialSourcesTitle: t("updates.sourcesTitle"),
            disclaimer: t("updates.disclaimer"),
            statusDatePrefixes: t.raw("updates.statusDatePrefixes") as Record<FounderLibraryUpdateStatus, string>,
            jurisdictions: t.raw("updates.jurisdictions") as Record<FounderLibraryUpdateJurisdiction, string>,
            categories: t.raw("updates.categories") as Record<FounderLibraryUpdateCategory, string>,
          }}
        />
      )}
    </main>
  );
}
