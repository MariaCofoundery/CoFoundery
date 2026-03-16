import Link from "next/link";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { Kpi } from "@/components/marketing/Kpi";
import { Signal } from "@/components/marketing/Signal";
import { StepCard } from "@/components/marketing/StepCard";
import { features, nav, steps } from "@/data/marketing";

const audiences = [
  {
    title: "Pre-Founder Matching",
    text: "Für Founder, die ernsthaft prüfen wollen, ob sie gemeinsam gründen sollten, bevor aus Sympathie schon ein Commitment wird.",
  },
  {
    title: "Bestehende Founder-Teams",
    text: "Für Teams, die bereits zusammenarbeiten und Rollen, Entscheidungsregeln oder Spannungen strukturierter klären wollen.",
  },
  {
    title: "Begleitender Advisor-Kontext",
    text: "Für Advisors, Accelerators oder Investoren, die Gespräche sauber begleiten wollen, ohne das Founder-Team zu überfahren.",
  },
];

const faqs = [
  {
    q: "Ist CoFoundery Align ein Persönlichkeitstest?",
    a: "Nein. CoFoundery Align ist ein strukturierter Entscheidungs- und Gesprächsraum für Gründungsteams: mit Vergleich, Report, Leitfaden und Workbook.",
  },
  {
    q: "Wann wird der Report freigeschaltet?",
    a: "Sobald beide Personen den Basisfragebogen abgeschlossen haben. Das Werte-Add-on erscheint nur dann im gemeinsamen Ergebnis, wenn es angefordert und von beiden abgeschlossen wurde.",
  },
  {
    q: "Ist das nur für neue Founder-Teams gedacht?",
    a: "Nein. Der Flow unterscheidet bewusst zwischen Pre-Founder Matching und bestehenden Founder-Teams, damit Sprache, Leitfaden und Workbook zum Kontext passen.",
  },
  {
    q: "Brauchen wir dafür einen Advisor?",
    a: "Nein. Founder können den gesamten Flow allein nutzen. Ein Advisor kann optional später strukturiert eingebunden werden.",
  },
  {
    q: "Wie wird mit E-Mail und Daten umgegangen?",
    a: "Die E-Mail-Adresse wird zweckgebunden für Einladung und Zuordnung zur Session verwendet. Antworten dienen ausschließlich der Profil-, Report- und Workbook-Erstellung.",
  },
];

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg)] text-[color:var(--ink)]">
      {/* Background Decor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 88% 0%, rgba(38, 118, 255, 0.2), transparent 36%), radial-gradient(circle at 10% 22%, rgba(124, 58, 237, 0.16), transparent 36%), radial-gradient(circle at 46% 92%, rgba(21, 80, 128, 0.12), transparent 45%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[color:var(--blob-a)] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-6 h-96 w-96 rounded-full bg-[color:var(--blob-b)] blur-3xl" />

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
        <section className="grid items-end gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="reveal">
            <p className="inline-block rounded-full border border-[color:var(--line)] bg-white/75 px-4 py-2 font-[var(--font-display)] text-[11px] tracking-[0.14em] text-[color:var(--ink-soft)]">
              Klarheit für Gründerentscheidungen
            </p>
            <h1 className="mt-6 max-w-5xl font-[var(--font-display)] text-4xl leading-[1] tracking-[-0.04em] md:text-6xl">
              <span className="block">Erfolgreiche Startups beginnen</span>
              <span className="mt-2 block text-[color:var(--ink)]/92">
                mit klaren Founder-Entscheidungen.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
              CoFoundery Align ist weit mehr als ein Gesprächsleitfaden. Es hilft euch, ein
              gesundes Startup auf einem klareren Fundament aufzubauen: mit besserem Verständnis
              für Vertrauen, Verantwortung, gemeinsames Tempo und die Entscheidungen, die eure
              Zusammenarbeit wirklich tragen müssen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl bg-[color:var(--brand-primary)] px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-slate-950 transition hover:translate-y-[-1px] hover:bg-[color:var(--brand-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]"
              >
                Alignment prüfen
              </Link>
              <Link
                href="/informierte-entscheidungen"
                className="rounded-2xl border border-[color:var(--line)] bg-white/85 px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink)] transition hover:bg-white"
              >
                Unsere Haltung
              </Link>
              <Link
                href="/beispiel-auswertung"
                className="rounded-2xl border border-[color:var(--line)] bg-white/85 px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink)] transition hover:bg-white"
              >
                Einblick erhalten
              </Link>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Kpi title="Basisprofil" value="48 Fragen" />
              <Kpi title="Output" value="Report + Workbook" />
              <Kpi title="Kontext" value="Optional Advisor" />
            </div>
          </div>

          <div className="reveal">
            <div className="rounded-3xl border border-[color:var(--line)] bg-white/80 p-5 shadow-[var(--shadow)] backdrop-blur md:p-6">
              <p className="font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink-soft)]">
                Alignment Snapshot
              </p>
              <div className="mt-4 grid gap-3">
                <Signal label="Entscheidungslogik" status="Gemeinsam lesbar" tone="var(--ok)" />
                <Signal label="Verantwortung & Commitment" status="Klare Unterschiede" tone="var(--warn)" />
                <Signal label="Konflikt- und Gesprächskultur" status="Gut vorbereiten" tone="var(--warn)" />
              </div>
              <div className="mt-5 rounded-2xl bg-[color:var(--surface-soft)] px-4 py-4 text-sm leading-6 text-[color:var(--muted)]">
                Kein künstlicher Matching-Score, sondern ein klarer Ausgangspunkt für die
                Gespräche und Entscheidungen, die in Gründungsteams wirklich tragen müssen.
              </div>
            </div>
          </div>
        </section>

        <section id="fuer-wen" className="mt-16 reveal">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">Für wen</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              Für Entscheidungen vor und während der Zusammenarbeit
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-[color:var(--muted)]">
              Die Plattform unterscheidet bewusst zwischen Kennenlernphase, bestehender
              Zusammenarbeit und begleitendem Advisor-Kontext.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {audiences.map((audience) => (
              <article
                key={audience.title}
                className="rounded-3xl border border-[color:var(--line)] bg-white/85 p-6 shadow-[var(--shadow)]"
              >
                <h3 className="font-[var(--font-display)] text-lg tracking-[0.01em] text-[color:var(--ink)]">
                  {audience.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{audience.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="problem" className="mt-16 reveal">
          <div className="overflow-hidden rounded-[32px] border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,247,255,0.9))] shadow-[var(--shadow)]">
            <div className="grid gap-10 px-6 py-8 md:grid-cols-[1.08fr_0.92fr] md:px-8 md:py-10">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">Problem</p>
                <h2 className="mt-3 max-w-2xl font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
                  Die meisten Gründerprobleme beginnen lange vor der Krise.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--muted)]">
                  Selten scheitert Zusammenarbeit erst dann, wenn Druck sichtbar wird. Oft sind
                  Unterschiede schon viel früher angelegt: in ungeklärter Entscheidungslogik,
                  diffuser Verantwortung und in Annahmen, die nie sauber ausgesprochen wurden.
                </p>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--muted)]">
                  Genau dort setzt CoFoundery Align an. Die Plattform macht diese Unterschiede
                  früh sichtbar und übersetzt sie in einen Report, einen Gesprächsleitfaden
                  und ein Workbook, damit aus vagem Bauchgefühl echte Klärung wird.
                </p>
              </div>

              <div className="grid gap-4 self-start">
                <div className="border-l border-[color:var(--line)] pl-5">
                  <p className="font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink-soft)]">
                    Entscheidungslogik
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    Wer entscheidet wann, worauf wird bestanden und wie viel Unklarheit ist noch
                    tragbar, bevor ein Team kippt?
                  </p>
                </div>
                <div className="border-l border-[color:var(--line)] pl-5">
                  <p className="font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink-soft)]">
                    Verantwortung
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    Rollen wirken oft geklärt, bleiben im Alltag aber diffus, sobald Tempo,
                    Druck oder Ownership wirklich wichtig werden.
                  </p>
                </div>
                <div className="border-l border-[color:var(--line)] pl-5">
                  <p className="font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink-soft)]">
                    Annahmen und Konflikte
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    Vieles wird vorausgesetzt, kaum abgeglichen. Spätere Konflikte sind oft nur
                    die lauter gewordene Form früher Unterschiede.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="produkt" className="mt-16 reveal">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">Produkt</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              Ein klarer Vergleich, der weiterarbeitet
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-[color:var(--muted)]">
              CoFoundery Align bleibt nicht bei einem Test stehen. Der Vergleich wird in einen
              Report, konkrete Gespräche und ein gemeinsames Workbook übersetzt, damit aus
              Erkenntnis auch Entscheidung wird.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} title={feature.title} text={feature.text} />
            ))}
          </div>
        </section>

        <section className="mt-16 reveal">
          <div className="overflow-hidden rounded-[32px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,249,252,0.96))] shadow-[var(--shadow)]">
            <div className="grid gap-10 px-6 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-10">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                  Was CoFoundery Align anders macht
                </p>
                <h2 className="mt-3 max-w-2xl font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
                  Was CoFoundery Align anders macht
                </h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-[color:var(--muted)]">
                  <p>
                    Viele Tools messen Persönlichkeit. CoFoundery Align untersucht
                    Entscheidungen.
                  </p>
                  <p>
                    Der Fokus liegt auf den Fragen, die für Gründerteams wirklich
                    entscheidend werden: Tempo, Verantwortung, Risiko, Konfliktstil,
                    Commitment und Zusammenarbeit.
                  </p>
                  <p>
                    Die Fragen basieren auf Forschung zu Gründerentscheidungen und
                    typischen Spannungsfeldern in Startup-Teams. Sie werden getrennt
                    beantwortet und anschließend strukturiert verglichen.
                  </p>
                  <p className="text-[color:var(--ink)]">
                    Das Ergebnis ist kein Score, sondern eine gemeinsame Grundlage für
                    Gespräche und Entscheidungen.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-4">
                {[
                  {
                    title: "Founder Report",
                    text: "Macht Unterschiede, tragende Gemeinsamkeiten und relevante Spannungsfelder klar lesbar.",
                  },
                  {
                    title: "Conversation Guide",
                    text: "Übersetzt die Ergebnisse in konkrete Fragen für ein gutes, strukturiertes Founder-Gespräch.",
                  },
                  {
                    title: "Alignment Workbook",
                    text: "Hilft dabei, aus Erkenntnissen klare Vereinbarungen und nächste Schritte für den Alltag zu machen.",
                  },
                ].map((item, index) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex w-10 flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-[color:var(--brand-primary)] shadow-[0_0_0_6px_rgba(38,118,255,0.08)]" />
                      {index < 2 ? <div className="mt-2 h-full w-px bg-[color:var(--line)]" /> : null}
                    </div>
                    <div className="rounded-2xl border border-[color:var(--line)] bg-white/82 px-5 py-4">
                      <p className="font-[var(--font-display)] text-base tracking-[0.01em] text-[color:var(--ink)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="ablauf" className="mt-16 reveal">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">Ablauf</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              In drei ruhigen Schritten zu mehr Klarheit
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <StepCard key={step.step} step={step.step} title={step.title} text={step.text} />
            ))}
          </div>
        </section>

        <section className="mt-16 reveal">
          <div className="grid gap-8 rounded-[32px] border border-[color:var(--line)] bg-white/84 px-6 py-8 shadow-[var(--shadow)] md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-10">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                Founder Reality Check
              </p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
                Founder Reality Check
              </h2>
              <div className="mt-5 space-y-4 text-base leading-8 text-[color:var(--muted)]">
                <p>
                  Viele Gründerteams starten mit einer starken Idee, aber ohne klare
                  Antworten auf die Fragen, die später wirklich Druck erzeugen.
                </p>
                <p>
                  Wer trifft Entscheidungen, wenn ihr uneinig seid? Wie viel Risiko wollt
                  ihr wirklich eingehen? Wie verbindlich ist Commitment, wenn das Startup
                  wächst? Was passiert, wenn Tempo und Arbeitsstil auseinandergehen?
                </p>
                <p>
                  Viele Teams klären diese Fragen erst unter Druck. CoFoundery Align hilft,
                  sie früh strukturiert zu besprechen.
                </p>
              </div>
            </div>

            <div className="grid gap-3 self-center sm:grid-cols-2">
              {[
                {
                  label: "Decision",
                  text: "Wie ihr Entscheidungen trefft und mit Uneinigkeit umgeht.",
                  icon: <SectionGlyph type="decision" />,
                },
                {
                  label: "Risk",
                  text: "Welche Unsicherheit ihr tragen wollt und wo eure Grenzen liegen.",
                  icon: <SectionGlyph type="risk" />,
                },
                {
                  label: "Commitment",
                  text: "Wie verbindlich Fokus, Einsatz und Erwartungen wirklich sind.",
                  icon: <SectionGlyph type="commitment" />,
                },
                {
                  label: "Collaboration",
                  text: "Wie Rollen, Tempo und Zusammenarbeit im Alltag zusammenpassen.",
                  icon: <SectionGlyph type="collaboration" />,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/80 px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-[color:var(--ink)]">
                      {item.icon}
                    </div>
                    <p className="font-[var(--font-display)] text-base tracking-[0.01em] text-[color:var(--ink)]">
                      {item.label}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 reveal">
          <div className="rounded-[32px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(250,252,255,0.95),rgba(255,255,255,0.92))] px-6 py-8 shadow-[var(--shadow)] md:px-8 md:py-10">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                Trust Section
              </p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
                Worauf der Ansatz basiert
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                {
                  title: "Forschung zu Gründerentscheidungen",
                  text: "Studien zu Entrepreneurial Teams zeigen, dass Konflikte häufig aus ungeklärten Entscheidungs- und Rollenlogiken entstehen.",
                  icon: <SectionGlyph type="research" />,
                },
                {
                  title: "Startup-Praxis",
                  text: "Viele Gründerkonflikte entstehen nicht plötzlich, sondern aus frühen Annahmen über Tempo, Verantwortung und Risiko.",
                  icon: <SectionGlyph type="practice" />,
                },
                {
                  title: "Strukturierte Reflexion statt Persönlichkeitstests",
                  text: "CoFoundery Align übersetzt diese Themen in einen strukturierten Vergleich und eine konkrete Gesprächsgrundlage.",
                  icon: <SectionGlyph type="reflection" />,
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 border-t border-[color:var(--line)] pt-4 md:block md:border-t-0 md:border-l md:pl-5 md:first:border-l-0 md:first:pl-0">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-[color:var(--ink)]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-[var(--font-display)] text-base tracking-[0.01em] text-[color:var(--ink)]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mt-16 reveal">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">FAQ</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              Häufige Fragen
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-2xl border border-[color:var(--line)] bg-white/85 px-5 py-4">
                <h3 className="font-[var(--font-display)] text-base tracking-[0.02em]">{item.q}</h3>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] py-8 text-sm text-[color:var(--muted)]">
          <div>
            <p className="text-[color:var(--ink)]">© 2026 CoFoundery Align</p>
            <p className="mt-1">Strukturierter Entscheidungs- und Gesprächsraum für Founder.</p>
          </div>
          <p className="flex flex-wrap items-center gap-2">
            <Link href="/impressum" className="hover:text-[color:var(--ink)]">
              Impressum
            </Link>
            <span>·</span>
            <Link href="/datenschutz" className="hover:text-[color:var(--ink)]">
              Datenschutz
            </Link>
            <span>·</span>
            <Link href="/informierte-entscheidungen" className="hover:text-[color:var(--ink)]">
              Unsere Haltung
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function SectionGlyph({
  type,
}: {
  type:
    | "decision"
    | "risk"
    | "commitment"
    | "collaboration"
    | "research"
    | "practice"
    | "reflection";
}) {
  if (type === "decision") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 5h12M10 5v10M6 15h8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "risk") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 3 17 16H3L10 3Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 8v3.5M10 13.8h.01" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "commitment") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 10.5 8.2 14 15 6.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3.5" y="3.5" width="13" height="13" rx="3" />
      </svg>
    );
  }

  if (type === "collaboration") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="6" cy="7" r="2.2" />
        <circle cx="14" cy="7" r="2.2" />
        <path d="M3.8 15c.5-2 1.8-3 4.2-3s3.7 1 4.2 3M9.5 14.8c.5-1.8 1.7-2.8 4-2.8 1.1 0 2 .2 2.7.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "research") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="8.5" cy="8.5" r="4.5" />
        <path d="m12 12 4 4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "practice") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 15h12M6 15V7l4-2 4 2v8M8.5 10.2h3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 3.5 12 7.5l4.5.6-3.2 3 0.8 4.4L10 13.4l-4.1 2.1.8-4.4-3.2-3 4.5-.6 2-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
