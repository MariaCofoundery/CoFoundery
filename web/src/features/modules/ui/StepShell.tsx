"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * Gemeinsamer Rahmen fuer Fragebogen-Durchlaeufe: links die Schritte als Liste (Punkt: offen · aktuell ·
 * beantwortet), in der Mitte der aktuelle Schritt, darunter Zurueck/Weiter und der Hinweis „Nur fuer dich".
 *
 * Keine Zaehlung und kein Fortschrittsbalken: Die Liste zeigt nur, welche Schritte beantwortet sind. Wie viele
 * es insgesamt sind, steht nirgends als Zahl. Der letzte Schritt („Abgeben") steht in der Liste wie jeder andere.
 */
export type Step = { key: string; label: string; done: boolean };

export function StepShell({
  steps,
  renderStep,
  privacyNote,
}: {
  steps: readonly Step[];
  renderStep: (key: string) => ReactNode;
  privacyNote: string;
}) {
  const t = useTranslations("questionnaires.flow");
  const [index, setIndex] = useState(0);
  const current = steps[index];
  const last = index === steps.length - 1;
  const go = (next: number) => {
    setIndex(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label={t("steps")} className="min-w-0">
        <p className="hidden text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 lg:block">{t("steps")}</p>
        <ol className="mt-0 flex gap-1 overflow-x-auto pb-1 lg:mt-2 lg:flex-col lg:overflow-visible">
          {steps.map((step, i) => (
            <li key={step.key} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "step" : undefined}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[15px] transition ${
                  i === index ? "bg-violet-50 font-semibold text-slate-950" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    i === index ? "bg-violet-600" : step.done ? "bg-teal-600" : "border-2 border-slate-300"
                  }`}
                />
                <span>{step.label}</span>
                <span className="sr-only">{step.done ? t("answered") : t("open")}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 hidden text-xs leading-5 text-slate-500 lg:block">{t("noCounts")}</p>
      </nav>

      <div className="min-w-0 space-y-6">
        {current ? renderStep(current.key) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 disabled:opacity-40"
          >
            {t("back")}
          </button>
          {!last ? (
            <button type="button" onClick={() => go(index + 1)} className="brand-cta inline-flex min-h-11 items-center rounded-xl px-6 text-sm font-semibold">
              {t("next")}
            </button>
          ) : null}
        </div>

        <p className="rounded-2xl bg-violet-50 p-4 text-[15px] leading-6 text-slate-700">{privacyNote}</p>
      </div>
    </div>
  );
}
