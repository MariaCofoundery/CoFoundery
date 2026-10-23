"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FOUNDER_LIBRARY_CATEGORY_KEYS,
  filterFounderLibraryTerms,
  retainVisibleFounderLibraryOpenTerm,
  sortFounderLibraryTerms,
  toggleFounderLibraryOpenTerm,
  type FounderLibraryCategoryFilter,
  type FounderLibraryCategoryKey,
  type LocalizedFounderLibraryTerm,
} from "@/features/founderLibrary/founderLibraryRegistry";

type Labels = {
  searchLabel: string;
  searchPlaceholder: string;
  filtersLabel: string;
  allCategories: string;
  categories: Record<FounderLibraryCategoryKey, string>;
  shortExplanation: string;
  noResults: string;
  noResultsHint: string;
  setupPrompt: string;
  openInSetup: string;
};

type Props = {
  teamId?: string;
  locale: string;
  terms: readonly LocalizedFounderLibraryTerm[];
  setupTopicLabels: Record<string, string>;
  labels: Labels;
};

export function FounderLibraryGlossary({ teamId, locale, terms, setupTopicLabels, labels }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FounderLibraryCategoryFilter>("all");
  const [openTermId, setOpenTermId] = useState<string | null>(null);

  const visibleTerms = useMemo(
    () => sortFounderLibraryTerms(filterFounderLibraryTerms(terms, query, category), locale),
    [category, locale, query, terms],
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, LocalizedFounderLibraryTerm[]>();
    for (const entry of visibleTerms) {
      const letter = entry.term.charAt(0).toLocaleUpperCase(locale);
      grouped.set(letter, [...(grouped.get(letter) ?? []), entry]);
    }
    return [...grouped.entries()];
  }, [locale, visibleTerms]);

  function toggleEntry(id: string) {
    setOpenTermId((current) => toggleFounderLibraryOpenTerm(current, id));
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    const nextVisibleTerms = filterFounderLibraryTerms(terms, nextQuery, category);
    setOpenTermId((current) => retainVisibleFounderLibraryOpenTerm(current, nextVisibleTerms));
  }

  function updateCategory(nextCategory: FounderLibraryCategoryFilter) {
    setCategory(nextCategory);
    const nextVisibleTerms = filterFounderLibraryTerms(terms, query, nextCategory);
    setOpenTermId((current) => retainVisibleFounderLibraryOpenTerm(current, nextVisibleTerms));
  }

  const filters: FounderLibraryCategoryFilter[] = ["all", ...FOUNDER_LIBRARY_CATEGORY_KEYS];

  const CATEGORY_TONE: Record<FounderLibraryCategoryKey, string> = {
    equity_financing: "bg-[#e3f6ec] text-[#17794a]",
    contracts_governance: "bg-[#e1effa] text-[#0b5a8a]",
    legal_form_liability: "bg-[#fdecc8] text-[#7a4300]",
    company_building: "bg-[#efeafd] text-[#4a2fb8]",
  } as Record<FounderLibraryCategoryKey, string>;
  const presentLetters = groups.map(([letter]) => letter);
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="mt-7">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="founder-library-search" className="sr-only">{labels.searchLabel}</label>
          <div className="relative">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#8b89aa]">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              id="founder-library-search"
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className="min-h-12 w-full rounded-xl border border-[#d8d5ea] bg-white py-3 pl-12 pr-4 text-base text-[#0b1f3a] outline-none placeholder:text-[#8b89aa] focus:border-[#6d49e0] focus:ring-4 focus:ring-[#6d49e0]/15"
            />
          </div>
        </div>

        <div role="group" aria-label={labels.filtersLabel} className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const selected = category === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={selected}
                onClick={() => updateCategory(filter)}
                className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] ${selected ? "border-[#0b1f3a] bg-[#0b1f3a] text-white" : "border-[#d8d5ea] bg-white text-[#33325e] hover:bg-[#f5f2fe]"}`}
              >
                {filter === "all" ? labels.allCategories : labels.categories[filter]}
              </button>
            );
          })}
        </div>

        {/* A bis Z: Buchstaben mit Begriffen springen dorthin, die anderen stehen blass da. */}
        <div className="flex flex-wrap gap-1.5" aria-hidden={groups.length === 0}>
          {ALPHABET.map((letter) =>
            presentLetters.includes(letter) ? (
              <a key={letter} href={`#glossary-letter-${letter}`} className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#efeafd] text-sm font-bold text-[#4a2fb8] hover:bg-[#e4dcfb]">{letter}</a>
            ) : (
              <span key={letter} className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-sm font-bold text-[#c4c2d8]">{letter}</span>
            ),
          )}
        </div>
      </div>

      <div className="mt-7" aria-live="polite">
        {groups.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-medium text-[#0b1f3a]">{labels.noResults}</p>
            <p className="mt-2 text-sm text-[#5f5e7a]">{labels.noResultsHint}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(([letter, entries]) => (
              <section key={letter} aria-labelledby={`glossary-letter-${letter}`} className="scroll-mt-24">
                <div className="mb-3 flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#efeafd] text-xl font-bold text-[#4a2fb8]">{letter}</span>
                  <h2 id={`glossary-letter-${letter}`} className="sr-only">{letter}</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {entries.map((entry) => {
                    const isOpen = openTermId === entry.id;
                    const definition = entry.shortDefinition;
                    const panelId = `glossary-panel-${entry.id}`;
                    return (
                      <article key={entry.id} className={`rounded-[18px] border bg-white transition-shadow ${isOpen ? "border-[#d9cff8] md:col-span-2" : "border-[#e4e2f0] hover:shadow-[0_10px_24px_rgba(109,73,224,0.10)]"}`}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => toggleEntry(entry.id)}
                          className="group flex min-h-16 w-full items-center gap-3.5 rounded-[18px] px-[18px] py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]"
                        >
                          <span aria-hidden="true" className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[#efeafd] text-base font-bold text-[#4a2fb8]">{entry.term.charAt(0).toLocaleUpperCase(locale)}</span>
                          <span className="min-w-0 flex-1">
                            <span id={`glossary-term-${entry.id}`} className="block text-[16.5px] font-semibold tracking-tight text-[#0b1f3a]">{entry.term}</span>
                            {!isOpen ? <span className="mt-0.5 block truncate text-[13.5px] text-[#5f5e7a]">{definition}</span> : null}
                          </span>
                          <span className={`hidden flex-none rounded-full px-2.5 py-0.5 text-[13px] font-semibold sm:inline-block ${CATEGORY_TONE[entry.category] ?? "bg-[#f1f0f7] text-[#33325e]"}`}>{labels.categories[entry.category]}</span>
                          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`size-5 shrink-0 text-[#8b89aa] transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}>
                            <path d="m5 7.5 5 5 5-5" />
                          </svg>
                        </button>

                        {isOpen ? (
                          <div id={panelId} className="px-[18px] pb-5 pl-[66px] pr-9" role="region" aria-labelledby={`glossary-term-${entry.id}`}>
                            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]">{labels.shortExplanation}</h3>
                            <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[#0b1f3a]">{entry.shortDefinition}</p>
                            {teamId && (entry.setupTopicKeys?.length ?? 0) > 0 ? (
                              <div className="mt-4 rounded-2xl bg-[#f5f2fe] px-4 py-3">
                                <p className="text-xs text-[#5f5e7a]">{labels.setupPrompt}</p>
                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                                  {entry.setupTopicKeys?.map((topicKey) => (
                                    <Link key={topicKey} href={`/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(topicKey)}`} className="rounded-sm text-sm font-semibold text-[#6d49e0] underline-offset-4 hover:underline">
                                      {labels.openInSetup.replace("{topic}", setupTopicLabels[topicKey] ?? topicKey)}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
