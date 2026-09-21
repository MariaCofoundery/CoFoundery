import Link from "next/link";

type Props = {
  teamId: string;
  active: "overview" | "setup" | "library" | "alignment" | "roles";
  labels: {
    ariaLabel: string;
    context: string;
    overview: string;
    setup: string;
    library: string;
    alignment: string;
    roles: string;
  };
};

export function FounderTeamNavigation({ teamId, active, labels }: Props) {
  const items = [
    { key: "overview" as const, href: `/teams/${encodeURIComponent(teamId)}` },
    { key: "setup" as const, href: `/teams/${encodeURIComponent(teamId)}/setup` },
    { key: "library" as const, href: `/teams/${encodeURIComponent(teamId)}/founder-library` },
    { key: "alignment" as const, href: `/teams/${encodeURIComponent(teamId)}#team-alignment` },
    // DAZUGEKOMMEN AM 21.09.2026: Rollen und Zustaendigkeiten. Sie stehen
    // zuletzt, weil sie erst etwas zeigen, wenn die Mitglieder ihre Angaben
    // gemacht und freigegeben haben - ein Reiter, der bei den meisten Teams
    // zunaechst leer ist, gehoert nicht an den Anfang.
    { key: "roles" as const, href: `/teams/${encodeURIComponent(teamId)}/roles` },
  ];

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-3">
      <p className="px-2 text-xs font-medium text-slate-500">
        {labels.context}
      </p>
      <nav aria-label={labels.ariaLabel} className="mt-2 flex flex-wrap gap-1">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 ${
              active === item.key
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            {labels[item.key]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
