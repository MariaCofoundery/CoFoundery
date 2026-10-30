import type { ReactNode } from "react";

/**
 * Kopf der Advisor-Seiten: tiefes Indigo mit hellem Text (Richtung C aus dem
 * Optik-Vorschlag). Rechts darf eine Hauptaktion stehen, darunter ein freier
 * Platz fuer Chips oder Reiter (`children`).
 */
export function AdvisorPageHeader({
  eyebrow,
  title,
  text,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  text?: string | null;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="advisor-hero rounded-[28px] p-6 sm:p-8">
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">{eyebrow}</p>
          <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {text ? <p className="mt-3 max-w-2xl text-sm leading-7 text-indigo-100">{text}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="relative z-10 mt-5">{children}</div> : null}
    </header>
  );
}
