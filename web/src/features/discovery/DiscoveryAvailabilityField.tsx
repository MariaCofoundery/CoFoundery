"use client";

import { useState } from "react";

type Option = { value: string; label: string; hint: string };

/**
 * Obergrenze oder Jetzt-Stand - und die Bedingung dazu.
 *
 * Zwei Karten statt einer Skala. Eine Skala ("wie motiviert bist du?") waere
 * wertlos gewesen: Alle kreuzen das Hoechste an, und eine Angabe, bei der alle
 * dasselbe sagen, traegt keine Information.
 *
 * Diese Frage funktioniert, weil beide Antworten respektabel sind - die eine
 * schuetzt die Person, die andere sagt etwas ueber ihre Bereitschaft. Und die
 * zweite kostet etwas: Wer "ich wuerde mehr freimachen" waehlt, muss
 * dazusagen, WAS passieren muesste. "Ja, fuer das Richtige" ist billig; "wenn
 * wir eine Finanzierung haben, gehe ich im Job auf 30 Stunden runter" ist eine
 * Aussage, ueber die sich reden laesst.
 *
 * Das Feld klappt deshalb in derselben Karte auf, die es hervorgerufen hat -
 * dieselbe Loesung wie bei "Anderer Schwerpunkt".
 */
export function DiscoveryAvailabilityField({
  value,
  condition,
  options,
  copy,
}: {
  value: string | null;
  condition: string | null;
  options: Option[];
  copy: { conditionLabel: string; conditionPlaceholder: string; conditionHint: string };
}) {
  const [selected, setSelected] = useState<string | null>(value);

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = selected === option.value;
        const expands = option.value === "would_expand" && checked;
        return (
          <div
            key={option.value}
            className={`rounded-2xl border transition ${expands ? "sm:col-span-2" : ""} ${
              checked
                ? "border-slate-900 bg-slate-900/[0.04]"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3 px-3 py-3 text-sm">
              <input
                type="radio"
                name="availabilityFlexibility"
                value={option.value}
                checked={checked}
                onChange={() => setSelected(option.value)}
                className="mt-1 h-4 w-4 border-slate-300"
              />
              <span>
                <span
                  className={`block ${checked ? "font-semibold text-slate-900" : "text-slate-700"}`}
                >
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{option.hint}</span>
              </span>
            </label>

            {expands ? (
              <div className="border-t border-slate-900/10 px-3 pb-3 pt-3">
                <label className="block text-sm font-medium text-slate-900">
                  {copy.conditionLabel}
                  <input
                    name="availabilityCondition"
                    required
                    minLength={10}
                    maxLength={200}
                    defaultValue={condition ?? ""}
                    placeholder={copy.conditionPlaceholder}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                  />
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {copy.conditionHint}
                  </span>
                </label>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
