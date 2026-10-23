"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { FounderInTheWildPromptState } from "./founderInTheWildModel";

function Submit({ label, pendingLabel, disabled }: { label: string; pendingLabel: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="min-h-12 rounded-xl brand-cta px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] disabled:bg-[#d8d5ea]">{pending ? pendingLabel : label}</button>;
}

export function FounderInTheWildPromptForm({ prompt, locale, action, labels }: { prompt: FounderInTheWildPromptState; locale: "de" | "en"; action: (data: FormData) => void | Promise<void>; labels: { move: string; matters: string; mattersHint: string; need: string; guess: string; guessHint: string; lock: string; locking: string; warning: string } }) {
  const [move, setMove] = useState(prompt.move.choiceKeys ?? []);
  const [matters, setMatters] = useState(prompt.matters.choiceKeys ?? []);
  const [need, setNeed] = useState(prompt.need.choiceKeys ?? []);
  const [guess, setGuess] = useState(prompt.guess?.choiceKeys ?? []);
  const group = (name: "move" | "matters" | "need" | "guess", legend: string, choices: readonly { key: string; label: { de: string; en: string } }[], selected: string[], setSelected: (keys: string[]) => void) => {
    const multi = name === "matters";
    return <fieldset className="rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-7"><legend className="px-1 text-lg font-semibold text-[#0b1f3a]">{legend}</legend>{multi ? <p id="matters-hint" className="mt-1 text-sm text-[#5f5e7a]">{labels.mattersHint}</p> : null}<div className="mt-4 grid gap-3">{choices.map((choice) => { const checked = selected.includes(choice.key); const disabled = multi && selected.length === 2 && !checked; return <label key={choice.key} className={`flex min-h-14 cursor-pointer items-center gap-3.5 rounded-[18px] border-2 px-[18px] py-4 text-[15px] leading-6 focus-within:ring-2 focus-within:ring-[#6d49e0] ${checked ? "border-[#6d49e0] bg-[#f5f2fe] shadow-[0_0_0_4px_rgba(109,73,224,0.10)]" : "border-[#e4e2f0] bg-white hover:border-[#d9cff8]"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}><input type={multi ? "checkbox" : "radio"} name={name} value={choice.key} checked={checked} disabled={disabled} aria-describedby={multi ? "matters-hint" : undefined} onChange={() => setSelected(multi ? checked ? selected.filter((key) => key !== choice.key) : [...selected, choice.key] : [choice.key])} className="h-[22px] w-[22px] accent-[#6d49e0]"/><span className="flex-1 font-semibold">{choice.label[locale]}</span>{checked ? <span aria-hidden="true">✓</span> : null}</label>; })}</div></fieldset>;
  };
  const complete =
    move.length === 1 && matters.length >= 1 && matters.length <= 2 && need.length === 1
    && (!prompt.guess || guess.length === 1);
  return <form action={action} className="mt-6 grid gap-5">
    {group("move", labels.move, prompt.content.moves, move, setMove)}
    {/* Der Tipp steht DIREKT hinter dem eigenen Zug und laeuft auf denselben
        Moeglichkeiten - so sieht man beim Raten noch, wofuer man sich selbst
        entschieden hat. Nur in Packs, die ihn haben. */}
    {prompt.guess ? (
      <div className="rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-1">
        {group("guess", labels.guess, prompt.content.moves, guess, setGuess)}
        <p className="px-5 pb-4 text-sm leading-6 text-[#3a2394]">{labels.guessHint}</p>
      </div>
    ) : null}
    {group("matters", labels.matters, prompt.content.matters, matters, setMatters)}
    {group("need", labels.need, prompt.content.needs, need, setNeed)}
    <p className="rounded-xl bg-[#f7f6fb] px-4 py-3 text-[13.5px] text-[#5f5e7a]">{labels.warning}</p>
    <Submit label={labels.lock} pendingLabel={labels.locking} disabled={!complete || prompt.complete}/>
  </form>;
}
