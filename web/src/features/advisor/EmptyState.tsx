import Link from "next/link";

/**
 * Ein leerer Bereich mit dem logischen naechsten Schritt: kurzer Satz, ein Icon, ein bis zwei Wege.
 * Ersetzt Saetze, die nur "noch nichts da" sagen und ins Leere laufen.
 */
export function EmptyState({
  text,
  actions,
}: {
  text: string;
  actions: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-5 sm:flex-row sm:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-slate-700">{text}</p>
        {actions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold ${
                  action.primary ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
