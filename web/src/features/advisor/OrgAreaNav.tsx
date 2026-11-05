import Link from "next/link";

type Group = { key: string; label: string; hint: string; tabs: { key: string; label: string; href: string }[] };

const ICONS: Record<string, string> = {
  care: "M3 12h4l3-8 4 16 3-8h4",
  team: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8M13.5 15c.8-.5 1.6-.8 2.5-.8 2.7 0 4.9 1.8 5.5 4.8",
  content: "M4 5h6a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4V5zM20 5h-6a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h7V5z",
  setup: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
};

/**
 * Die Bereiche der Organisation in Gruppen statt vieler Reiter in einer Reihe (seit 05.11.2026):
 * Betreuen (taeglich), Teamraum (das Team der Organisation), Inhalte fuer die Teams, Einrichten.
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
                <path d={ICONS[group.key] ?? ICONS.care} />
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
