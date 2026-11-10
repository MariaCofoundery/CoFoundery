"use client";

import { useState } from "react";
import { SubmitButton } from "@/features/ui/SubmitButton";
import type { Door } from "@/features/connect/doors/doorCatalog";

export type DoorFormCopy = {
  step1: string; step1b: string; step2: string; regionPlaceholder: string; sector: string; sectorNone: string; step3: string; note: string; noteHint: string;
  otherLabel: string; pickType: string; save: string; cancel: string; otherTypeLabel: string;
  closeness: { key: string; label: string; text: string }[];
  groups: { key: string; label: string; types: { key: string; label: string }[] }[];
  sectors: { key: string; label: string }[];
};

const CHIP = "inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-[13.5px] font-semibold text-slate-950";
const FIELD = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal";

/**
 * Eine Tuer anlegen oder aendern (Entwurf 10.11.2026): Funktion, dann Art von Mensch, dann Ort, Branche und Naehe. Die Auswahl steht
 * in versteckten Feldern; abgeschickt wird mit der Serverfunktion. Ohne gewaehlte Art bleibt der Knopf gesperrt.
 */
export function DoorForm({ copy, initial, action, onCancelHref }: { copy: DoorFormCopy; initial?: Door | null; action: (formData: FormData) => void | Promise<void>; onCancelHref: string }) {
  const initialGroup = initial ? (initial.typeKey === "other" ? "other" : copy.groups.find((group) => group.types.some((type) => type.key === initial.typeKey))?.key ?? null) : null;
  const [group, setGroup] = useState<string | null>(initialGroup);
  const [type, setType] = useState<string | null>(initial?.typeKey ?? null);
  const [closeness, setCloseness] = useState<string>(initial?.closeness ?? "introduce");
  const current = copy.groups.find((entry) => entry.key === group) ?? null;
  const ready = Boolean(type) && closeness !== "";
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-violet-200 bg-white p-5">
      {initial ? <input type="hidden" name="doorId" value={initial.id} /> : null}
      <input type="hidden" name="type" value={type ?? ""} />
      <input type="hidden" name="closeness" value={closeness} />
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">{copy.step1}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {copy.groups.map((entry) => (
            <button key={entry.key} type="button" aria-pressed={group === entry.key} onClick={() => { setGroup(entry.key); setType(null); }} className={`${CHIP} ${group === entry.key ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>{entry.label}</button>
          ))}
          <button type="button" aria-pressed={group === "other"} onClick={() => { setGroup("other"); setType("other"); }} className={`${CHIP} border-dashed ${group === "other" ? "border-violet-600 bg-violet-50" : "border-slate-300 bg-white text-violet-800 hover:bg-slate-50"}`}>{copy.otherTypeLabel}</button>
        </div>
      </fieldset>
      {current ? (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">{copy.step1b}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {current.types.map((entry) => (
              <button key={entry.key} type="button" aria-pressed={type === entry.key} onClick={() => setType(entry.key)} className={`${CHIP} ${type === entry.key ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>{entry.label}</button>
            ))}
          </div>
        </fieldset>
      ) : group === "other" ? (
        <label className="block text-sm font-semibold text-slate-900">{copy.otherLabel}<input name="otherLabel" required maxLength={60} defaultValue={initial?.otherLabel ?? ""} className={FIELD} /></label>
      ) : (
        <p className="text-sm text-slate-700">{copy.pickType}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-900">{copy.step2}<input name="region" maxLength={60} defaultValue={initial?.region ?? ""} placeholder={copy.regionPlaceholder} className={FIELD} /></label>
        <label className="block text-sm font-semibold text-slate-900">{copy.sector}
          <select name="sector" defaultValue={initial?.sectorKey ?? ""} className={FIELD}><option value="">{copy.sectorNone}</option>{copy.sectors.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select>
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">{copy.step3}</legend>
        <div className="mt-2 grid gap-2">
          {copy.closeness.map((entry) => (
            <button key={entry.key} type="button" aria-pressed={closeness === entry.key} onClick={() => setCloseness(entry.key)} className={`flex min-h-12 flex-col rounded-xl border-[1.5px] px-4 py-2 text-left ${closeness === entry.key ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <b className="text-[14.5px] text-slate-950">{entry.label}</b><span className="text-[13px] text-slate-700">{entry.text}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold text-slate-900">{copy.note}
        <input name="note" maxLength={140} defaultValue={initial?.note ?? ""} className={FIELD} />
        <span className="mt-1.5 block rounded-xl bg-amber-50 px-3 py-2 text-xs font-normal leading-5 text-amber-900">{copy.noteHint}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        {ready ? <SubmitButton label={copy.save} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B36D6]" /> : <span className="inline-flex min-h-11 items-center rounded-xl bg-slate-200 px-5 text-sm font-semibold text-slate-600" aria-disabled="true">{copy.save}</span>}
        <a href={onCancelHref} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-slate-700">{copy.cancel}</a>
      </div>
    </form>
  );
}
