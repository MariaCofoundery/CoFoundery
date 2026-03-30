"use client";

import { motion, useReducedMotion } from "framer-motion";
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
  const scrollSectionRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const metricsRef = useRef({
    stickyTop: 0,
    horizontalDistance: 0,
    stickyHeight: 0,
  });
  const [debugState, setDebugState] = useState({
    viewportWidth: 0,
    trackWidth: 0,
    horizontalDistance: 0,
    stickyHeight: 0,
    sectionHeight: 0,
    scrollProgress: 0,
    translateX: 0,
  });

  useEffect(() => {
    const updateMeasurements = () => {
      const viewportWidth = viewportRef.current?.clientWidth ?? 0;
      const trackWidth = trackRef.current?.scrollWidth ?? 0;
      const nextStickyHeight = stickyRef.current?.clientHeight ?? 0;
      const stickyTop = stickyRef.current
        ? Number.parseFloat(window.getComputedStyle(stickyRef.current).top || "0") || 0
        : 0;
      const horizontalDistance = Math.max(trackWidth - viewportWidth, 0);

      metricsRef.current = {
        stickyTop,
        horizontalDistance,
        stickyHeight: nextStickyHeight,
      };

      setDebugState((current) => ({
        ...current,
        viewportWidth,
        trackWidth,
        horizontalDistance,
        stickyHeight: nextStickyHeight,
        sectionHeight: nextStickyHeight + stickyTop + horizontalDistance,
      }));
    };

    const updateProgress = () => {
      const sectionTop = scrollSectionRef.current?.getBoundingClientRect().top ?? 0;
      const { stickyTop, horizontalDistance } = metricsRef.current;
      const rawProgress =
        horizontalDistance > 0 ? (stickyTop - sectionTop) / horizontalDistance : 0;
      const scrollProgress = Math.min(1, Math.max(0, rawProgress));
      const translateX = reduceMotion ? 0 : -horizontalDistance * scrollProgress;

      setDebugState((current) => ({
        ...current,
        scrollProgress,
        translateX,
      }));
    };

    updateMeasurements();
    updateProgress();

    const observer = new ResizeObserver(() => {
      updateMeasurements();
      updateProgress();
    });
    if (scrollSectionRef.current) observer.observe(scrollSectionRef.current);
    if (stickyRef.current) observer.observe(stickyRef.current);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (trackRef.current) observer.observe(trackRef.current);

    window.addEventListener("resize", updateMeasurements);
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMeasurements);
      window.removeEventListener("scroll", updateProgress);
    };
  }, [reduceMotion]);

  return (
    <section id="ablauf" className="mt-20 reveal">
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

      <div className="mt-10 lg:hidden">
        <div className="space-y-5">
          {panels.map((panel, index) => (
            <FlowPanel key={panel.step} panel={panel} index={index} />
          ))}
        </div>
      </div>

      <div
        ref={scrollSectionRef}
        className="relative mt-8 hidden lg:block"
        style={{
          height: debugState.sectionHeight > 0 ? `${debugState.sectionHeight}px` : undefined,
        }}
      >
        <div
          ref={stickyRef}
          className="sticky top-24 h-[min(760px,calc(100vh-8rem))] overflow-hidden rounded-[42px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(248,250,252,0.56))] px-6 py-5 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur md:px-8 md:py-6"
        >
          <div className="flex h-full flex-col">
            <div className="mb-5 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                {panels.map((panel) => (
                  <div key={panel.step} className="inline-flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-xs font-medium text-slate-600">
                      {panel.step}
                    </span>
                    <span className="text-xs tracking-[0.08em] text-slate-500">{panel.label}</span>
                  </div>
                ))}
              </div>
              <div className="w-40">
                <div className="h-1 rounded-full bg-slate-200/85">
                  <div
                    style={{
                      width: `${reduceMotion ? 100 : Math.max(6, debugState.scrollProgress * 100)}%`,
                    }}
                    className="h-full rounded-full bg-[color:var(--brand-primary)]"
                  />
                </div>
              </div>
            </div>

            <div ref={viewportRef} className="min-h-0 flex-1 overflow-hidden">
              <div
                ref={trackRef}
                style={{
                  transform: `translate3d(${debugState.translateX}px, 0, 0)`,
                }}
                className="flex h-full gap-6"
              >
                {panels.map((panel, index) => (
                  <div
                    key={panel.step}
                    className="h-full w-[min(1180px,calc(100vw-9rem))] shrink-0"
                  >
                    <FlowPanel panel={panel} index={index} />
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute right-6 top-5 rounded-2xl border border-slate-200/80 bg-white/82 px-3 py-2 text-[10px] leading-5 tracking-[0.08em] text-slate-500 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
              <div>viewport: {Math.round(debugState.viewportWidth)}px</div>
              <div>track: {Math.round(debugState.trackWidth)}px</div>
              <div>distance: {Math.round(debugState.horizontalDistance)}px</div>
              <div>height: {Math.round(debugState.sectionHeight)}px</div>
              <div>progress: {Math.round(debugState.scrollProgress * 100)}%</div>
              <div>translateX: {Math.round(debugState.translateX)}px</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
