import Link from "next/link";

type NavigationKey = "overview" | "workstyle" | "roles" | "setup" | "library" | "alignment";

type Props = {
  teamId: string;
  active: NavigationKey;
  labels: {
    ariaLabel: string;
    overview: string;
    workstyle: string;
    roles: string;
    setup: string;
    library: string;
    /** Nicht mehr in der Leiste (Phase 11.7B) - fruehere Auswertungen stehen auf der Uebersicht. */
    alignment?: string;
  };
};

/**
 * Die Arbeitsstruktur eines Teams - in der Reihenfolge, in der ein Team sie
 * benutzt: Ueberblick, sich verstehen (Zusammenspiel, Faehigkeiten),
 * festhalten (Setup), nachschlagen (Library).
 *
 * Phase 11.7B: Die Leiste gehoert zum Teaminhalt, nicht zur globalen
 * Navigation. Deshalb ruhige Reiter mit Unterstrich statt eines dunklen
 * Pills - global gibt es die farbige Pille, in der zweiten Ebene den
 * Unterstrich, hier denselben Unterstrich. Auf dem Telefon horizontal
 * scrollbar statt umbrechend; jedes Ziel bleibt mindestens 44 Pixel hoch.
 */
export function FounderTeamNavigation({ teamId, active, labels }: Props) {
  const team = encodeURIComponent(teamId);
  const items = [
    { key: "overview" as const, href: `/teams/${team}` },
    { key: "workstyle" as const, href: `/teams/${team}/workstyle` },
    { key: "roles" as const, href: `/teams/${encodeURIComponent(teamId)}/roles` },
    { key: "setup" as const, href: `/teams/${team}/setup` },
    { key: "library" as const, href: `/teams/${team}/founder-library` },
  ];

  return (
    <nav aria-label={labels.ariaLabel} className="ws-no-print team-tabs -mx-4 mt-4 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max items-end gap-1 sm:gap-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 sm:px-3 ${
                active === item.key
                  ? "border-violet-500 font-semibold text-slate-950"
                  : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {labels[item.key]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
