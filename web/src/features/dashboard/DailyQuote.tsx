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
    <section className="mb-6 rounded-xl border border-slate-200/80 bg-white/95 p-4 md:p-5">
      <div className="flex items-start gap-3 border-l-2 border-cyan-300 pl-3">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-300" aria-hidden="true" />
        <div>
          <p className="text-base font-medium text-slate-900 md:text-lg">{greeting}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-500">Zitat des Tages</p>
          <p className="mt-1 text-sm text-slate-700">„{quote}“</p>
        </div>
      </div>
    </section>
  );
}
