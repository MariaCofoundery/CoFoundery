"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const panels = [
  {
    step: "1",
    title: "Startet mit eurem Profil",
    text: "Ihr beantwortet strukturierte Fragen zu Zusammenarbeit, Entscheidungen, Konflikten und Verantwortung.",
    label: "Selbstbild sichtbar machen",
  },
  {
    step: "2",
    title: "Seht, wo ihr zusammenpasst",
    text: "Der Matching-Report zeigt, wo ihr ähnlich tickt, wo ihr unterschiedlich entscheidet und wo daraus Spannungen entstehen können.",
    label: "Gemeinsamkeiten, Unterschiede, Konfliktpotenzial",
  },
  {
    step: "3",
    title: "Macht daraus klare Regeln",
    text: "Im Workbook klärt ihr die Punkte, die später sonst Reibung erzeugen würden – und haltet konkrete Vereinbarungen fest.",
    label: "Von Analyse zu Vereinbarung",
  },
];

function QuestionScale() {
  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
          Profil
        </p>
        <span className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[10px] tracking-[0.12em] text-slate-500">
          48 Fragen
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {[
          "Wie schnell sprichst du Reibung im Team an?",
          "Wann ist ein Risiko für dich sichtbar genug?",
          "Wie klar sollte Ownership verteilt sein?",
        ].map((question, index) => (
          <div key={question} className="rounded-2xl border border-slate-200/75 bg-slate-50/75 px-4 py-4">
            <p className="text-sm leading-6 text-slate-700">{question}</p>
            <div className="mt-3 flex gap-2">
              {[0, 1, 2, 3, 4].map((dot) => (
                <motion.span
                  key={`${question}-${dot}`}
                  initial={{ opacity: 0.32, y: 6 }}
                  whileInView={{ opacity: dot === (index + 2) % 5 ? 1 : 0.46, y: 0 }}
                  viewport={{ once: true, amount: 0.7 }}
                  transition={{ duration: 0.42, delay: 0.08 * dot }}
                  className={`h-2.5 flex-1 rounded-full ${
                    dot === (index + 2) % 5 ? "bg-[color:var(--brand-primary)]" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchingSnapshot() {
  return (
    <div className="rounded-[30px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
            Matching-Report
          </p>
          <p className="mt-2 font-[var(--font-display)] text-xl tracking-[-0.02em] text-slate-950">
            Zwei Perspektiven, ein klarer Vergleich
          </p>
        </div>
        <span className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[10px] tracking-[0.12em] text-slate-500">
          Report
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Founder A</p>
          <div className="mt-3 space-y-3">
            {[
              { label: "Entscheidung", width: "72%", tone: "bg-emerald-300/80" },
              { label: "Konflikt", width: "54%", tone: "bg-amber-300/80" },
              { label: "Ownership", width: "82%", tone: "bg-slate-300/90" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-500">{item.label}</p>
                <div className="mt-2 h-2.5 rounded-full bg-slate-200/85 p-[2px]">
                  <div className={`h-full rounded-full ${item.tone}`} style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="relative h-24 w-16">
            <motion.div
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 3.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--brand-primary)]/12 blur-xl"
            />
            <div className="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-[color:var(--brand-primary)] shadow-[0_0_0_9px_rgba(38,118,255,0.12)]" />
            <div className="absolute left-1/2 top-5 h-14 w-px -translate-x-1/2 bg-[color:var(--line)]" />
            <div className="absolute bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-slate-400/80 shadow-[0_0_0_9px_rgba(148,163,184,0.14)]" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Founder B</p>
          <div className="mt-3 space-y-3">
            {[
              { label: "Entscheidung", width: "56%", tone: "bg-emerald-300/80" },
              { label: "Konflikt", width: "78%", tone: "bg-amber-300/80" },
              { label: "Ownership", width: "64%", tone: "bg-slate-300/90" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-500">{item.label}</p>
                <div className="mt-2 h-2.5 rounded-full bg-slate-200/85 p-[2px]">
                  <div className={`h-full rounded-full ${item.tone}`} style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkbookVisual() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            title: "Perspektive A",
            lines: ["Wir sprechen Kritik direkt an.", "Entscheidungen lieber früh klären."],
          },
          {
            title: "Perspektive B",
            lines: ["Erst einordnen, dann ansprechen.", "Mehr Abgleich bei strategischen Themen."],
          },
        ].map((entry, index) => (
          <motion.div
            key={entry.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
            className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{entry.title}</p>
            <div className="mt-4 space-y-2">
              {entry.lines.map((line) => (
                <div key={line} className="rounded-xl border border-slate-200/75 bg-slate-50/80 px-3 py-3 text-sm text-slate-700">
                  {line}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.55, delay: 0.16, ease: "easeOut" }}
        className="rounded-[28px] border border-[color:var(--brand-accent)]/15 bg-[linear-gradient(135deg,rgba(38,118,255,0.08),rgba(21,80,128,0.06))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
              Gemeinsame Regel
            </p>
            <p className="mt-2 font-[var(--font-display)] text-xl tracking-[-0.02em] text-slate-950">
              Konflikte sprechen wir innerhalb von 24 Stunden an und klären sie in einem festen Gespräch.
            </p>
          </div>
          <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[10px] tracking-[0.12em] text-slate-600">
            Workbook
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function FlowPanel({
  panel,
  index,
}: {
  panel: (typeof panels)[number];
  index: number;
}) {
  return (
    <article className="grid h-full gap-8 rounded-[36px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.10)] md:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
      <div className="flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-sm font-semibold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
              {panel.step}
            </span>
            <span className="rounded-full border border-slate-200/80 bg-slate-50/85 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
              {panel.label}
            </span>
          </div>

          <h3 className="mt-6 max-w-md font-[var(--font-display)] text-3xl tracking-[-0.04em] text-slate-950 md:text-[2.15rem]">
            {panel.title}
          </h3>
          <p className="mt-4 max-w-md text-base leading-8 text-[color:var(--muted)]">
            {panel.text}
          </p>
        </div>

        <div className="mt-8 hidden lg:flex lg:items-center lg:gap-3">
          <div className="h-px flex-1 bg-[color:var(--line)]" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Schritt {index + 1} von {panels.length}
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-12 top-8 h-24 rounded-full bg-[color:var(--brand-primary)]/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-4 bottom-4 h-24 w-24 rounded-full bg-[color:var(--brand-accent)]/8 blur-3xl"
        />
        <div className="relative">
          {index === 0 ? <QuestionScale /> : null}
          {index === 1 ? <MatchingSnapshot /> : null}
          {index === 2 ? <WorkbookVisual /> : null}
        </div>
      </div>
    </article>
  );
}

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    let observer: IntersectionObserver | null = null;

    const setupObserver = () => {
      observer?.disconnect();
      observer = null;

      if (!mediaQuery.matches) {
        setActiveStep(0);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries
            .filter((entry) => entry.isIntersecting)
            .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

          if (visibleEntries.length === 0) {
            return;
          }

          const nextIndex = Number(
            visibleEntries[0].target.getAttribute("data-step-index") ?? "0",
          );

          setActiveStep(nextIndex);
        },
        {
          root: null,
          rootMargin: "-18% 0px -42% 0px",
          threshold: [0.2, 0.35, 0.5, 0.7],
        },
      );

      for (const stepRef of stepRefs.current) {
        if (stepRef) {
          observer.observe(stepRef);
        }
      }
    };

    setupObserver();

    const handleMediaChange = () => setupObserver();
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      observer?.disconnect();
    };
  }, []);

  return (
    <section id="ablauf" className="mt-20">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
          So funktioniert CoFoundery Align
        </p>
        <h2 className="mt-3 font-[var(--font-display)] text-3xl tracking-tight md:text-4xl">
          Drei Schritte zu einem stärkeren Founder-Team
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--muted)]">
          Von der ersten Selbsteinschätzung bis zu klaren gemeinsamen Regeln.
        </p>
      </div>

      <div className="mt-8">
        <div className="mb-5 hidden flex-wrap items-center gap-3 lg:flex">
          {panels.map((panel, index) => (
            <div
              key={panel.step}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.04)] transition-all duration-300 ${
                activeStep === index
                  ? "border-[color:var(--brand-primary)]/15 bg-white/94"
                  : "border-slate-200/80 bg-white/78"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors duration-300 ${
                  activeStep === index
                    ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-white"
                    : "border-slate-200/80 bg-white text-slate-600"
                }`}
              >
                {panel.step}
              </span>
              <span
                className={`text-xs tracking-[0.08em] transition-colors duration-300 ${
                  activeStep === index ? "text-slate-800" : "text-slate-500"
                }`}
              >
                {panel.label}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-6 lg:hidden">
          {panels.map((panel, index) => (
            <FlowPanel key={panel.step} panel={panel} index={index} />
          ))}
        </div>

        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:gap-8">
            <div className="relative">
              <div className="sticky top-24">
              <div className="relative overflow-hidden rounded-[36px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.90))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.10)]">
                <div
                  aria-hidden
                  className="absolute inset-x-12 top-8 h-24 rounded-full bg-[color:var(--brand-primary)]/10 blur-3xl"
                />
                <div
                  aria-hidden
                  className="absolute -right-4 bottom-4 h-24 w-24 rounded-full bg-[color:var(--brand-accent)]/8 blur-3xl"
                />
                <div className="relative">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                        Schritt {activeStep + 1}
                      </p>
                      <p className="mt-2 font-[var(--font-display)] text-2xl tracking-[-0.03em] text-slate-950">
                        {panels[activeStep]?.title}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200/80 bg-white/82 px-3 py-1 text-[10px] tracking-[0.12em] text-slate-500">
                      {activeStep + 1} / {panels.length}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={panels[activeStep]?.step}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      {activeStep === 0 ? <QuestionScale /> : null}
                      {activeStep === 1 ? <MatchingSnapshot /> : null}
                      {activeStep === 2 ? <WorkbookVisual /> : null}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {panels.map((panel, index) => (
              <section
                key={panel.step}
                ref={(node) => {
                  stepRefs.current[index] = node;
                }}
                data-step-index={index}
                className="flex min-h-[58vh] items-center"
              >
                <article
                  className={`w-full rounded-[32px] border p-6 transition-all duration-300 ${
                    activeStep === index
                      ? "border-[color:var(--brand-primary)]/15 bg-white shadow-[0_22px_55px_rgba(15,23,42,0.08)]"
                      : "border-[color:var(--line)] bg-white/72 shadow-[0_12px_28px_rgba(15,23,42,0.04)] opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-300 ${
                        activeStep === index
                          ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-white"
                          : "border-[color:var(--line)] bg-white text-slate-700"
                      }`}
                    >
                      {panel.step}
                    </span>
                    <span className="rounded-full border border-slate-200/80 bg-slate-50/85 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {panel.label}
                    </span>
                  </div>

                  <h3 className="mt-6 max-w-md font-[var(--font-display)] text-3xl tracking-[-0.04em] text-slate-950">
                    {panel.title}
                  </h3>
                  <p className="mt-4 max-w-md text-base leading-8 text-[color:var(--muted)]">
                    {panel.text}
                  </p>
                </article>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
