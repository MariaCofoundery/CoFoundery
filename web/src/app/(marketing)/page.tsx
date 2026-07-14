import Link from "next/link";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { LandingHero } from "@/components/marketing/LandingHero";
import { LandingTopNav } from "@/components/marketing/LandingTopNav";
import { getMarketingContent } from "@/data/marketing";
import { getRequestLocale } from "@/i18n/getLocale";

export default function Page() {
  const content = getMarketingContent(getRequestLocale());

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[color:var(--bg)] text-[color:var(--ink)]">
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

      <LandingTopNav />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-8 md:px-8 md:pt-12">
        <LandingHero />

        <section id="fuer-wen" className="mt-16 reveal">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{content.home.audienceEyebrow}</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              {content.home.audienceTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-[color:var(--muted)]">
              {content.home.audienceText}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {content.audiences.map((audience) => (
              <article
                key={audience.title}
                className="rounded-3xl border border-[color:var(--line)] bg-white/85 p-6 shadow-[var(--shadow)]"
              >
                <AudienceAvatarVisual type={audience.visual} />
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
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{content.home.problemEyebrow}</p>
                <h2 className="mt-3 max-w-2xl font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
                  {content.home.problemTitle}
                </h2>
                {content.home.problemParagraphs.map((paragraph, index) => (
                  <p
                    key={paragraph}
                    className={`${index === 0 ? "mt-5" : "mt-4"} max-w-2xl text-base leading-8 text-[color:var(--muted)]`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="grid gap-4 self-start">
                {content.home.problemCards.map((card) => (
                  <div key={card.title} className="border-l border-[color:var(--line)] pl-5">
                    <p className="font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink-soft)]">
                      {card.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                      {card.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="produkt" className="mt-16 reveal">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{content.home.productEyebrow}</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              {content.home.productTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-[color:var(--muted)]">
              {content.home.productText}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {content.features.map((feature) => (
              <FeatureCard key={feature.title} title={feature.title} text={feature.text} />
            ))}
          </div>
        </section>

        <section className="mt-16 reveal">
          <div className="overflow-hidden rounded-[32px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,249,252,0.96))] shadow-[var(--shadow)]">
            <div className="grid gap-10 px-6 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-10">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{content.home.approachEyebrow}</p>
                <h2 className="mt-3 max-w-2xl font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
                  {content.home.approachTitle}
                </h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-[color:var(--muted)]">
                  {content.home.approachParagraphs.map((paragraph, index) => (
                    <p key={paragraph} className={index === content.home.approachParagraphs.length - 1 ? "text-[color:var(--ink)]" : undefined}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-center gap-4">
                {content.home.approachCards.map((item, index) => (
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

        <HowItWorksSection />

        <section className="mt-16 reveal">
          <div className="grid gap-8 rounded-[32px] border border-[color:var(--line)] bg-white/84 px-6 py-8 shadow-[var(--shadow)] md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-10">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{content.home.dimensionsEyebrow}</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
                {content.home.dimensionsTitle}
              </h2>
              <div className="mt-5 space-y-4 text-base leading-8 text-[color:var(--muted)]">
                {content.home.dimensionsParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[color:var(--muted)]">
                {content.home.dimensionsFooter}
              </p>
            </div>

            <div className="grid gap-3 self-center sm:grid-cols-2">
              {content.dimensions.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/80 px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-[color:var(--ink)]">
                      <SectionGlyph type={item.icon} />
                    </div>
                    <p className="font-[var(--font-display)] text-base tracking-[0.01em] text-[color:var(--ink)]">
                      {item.title}
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
                {content.home.evidenceEyebrow}
              </p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
                {content.home.evidenceTitle}
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {content.home.evidenceCards.map((item) => (
                <div key={item.title} className="flex gap-4 border-t border-[color:var(--line)] pt-4 md:block md:border-t-0 md:border-l md:pl-5 md:first:border-l-0 md:first:pl-0">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-[color:var(--ink)]">
                    <SectionGlyph type={item.icon} />
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
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{content.home.faqEyebrow}</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
              {content.home.faqTitle}
            </h2>
          </div>
          <div className="space-y-3">
            {content.faqs.map((item) => (
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
            <p className="mt-1">{content.home.footerText}</p>
          </div>
          <p className="flex flex-wrap items-center gap-2">
            <Link href="/impressum" className="hover:text-[color:var(--ink)]">
              {content.home.legalNotice}
            </Link>
            <span>·</span>
            <Link href="/datenschutz" className="hover:text-[color:var(--ink)]">
              {content.home.privacyPolicy}
            </Link>
            <span>·</span>
            <Link href="/informierte-entscheidungen" className="hover:text-[color:var(--ink)]">
              {content.home.stanceLink}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function AudienceAvatarVisual({
  type,
}: {
  type: "pre-founder" | "existing-team" | "advisor";
}) {
  if (type === "pre-founder") {
    return (
      <div className="mb-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.9))] p-4">
        <div className="relative flex h-24 items-center justify-center">
          <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-[color:var(--line)]" />
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/90 bg-emerald-100/70 shadow-[0_0_0_8px_rgba(16,185,129,0.08)]" />
          <div className="relative flex items-center justify-center">
            <div className="translate-x-3">
              <AudienceAvatar className="h-16 w-16" />
            </div>
            <div className="-ml-3">
              <AudienceAvatar className="h-16 w-16" innerClassName="bg-slate-400/70" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "existing-team") {
    return (
      <div className="mb-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.9))] p-4">
        <div className="relative h-24 rounded-[20px] border border-slate-200/80 bg-white/80">
          <div className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-[color:var(--line)]" />
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200/85 bg-slate-50/95" />
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <AudienceAvatar className="h-14 w-14" />
          </div>
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <AudienceAvatar className="h-14 w-14" innerClassName="bg-slate-400/70" />
          </div>
          <div className="absolute left-[30%] top-[35%] h-2 w-12 rounded-full bg-emerald-200/85" />
          <div className="absolute right-[27%] top-[58%] h-2 w-10 rounded-full bg-amber-200/90" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.9))] p-4">
      <div className="relative h-24 rounded-[20px] bg-white/70">
        <div className="absolute left-5 top-1/2 -translate-y-1/2">
          <AudienceAvatar className="h-14 w-14" />
        </div>
        <div className="absolute left-[4.8rem] top-1/2 -translate-y-1/2">
          <AudienceAvatar className="h-14 w-14" innerClassName="bg-slate-400/70" />
        </div>
        <div className="absolute right-5 top-4">
          <AudienceAvatar className="h-11 w-11 border-[color:var(--brand-primary)]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(235,244,255,0.94))]" innerClassName="bg-[color:var(--brand-primary)]/22" />
        </div>
        <div className="absolute right-[3.8rem] top-[39%] h-px w-10 bg-[color:var(--brand-primary)]/35" />
      </div>
    </div>
  );
}

function AudienceAvatar({
  className,
  innerClassName,
}: {
  className: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-full border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] ${className}`}
    >
      <div className="absolute left-1/2 top-[24%] h-[28%] w-[28%] -translate-x-1/2 rounded-full bg-slate-400/55" />
      <div
        className={`absolute left-1/2 top-[52%] h-[36%] w-[54%] -translate-x-1/2 rounded-t-full bg-slate-300/85 ${
          innerClassName ?? ""
        }`}
      />
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
