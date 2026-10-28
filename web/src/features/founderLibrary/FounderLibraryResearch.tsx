import type { FounderLibraryResearchSource } from "@/features/founderLibrary/founderLibraryResearchRegistry";

type LocalizedSource = FounderLibraryResearchSource & { summary: string; limits: string };

type Props = {
  sources: readonly LocalizedSource[];
  /** Titel der Setup-Themen, fuer die der Hinweis "Oft ein Knackpunkt" gilt. */
  conflictTopicTitles: readonly string[];
  labels: {
    listLabel: string;
    doi: string;
    open: string;
    summary: string;
    limits: string;
    usedForTitle: string;
    usedFor: string;
    notCoveredTitle: string;
    notCovered: string;
    disclaimer: string;
  };
};

export function FounderLibraryResearch({ sources, conflictTopicTitles, labels }: Props) {
  return (
    <div className="mt-8">
      <section className="grid gap-4" aria-label={labels.listLabel}>
        {sources.map((source) => (
          <article key={source.id} className="rounded-[24px] border border-[#e4e2f0] bg-white p-6 sm:p-[26px]">
            <p className="text-sm font-medium text-slate-600">{source.authors} ({source.year})</p>
            <h2 className="mt-2 max-w-3xl text-xl font-semibold tracking-tight text-[#0b1f3a]">{source.title}</h2>
            <p className="mt-1 text-sm italic text-slate-600">{source.venue}</p>

            <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.1em] text-[#5f5e7a]">{labels.summary}</h3>
            <p className="mt-1 max-w-3xl text-[15px] leading-7 text-slate-800">{source.summary}</p>

            <h3 className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-[#5f5e7a]">{labels.limits}</h3>
            <p className="mt-1 max-w-3xl text-[15px] leading-7 text-slate-800">{source.limits}</p>

            <h3 className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-[#5f5e7a]">{labels.usedForTitle}</h3>
            <p className="mt-1 max-w-3xl text-[15px] leading-7 text-slate-800">{labels.usedFor}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {conflictTopicTitles.map((title) => (
                <li key={title} className="rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-800 ring-1 ring-inset ring-rose-200">{title}</li>
              ))}
            </ul>

            <p className="mt-5 text-sm text-slate-600">
              {labels.doi}: <span className="font-mono text-[13px]">{source.doi}</span>
            </p>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex min-h-11 items-center rounded-full border border-[#d8d5ea] bg-white px-5 text-sm font-semibold text-[#0b1f3a] transition hover:bg-[#f5f2fe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]"
            >
              {labels.open}
            </a>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-[24px] bg-[#f7f6fb] p-6" aria-labelledby="research-not-covered">
        <h2 id="research-not-covered" className="text-lg font-semibold text-[#0b1f3a]">{labels.notCoveredTitle}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-700">{labels.notCovered}</p>
      </section>

      <p className="mt-6 max-w-3xl text-xs leading-6 text-slate-500">{labels.disclaimer}</p>
    </div>
  );
}
