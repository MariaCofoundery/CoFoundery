import Link from "next/link";

type Group = { key: string; label: string; tabs: { key: string; label: string; href: string }[] };

/**
 * Die Bereiche der Organisation (Entwurf vom 05.11.2026, freigegeben): die drei Gruppen - Betreuen, Inhalte fuer
 * die Teams, Einrichten - als Umschalter im schmalen Kopf ("groups"), darunter die Reiter der gewaehlten Gruppe
 * als ruhige Zeile ("tabs"). Der Teamraum ist seit demselben Tag ein eigener Bereich im Hauptmenue.
 */
export function OrgAreaNav({ groups, activeTab, ariaLabel, part }: { groups: Group[]; activeTab: string; ariaLabel: string; part: "groups" | "tabs" }) {
  const active = groups.find((group) => group.tabs.some((entry) => entry.key === activeTab)) ?? groups[0];
  if (part === "groups") {
    return (
      <nav aria-label={ariaLabel} className="relative z-10 flex flex-wrap gap-1.5 rounded-[14px] bg-white/10 p-1">
        {groups.map((group) => {
          const isActive = group.key === active.key;
          return (
            <Link
              key={group.key}
              href={group.tabs[0].href}
              aria-current={isActive ? "true" : undefined}
              className={`inline-flex min-h-10 items-center rounded-[10px] px-4 text-sm ${isActive ? "bg-white font-semibold text-indigo-950" : "font-medium text-white hover:bg-white/10"}`}
            >
              {group.label}
            </Link>
          );
        })}
      </nav>
    );
  }
  return (
    <nav aria-label={active.label} className="-mx-4 flex gap-6 overflow-x-auto border-b border-slate-200 px-4 text-sm [scrollbar-width:none] sm:mx-0 sm:px-1">
      {active.tabs.map((entry) => (
        <Link
          key={entry.key}
          href={entry.href}
          aria-current={activeTab === entry.key ? "page" : undefined}
          className={`-mb-px inline-flex min-h-12 shrink-0 items-center whitespace-nowrap border-b-2 ${
            activeTab === entry.key ? "border-slate-950 font-semibold text-slate-950" : "border-transparent text-slate-600 hover:text-slate-950"
          }`}
        >
          {entry.label}
        </Link>
      ))}
    </nav>
  );
}
