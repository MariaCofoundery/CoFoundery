import Link from "next/link";
import type { ReactNode } from "react";

export type AdvisorTab = { key: string; label: string; href: string; active: boolean };

/**
 * Kopf der Advisor-Detailseiten (Person, Team, Gruppenauswertung):
 * Zurueck zu „Begleitung", Marken-Flaeche mit Name und Zeile darunter, Chips
 * fuer das, was freigegeben ist, und - wenn es mehrere Ansichten gibt - die
 * Reiter.
 *
 * Es stehen nur Chips fuer das, was FREIGEGEBEN ist. Ein Chip „nicht
 * freigegeben" waere eine Aussage ueber den Menschen und eine Aufforderung,
 * danach zu fragen - beides will diese Seite nicht.
 */
export function AdvisorDetailHeader({
  backLabel,
  eyebrow,
  title,
  subtitle,
  chips = [],
  tabs = [],
  tabsLabel,
  children,
}: {
  backLabel: string;
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  chips?: string[];
  tabs?: AdvisorTab[];
  tabsLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <Link
        href="/advisor/begleitung"
        className="ws-no-print inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
      >
        ← {backLabel}
      </Link>
      <div className="brand-panel mt-2 rounded-[28px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-base text-white">{subtitle}</p> : null}
        {chips.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={chip} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-900">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
      {tabs.length > 1 ? (
        <nav aria-label={tabsLabel} className="ws-no-print -mx-4 mt-5 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max items-end gap-1">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  aria-current={tab.active ? "page" : undefined}
                  className={`-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm transition sm:px-4 ${
                    tab.active
                      ? "border-violet-500 font-semibold text-slate-950"
                      : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
