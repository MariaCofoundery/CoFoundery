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
import { FounderLibraryResearch } from "@/features/founderLibrary/FounderLibraryResearch";
import { FOUNDER_LIBRARY_RESEARCH_SOURCES } from "@/features/founderLibrary/founderLibraryResearchRegistry";
import { FOUNDER_SETUP_CONFLICT_PRONE } from "@/features/teams/founderSetupCatalog";
import {
  FOUNDER_LIBRARY_OFFICIAL_SOURCES,
  FOUNDER_LIBRARY_UPDATES,
  type FounderLibraryUpdateCategory,
  type FounderLibraryUpdateJurisdiction,
  type FounderLibraryUpdateStatus,
  type LocalizedFounderLibraryUpdate,
} from "@/features/founderLibrary/founderLibraryUpdatesRegistry";

export type { FounderLibraryViewKey } from "@/features/founderLibrary/founderLibraryViewKey";
import type { FounderLibraryViewKey } from "@/features/founderLibrary/founderLibraryViewKey";

type Props = {
  view: FounderLibraryViewKey;
  pathname: string;
  backHref?: string;
  backLabel?: string;
  teamId?: string;
  contextNavigation?: ReactNode;
  /**
   * Phase 11.7B.1: Im Team traegt der gemeinsame Teamkopf (TeamPageHeader)
   * Rueckweg, Titel und Teamreiter - dann kein eigener Rueckweg und kein
   * zweiter Titel.
   */
  teamHeader?: ReactNode;
};

export async function FounderLibraryView({
  view,
  pathname,
  backHref,
  backLabel,
  teamId,
  contextNavigation,
  teamHeader,
}: Props) {
  const [t, setupT, locale] = await Promise.all([
    getTranslations("founderLibrary"),
    getTranslations("teams.setup"),
    getLocale(),
  ]);

  const tab = (active: boolean, onBrand: boolean) =>
    `inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] ${
      active
        ? onBrand
          ? "bg-white text-[#4a2fb8]"
          : "bg-[#0b1f3a] text-white"
        : onBrand
          ? "text-white hover:bg-white/15"
          : "border border-[#d8d5ea] bg-white text-[#33325e] hover:bg-[#f5f2fe]"
    }`;
  const tabs = (onBrand: boolean) => (
    <nav aria-label={t("views.label")} className={onBrand ? "inline-flex gap-1 rounded-full bg-white/20 p-1" : "mt-6 flex gap-2"}>
      <Link href={pathname} aria-current={view === "glossary" ? "page" : undefined} className={tab(view === "glossary", onBrand)}>
        {t("views.glossary")}
      </Link>
      <Link href={`${pathname}?view=updates`} aria-current={view === "updates" ? "page" : undefined} className={tab(view === "updates", onBrand)}>
        {t("views.updates")}
      </Link>
      <Link href={`${pathname}?view=research`} aria-current={view === "research" ? "page" : undefined} className={tab(view === "research", onBrand)}>
        {t("views.research")}
      </Link>
    </nav>
  );

  return (
    <main className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${teamHeader ? "py-5 sm:py-6" : "py-8 sm:py-10"}`}>
      {teamHeader ? (
        <>
          {teamHeader}
          <p className="mt-4 max-w-3xl text-lg font-medium leading-7 text-slate-900">{view === "glossary" ? t("title") : view === "research" ? t("research.title") : t("updates.title")}</p>
          <p className="mt-1 max-w-3xl text-base leading-7 text-slate-700">{view === "glossary" ? t("intro") : view === "research" ? t("research.intro") : t("updates.intro")}</p>
          {view === "glossary" ? <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">{t("professionalNote")}</p> : null}
        </>
      ) : (
      <>
      {backHref && backLabel ? (
        <Link href={backHref} className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
          {backLabel}
        </Link>
      ) : null}
      <header className="brand-panel relative mt-5 grid items-center gap-5 overflow-hidden rounded-[28px] px-6 py-8 sm:px-9 md:grid-cols-[minmax(0,1fr)_auto]">
        <span aria-hidden="true" className="orb -top-14 right-52 hidden h-36 w-36 md:block" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{view === "glossary" ? t("eyebrow") : view === "research" ? t("research.eyebrow") : t("updates.eyebrow")}</p>
          <h1 className="mt-1 max-w-2xl text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[34px]">{view === "glossary" ? t("title") : view === "research" ? t("research.title") : t("updates.title")}</h1>
          <p className="mt-2 max-w-xl text-[15.5px] leading-7 text-white opacity-95">{view === "glossary" ? t("intro") : view === "research" ? t("research.intro") : t("updates.intro")}</p>
          {view === "glossary" ? <p className="mt-2 max-w-xl text-[13px] leading-6 text-white opacity-90">{t("professionalNote")}</p> : null}
        </div>
        <div className="md:justify-self-end">{tabs(true)}</div>
      </header>

      {contextNavigation}
      </>
      )}

      {teamHeader ? tabs(false) : null}

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
      ) : view === "research" ? (
        <FounderLibraryResearch
          sources={FOUNDER_LIBRARY_RESEARCH_SOURCES.map((source) => ({
            ...source,
            summary: t(`research.entries.${source.id}.summary`),
            limits: t(`research.entries.${source.id}.limits`),
          }))}
          conflictTopicTitles={[...FOUNDER_SETUP_CONFLICT_PRONE].map((key) => setupT(`items.${key}.title`))}
          labels={{
            listLabel: t("research.listLabel"),
            doi: t("research.doi"),
            open: t("research.open"),
            summary: t("research.summary"),
            limits: t("research.limits"),
            usedForTitle: t("research.usedForTitle"),
            usedFor: t("research.usedFor"),
            notCoveredTitle: t("research.notCoveredTitle"),
            notCovered: t("research.notCovered"),
            disclaimer: t("research.disclaimer"),
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
