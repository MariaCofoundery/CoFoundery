import Link from "next/link";

export type WaitingItem = { key: string; text: string; href: string; cta: string; icon?: "flag" | "cal" | "lock" | "mail" };

const ICON = (kind: WaitingItem["icon"]) =>
  kind === "flag" ? (
    <path d="M6 20V4.5M6 5h11l-2.2 3.5L17 12H6" />
  ) : kind === "cal" ? (
    <><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>
  ) : kind === "lock" ? (
    <><rect x="5" y="10.5" width="14" height="9" rx="3" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>
  ) : (
    <><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="m4.5 8 7.5 5.5L19.5 8" /></>
  );

/** Die drei Kennzahlen oben auf "Heute". Zahlen je Zaehler, keine Gesamtwertung. */
export function TodayTiles({ teams, updates, invites, labels }: { teams: number; updates: number; invites: number; labels: [string, string, string] }) {
  const tiles: [string, number, React.ReactNode, string][] = [
    [labels[0], teams, <path key="a" d="M3 12h4l3-8 4 16 3-8h4" />, "bg-violet-100 text-violet-700"],
    [labels[1], updates, <><rect key="b" x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>, "bg-amber-100 text-amber-800"],
    [labels[2], invites, <><rect key="c" x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="m4.5 8 7.5 5.5L19.5 8" /></>, "bg-emerald-100 text-emerald-800"],
  ];
  return (
    <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map(([label, value, icon, tone]) => (
        <div key={label} className="advisor-card flex items-start gap-3 px-4 py-4">
          <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
          </span>
          <div>
            <dd className="text-3xl font-bold leading-none tracking-tight text-slate-950">{value}</dd>
            <dt className="mt-1 text-sm leading-5 text-slate-600">{label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Die Liste "Wartet auf dich" auf "Heute". */
export function WaitingItems({ items }: { items: WaitingItem[] }) {
  return (
    <ul className="mt-4 grid gap-3">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900">
          <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICON(item.icon)}</svg>
          </span>
          <span className="min-w-0">{item.text}</span>
          <Link href={item.href} className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            {item.cta}
          </Link>
        </li>
      ))}
    </ul>
  );
}
