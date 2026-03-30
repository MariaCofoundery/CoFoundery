"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const supportPoints = [
  "48 strukturierte Fragen",
  "Klarer Matching-Report",
  "Gemeinsames Workbook",
];

const alignmentRows = [
  {
    label: "Gemeinsamkeiten",
    detail: "Tragende Arbeitsbasis",
    leftWidth: "72%",
    rightWidth: "72%",
    tone: "bg-emerald-300/75",
  },
  {
    label: "Entscheidungen",
    detail: "Unterschiede früh sichtbar",
    leftWidth: "58%",
    rightWidth: "84%",
    tone: "bg-amber-300/80",
  },
  {
    label: "Spannungen",
    detail: "Klärungsbedarf im Alltag",
    leftWidth: "38%",
    rightWidth: "66%",
    tone: "bg-slate-300/85",
  },
];

function FounderCard({
  title,
  subtitle,
  align,
  delay,
}: {
  title: string;
  subtitle: string;
  align: "left" | "right";
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative z-10 w-full max-w-[17rem] rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur ${
        align === "right" ? "justify-self-end" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
            {title}
          </p>
          <p className="mt-2 font-[var(--font-display)] text-lg tracking-[-0.02em] text-slate-950">
            {subtitle}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 text-[11px] font-medium text-slate-600">
          {align === "left" ? "A" : "B"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Arbeitsmodus</p>
          <p className="mt-2 text-sm text-slate-700">
            {align === "left" ? "Klar, zügig, mit Zug zur Entscheidung" : "Sorgfältig, abwägend, mit Blick auf Risiken"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(align === "left"
            ? ["Tempo", "Ownership", "Entscheidung"]
            : ["Abgleich", "Risiko", "Struktur"]
          ).map((item) => (
            <span
              key={item}
              className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-[11px] tracking-[0.08em] text-slate-600"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function LandingHero() {
  const reduceMotion = useReducedMotion();

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

          <div className="relative grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <motion.div
                animate={reduceMotion ? undefined : { y: [-2, 8] }}
                transition={floatTransition}
              >
                <FounderCard title="Founder-Perspektive" subtitle="Schneller, direkter Zugriff" align="left" delay={0.16} />
              </motion.div>

              <motion.div
                animate={reduceMotion ? undefined : { y: [8, -2] }}
                transition={floatTransition}
              >
                <FounderCard title="Founder-Perspektive" subtitle="Mehr Abgleich, mehr Absicherung" align="right" delay={0.24} />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-[30px] border border-slate-200/85 bg-white/88 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    Gemeinsame Struktur
                  </p>
                  <h2 className="mt-2 font-[var(--font-display)] text-2xl tracking-[-0.03em] text-slate-950">
                    Unterschiede werden lesbar, bevor sie tragen müssen.
                  </h2>
                </div>
                <motion.div
                  animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.82, 1, 0.82] }}
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: 3.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                  }
                  className="mt-1 h-3 w-3 rounded-full bg-[color:var(--brand-primary)] shadow-[0_0_0_10px_rgba(38,118,255,0.12)]"
                />
              </div>

              <div className="mt-6 space-y-4">
                {alignmentRows.map((row, index) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.42 + index * 0.1, ease: "easeOut" }}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/78 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">{row.label}</p>
                      <p className="text-xs tracking-[0.08em] text-slate-500">{row.detail}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="h-2.5 rounded-full bg-slate-200/90 p-[2px]">
                        <div className={`h-full rounded-full ${row.tone}`} style={{ width: row.leftWidth }} />
                      </div>
                      <div className="h-px w-7 bg-[color:var(--line)]" />
                      <div className="h-2.5 rounded-full bg-slate-200/90 p-[2px]">
                        <div className={`ml-auto h-full rounded-full ${row.tone}`} style={{ width: row.rightWidth }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.72, ease: "easeOut" }}
                className="mt-5 rounded-2xl border border-[color:var(--brand-accent)]/15 bg-[linear-gradient(135deg,rgba(38,118,255,0.08),rgba(21,80,128,0.06))] px-4 py-4 text-sm leading-6 text-slate-700"
              >
                Der Report zeigt, was euch trägt, wo Reibung entsteht und welche Punkte ihr im
                Workbook früh sauber klären solltet.
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
