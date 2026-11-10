"use client";

import { useState } from "react";
import { VALUES_MAX, VALUES_MIN, VALUE_KEYS, type PersonValue, type ValueKey } from "@/features/values/valuesModel";

type Item = { id: string; key: ValueKey | "custom"; label: string; meaning: string };
type Copy = {
  count: string; hint: string; custom: string; customPlaceholder: string; customAdd: string; yourOrder: string; orderHint: string;
  meaning: string; up: string; down: string; remove: string; violated: string; violatedPlaceholder: string; save: string; saveNote: string;
  names: Record<ValueKey, string>;
};

let counter = 0;
const nextId = () => `v${++counter}`;

/**
 * Meine Werte (Entwurf 10.11.2026): waehlen, in eine eigene Reihenfolge ziehen (Maus) oder mit den Pfeilen (Tastatur) sortieren,
 * und je Wert in einem Satz sagen, was er heisst. Das Formular schickt die Liste in dieser Reihenfolge; die Reihenfolge ist die
 * Ordnung der Person - das Tool rechnet damit nichts aus.
 */
export function ValuesEditor({ initial, violated, copy, action }: { initial: PersonValue[]; violated: string; copy: Copy; action: (formData: FormData) => void | Promise<void> }) {
  const [items, setItems] = useState<Item[]>(() => initial.map((value) => ({ id: nextId(), key: value.key, label: value.label ?? "", meaning: value.meaning ?? "" })));
  const [custom, setCustom] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const full = items.length >= VALUES_MAX;
  const chosen = new Set(items.filter((item) => item.key !== "custom").map((item) => item.key));

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    setItems((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const toggle = (key: ValueKey) =>
    setItems((current) => (chosen.has(key) ? current.filter((item) => item.key !== key) : current.length >= VALUES_MAX ? current : [...current, { id: nextId(), key, label: "", meaning: "" }]));
  const addCustom = () => {
    const label = custom.trim().slice(0, 40);
    if (!label || full) return;
    setItems((current) => [...current, { id: nextId(), key: "custom", label, meaning: "" }]);
    setCustom("");
  };

  return (
    <form action={action} className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <b>{copy.count.replace("{count}", String(items.length)).replace("{max}", String(VALUES_MAX))}</b>
        <span className="text-slate-600">{copy.hint.replace("{min}", String(VALUES_MIN))}</span>
      </div>

      <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        {VALUE_KEYS.map((key) => {
          const on = chosen.has(key);
          return (
            <button key={key} type="button" aria-pressed={on} disabled={!on && full} onClick={() => toggle(key)} className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-[14.5px] font-semibold transition disabled:opacity-40 ${on ? "border-violet-600 bg-violet-50 text-slate-950" : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"}`}>
              {copy.names[key]}
            </button>
          );
        })}
        <span className="inline-flex items-center gap-2">
          <label className="sr-only" htmlFor="custom-value">{copy.custom}</label>
          <input id="custom-value" value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } }} maxLength={40} placeholder={copy.customPlaceholder} disabled={full} className="min-h-11 w-44 rounded-full border-[1.5px] border-dashed border-slate-400 bg-white px-4 text-sm disabled:opacity-40" />
          <button type="button" onClick={addCustom} disabled={full || !custom.trim()} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-violet-800 disabled:opacity-40">{copy.customAdd}</button>
        </span>
      </div>

      <section aria-labelledby="values-order" className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="values-order" className="text-lg font-bold text-slate-950">{copy.yourOrder}</h2>
        <ol className="grid gap-2">
          {items.map((item, index) => {
            const name = item.key === "custom" ? item.label : copy.names[item.key];
            return (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDragging(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging !== null) move(dragging, index);
                  setDragging(null);
                }}
                onDragEnd={() => setDragging(null)}
                className={`grid items-center gap-2.5 rounded-2xl border-[1.5px] border-slate-200 bg-white p-2.5 sm:grid-cols-[28px_36px_minmax(0,11rem)_minmax(0,1fr)_auto] ${dragging === index ? "opacity-50" : ""}`}
              >
                <input type="hidden" name="valueKey" value={item.key} />
                <input type="hidden" name="valueLabel" value={item.label} />
                <span aria-hidden="true" className="hidden cursor-grab select-none text-center text-xl text-slate-400 sm:block">⋮⋮</span>
                <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-violet-50 text-[14px] font-bold text-violet-900">{index + 1}</span>
                <b className="text-[15px]">{name}</b>
                <input name="valueMeaning" value={item.meaning} onChange={(event) => setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, meaning: event.target.value } : entry)))} maxLength={200} placeholder={copy.meaning} aria-label={`${name}: ${copy.meaning}`} className="min-h-11 w-full rounded-xl border-[1.5px] border-slate-300 px-3.5 text-[14.5px]" />
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`${name}: ${copy.up}`} className="h-11 w-11 rounded-xl border-[1.5px] border-slate-300 bg-white text-lg disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(index, index + 1)} disabled={index === items.length - 1} aria-label={`${name}: ${copy.down}`} className="h-11 w-11 rounded-xl border-[1.5px] border-slate-300 bg-white text-lg disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`${name}: ${copy.remove}`} className="h-11 w-11 rounded-xl text-lg text-slate-500 hover:text-rose-800">×</button>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-[12.5px] leading-5 text-slate-600">{copy.orderHint}</p>
      </section>

      <label className="grid gap-1.5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <span className="text-[15px] font-bold text-slate-950">{copy.violated}</span>
        <textarea name="violated" rows={2} maxLength={300} defaultValue={violated} placeholder={copy.violatedPlaceholder} className="rounded-xl border-[1.5px] border-slate-300 px-3.5 py-2.5 text-[14.5px]" />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="inline-flex min-h-12 items-center rounded-xl bg-[#6D49E0] px-7 text-[15px] font-semibold text-white">{copy.save}</button>
        <span className="text-[13px] text-slate-600">{copy.saveNote}</span>
      </div>
    </form>
  );
}
