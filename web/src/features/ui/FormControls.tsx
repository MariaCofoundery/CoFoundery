"use client";

import { useState } from "react";

/**
 * Bausteine der neuen Formulare (Entwurf 05.11.2026): Umschalter statt Auswahlliste, Schalter statt Haekchen,
 * Felder als ruhige Kacheln. Alles sind echte Knoepfe und Felder - mit Tastatur und Vorleser bedienbar - und der Wert
 * geht als verstecktes Feld mit dem Formular, damit es auch ohne Skript als normales Formular funktioniert.
 */

export const TILE = "flex flex-col gap-0.5 rounded-[14px] bg-[#F4F5FB] px-3 py-2 focus-within:ring-2 focus-within:ring-violet-500";
export const TILE_LABEL = "text-xs font-semibold text-slate-600";
export const TILE_INPUT = "min-w-0 border-0 bg-transparent p-0 text-[15px] font-semibold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-500";
export const SECTION_TITLE = "flex items-center gap-2 text-[15px] font-bold text-slate-950";

/** Zwei bis vier Moeglichkeiten in einer Leiste; eine ist gewaehlt. */
export function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`grid gap-1 rounded-[14px] bg-[#F0F1F7] p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <input type="hidden" name={name} value={value} />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-10 rounded-[10px] px-2 text-sm font-semibold transition ${value === option.value ? "bg-white text-slate-950 shadow-[0_1px_3px_rgba(23,23,58,0.14)]" : "text-slate-700 hover:text-slate-950"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Ein Schalter mit Text. `name` und `on`/`off` bestimmen, was mit dem Formular geht. */
export function Switch({
  name,
  label,
  hint,
  checked,
  onChange,
  on = "yes",
  off = "no",
  disabled = false,
  icon,
  tone = "violet",
}: {
  name?: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  on?: string;
  off?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  tone?: "violet" | "sky" | "pink" | "green";
}) {
  const bg = { violet: "bg-violet-100 text-violet-800", sky: "bg-sky-100 text-sky-800", pink: "bg-pink-100 text-pink-800", green: "bg-emerald-100 text-emerald-800" }[tone];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:opacity-60"
    >
      {name ? <input type="hidden" name={name} value={checked ? on : off} /> : null}
      {icon ? <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${bg}`}>{icon}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold text-slate-950">{label}</span>
        {hint ? <span className="text-[12.5px] leading-[1.4] text-slate-600">{hint}</span> : null}
      </span>
      <span aria-hidden="true" className={`relative h-[26px] w-11 shrink-0 rounded-full transition ${checked ? "bg-[#6D49E0]" : "bg-slate-400"}`}>
        <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[21px]" : "left-[3px]"}`} />
      </span>
    </button>
  );
}

/** Ein Feld, das erst auf Wunsch erscheint ("+ Interne Notiz"). Hat es schon einen Wert, steht es offen. */
export function OptionalField({ label, children, startOpen }: { label: string; children: React.ReactNode; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  if (open) return <>{children}</>;
  return (
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center rounded-xl border-[1.5px] border-dashed border-slate-300 px-3.5 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50">
      + {label}
    </button>
  );
}
