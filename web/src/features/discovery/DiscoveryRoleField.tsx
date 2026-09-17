"use client";

import { useState } from "react";
import type { DiscoveryFounderRole } from "@/features/discovery/discoveryTypes";

type Copy = {
  limitReached: string;
  otherLabel: string;
  otherPlaceholder: string;
  otherHint: string;
  counter: (selected: number, max: number) => string;
};

/**
 * Die Rollenauswahl.
 *
 * Zwei Dinge, die vorher fehlten:
 *
 *   "Anderer Schwerpunkt" sagte nichts. Wer ihn waehlte, stand im Profil mit
 *   genau dieser Floskel - die suchende Person sah, dass da etwas ist, aber
 *   nicht was. Jetzt klappt ein Feld auf, und es ist Pflicht: Wer "anderer"
 *   waehlt, soll sagen, welcher.
 *
 *   Die Obergrenze griff unsichtbar. Man konnte fuenf Rollen ankreuzen; beim
 *   Speichern fielen zwei weg, ohne ein Wort. Jetzt laesst sich die vierte
 *   nicht mehr anklicken, und daneben steht, wie viele von wie vielen gesetzt
 *   sind.
 */
export function DiscoveryRoleField({
  name,
  otherName,
  options,
  initialSelected,
  initialOther,
  max,
  copy,
}: {
  name: string;
  otherName: string;
  options: { value: DiscoveryFounderRole; label: string }[];
  initialSelected: DiscoveryFounderRole[];
  initialOther: string | null;
  max: number;
  copy: Copy;
}) {
  const [selected, setSelected] = useState<DiscoveryFounderRole[]>(initialSelected);
  const atLimit = selected.length >= max;
  const otherChosen = selected.includes("other");

  function toggle(value: DiscoveryFounderRole) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length >= max
          ? current
          : [...current, value]
    );
  }

  return (
    <div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          // Gesetzte bleiben immer anklickbar - sonst koennte man die Auswahl
          // am Limit nicht mehr aendern, nur noch aufgeben.
          const disabled = !checked && atLimit;
          return (
            <label
              key={option.value}
              className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                checked
                  ? "border-slate-900 bg-slate-900/[0.04] font-medium text-slate-900"
                  : disabled
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.value)}
                className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-2 focus:ring-slate-300"
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500" aria-live="polite">
        {copy.counter(selected.length, max)}
        {atLimit ? ` · ${copy.limitReached}` : ""}
      </p>

      {otherChosen ? (
        <label className="mt-3 block text-sm font-medium">
          {copy.otherLabel}
          <input
            name={otherName}
            required
            minLength={2}
            maxLength={80}
            defaultValue={initialOther ?? ""}
            placeholder={copy.otherPlaceholder}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">{copy.otherHint}</span>
        </label>
      ) : null}
    </div>
  );
}
