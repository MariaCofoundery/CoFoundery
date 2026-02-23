import Link from "next/link";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { Kpi } from "@/components/marketing/Kpi";
import { Signal } from "@/components/marketing/Signal";
import { StepCard } from "@/components/marketing/StepCard";
import { features, nav, steps } from "@/data/marketing";

const faqs = [
  {
    q: "Ist CoFoundery Align ein Persönlichkeitstest?",
    a: "Nein. Es ist ein strukturierter Abgleich eurer Arbeits- und Entscheidungslogik in Gründungssituationen.",
  },
  {
    q: "Wann wird der Vergleichsreport freigeschaltet?",
    a: "Sobald beide Personen den Basisfragebogen abgeschlossen haben. Das Werte-Add-on erscheint nur, wenn es angefordert und von beiden abgeschlossen wurde.",
  },
  {
    q: "Wie wird mit E-Mail und Daten umgegangen?",
    a: "Die E-Mail-Adresse wird zweckgebunden für Einladung und Zuordnung zur Session verwendet. Antworten dienen ausschließlich der Report-Erstellung.",
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
              Wo Visionen gemeinsame Wege finden
            </p>
            <h1 className="mt-6 font-[var(--font-display)] text-4xl leading-[1.03] tracking-tight md:text-6xl">
              Gründe mit Fokus.
              <br />
              Auf Augenhöhe.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
              CoFoundery Align verbindet Co-Founder durch datengestütztes Matching. 
              Wir begleiten euch dabei, frühzeitig ein belastbares Fundament für eure 
              gemeinsame Startup-Reise zu schaffen.
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
              <Kpi title="Persönlichkeit" value="6 Dimensionen" />
              <Kpi title="Team-Dynamik" value="1 Session" />
              <Kpi title="Reflektion" value="Ready Report" />
            </div>
          </div>

          <div className="reveal">
            <div className="rounded-3xl border border-[color:var(--line)] bg-white/80 p-5 shadow-[var(--shadow)] backdrop-blur md:p-6">
              <p className="font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink-soft)]">
                Alignment Snapshot
              </p>
              <div className="mt-4 grid gap-3">
                <Signal label="Vision & Werte" status="Im Einklang" tone="var(--ok)" />
                <Signal label="Rollenverteilung" status="Klarheit" tone="var(--ok)" />
                <Signal label="Konfliktkultur" status="Vertiefen" tone="var(--warn)" />
              </div>
              <div className="mt-5 rounded-2xl bg-[color:var(--surface-soft)] px-4 py-4 text-sm leading-6 text-[color:var(--muted)]">
                Dieser Report unterstützt euch dabei, die Gespräche zu führen, die für ein 
                langfristiges Commitment entscheidend sind.
              </div>
            </div>
          </div>
        </section>

        <section id="produkt" className="mt-16 reveal">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">Produkt</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              Klarheit vor Commitment
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-[color:var(--muted)]">
              Statt Bauchgefühl liefert CoFoundery Align eine belastbare Gesprächsgrundlage für die
              Co-Founder-Entscheidung: strukturiert, präzise und direkt im Alltag nutzbar.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} title={feature.title} text={feature.text} />
            ))}
          </div>
        </section>

        <section id="ablauf" className="mt-16 reveal">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">Ablauf</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              In drei klaren Schritten zum Vergleich
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <StepCard key={step.step} step={step.step} title={step.title} text={step.text} />
            ))}
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
          <p>CoFoundery Align - Connecting the next generation of founders</p>
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
            <span>·</span>
            <span>Business.mariaschulz@gmail.com</span>
            <span>·</span>
            <span>2026</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
