import Link from "next/link";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { getMarketingContent } from "@/data/marketing";
import { getRequestLocale } from "@/i18n/getLocale";

export default async function InformierteEntscheidungenPage() {
  const content = getMarketingContent(await getRequestLocale());

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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:var(--line)] bg-white/70 px-4 py-3 backdrop-blur md:flex-nowrap md:px-6">
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
            {content.nav.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[color:var(--ink)]">
                {item.label}
              </Link>
            ))}
          </nav>
          <PublicLanguageSwitcher className="order-3 ml-auto shrink-0 [&_button]:px-2 [&_button]:py-1 md:order-none md:ml-0 md:[&_button]:px-2.5 md:[&_button]:py-1.5" />
          <Link
            href="/start"
            className="order-2 rounded-xl border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 font-[var(--font-display)] text-[10px] tracking-[0.14em] text-slate-950 transition hover:bg-[color:var(--brand-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] md:order-none md:text-xs"
          >
            {content.stance.navCta}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-8 md:pt-16">
        <section className="reveal">
          <p className="inline-block rounded-full border border-[color:var(--line)] bg-white/75 px-4 py-2 font-[var(--font-display)] text-[11px] tracking-[0.14em] text-[color:var(--ink-soft)]">
            {content.stance.badge}
          </p>
          <div className="mt-6 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-white/85 p-6 shadow-[var(--shadow)] md:p-10">
            <div className="h-2 w-24 rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[#2b4b6f]" />
            <blockquote className="mt-6 font-[var(--font-display)] text-3xl leading-tight tracking-tight md:text-6xl">
              {content.stance.quote}
              <br />
              <span className="text-[color:var(--accent-dark)]">{content.stance.quoteAccent}</span>
            </blockquote>
          </div>
        </section>

        <section className="mt-12 reveal rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/85 p-6 md:p-10">
          <h1 className="font-[var(--font-display)] text-2xl tracking-tight md:text-4xl">
            {content.stance.title}
          </h1>
          <div className="mt-5 space-y-5 text-base leading-8 text-[color:var(--muted)]">
            {content.stance.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="mt-12 reveal rounded-3xl border border-[color:var(--line)] bg-white/85 p-6 md:p-10">
          <h2 className="font-[var(--font-display)] text-2xl tracking-tight md:text-3xl">{content.stance.approachTitle}</h2>
          <p className="mt-4 text-base leading-8 text-[color:var(--muted)]">
            {content.stance.approachIntro}
          </p>
          <ul className="mt-4 space-y-3 text-base leading-8 text-[color:var(--muted)]">
            {content.stance.bullets.map((bullet) => (
              <li key={bullet} className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3">
                {bullet}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-base leading-8 text-[color:var(--muted)]">
            {content.stance.approachOutro}
          </p>
        </section>

        <section className="mt-12 reveal rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/85 p-6 md:p-10">
          <h2 className="font-[var(--font-display)] text-2xl tracking-tight md:text-3xl">
            {content.stance.sourcesTitle}
          </h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-[color:var(--muted)] md:text-base">
            {content.stance.sources.map((source) => (
              <li key={source} className="rounded-xl border border-[color:var(--line)] bg-white/85 px-4 py-3">
                {source}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="rounded-2xl bg-[color:var(--brand-primary)] px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-slate-950 transition hover:translate-y-[-1px] hover:bg-[color:var(--brand-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]"
            >
              {content.stance.primaryCta}
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-[color:var(--line)] bg-white/85 px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink)] transition hover:bg-white"
            >
              {content.stance.secondaryCta}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
