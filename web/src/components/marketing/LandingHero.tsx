"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const supportPoints = [
  "48 strukturierte Fragen",
  "Klarer Matching-Report",
  "Gemeinsames Workbook",
];

const sharedNodes = [
  { left: "41%", top: "23%", size: 10 },
  { left: "48%", top: "47%", size: 12 },
  { left: "56%", top: "31%", size: 8 },
];

const leftNodes = [
  { left: "14%", top: "24%", size: 11 },
  { left: "20%", top: "55%", size: 8 },
  { left: "28%", top: "71%", size: 10 },
];

const rightNodes = [
  { left: "73%", top: "22%", size: 10 },
  { left: "79%", top: "52%", size: 8 },
  { left: "68%", top: "71%", size: 11 },
];

function HeroNetworkVisual({ reduceMotion }: { reduceMotion: boolean }) {
  const sharedTransition = reduceMotion
    ? undefined
    : {
        duration: 4.2,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "mirror" as const,
        ease: "easeInOut" as const,
      };

  const pulseTransition = reduceMotion
    ? undefined
    : {
        duration: 3.1,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut" as const,
      };

  return (
    <div className="relative h-[420px] overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(244,247,251,0.90))] shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/35 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute left-[20%] top-[26%] h-28 w-28 rounded-full bg-slate-200/55 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute right-[18%] top-[30%] h-28 w-28 rounded-full bg-slate-200/45 blur-3xl"
      />

      <div className="absolute inset-0">
        <div className="absolute left-[23%] top-1/2 h-[192px] w-[192px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300/75 bg-white/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" />
        <div className="absolute right-[23%] top-1/2 h-[192px] w-[192px] translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300/75 bg-white/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" />
        <div className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/55 bg-emerald-200/18" />

        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M28 36 C40 38, 44 40, 50 40 C56 40, 60 37, 72 35"
            fill="none"
            stroke="rgba(110,231,183,0.85)"
            strokeWidth="1.8"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.25 }}
            animate={reduceMotion ? { pathLength: 1, opacity: 0.7 } : { pathLength: [0.45, 1, 0.55], opacity: [0.35, 0.72, 0.4] }}
            transition={pulseTransition}
          />
          <motion.path
            d="M31 63 C41 59, 45 58, 50 58 C56 58, 61 60, 69 63"
            fill="none"
            stroke="rgba(110,231,183,0.7)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={reduceMotion ? { pathLength: 1, opacity: 0.65 } : { pathLength: [0.4, 0.95, 0.5], opacity: [0.25, 0.68, 0.28] }}
            transition={{ ...pulseTransition, delay: 0.35 }}
          />
          <motion.path
            d="M34 47 C41 48, 44 51, 50 50 C57 49, 61 43, 67 45"
            fill="none"
            stroke="rgba(245,158,11,0.55)"
            strokeWidth="1.6"
            strokeDasharray="3 4"
            strokeLinecap="round"
            initial={{ opacity: 0.18 }}
            animate={reduceMotion ? { opacity: 0.52 } : { opacity: [0.2, 0.55, 0.24] }}
            transition={{ ...pulseTransition, duration: 2.8 }}
          />
          <motion.path
            d="M33 55 C39 52, 44 57, 50 55 C58 53, 61 61, 70 58"
            fill="none"
            stroke="rgba(239,68,68,0.46)"
            strokeWidth="1.5"
            strokeDasharray="2.5 4.5"
            strokeLinecap="round"
            initial={{ opacity: 0.16 }}
            animate={reduceMotion ? { opacity: 0.45 } : { opacity: [0.18, 0.46, 0.2] }}
            transition={{ ...pulseTransition, duration: 3.6, delay: 0.55 }}
          />
        </svg>

        {[...leftNodes, ...rightNodes].map((node, index) => (
          <motion.span
            key={`${node.left}-${node.top}-${node.size}`}
            className="absolute rounded-full border border-white/80 bg-slate-200/92 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
            style={{
              left: node.left,
              top: node.top,
              width: `${node.size}px`,
              height: `${node.size}px`,
            }}
            animate={reduceMotion ? undefined : { y: [-2, 4, -2] }}
            transition={{
              duration: 3.8 + index * 0.2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: index * 0.12,
            }}
          />
        ))}

        {sharedNodes.map((node, index) => (
          <motion.span
            key={`${node.left}-${node.top}-${node.size}`}
            className="absolute rounded-full border border-white/80 bg-emerald-300/90 shadow-[0_12px_28px_rgba(16,185,129,0.20)]"
            style={{
              left: node.left,
              top: node.top,
              width: `${node.size}px`,
              height: `${node.size}px`,
            }}
            animate={
              reduceMotion
                ? undefined
                : { y: [-2, 3, -2], scale: [1, 1.06, 1] }
            }
            transition={{
              ...(sharedTransition ?? {}),
              delay: index * 0.18,
            }}
          />
        ))}

        <motion.div
          className="absolute left-[23%] top-1/2 h-[136px] w-[136px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400/18 bg-white/10"
          animate={reduceMotion ? undefined : { y: [-3, 3, -3] }}
          transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[23%] top-1/2 h-[136px] w-[136px] translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400/18 bg-white/10"
          animate={reduceMotion ? undefined : { y: [3, -3, 3] }}
          transition={{ duration: 6.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

export function LandingHero() {
  const reduceMotion = useReducedMotion() ?? false;

  const floatTransition = reduceMotion
    ? { duration: 0 }
    : {
        duration: 4.6,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "mirror" as const,
        ease: "easeInOut" as const,
      };

  return (
    <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:gap-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        className="reveal"
      >
        <p className="inline-flex rounded-full border border-[color:var(--line)] bg-white/82 px-4 py-2 font-[var(--font-display)] text-[11px] tracking-[0.14em] text-[color:var(--ink-soft)] shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
          Die meisten Founder merken zu spät, wo sie nicht zusammenpassen.
        </p>

        <h1 className="mt-7 max-w-4xl font-[var(--font-display)] text-4xl leading-[0.94] tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-[4.35rem]">
          Erfolgreiche Startups entstehen aus stabilen Founder-Teams.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)] lg:text-[1.15rem]">
          Ihr seht, wo ihr gleich tickt, wo ihr unterschiedlich entscheidet und wo daraus echte
          Spannungen entstehen können – bevor sie eure Zusammenarbeit belasten.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--brand-primary)] px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-slate-950 transition hover:translate-y-[-1px] hover:bg-[color:var(--brand-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]"
          >
            Founder-Kompatibilität prüfen
          </Link>
          <Link
            href="#ablauf"
            className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white/86 px-6 py-4 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-[color:var(--ink)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]/30"
          >
            So funktioniert&apos;s
          </Link>
        </div>

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[color:var(--muted)]">
          {supportPoints.map((item) => (
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
            <motion.div
              animate={reduceMotion ? undefined : { y: [-2, 6, -2] }}
              transition={floatTransition}
            >
              <HeroNetworkVisual reduceMotion={reduceMotion} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
