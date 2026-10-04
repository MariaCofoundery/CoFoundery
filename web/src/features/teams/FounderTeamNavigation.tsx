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
    alignment: string;
  };
};

/**
 * Die Arbeitsstruktur eines Teams - seit Phase 9.4B in der Reihenfolge, in
 * der ein Team sie benutzt: Ueberblick, sich verstehen (Zusammenspiel,
 * Faehigkeiten), festhalten (Setup), nachschlagen (Library). Fruehere
 * Auswertungen stehen leise am Ende - sie sind Rueckblick, kein Bereich.
 *
 * Vorher stand "Euer Zusammenspiel" als hartkodierter Extra-Link vor der
 * Liste, ohne aktiven Zustand, und "Rollen" ganz hinten.
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
    <nav
      aria-label={labels.ariaLabel}
      className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-slate-200 pb-3"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 ${
            active === item.key
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          }`}
        >
          {labels[item.key]}
        </Link>
      ))}
      <Link
        href={`/teams/${team}#team-alignment`}
        className="ml-auto inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
      >
        {labels.alignment}
      </Link>
    </nav>
  );
}
