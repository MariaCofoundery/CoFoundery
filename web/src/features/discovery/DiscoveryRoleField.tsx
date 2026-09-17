"use client";

import { useState } from "react";
import type { DiscoveryFounderRole } from "@/features/discovery/discoveryTypes";

type Copy = {
  limitReached: string;
  otherLabel: string;
  otherPlaceholder: string;
  otherHint: string;
  /**
   * Fertige Texte, einer je moeglicher Anzahl - der Index ist die Anzahl.
   *
   * KEINE Funktion: Diese Komponente laeuft im Browser, die Uebersetzung
   * liegt auf dem Server. Eine Funktion ueber diese Grenze zu reichen, laesst
   * React nicht zu - es wirft beim Rendern, und die Seite zeigt nur noch
   * "a server-side exception has occurred". Genau das ist hier passiert.
   */
  counterByCount: string[];
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
          const expands = option.value === "other" && checked;

          return (
            /* Die Karte ist ein div, nicht das label: Sonst wuerde ein Klick
               in das Textfeld darin das Ankreuzfeld umschalten - das label
               gilt ja fuer die Rolle. */
            <div
              key={option.value}
              className={`rounded-2xl border transition ${
                expands ? "sm:col-span-2 lg:col-span-3" : ""
              } ${
                checked
                  ? "border-slate-900 bg-slate-900/[0.04]"
                  : disabled
                    ? "border-slate-100 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <label
                className={`flex min-h-11 items-center gap-3 px-3 py-2 text-sm ${
                  checked
                    ? "font-medium text-slate-900"
                    : disabled
                      ? "cursor-not-allowed text-slate-400"
                      : "cursor-pointer text-slate-700"
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

              {/* Das Feld gehoert in dieselbe Karte, unter das Ankreuzfeld,
                  das es hervorgerufen hat. Darunter im Freien war nicht zu
                  erkennen, wozu es gehoert. */}
              {expands ? (
                <div className="border-t border-slate-900/10 px-3 pb-3 pt-3">
                  <label className="block text-sm font-medium text-slate-900">
                    {copy.otherLabel}
                    <input
                      name={otherName}
                      required
                      autoFocus
                      minLength={2}
                      maxLength={80}
                      defaultValue={initialOther ?? ""}
                      placeholder={copy.otherPlaceholder}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                    />
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {copy.otherHint}
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500" aria-live="polite">
        {copy.counterByCount[selected.length] ?? ""}
        {atLimit ? ` \u00b7 ${copy.limitReached}` : ""}
      </p>
    </div>
  );
}
