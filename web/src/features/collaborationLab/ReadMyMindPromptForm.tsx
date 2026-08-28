"use client";

import { useState } from "react";
import type { ReadMyMindOwnSlot } from "@/features/collaborationLab/readMyMindModel";

type Labels = { saved: string; lockWarning: string; submit: string; multiHint: string };

function ChoiceGroup({ legend, slot, locale, labels, selected, setSelected }: { legend: string; slot: ReadMyMindOwnSlot; locale: "de" | "en"; labels: Labels; selected: string[]; setSelected: (choices: string[]) => void }) {
  const locked = Boolean(slot.lockedAt);
  const multi = slot.contract.format === "multi_choice";
  const atMaximum = selected.length >= slot.contract.maxSelections;
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" disabled={locked}>
      <legend className="px-1 text-base font-semibold text-slate-950">{legend}</legend>
      {multi ? <p id={`${slot.responseType}-hint`} className="mt-1 text-sm text-slate-600">{labels.multiHint}</p> : null}
      <div className="mt-3 grid gap-2">
        {slot.contract.choices.map((choice) => {
          const checked = selected.includes(choice.key);
          const disabled = locked || (multi && atMaximum && !checked);
          return (
            <label key={choice.key} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition focus-within:ring-2 focus-within:ring-violet-400 ${checked ? "border-violet-400 bg-violet-50 text-violet-950" : "border-slate-200 bg-slate-50/70 text-slate-800"} ${disabled && !locked ? "cursor-not-allowed opacity-55" : ""}`}>
              <input
                type={multi ? "checkbox" : "radio"}
                name={slot.responseType}
                value={choice.key}
                checked={checked}
                disabled={disabled}
                aria-describedby={multi ? `${slot.responseType}-hint` : undefined}
                onChange={() => setSelected(multi ? (checked ? selected.filter((key) => key !== choice.key) : [...selected, choice.key]) : [choice.key])}
                className="h-4 w-4 accent-violet-700"
              />
              <span className="flex-1">{choice.label[locale]}</span>
              {checked ? <span aria-hidden="true" className="text-violet-700">✓</span> : null}
            </label>
          );
        })}
      </div>
      {locked ? <p className="mt-3 text-xs font-semibold text-emerald-700">{labels.saved}</p> : null}
    </fieldset>
  );
}

export function ReadMyMindPromptForm({ action, locale, selfLegend, guessLegend, needLegend, prompt, labels }: {
  action: (formData: FormData) => void | Promise<void>;
  locale: "de" | "en";
  selfLegend: string;
  guessLegend: string;
  needLegend: string;
  prompt: { self: ReadMyMindOwnSlot; guess: ReadMyMindOwnSlot; need: ReadMyMindOwnSlot | null };
  labels: Labels;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({
    self: prompt.self.lockedChoiceKeys ?? [],
    guess: prompt.guess.lockedChoiceKeys ?? [],
    need: prompt.need?.lockedChoiceKeys ?? [],
  });
  const slots = [prompt.self, prompt.guess, ...(prompt.need ? [prompt.need] : [])];
  const complete = slots.every((slot) => {
    if (slot.lockedAt) return true;
    const count = selections[slot.responseType]?.length ?? 0;
    return count >= slot.contract.minSelections && count <= slot.contract.maxSelections;
  });
  return (
    <form action={action} className="mt-6 grid gap-5">
      <ChoiceGroup legend={selfLegend} slot={prompt.self} locale={locale} labels={labels} selected={selections.self ?? []} setSelected={(choices) => setSelections((current) => ({ ...current, self: choices }))} />
      <ChoiceGroup legend={guessLegend} slot={prompt.guess} locale={locale} labels={labels} selected={selections.guess ?? []} setSelected={(choices) => setSelections((current) => ({ ...current, guess: choices }))} />
      {prompt.need ? <ChoiceGroup legend={needLegend} slot={prompt.need} locale={locale} labels={labels} selected={selections.need ?? []} setSelected={(choices) => setSelections((current) => ({ ...current, need: choices }))} /> : null}
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p>{labels.lockWarning}</p>
      </div>
      <button type="submit" disabled={!complete} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300">
        {labels.submit}
      </button>
    </form>
  );
}
