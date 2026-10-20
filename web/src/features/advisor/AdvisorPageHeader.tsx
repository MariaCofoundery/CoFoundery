import type { ReactNode } from "react";

/**
 * Kopf der Advisor-Seiten: Marken-Flaeche wie auf den uebrigen Bereichen.
 * Rechts darf eine Hauptaktion stehen.
 */
export function AdvisorPageHeader({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text?: string | null;
  action?: ReactNode;
}) {
  return (
    <header className="brand-panel rounded-[28px] p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {text ? <p className="mt-3 max-w-2xl text-sm leading-7 text-white">{text}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
