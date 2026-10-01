import Link from "next/link";

/**
 * Zwei Fassungen zum Weitergeben — und die Wahl steht vor dem Klick.
 *
 * ---------------------------------------------------------------------------
 * WARUM HIER KEIN DRUCKKNOPF MEHR STEHT
 * ---------------------------------------------------------------------------
 *
 * Bis zum 01.10.2026 war es einer: „Als PDF speichern", und was dann im PDF
 * stand, hing davon ab, welche Aufklapper gerade offen waren. Zwei Menschen
 * mit demselben Profil bekamen zwei verschiedene Dokumente, und niemand
 * konnte sehen, warum.
 *
 * Jetzt führt der Weg auf eine eigene Seite, deren Inhalt in der Adresse
 * steht. Dafür muss vorher entschieden werden, welche Fassung gemeint ist —
 * und das ist keine Hürde, sondern die Frage, die ohnehin ansteht: Für wen
 * ist das?
 *
 * ---------------------------------------------------------------------------
 * ZWEI, NICHT DREI
 * ---------------------------------------------------------------------------
 *
 * Eine dritte Fassung („mittel") hätte keine Zielgruppe, die man benennen
 * kann. Die beiden hier haben eine: ein erstes Gespräch, und ein vertieftes.
 *
 * Der Hinweis zur Langfassung steht auf ihrer eigenen Seite, nicht hier: Er
 * gehört an die Stelle, an der man sie wirklich erzeugt.
 */
export function ProfilePdfChoice({
  copy,
}: {
  copy: {
    title: string;
    shortTitle: string;
    shortText: string;
    fullTitle: string;
    fullText: string;
  };
}) {
  return (
    <section className="no-print mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
      <h2 className="text-sm font-semibold text-slate-900">{copy.title}</h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Wahl href="/me/profile/print?mode=short" title={copy.shortTitle} text={copy.shortText} />
        <Wahl href="/me/profile/print?mode=full" title={copy.fullTitle} text={copy.fullText} />
      </div>
    </section>
  );
}

/**
 * Eine der beiden Fassungen.
 *
 * Der ganze Kasten ist der Link, nicht nur das Wort: Am Telefon trifft man
 * eine Fläche, keine Zeile.
 */
function Wahl({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <span className="text-sm font-semibold text-slate-900">{title}</span>
      <span className="mt-1 text-xs leading-5 text-slate-600">{text}</span>
    </Link>
  );
}
