"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { FounderInTheWildPromptState } from "./founderInTheWildModel";

function Submit({ label, pendingLabel, disabled }: { label: string; pendingLabel: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="min-h-12 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:bg-slate-300">{pending ? pendingLabel : label}</button>;
}

export function FounderInTheWildPromptForm({ prompt, locale, action, labels }: { prompt: FounderInTheWildPromptState; locale: "de" | "en"; action: (data: FormData) => void | Promise<void>; labels: { move: string; matters: string; mattersHint: string; need: string; lock: string; locking: string; warning: string } }) {
  const [move, setMove] = useState(prompt.move.choiceKeys ?? []);
  const [matters, setMatters] = useState(prompt.matters.choiceKeys ?? []);
  const [need, setNeed] = useState(prompt.need.choiceKeys ?? []);
  const group = (name: "move" | "matters" | "need", legend: string, choices: readonly { key: string; label: { de: string; en: string } }[], selected: string[], setSelected: (keys: string[]) => void) => {
    const multi = name === "matters";
    return <fieldset className="rounded-2xl border border-slate-200 bg-white p-5"><legend className="px-1 text-lg font-semibold text-slate-950">{legend}</legend>{multi ? <p id="matters-hint" className="mt-1 text-sm text-slate-600">{labels.mattersHint}</p> : null}<div className="mt-4 grid gap-3">{choices.map((choice) => { const checked = selected.includes(choice.key); const disabled = multi && selected.length === 2 && !checked; return <label key={choice.key} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm leading-6 focus-within:ring-2 focus-within:ring-violet-500 ${checked ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-white"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}><input type={multi ? "checkbox" : "radio"} name={name} value={choice.key} checked={checked} disabled={disabled} aria-describedby={multi ? "matters-hint" : undefined} onChange={() => setSelected(multi ? checked ? selected.filter((key) => key !== choice.key) : [...selected, choice.key] : [choice.key])} className="h-4 w-4 accent-violet-700"/><span className="flex-1">{choice.label[locale]}</span>{checked ? <span aria-hidden="true">✓</span> : null}</label>; })}</div></fieldset>;
  };
  const complete = move.length === 1 && matters.length >= 1 && matters.length <= 2 && need.length === 1;
  return <form action={action} className="mt-6 grid gap-5">
    {group("move", labels.move, prompt.content.moves, move, setMove)}
    {group("matters", labels.matters, prompt.content.matters, matters, setMatters)}
    {group("need", labels.need, prompt.content.needs, need, setNeed)}
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{labels.warning}</p>
    <Submit label={labels.lock} pendingLabel={labels.locking} disabled={!complete || prompt.complete}/>
  </form>;
}
