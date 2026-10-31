import Link from "next/link";

type Group = { key: string; label: string; hint: string; tabs: { key: string; label: string; href: string }[] };

const ICONS: Record<string, string> = {
  run: "M3 12h4l3-8 4 16 3-8h4",
  setup: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  manage: "M12 3l8 4v5c0 4.5-3.4 7.6-8 9-4.6-1.4-8-4.5-8-9V7l8-4z",
};

/**
 * Die Bereiche der Organisation in drei Gruppen statt zehn Reitern in einer Reihe:
 * laufender Betrieb (taeglich), Einrichten (zu Beginn, selten wieder) und Verwalten (Hintergrund).
 * Die Gruppe sagt in einem Satz, wofuer sie da ist.
 */
export function OrgAreaNav({ groups, activeTab, ariaLabel }: { groups: Group[]; activeTab: string; ariaLabel: string }) {
  const active = groups.find((group) => group.tabs.some((entry) => entry.key === activeTab)) ?? groups[0];
  return (
    <div className="grid gap-3" role="group" aria-label={ariaLabel}>
      <nav className="flex flex-wrap gap-2" aria-label={ariaLabel}>
        {groups.map((group) => {
          const isActive = group.key === active.key;
          return (
            <Link
              key={group.key}
              href={group.tabs[0].href}
              aria-current={isActive ? "true" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
                isActive ? "bg-white text-indigo-900" : "bg-white/10 text-indigo-100 hover:bg-white/20"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICONS[group.key] ?? ICONS.run} />
              </svg>
              {group.label}
            </Link>
          );
        })}
      </nav>
      <p className="text-xs leading-5 text-indigo-100/90">{active.hint}</p>
      <nav className="flex flex-wrap gap-1.5" aria-label={active.label}>
        {active.tabs.map((entry) => (
          <Link
            key={entry.key}
            href={entry.href}
            aria-current={activeTab === entry.key ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium ${
              activeTab === entry.key ? "bg-white/90 text-indigo-950" : "text-indigo-100 underline-offset-4 hover:bg-white/10 hover:underline"
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
