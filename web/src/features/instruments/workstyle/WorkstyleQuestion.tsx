"use client";

import { useTranslations, useLocale } from "next-intl";

import { workstyleDisplayItem, workstyleDisplayOptions } from "./display";
import type { AppLocale } from "@/i18n/config";
import { useEffect, useRef, useState } from "react";
import type { WorkstyleItem } from "@/features/instruments/workstyle/registry";
import type { ResearchAnswer } from "@/features/instruments/workstyle/data";

/** Gemeinsame Bausteine aller Workstyle-Fragebogen (aktuell v5, frueher v2/v3/v4): Fortschritt und Fragekarte. */
const button =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-violet-800 px-6 py-3 font-semibold text-white transition hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:opacity-50";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:opacity-50";

/** Kontext fuer den Abschluss: aus welcher Einladung / welchem Team jemand kommt. */
export type WorkstyleCompletionContext = { teamId: string | null; partnerNames: string[] };

export function WorkstyleProgress({ position, total, noun = "Frage", ariaLabel = "Fortschritt" }: { position: number; total: number; noun?: string; ariaLabel?: string }) {
  const t = useTranslations("workstyleFlow");

  const label = t("value_value_of_value", { p0: noun === "Frage" ? t("question") : noun, p1: position + 1, p2: total });
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
        <span>{label}</span>
      </div>
      {/* Fortschritt ist Fortschritt, keine Bewertung: Markenfarben statt Ampel-Gruen. */}
      <div role="progressbar" aria-label={ariaLabel === "Fortschritt" ? t("progress") : ariaLabel} aria-valuemin={1} aria-valuemax={total} aria-valuenow={position + 1} aria-valuetext={label} className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((position + 1) / total) * 100}%` }} />
      </div>
    </div>
  );
}

export function WorkstyleQuestion({ item: sourceItem, initial, pending, last, canGoBack, onSave, onBack }: {
  item: WorkstyleItem; initial?: ResearchAnswer; pending: boolean; last: boolean; canGoBack: boolean;
  onSave: (value: number | string, elapsed: number) => void; onBack: () => void;
}) {
  const t = useTranslations("workstyleFlow");

  const locale = useLocale() as AppLocale;
  const item = workstyleDisplayItem(sourceItem, locale);
  const [value, setValue] = useState<number | string | null>(initial?.missing_reason ?? initial?.response_option ?? initial?.response_value ?? null);
  const [started] = useState(() => Date.now());
  const card = useRef<HTMLDivElement>(null);
  const question = useRef<HTMLLegendElement>(null);
  useEffect(() => {
    // Phase 11.5: Nach jedem Wechsel steht die neue Frage vollstaendig im Blick.
    // scroll-mt beruecksichtigt die feste Kopfleiste der App; gescrollt wird nur,
    // wenn der Kartenanfang nicht sichtbar ist. Danach Fokus auf die Frage, damit
    // Screenreader sie ansagen - ohne zweiten Sprung.
    const box = card.current;
    if (box) {
      const top = box.getBoundingClientRect().top;
      const offset = parseFloat(getComputedStyle(box).scrollMarginTop) || 0;
      // "instant": die globale scroll-behavior:smooth wuerde sonst animieren und die Frage erst verspaetet zeigen.
      if (top < offset || top > window.innerHeight * 0.6) box.scrollIntoView({ block: "start", behavior: "instant" });
    }
    question.current?.focus({ preventScroll: true });
  }, []);
  // Visual separation only: concatenate these two substrings to recover the exact supplied prompt.
  const split = Math.max(0, ...["Wie ", "Was ", "How ", "Which ", "What "].map(word => item.prompt.lastIndexOf(word)));
  return <div ref={card} className="scroll-mt-36 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-9">
    <form onSubmit={event => { event.preventDefault(); if (value !== null) onSave(value, Date.now() - started); }}>
      <fieldset disabled={pending}>
        <legend ref={question} tabIndex={-1} className="mb-8 w-full outline-none">
          <span className="block text-lg leading-8 text-slate-600">{item.prompt.slice(0, split)}</span>
          <span className="mt-3 block text-2xl font-semibold leading-9 tracking-[-0.01em] text-slate-950">{item.prompt.slice(split)}</span>
        </legend>
        {item.response_format === "comparative" && item.assessment_version === "8.5a-v5" && <p className="mb-3 text-sm text-slate-600" data-workstyle-choice-hint>{t("v5_choice_hint")}</p>}
        {item.response_format === "comparative" && <div className="mb-6 grid gap-3" aria-label={t("comparative_label")}>
          {item.alternatives?.map(alternative => <p key={alternative.option_id} className="flex gap-3 rounded-2xl bg-slate-50 p-4 leading-7 text-slate-800">
            <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-violet-800 ring-1 ring-violet-200">{alternative.option_id}</span>
            <span><span className="sr-only">{alternative.option_id}: </span>{alternative.label}</span>
          </p>)}
        </div>}
        <div className="grid gap-2.5">
          {workstyleDisplayOptions(item, locale).map(option => <label key={option.value} className={`flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border px-5 py-3.5 leading-6 transition ${value === option.value ? "border-violet-500 bg-violet-50/70 ring-1 ring-violet-200" : "border-slate-200 hover:border-slate-300"}`}>
            <input type="radio" className="h-5 w-5 shrink-0 accent-violet-700" name={item.item_key} value={option.value} checked={value === option.value} onChange={() => setValue(option.value)} />{option.label}
          </label>)}
          <label className={`mt-2 flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border border-dashed px-5 py-3.5 leading-6 text-slate-700 transition ${value === "cannot_assess" ? "border-violet-400 bg-violet-50/50" : "border-slate-300 hover:border-slate-400"}`}>
            <input type="radio" className="h-5 w-5 shrink-0 accent-violet-700" name={item.item_key} value="cannot_assess" checked={value === "cannot_assess"} onChange={() => setValue("cannot_assess")} />{t("i_cannot_assess_this_yet")} </label>
        </div>
      </fieldset>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {canGoBack ? <button type="button" className={secondary} disabled={pending} onClick={onBack}>{t("back")}</button> : <span />}
        <button className={button} disabled={pending || value === null}>{pending ? t("saving") : last ? t("finish") : t("next")}</button>
      </div>
    </form>
  </div>;
}
