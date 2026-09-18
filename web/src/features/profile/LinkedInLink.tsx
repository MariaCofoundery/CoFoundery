/**
 * Der Link auf ein LinkedIn-Profil.
 *
 * Immer ein neues Fenster: Wer in einer Kontaktliste steht und nebenbei ein
 * Profil nachschlaegt, will nicht aus CoFoundery herausfallen und sich danach
 * zurueckklicken muessen.
 *
 * `rel="noreferrer noopener"` gehoert bei `target="_blank"` dazu - ohne
 * `noopener` kann die geoeffnete Seite auf das oeffnende Fenster zugreifen.
 *
 * Serverkomponente ohne Zustand: Die Texte kommen von aussen, damit sie dort
 * aufgeloest werden, wo ohnehin uebersetzt wird.
 */
export function LinkedInLink({
  url,
  label,
  hint,
  className,
}: {
  url: string;
  label: string;
  hint: string;
  className?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      title={hint}
      className={
        className ??
        "inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      }
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
        <path d="M3.4 5.5h2.2V13H3.4V5.5Zm1.1-3.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM7.3 5.5h2.1v1.03h.03c.3-.55 1.02-1.13 2.1-1.13 2.25 0 2.67 1.42 2.67 3.28V13h-2.2V9.12c0-.93-.02-2.12-1.32-2.12-1.32 0-1.52 1-1.52 2.05V13H7.3V5.5Z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
