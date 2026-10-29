"use client";

import { useState } from "react";
import type { DiscoveryFounderRole } from "@/features/discovery/discoveryTypes";
import { FOCUS_HUES, FOCUS_ICONS } from "@/features/profile/journey/focusVisuals";

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
  /** Beschriftung des Aufklappers unter einer Rolle ("Was gehoert dazu?"). */
  whatBelongs: string;
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
  partName,
  options,
  initialSelected,
  initialParts,
  initialOther,
  max,
  copy,
}: {
  name: string;
  otherName: string;
  /** Name der versteckten Felder fuer die gewaehlten Unterbereiche. */
  partName: string;
  initialParts: string[];
  /** `parts` sind die waehlbaren Unterbereiche (Kennung + Beschriftung); gespeichert wird die Kennung. */
  options: { value: DiscoveryFounderRole; label: string; help?: string; parts?: { id: string; label: string }[] }[];
  initialSelected: DiscoveryFounderRole[];
  initialOther: string | null;
  max: number;
  copy: Copy;
}) {
  const [selected, setSelected] = useState<DiscoveryFounderRole[]>(initialSelected);
  const [parts, setParts] = useState<string[]>(initialParts);
  const atLimit = selected.length >= max;
  // Immer nur eine Erklaerung offen: Wer die naechste aufklappt, schliesst die vorige.
  const [openOne, setOpenOne] = useState<DiscoveryFounderRole | null>(null);

  function toggle(value: DiscoveryFounderRole) {
    if (selected.includes(value)) {
      // Wer Product abwaehlt, verliert auch dessen Unterbereiche.
      setParts((current) => current.filter((id) => !id.startsWith(`${value}.`)));
      setOpenOne((open) => (open === value ? null : open));
    }
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length >= max
          ? current
          : [...current, value]
    );
  }

  function togglePart(id: string) {
    setParts((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div>
      {/* Gespeichert wird die Kennung, nur zu gewaehlten Rollen. */}
      {parts
        .filter((id) => selected.includes(id.split(".")[0] as DiscoveryFounderRole))
        .map((id) => (
          <input key={id} type="hidden" name={partName} value={id} />
        ))}
      <div className="mt-3 grid gap-2.5">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          // Gesetzte bleiben immer anklickbar - sonst koennte man die Auswahl
          // am Limit nicht mehr aendern, nur noch aufgeben.
          const disabled = !checked && atLimit;
          const expands = option.value === "other" && checked;

          const hue = FOCUS_HUES[option.value] ?? FOCUS_HUES.other;
          const open = openOne === option.value;
          const pickedCount = parts.filter((id) => id.startsWith(`${option.value}.`)).length;

          return (
            /* Die Karte ist ein div, nicht das label: Sonst wuerde ein Klick
               in das Textfeld darin das Ankreuzfeld umschalten - das label
               gilt ja fuer die Rolle. */
            <div
              key={option.value}
              style={checked ? { borderColor: hue } : undefined}
              className={`overflow-hidden rounded-[1.15rem] border-[1.5px] transition ${
                checked
                  ? "bg-white"
                  : disabled
                    ? "border-slate-100 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <label
                className={`grid grid-cols-[2.6rem_1fr_1.75rem] items-center gap-3 p-3 ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } focus-within:ring-2 focus-within:ring-violet-500`}
              >
                <span
                  aria-hidden="true"
                  className="grid h-[2.6rem] w-[2.6rem] place-items-center rounded-xl"
                  style={{ background: checked ? hue : `${hue}22`, color: checked ? "#fff" : hue }}
                >
                  <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem] fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={FOCUS_ICONS[option.value] ?? FOCUS_ICONS.other} />
                  </svg>
                </span>
                <span className="grid gap-0.5">
                  <strong className="text-[0.95rem] text-slate-950">{option.label}</strong>
                  {option.help ? <span className="text-[0.8rem] font-medium leading-snug text-slate-500">{option.help}</span> : null}
                </span>
                {/* Das Ankreuzfeld bleibt ein echtes Feld (wird mitgeschickt, per Tastatur erreichbar); gezeigt wird der Haken. */}
                <input
                  type="checkbox"
                  name={name}
                  value={option.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid h-7 w-7 place-items-center rounded-full border-2 transition ${checked ? "text-white" : "border-slate-300 text-transparent"}`}
                  style={checked ? { background: hue, borderColor: hue } : undefined}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
              </label>

              {/* Unterbereiche: waehlbar, gespeichert als Kennungen. Immer nur eine Karte offen. */}
              {option.parts && option.parts.length > 0 ? (
                <>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenOne((current) => (current === option.value ? null : option.value))}
                    className="ml-[4.35rem] inline-flex min-h-9 items-center pb-1 text-xs font-bold text-violet-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    {copy.whatBelongs}{pickedCount > 0 ? ` \u00b7 ${pickedCount}` : ""} {open ? "\u25B4" : "\u25BE"}
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 px-3 pb-4 pl-[4.35rem]">
                        {option.parts.map((part) => {
                          const picked = parts.includes(part.id);
                          return (
                            <button
                              key={part.id}
                              type="button"
                              tabIndex={open ? 0 : -1}
                              aria-pressed={picked}
                              onClick={() => togglePart(part.id)}
                              className={`min-h-9 rounded-[10px] border-[1.5px] px-3 text-[0.82rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                                picked ? "text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                              }`}
                              style={picked ? { background: hue, borderColor: hue } : undefined}
                            >
                              {part.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {/* Das Feld gehoert in dieselbe Karte, unter das Ankreuzfeld,
                  das es hervorgerufen hat. */}
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
