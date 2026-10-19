import Link from "next/link";

/**
 * „Auf einen Blick" - drei kurze Karten ueber dem Profil.
 *
 * DETERMINISTISCH, OHNE KI UND OHNE WERT: Jede Karte wiederholt in einem Satz, was weiter unten ausfuehrlich
 * steht - die Bereiche, in denen die Antworten durchgehend in eine Richtung zeigen, die ersten Staerken, die
 * ersten Aussagen zur Richtung. Es entsteht nichts Neues, nichts wird gedeutet, nichts gewichtet.
 *
 * Eine Karte ohne Inhalt zeigt keine Luecke, sondern einen ruhigen Weg dorthin (Angebot, nie Pflicht). Keine
 * Prozente, kein „x von y". Die Farbe der Karte sagt, WELCHE Karte es ist - nie, wie gut.
 */
export type GlanceCard = {
  key: "work" | "strengths" | "direction";
  title: string;
  /** Die Saetze der Karte; leer = Angebot. */
  lines: string[];
  empty: string;
  href: string;
  cta: string;
};

const TONE: Record<GlanceCard["key"], string> = {
  work: "bg-violet-50 text-violet-900",
  strengths: "bg-teal-50 text-teal-900",
  direction: "bg-amber-50 text-amber-900",
};

export function ProfileGlance({ title, note, cards }: { title: string; note: string; cards: GlanceCard[] }) {
  return (
    <section id="auf-einen-blick" className="page-section scroll-mt-6" aria-labelledby="profile-glance-title" data-profile-glance>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="profile-glance-title" className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <span className="text-xs text-slate-500">{note}</span>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <li key={card.key} data-glance={card.key} className={`flex flex-col gap-2 rounded-2xl p-5 ${TONE[card.key]}`}>
            <h3 className="text-sm font-semibold">{card.title}</h3>
            {card.lines.length > 0 ? (
              <ul className="space-y-1.5">
                {card.lines.map((line) => (
                  <li key={line} className="text-sm leading-6 text-slate-800">{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-slate-700">{card.empty}</p>
            )}
            <Link href={card.href} className="no-print mt-auto inline-flex min-h-10 items-center self-start text-sm font-semibold underline underline-offset-2">
              {card.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
