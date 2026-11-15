import Link from "next/link";

/**
 * Der kleine "erste Erfolg" oben auf der ersten Seite eines Bereichs: ein Satz, was man hier gleich sehen kann, und ein
 * Knopf dorthin. Er schreibt nichts, fragt nichts und verschwindet, sobald es nichts mehr zu entdecken gibt (die Seite
 * entscheidet, wann er erscheint).
 */
export function AreaPayoff({ title, text, cta, href, note }: { title: string; text: string; cta: string; href: string; note?: string }) {
  return (
    <section className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-5" data-area-payoff>
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{text}</p>
      <Link href={href} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-violet-300 bg-white px-4 text-sm font-semibold text-violet-900 hover:bg-violet-50">
        {cta}
      </Link>
      {note ? <p className="mt-2 text-xs leading-5 text-slate-600">{note}</p> : null}
    </section>
  );
}
