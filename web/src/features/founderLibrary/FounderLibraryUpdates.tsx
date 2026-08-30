import {
  sortFounderLibraryUpdates,
  type FounderLibraryOfficialSource,
  type FounderLibraryUpdateCategory,
  type FounderLibraryUpdateJurisdiction,
  type FounderLibraryUpdateStatus,
  type LocalizedFounderLibraryUpdate,
} from "@/features/founderLibrary/founderLibraryUpdatesRegistry";

type LocalizedOfficialSource = FounderLibraryOfficialSource & {
  name: string;
  description: string;
};

type Labels = {
  updatesListLabel: string;
  officialSourceLink: string;
  externalLink: string;
  officialSourcesTitle: string;
  disclaimer: string;
  statusDatePrefixes: Record<FounderLibraryUpdateStatus, string>;
  jurisdictions: Record<FounderLibraryUpdateJurisdiction, string>;
  categories: Record<FounderLibraryUpdateCategory, string>;
};

type Props = {
  locale: string;
  updates: readonly LocalizedFounderLibraryUpdate[];
  sources: readonly LocalizedOfficialSource[];
  labels: Labels;
};

function ExternalArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4 shrink-0">
      <path d="M7 5h8v8" />
      <path d="m15 5-9 9" />
    </svg>
  );
}

export function FounderLibraryUpdates({ locale, updates, sources, labels }: Props) {
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div className="mt-8">
      <section className="divide-y divide-slate-200" aria-label={labels.updatesListLabel}>
        {sortFounderLibraryUpdates(updates).map((update) => (
          <article key={update.id} className="py-7 sm:py-8">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
              <span className="text-amber-800">
                {labels.statusDatePrefixes[update.status]}{" "}
                <time dateTime={update.date}>{dateFormatter.format(new Date(`${update.date}T00:00:00Z`))}</time>
              </span>
              <span aria-hidden="true">·</span>
              <span>{labels.jurisdictions[update.jurisdiction]}</span>
              <span aria-hidden="true">·</span>
              <span>{labels.categories[update.category]}</span>
            </div>
            <h2 className="mt-3 max-w-3xl text-xl font-semibold tracking-tight text-slate-950">{update.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{update.relevance}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={update.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                {labels.officialSourceLink}
                <ExternalArrow />
                <span className="sr-only">({labels.externalLink})</span>
              </a>
              <span className="text-xs text-slate-400">{update.sourceLabel}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 border-t border-slate-200 pt-8" aria-labelledby="founder-library-official-sources">
        <h2 id="founder-library-official-sources" className="text-xl font-semibold tracking-tight text-slate-950">{labels.officialSourcesTitle}</h2>
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {sources.map((source) => (
            <article key={source.id} className="py-5">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-sm font-semibold text-slate-900 underline-offset-4 hover:text-amber-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                {source.name}
                <ExternalArrow />
                <span className="sr-only">({labels.externalLink})</span>
              </a>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{source.description}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-8 max-w-3xl border-t border-slate-200 pt-5 text-xs leading-6 text-slate-500">{labels.disclaimer}</p>
    </div>
  );
}
