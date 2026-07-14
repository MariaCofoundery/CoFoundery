"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { getMarketingContent, type MarketingContent } from "@/data/marketing";

function HeroProductVisual({
  reduceMotion,
  content,
}: {
  reduceMotion: boolean;
  content: MarketingContent["hero"];
}) {
  return (
    <div className="relative h-[420px] overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(244,247,251,0.90))] shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div
        aria-hidden
        className="absolute left-1/2 top-10 h-32 w-48 -translate-x-1/2 rounded-full bg-[color:var(--brand-primary)]/12 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-4 bottom-4 h-36 w-36 rounded-full bg-[color:var(--brand-accent)]/10 blur-3xl"
      />
      <div className="relative flex h-full flex-col gap-4 p-5 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {content.founderSignals.map((founder, founderIndex) => (
            <motion.div
              key={founder.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.14 + founderIndex * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-[var(--font-display)] text-sm tracking-[0.02em] text-slate-900">
                  {founder.title}
                </p>
                <span className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[10px] tracking-[0.14em] text-slate-500">
                  {founder.profileLabel}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {founder.items.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.24 + founderIndex * 0.12 + index * 0.06 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-slate-200/85 p-[2px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: item.width }}
                        transition={{ duration: 0.55, delay: 0.3 + founderIndex * 0.12 + index * 0.06, ease: "easeOut" }}
                        className={`h-full rounded-full ${item.tone}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.09)]"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                {content.visual.reportEyebrow}
              </p>
              <p className="mt-2 font-[var(--font-display)] text-xl tracking-[-0.02em] text-slate-950">
                {content.visual.reportTitle}
              </p>
            </div>
            <span className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[10px] tracking-[0.14em] text-slate-500">
              {content.visual.reportBadge}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {content.comparisonRows.map((row, rowIndex) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.44 + rowIndex * 0.08, ease: "easeOut" }}
                className="rounded-2xl border border-slate-200/75 bg-slate-50/78 px-4 py-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{row.label}</p>
                  <motion.p
                    className="text-[11px] tracking-[0.08em] text-slate-500"
                    animate={
                      !reduceMotion && rowIndex === 2
                        ? { opacity: [0.5, 1, 0.5] }
                        : undefined
                    }
                    transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  >
                    {row.hint}
                  </motion.p>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="h-2.5 rounded-full bg-slate-200/90 p-[2px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: row.leftWidth }}
                      transition={{ duration: 0.55, delay: 0.52 + rowIndex * 0.08, ease: "easeOut" }}
                      className={`h-full rounded-full ${row.tone}`}
                    />
                  </div>
                  <div className="h-px w-7 bg-[color:var(--line)]" />
                  <div className="h-2.5 rounded-full bg-slate-200/90 p-[2px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: row.rightWidth }}
                      transition={{ duration: 0.55, delay: 0.58 + rowIndex * 0.08, ease: "easeOut" }}
                      className={`ml-auto h-full rounded-full ${row.tone}`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.7, ease: "easeOut" }}
          className="rounded-[22px] border border-[color:var(--brand-accent)]/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(38,118,255,0.06))] px-4 py-4"
        >
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            {content.summaryPoints.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.78 + index * 0.06 }}
                className="inline-flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-primary)]/80" />
                <span>{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function LandingHero() {
  const locale = useLocale();
  const content = getMarketingContent(locale).hero;
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:gap-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        className="reveal"
      >
        <h1 className="max-w-4xl font-[var(--font-display)] text-4xl leading-[0.94] tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-[3.75rem] lg:leading-[0.9] xl:text-[3.95rem]">
          {content.headline}
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)] lg:text-[1.15rem]">
          {content.subline}
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/start"
            className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--brand-primary)] px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-slate-950 transition hover:translate-y-[-1px] hover:bg-[color:var(--brand-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]"
          >
            {content.primaryCta}
          </Link>
          <Link
            href="#ablauf"
            className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white/86 px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]/30"
          >
            {content.secondaryCta}
          </Link>
        </div>

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[color:var(--muted)]">
          {content.supportPoints.map((item) => (
            <div key={item} className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-primary)]/80" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="reveal">
        <div className="relative overflow-hidden rounded-[36px] border border-[color:var(--line)] bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(243,247,252,0.92))] p-5 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-6 lg:p-7">
          <div
            aria-hidden
            className="absolute inset-x-12 top-12 h-32 rounded-full bg-[color:var(--brand-primary)]/12 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -right-10 bottom-4 h-40 w-40 rounded-full bg-[color:var(--brand-accent)]/10 blur-3xl"
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <HeroProductVisual reduceMotion={reduceMotion} content={content} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
