import type { ReactNode } from "react";

/**
 * Die Vorlage einer Mitteilung. Das Aussehen ist immer gleich; Titel, Text und
 * ein optionaler Knopf kommen aus dem Admin-Bereich. Ein Pop-up, die Vorschau
 * im Admin-Bereich und der Eintrag im Postfach nutzen dieselbe Darstellung,
 * damit niemand dreimal etwas anderes sieht.
 *
 * Reiner Text: Absaetze durch Leerzeilen, keine Auszeichnung, kein HTML. Der
 * Text wird als Text gesetzt, nie als Markup.
 */
export function AnnouncementCard({
  eyebrow,
  title,
  body,
  titleId,
  actions,
  footer,
}: {
  eyebrow: string;
  title: string;
  body: string;
  titleId?: string;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_30px_80px_-24px_rgba(60,40,180,.45)]">
      <div className="h-1.5 bg-gradient-to-r from-violet-600 via-pink-500 to-sky-500" aria-hidden="true" />
      <div className="grid gap-4 p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-pink-50">
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c1.9 0 3.3 1 4.1 2.3L12 9.6l1.9-2.3C14.7 6 16.1 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" fill="#ec4899" />
            </svg>
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-[.1em] text-slate-500">{eyebrow}</span>
        </div>
        <h2 id={titleId} className="text-[1.45rem] font-extrabold leading-tight tracking-tight text-slate-950">{title}</h2>
        <div className="grid gap-3 text-[0.95rem] leading-7 text-slate-700">
          {body.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">{paragraph}</p>
          ))}
        </div>
        {actions ? <div className="mt-1 grid gap-2">{actions}</div> : null}
        {footer ? <p className="text-xs leading-5 text-slate-500">{footer}</p> : null}
      </div>
    </div>
  );
}
