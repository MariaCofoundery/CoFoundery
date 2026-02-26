import Link from "next/link";
import { nav } from "@/data/marketing";

export default function InformierteEntscheidungenPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg)] text-[color:var(--ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 88% 0%, rgba(38, 118, 255, 0.18), transparent 35%), radial-gradient(circle at 12% 20%, rgba(124, 58, 237, 0.14), transparent 36%), radial-gradient(circle at 36% 94%, rgba(21, 80, 128, 0.1), transparent 44%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -left-32 top-28 h-96 w-96 rounded-full bg-[color:var(--blob-a)] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 bottom-12 h-96 w-96 rounded-full bg-[color:var(--blob-b)] blur-3xl" />

      <header className="relative z-10 mx-auto mt-4 w-full max-w-6xl px-5 md:px-8">
        <div className="flex items-center justify-between rounded-2xl border border-[color:var(--line)] bg-white/70 px-4 py-3 backdrop-blur md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <object
              data="/cofoundery-align-logo.svg"
              type="image/svg+xml"
              aria-label="CoFoundery Align Logo"
              className="h-10 w-auto max-w-[190px]"
            >
              <span className="font-[var(--font-display)] text-sm tracking-[0.08em] md:text-base">
                CoFoundery Align
              </span>
            </object>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[color:var(--muted)] md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[color:var(--ink)]">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 font-[var(--font-display)] text-[10px] tracking-[0.14em] text-slate-950 transition hover:bg-[color:var(--brand-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] md:text-xs"
          >
            Session starten
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-8 md:pt-16">
        <section className="reveal">
          <p className="inline-block rounded-full border border-[color:var(--line)] bg-white/75 px-4 py-2 font-[var(--font-display)] text-[11px] tracking-[0.14em] text-[color:var(--ink-soft)]">
            Wissenschaftlich fundiert
          </p>
          <div className="mt-6 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-white/85 p-6 shadow-[var(--shadow)] md:p-10">
            <div className="h-2 w-24 rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[#2b4b6f]" />
            <blockquote className="mt-6 font-[var(--font-display)] text-3xl leading-tight tracking-tight md:text-6xl">
              „Wir glauben nicht an perfekte Matches,
              <br />
              <span className="text-[color:var(--accent-dark)]"> sondern an informierte Entscheidungen.“</span>
            </blockquote>
          </div>
        </section>

        <section className="mt-12 reveal rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/85 p-6 md:p-10">
          <h1 className="font-[var(--font-display)] text-2xl tracking-tight md:text-4xl">
            Wissenschaftlich fundiert - nicht aus dem Bauch heraus
          </h1>
          <div className="mt-5 space-y-5 text-base leading-8 text-[color:var(--muted)]">
            <p>
              Co-Founder-Entscheidungen gehören zu den folgenreichsten Entscheidungen im Aufbau
              eines Startups. Trotzdem werden sie häufig auf Basis von Sympathie, Intuition oder
              Zeitdruck getroffen. Die Forschung zeigt jedoch klar: Teamdynamik, Konfliktmuster
              und implizite Erwartungen haben messbare Auswirkungen auf den Erfolg junger
              Unternehmen.
            </p>
            <p>
              Zahlreiche Studien aus der Wirtschafts- und Organisationspsychologie sowie der
              Entrepreneurship-Forschung belegen, dass Konflikte innerhalb von Gründerteams -
              insbesondere Beziehungskonflikte - eng mit Leistungsfähigkeit, Wachstum und
              Zufriedenheit zusammenhängen. Meta-Analysen zeigen konsistent, dass affektive
              Konflikte (z. B. Spannungen auf persönlicher Ebene) die Team-Performance deutlich
              beeinträchtigen, während Klarheit, Kohäsion und funktionale Entscheidungsprozesse
              positiv wirken.
            </p>
            <p>
              Auch speziell für Gründerteams gilt: Unterschiede in Entscheidungsstil,
              Risikohaltung, Verantwortungsverständnis oder Konfliktverhalten sind keine
              Randthemen, sondern zentrale Einflussfaktoren für den weiteren
              Unternehmensverlauf. Studien zu Entrepreneurial Teams zeigen, dass solche
              Unterschiede häufig erst im Zeitverlauf sichtbar werden - dann allerdings unter
              hohem Druck und mit potenziell gravierenden Folgen.
            </p>
            <p>
              Darüber hinaus weisen empirische Arbeiten darauf hin, dass persönliche Merkmale
              und Verhaltensmuster von Foundern nicht direkt, sondern über Teamkonflikte und
              Entscheidungsprozesse auf den Unternehmenserfolg wirken. Genau hier setzt eine
              wirtschaftspsychologisch fundierte Betrachtung an: Nicht Menschen werden bewertet,
              sondern Spannungsfelder sichtbar gemacht, die für gemeinsame Entscheidungen relevant
              sind.
            </p>
          </div>
        </section>

        <section className="mt-12 reveal rounded-3xl border border-[color:var(--line)] bg-white/85 p-6 md:p-10">
          <h2 className="font-[var(--font-display)] text-2xl tracking-tight md:text-3xl">Unser Ansatz</h2>
          <p className="mt-4 text-base leading-8 text-[color:var(--muted)]">
            CoFoundery Align basiert auf diesen Erkenntnissen. Wir nutzen etablierte Konzepte aus
            der Team-, Konflikt- und Entrepreneurship-Forschung, um:
          </p>
          <ul className="mt-4 space-y-3 text-base leading-8 text-[color:var(--muted)]">
            <li className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3">
              implizite Erwartungen explizit zu machen
            </li>
            <li className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3">
              konfliktanfällige Konstellationen frühzeitig sichtbar zu machen
            </li>
            <li className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3">
              Entscheidungs- und Zusammenarbeitsmuster strukturiert zu reflektieren
            </li>
            <li className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3">
              fundierte Gesprächsleitfäden bereitzustellen, bevor es kritisch wird
            </li>
          </ul>
          <p className="mt-5 text-base leading-8 text-[color:var(--muted)]">
            Dabei stellen wir keine Diagnosen und vergeben keine Persönlichkeitslabels. Unser
            Ziel ist es, eine gemeinsame Sprache für relevante Themen zu schaffen - damit
            Co-Founder informierte Entscheidungen treffen können, statt Risiken erst im Ernstfall
            zu entdecken.
          </p>
        </section>

        <section className="mt-12 reveal rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/85 p-6 md:p-10">
          <h2 className="font-[var(--font-display)] text-2xl tracking-tight md:text-3xl">
            Wissenschaftliche Grundlagen (Auswahl)
          </h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-[color:var(--muted)] md:text-base">
            <li className="rounded-xl border border-[color:var(--line)] bg-white/85 px-4 py-3">
              De Dreu, C. K. W. &amp; Weingart, L. R. (2003). Task versus relationship conflict,
              team performance, and team member satisfaction: A meta-analysis. Journal of Applied
              Psychology.
            </li>
            <li className="rounded-xl border border-[color:var(--line)] bg-white/85 px-4 py-3">
              Ensley, M. D., Pearson, A. W. &amp; Amason, A. C. (2002). Understanding the dynamics
              of new venture top management teams. Journal of Business Venturing.
            </li>
            <li className="rounded-xl border border-[color:var(--line)] bg-white/85 px-4 py-3">
              Yoo, Y., Lee, S. &amp; Lee, S. (2021). Entrepreneurial team conflict and cohesion.
              Entrepreneurship Research Journal (Meta-Analyse).
            </li>
            <li className="rounded-xl border border-[color:var(--line)] bg-white/85 px-4 py-3">
              de Jong, B. A., Song, M. &amp; Song, L. Z. (2013). How lead founder personality
              affects new venture performance. Journal of Management.
            </li>
            <li className="rounded-xl border border-[color:var(--line)] bg-white/85 px-4 py-3">
              Hellmann, T. &amp; Wasserman, N. (2011). The First Deal: The Division of Founder
              Equity in New Ventures. NBER Working Paper.
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-[color:var(--brand-primary)] px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-slate-950 transition hover:translate-y-[-1px] hover:bg-[color:var(--brand-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]"
            >
              Alignment prüfen
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-[color:var(--line)] bg-white/85 px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink)] transition hover:bg-white"
            >
              Zur Startseite
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
