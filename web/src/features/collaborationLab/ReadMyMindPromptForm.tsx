"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { ReadMyMindOwnSlot } from "@/features/collaborationLab/readMyMindModel";

type Labels = {
  saved: string;
  lockWarning: string;
  submit: string;
  submitPending: string;
  multiHint: string;
  perspectiveShift: string;
  perspectiveShiftText: string;
  guessHelper: string;
};

function ChoiceGroup({ legend, slot, locale, labels, selected, setSelected, enabled = true, tone }: { legend: string; slot: ReadMyMindOwnSlot; locale: "de" | "en"; labels: Labels; selected: string[]; setSelected: (choices: string[]) => void; enabled?: boolean; tone: "self" | "guess" | "need" }) {
  const locked = Boolean(slot.lockedAt);
  const multi = slot.contract.format === "multi_choice";
  const atMaximum = selected.length >= slot.contract.maxSelections;
  const toneClasses = tone === "self"
    ? "border-[#e4e2f0] bg-white"
    : tone === "guess"
      ? "border-[#d9cff8] bg-[#f5f2fe]"
      : "border-[#e4e2f0] bg-white";
  return (
    <fieldset className={`rmm-phase rounded-[24px] border p-5 transition-[opacity,transform,box-shadow] duration-300 motion-reduce:transition-none sm:p-7 ${toneClasses} ${enabled ? "opacity-100" : "translate-y-1 opacity-55"}`} disabled={locked || !enabled}>
      <legend className="px-2 text-lg font-semibold tracking-tight text-[#0b1f3a]">{legend}</legend>
      {tone === "guess" ? <p id="guess-guidance" className="mt-1 text-sm leading-6 text-[#5f5e7a]">{labels.guessHelper}</p> : null}
      {multi ? <p id={`${slot.responseType}-hint`} className="mt-1 text-sm text-[#5f5e7a]">{labels.multiHint}</p> : null}
      <div className="mt-4 grid gap-3">
        {slot.contract.choices.map((choice) => {
          const checked = selected.includes(choice.key);
          const disabled = locked || !enabled || (multi && atMaximum && !checked);
          return (
            <label key={choice.key} className={`group relative flex min-h-14 items-center gap-3.5 rounded-[18px] border-2 px-[18px] py-4 text-[15px] leading-6 transition-[box-shadow,border-color,background-color,opacity] duration-200 motion-reduce:transition-none focus-within:ring-2 focus-within:ring-[#6d49e0] focus-within:ring-offset-2 ${locked ? "cursor-default" : "cursor-pointer"} ${checked ? "border-[#6d49e0] bg-[#f5f2fe] text-[#0b1f3a] shadow-[0_0_0_4px_rgba(109,73,224,0.10)]" : "border-[#e4e2f0] bg-white text-[#33325e] hover:border-[#d9cff8]"} ${disabled && !locked ? "cursor-not-allowed opacity-45" : ""}`}>
              <input
                type={multi ? "checkbox" : "radio"}
                name={slot.responseType}
                value={choice.key}
                checked={checked}
                disabled={disabled}
                aria-describedby={[tone === "guess" ? "guess-guidance" : null, multi ? `${slot.responseType}-hint` : null].filter(Boolean).join(" ") || undefined}
                onChange={() => setSelected(multi ? (checked ? selected.filter((key) => key !== choice.key) : [...selected, choice.key]) : [choice.key])}
                className="h-[22px] w-[22px] shrink-0 accent-[#6d49e0]"
              />
              <span className="flex-1 font-semibold">{choice.label[locale]}</span>
              <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-[opacity,transform,background-color] duration-200 motion-reduce:transition-none ${checked ? "scale-100 border-[#6d49e0] bg-[#6d49e0] text-white opacity-100" : "scale-75 border-[#e4e2f0] bg-white text-transparent opacity-0"}`}>✓</span>
            </label>
          );
        })}
      </div>
      {locked ? <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d9cff8] bg-white px-3 py-1 text-xs font-semibold text-[#4a2fb8]"><span aria-hidden="true">✓</span>{labels.saved}</p> : null}
    </fieldset>
  );
}

function SubmitButton({ labels, disabled }: { labels: Labels; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl brand-cta px-5 py-3 text-sm font-semibold transition-[transform,background-color,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:bg-[#4a2fb8] motion-safe:active:translate-y-0 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#d8d5ea] disabled:shadow-none disabled:hover:translate-y-0">
      <span aria-hidden="true" className={`transition-transform duration-200 motion-reduce:transition-none ${pending ? "scale-100" : "scale-90"}`}>✓</span>
      {pending ? labels.submitPending : labels.submit}
    </button>
  );
}

export function ReadMyMindPromptForm({ action, locale, selfLegend, guessLegend, needLegend, partnerName, prompt, labels }: {
  action: (formData: FormData) => void | Promise<void>;
  locale: "de" | "en";
  selfLegend: string;
  guessLegend: string;
  needLegend: string;
  partnerName: string;
  prompt: { self: ReadMyMindOwnSlot; guess: ReadMyMindOwnSlot; need: ReadMyMindOwnSlot | null };
  labels: Labels;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({
    self: prompt.self.lockedChoiceKeys ?? [],
    guess: prompt.guess.lockedChoiceKeys ?? [],
    need: prompt.need?.lockedChoiceKeys ?? [],
  });
  const slots = [prompt.self, prompt.guess, ...(prompt.need ? [prompt.need] : [])];
  const slotComplete = (slot: ReadMyMindOwnSlot) => {
    if (slot.lockedAt) return true;
    const count = selections[slot.responseType]?.length ?? 0;
    return count >= slot.contract.minSelections && count <= slot.contract.maxSelections;
  };
  const selfComplete = slotComplete(prompt.self);
  const guessComplete = slotComplete(prompt.guess);
  const allLocked = slots.every((slot) => Boolean(slot.lockedAt));
  const complete = slots.every((slot) => {
    return slotComplete(slot);
  });
  return (
    <form action={action} className="mt-6 grid gap-5">
      <ChoiceGroup tone="self" legend={selfLegend} slot={prompt.self} locale={locale} labels={labels} selected={selections.self ?? []} setSelected={(choices) => setSelections((current) => ({ ...current, self: choices }))} />
      <div className={`rmm-perspective-shift flex items-center gap-4 px-2 py-1 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${selfComplete ? "opacity-100" : "translate-y-1 opacity-45"}`} aria-hidden={!selfComplete}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f3dca0] bg-[#fdecc8] text-sm font-semibold text-[#5c3200]">{partnerName.trim().charAt(0).toLocaleUpperCase() || "·"}</span>
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a4300]">{labels.perspectiveShift}</p><p className="mt-0.5 text-sm font-medium text-[#33325e]">{labels.perspectiveShiftText}</p></div>
      </div>
      <ChoiceGroup tone="guess" enabled={selfComplete} legend={guessLegend} slot={prompt.guess} locale={locale} labels={labels} selected={selections.guess ?? []} setSelected={(choices) => setSelections((current) => ({ ...current, guess: choices }))} />
      {prompt.need ? <ChoiceGroup tone="need" enabled={selfComplete && guessComplete} legend={needLegend} slot={prompt.need} locale={locale} labels={labels} selected={selections.need ?? []} setSelected={(choices) => setSelections((current) => ({ ...current, need: choices }))} /> : null}
      <div className="rounded-xl bg-[#fff8e6] px-4 py-3 text-sm text-[#5c3200]">
        <p>{labels.lockWarning}</p>
      </div>
      <SubmitButton labels={labels} disabled={!complete || allLocked} />
    </form>
  );
}
