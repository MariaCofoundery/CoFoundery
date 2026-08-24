import Link from "next/link";

type Props = {
  teamId: string;
  active: "overview" | "setup" | "alignment";
  labels: {
    ariaLabel: string;
    context: string;
    overview: string;
    setup: string;
    alignment: string;
  };
};

export function FounderTeamNavigation({ teamId, active, labels }: Props) {
  const items = [
    { key: "overview" as const, href: `/teams/${encodeURIComponent(teamId)}` },
    { key: "setup" as const, href: `/teams/${encodeURIComponent(teamId)}/setup` },
    { key: "alignment" as const, href: `/teams/${encodeURIComponent(teamId)}#team-alignment` },
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
