type Props = {
  displayName?: string | null;
  quote: string;
};

export function DailyQuote({ displayName, quote }: Props) {
  const normalizedName = displayName?.trim();
  const greeting = normalizedName
    ? `Schön, dass du da bist, ${normalizedName} 👋`
    : "Schön, dass du da bist 👋";

  return (
    <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white/92 px-4 py-3 md:px-5 md:py-4">
      <div className="flex items-start gap-3 border-l-2 border-cyan-300/80 pl-3">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-300/90" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-slate-900 md:text-base">{greeting}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Zitat des Tages
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">„{quote}“</p>
        </div>
      </div>
    </section>
  );
}
