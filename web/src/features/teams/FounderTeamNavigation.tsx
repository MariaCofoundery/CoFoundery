import Link from "next/link";
import { TeamTabsActiveIntoView } from "@/features/teams/TeamTabsActiveIntoView";

type NavigationKey = "overview" | "workstyle" | "roles" | "setup" | "library" | "alignment" | "venture" | "tradeoffs" | "strengths" | "checkin";

type Props = {
  teamId: string;
  active: NavigationKey;
  labels: {
    ariaLabel: string;
    overview: string;
    workstyle: string;
    roles: string;
    venture: string;
    tradeoffs: string;
    strengths: string;
    checkin: string;
    setup: string;
    library: string;
    more: string;
    /** Nicht mehr in der Leiste (Phase 11.7B) - fruehere Auswertungen stehen auf der Uebersicht. */
    alignment?: string;
  };
};

/**
 * Die Arbeitsstruktur eines Teams.
 *
 * SEIT 04.11.2026 DREI REITER UND "MEHR" (Raster Kern / Ergaenzung / Hintergrund, Feedback an
 * Maria). Vorn steht, worauf es ankommt: Uebersicht, Zusammenspiel, Founder Setup. Alles andere
 * liegt in "Mehr" - erreichbar, aber nicht gleich laut. Vorher waren es neun Reiter, die auf einem
 * Laptop umbrachen.
 *
 * "Mehr" ist ein <details> ohne Client-JavaScript. Steht man auf einer Seite daraus, traegt der
 * Knopf ihren Namen und die Markierung - sonst wuesste man nicht, wo man ist.
 */
export function FounderTeamNavigation({ teamId, active, labels }: Props) {
  const team = encodeURIComponent(teamId);
  const primary = [
    { key: "overview" as const, href: `/teams/${team}` },
    { key: "workstyle" as const, href: `/teams/${team}/workstyle` },
    { key: "setup" as const, href: `/teams/${team}/setup` },
  ];
  const more = [
    { key: "venture" as const, href: `/teams/${team}/vorhaben-beta` },
    { key: "roles" as const, href: `/teams/${team}/roles` },
    { key: "tradeoffs" as const, href: `/teams/${team}/zielkonflikte` },
    { key: "strengths" as const, href: `/teams/${team}/staerken` },
    { key: "checkin" as const, href: `/teams/${team}/check-in` },
    { key: "library" as const, href: `/teams/${team}/founder-library` },
  ];
  const activeMore = more.find((item) => item.key === active) ?? null;
  const tab = (on: boolean) =>
    `-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 sm:px-3 ${
      on ? "border-violet-500 font-semibold text-slate-950" : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-900"
    }`;

  return (
    <nav aria-label={labels.ariaLabel} className="ws-no-print team-tabs mt-4 border-b border-slate-200">
      <ul className="flex flex-wrap items-end gap-x-1 sm:gap-x-2">
        {primary.map((item) => (
          <li key={item.key}>
            <Link href={item.href} aria-current={active === item.key ? "page" : undefined} className={tab(active === item.key)}>
              {labels[item.key]}
            </Link>
          </li>
        ))}
        <li>
          <details className="team-more relative">
            <summary className={`${tab(Boolean(activeMore))} cursor-pointer list-none gap-1.5 [&::-webkit-details-marker]:hidden`}>
              {activeMore ? `${labels.more}: ${labels[activeMore.key]}` : labels.more}
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </summary>
            <ul className="absolute left-0 z-30 mt-2 w-64 rounded-2xl border border-[#e4e2f0] bg-white p-2 shadow-[0_16px_36px_rgba(11,31,58,0.12)]">
              {more.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active === item.key ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-xl px-3 text-[15px] transition hover:bg-[#f5f3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] ${
                      active === item.key ? "bg-[#f5f3ff] font-semibold text-[#0b1f3a]" : "text-[#33325e]"
                    }`}
                  >
                    {labels[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </li>
      </ul>
      <TeamTabsActiveIntoView />
    </nav>
  );
}
