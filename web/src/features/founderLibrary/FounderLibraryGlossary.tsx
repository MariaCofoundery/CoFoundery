"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FOUNDER_LIBRARY_CATEGORY_KEYS,
  filterFounderLibraryTerms,
  sortFounderLibraryTerms,
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
  teamId: string;
  locale: string;
  terms: readonly LocalizedFounderLibraryTerm[];
  setupTopicLabels: Record<string, string>;
  labels: Labels;
};

export function FounderLibraryGlossary({ teamId, locale, terms, setupTopicLabels, labels }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FounderLibraryCategoryFilter>("all");
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());

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
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filters: FounderLibraryCategoryFilter[] = ["all", ...FOUNDER_LIBRARY_CATEGORY_KEYS];

  return (
    <div className="mt-8">
      <div className="border-b border-slate-200 pb-6">
        <label htmlFor="founder-library-search" className="text-sm font-semibold text-slate-800">{labels.searchLabel}</label>
        <div className="relative mt-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            id="founder-library-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
        </div>

        <div className="mt-4" role="group" aria-label={labels.filtersLabel}>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const selected = category === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategory(filter)}
                  className={`min-h-10 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"}`}
                >
                  {filter === "all" ? labels.allCategories : labels.categories[filter]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-7" aria-live="polite">
        {groups.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-medium text-slate-900">{labels.noResults}</p>
            <p className="mt-2 text-sm text-slate-500">{labels.noResultsHint}</p>
          </div>
        ) : (
          <div className="space-y-9">
            {groups.map(([letter, entries]) => (
              <section key={letter} aria-labelledby={`glossary-letter-${letter}`}>
                <h2 id={`glossary-letter-${letter}`} className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">{letter}</h2>
                <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
                  {entries.map((entry) => {
                    const isOpen = openIds.has(entry.id);
                    const panelId = `glossary-panel-${entry.id}`;
                    return (
                      <article key={entry.id}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => toggleEntry(entry.id)}
                          className="group flex min-h-16 w-full items-start justify-between gap-4 rounded-sm py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:py-5"
                        >
                          <span className="min-w-0">
                            <span id={`glossary-term-${entry.id}`} className="block text-lg font-semibold tracking-tight text-slate-950 group-hover:text-amber-800">{entry.term}</span>
                          </span>
                          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`mt-1 size-5 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}>
                            <path d="m5 7.5 5 5 5-5" />
                          </svg>
                        </button>

                        {isOpen ? (
                          <div id={panelId} className="pb-5 pr-9 sm:pb-6" role="region" aria-labelledby={`glossary-term-${entry.id}`}>
                            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{labels.shortExplanation}</h3>
                            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">{entry.shortDefinition}</p>
                            {(entry.setupTopicKeys?.length ?? 0) > 0 ? (
                              <div className="mt-5 border-l-2 border-amber-200 pl-3">
                                <p className="text-xs text-slate-500">{labels.setupPrompt}</p>
                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                                  {entry.setupTopicKeys?.map((topicKey) => (
                                    <Link key={topicKey} href={`/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(topicKey)}`} className="rounded-sm text-sm font-medium text-slate-700 underline-offset-4 hover:text-amber-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
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
