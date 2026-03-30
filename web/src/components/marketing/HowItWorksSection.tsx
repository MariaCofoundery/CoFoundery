"use client";

import { motion } from "framer-motion";
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
    text: "Der Matching-Report zeigt, wo ihr gleich tickt, wo ihr unterschiedlich entscheidet und wo daraus Spannungen entstehen können.",
    label: "Gemeinsamkeiten, Unterschiede, Spannungen",
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

      <div className="mt-5 space-y-4">
        {[
          { label: "Gemeinsamkeiten", left: "76%", right: "76%", tone: "bg-emerald-300/85" },
          { label: "Unterschiede", left: "42%", right: "72%", tone: "bg-slate-300/90" },
          { label: "Spannungen", left: "58%", right: "68%", tone: "bg-amber-300/85" },
        ].map((row) => (
          <div key={row.label} className="rounded-2xl border border-slate-200/75 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{row.label}</p>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                <span>A</span>
                <span>B</span>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="h-2.5 rounded-full bg-slate-200/85 p-[2px]">
                <div className={`h-full rounded-full ${row.tone}`} style={{ width: row.left }} />
              </div>
              <div className="h-px bg-slate-300/80 md:w-10" />
              <div className="h-2.5 rounded-full bg-slate-200/85 p-[2px]">
                <div className={`h-full rounded-full ${row.tone}`} style={{ width: row.right }} />
              </div>
            </div>
          </div>
        ))}
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

function StepVisual({ index }: { index: number }) {
  if (index === 0) return <QuestionScale />;
  if (index === 1) return <MatchingSnapshot />;
  return <WorkbookVisual />;
}

function StepCard({
  panel,
  index,
  isActive,
  setRef,
}: {
  panel: (typeof panels)[number];
  index: number;
  isActive: boolean;
  setRef?: (node: HTMLDivElement | null) => void;
}) {
  return (
    <motion.article
      ref={setRef}
      data-step-index={index}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`grid gap-8 rounded-[34px] border p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] transition-all duration-300 md:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 ${
        isActive
          ? "border-[color:var(--brand-primary)]/18 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)]"
          : "border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))]"
      }`}
    >
      <div className="flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold shadow-[0_10px_20px_rgba(15,23,42,0.06)] transition-all duration-300 ${
                isActive
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

          <h3 className="mt-6 max-w-md font-[var(--font-display)] text-3xl tracking-[-0.04em] text-slate-950 md:text-[2.1rem]">
            {panel.title}
          </h3>
          <p className="mt-4 max-w-md text-base leading-8 text-[color:var(--muted)]">
            {panel.text}
          </p>
        </div>

        <div className="mt-8 flex items-center gap-3">
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
          <StepVisual index={index} />
        </div>
      </div>
    </motion.article>
  );
}

function TimelineRail({
  index,
  isActive,
  isComplete,
  isLast,
}: {
  index: number;
  isActive: boolean;
  isComplete: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative hidden lg:flex lg:justify-center">
      {!isLast ? (
        <div className="absolute left-1/2 top-14 h-[calc(100%+2rem)] w-px -translate-x-1/2 bg-slate-200/85" />
      ) : null}
      {!isLast && (isComplete || isActive) ? (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ transformOrigin: "top center" }}
          className="absolute left-1/2 top-14 h-[calc(100%+2rem)] w-px -translate-x-1/2 bg-[color:var(--brand-primary)]/45"
        />
      ) : null}

      <div
        className={`relative z-10 mt-5 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300 ${
          isActive
            ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-white shadow-[0_14px_28px_rgba(38,118,255,0.18)]"
            : isComplete
              ? "border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)]"
              : "border-slate-200/90 bg-white text-slate-500"
        }`}
      >
        {index + 1}
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          const index = Number(visible[0].target.getAttribute("data-step-index"));
          if (Number.isFinite(index)) {
            setActiveStep(index);
          }
        }
      },
      {
        threshold: [0.25, 0.45, 0.65],
        rootMargin: "-18% 0px -28% 0px",
      },
    );

    const nodes = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    nodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, []);

  const setCardRef = (index: number) => (node: HTMLDivElement | null) => {
    cardRefs.current[index] = node;
  };

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

      <div className="mt-10">
        <div className="space-y-6 lg:hidden">
          {panels.map((panel, index) => (
            <StepCard key={panel.step} panel={panel} index={index} isActive={index === 0} />
          ))}
        </div>

        <div className="hidden lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-x-6 lg:gap-y-8">
          {panels.map((panel, index) => (
            <div key={panel.step} className="contents">
              <TimelineRail
                index={index}
                isActive={activeStep === index}
                isComplete={activeStep > index}
                isLast={index === panels.length - 1}
              />
              <StepCard
                panel={panel}
                index={index}
                isActive={activeStep === index}
                setRef={setCardRef(index)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
