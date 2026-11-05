"use client";

import { useState } from "react";

/**
 * Eine Auswahl als Knoepfe zum Antippen statt einer Liste (Entwurf 05.11.2026: "Wer kuemmert sich?",
 * "Bis wann?"). Der Wert geht als verstecktes Feld mit dem Formular. Ein zweites Tippen auf den gewaehlten
 * Knopf hebt die Wahl auf, wenn `allowEmpty`. Mit `customDate` gibt es zuletzt "Datum …" mit einem Datumsfeld.
 */
export function ChipChoice({
  name,
  label,
  options,
  defaultValue,
  allowEmpty = false,
  customDate,
  disabled = false,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  allowEmpty?: boolean;
  customDate?: { label: string; inputLabel: string };
  disabled?: boolean;
}) {
  const known = options.some((option) => option.value === defaultValue);
  const [value, setValue] = useState(defaultValue);
  const [custom, setCustom] = useState(Boolean(customDate && defaultValue && !known));
  const chip = (on: boolean) =>
    `inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm transition ${
      on ? "border-violet-500 bg-violet-50 font-semibold text-violet-900" : "border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50"
    }`;
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = !custom && value === option.value;
          return (
            <button
              key={option.value || "empty"}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => {
                setCustom(false);
                setValue(on && allowEmpty ? "" : option.value);
              }}
              className={chip(on)}
            >
              {option.label}
            </button>
          );
        })}
        {customDate ? (
          <button type="button" aria-pressed={custom} disabled={disabled} onClick={() => setCustom((current) => !current)} className={chip(custom)}>
            {customDate.label}
          </button>
        ) : null}
      </div>
      {customDate && custom ? (
        <label className="mt-2 block max-w-56">
          <span className="sr-only">{customDate.inputLabel}</span>
          <input type="date" value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]" />
        </label>
      ) : null}
    </div>
  );
}

/**
 * Mehrere waehlbar (Teamraum: "Wer kuemmert sich?" - seit 20270322120000 bis zu sechs Personen). Jede gewaehlte
 * Person geht als eigenes Feld gleichen Namens mit. `noneLabel` hebt alle auf ("Noch offen").
 */
export function ChipMultiChoice({
  name,
  label,
  options,
  defaultValues,
  noneLabel,
  max,
  disabled = false,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValues: string[];
  noneLabel: string;
  max: number;
  disabled?: boolean;
}) {
  const [values, setValues] = useState(defaultValues);
  const chip = (on: boolean) =>
    `inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm transition ${
      on ? "border-violet-500 bg-violet-50 font-semibold text-violet-900" : "border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50"
    } disabled:opacity-50`;
  return (
    <div>
      {values.map((value) => <input key={value} type="hidden" name={name} value={value} />)}
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              disabled={disabled || (!on && values.length >= max)}
              onClick={() => setValues((current) => (on ? current.filter((value) => value !== option.value) : [...current, option.value]))}
              className={chip(on)}
            >
              {option.label}
            </button>
          );
        })}
        <button type="button" aria-pressed={values.length === 0} disabled={disabled} onClick={() => setValues([])} className={chip(values.length === 0)}>
          {noneLabel}
        </button>
      </div>
    </div>
  );
}
