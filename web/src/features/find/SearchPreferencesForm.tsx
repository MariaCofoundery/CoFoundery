"use client";

import { useRef, useState, useTransition } from "react";

import { saveDiscoveryPreferences } from "@/features/find/preferenceActions";
import type { ThemePreference } from "@/features/find/discoveryMatch";
import { DIRECTIONS, type Direction, type Importance } from "@/features/find/discoveryThemes";

type ThemeCopy = { title: string; text: string };

export type SearchPreferencesCopy = {
  directionLabel: string;
  importanceLabel: string;
  directions: Record<Direction, string>;
  importances: Record<"1" | "2" | "3", string>;
  themes: Record<string, ThemeCopy>;
  save: string;
  saving: string;
  saved: string;
  saveFailed: string;
  changeLater: string;
};

/**
 * Die sechs Themen der Suche — Richtung und Gewicht.
 *
 * ---------------------------------------------------------------------------
 * DIE WICHTIGKEIT ERSCHEINT ERST, WENN SIE EINE BEDEUTUNG HAT
 * ---------------------------------------------------------------------------
 *
 * „Ist mir egal" und daneben „sehr wichtig" wären zwei Angaben, die sich
 * widersprechen. Die Spec sagt es in Abschnitt 7: die zweite Frage nur
 * anzeigen, wenn nicht „egal" gewählt ist. Die Datenbank weist den
 * Widerspruch zusätzlich ab — hier kann er gar nicht erst entstehen.
 *
 * ---------------------------------------------------------------------------
 * ES IST KEIN TEST UND KEIN ABSCHLUSS
 * ---------------------------------------------------------------------------
 *
 * Kein „Absenden", kein Punkt, ab dem nichts mehr geht. Ein Knopf, der
 * speichert, und darunter der Satz, dass man es jederzeit ändern kann
 * (Abschnitt 26).
 */
export function SearchPreferencesForm({
  themeIds,
  initial,
  copy,
}: {
  themeIds: readonly string[];
  initial: readonly ThemePreference[];
  copy: SearchPreferencesCopy;
}) {
  const [state, setState] = useState<Record<string, { direction: Direction; importance: Importance }>>(
    () =>
      Object.fromEntries(
        themeIds.map((themeId) => {
          const vorhanden = initial.find((entry) => entry.themeId === themeId);
          return [
            themeId,
            {
              direction: vorhanden?.direction ?? "neutral",
              importance: vorhanden?.importance ?? 0,
            },
          ];
        }),
      ),
  );
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();

  /**
   * Die Messung für den Pretest — Abschnitt 29.
   *
   * Je Thema: wie oft jemand es geändert hat, bevor er gespeichert hat, und
   * wie lange er ab der ersten Berührung gebraucht hat. Beides sagt etwas
   * darüber, ob eine Frage klar ist: Wer dreimal umentscheidet, hat sie
   * anders gelesen als beim ersten Mal.
   *
   * Im `ref` und nicht im Zustand: Es soll nichts neu zeichnen. Eine Messung,
   * die den gemessenen Vorgang beeinflusst, misst am Ende sich selbst.
   */
  const messung = useRef<Record<string, { changes: number; seit: number }>>({});
  const notiere = (themeId: string) => {
    const vorher = messung.current[themeId];
    messung.current[themeId] = {
      changes: (vorher?.changes ?? 0) + 1,
      seit: vorher?.seit ?? Date.now(),
    };
  };

  const setDirection = (themeId: string, direction: Direction) => {
    notiere(themeId);
    setState((current) => ({
      ...current,
      [themeId]: {
        direction,
        // „Egal" hat kein Gewicht; wer sich umentscheidet, fängt bei
        // „eher wichtig" an, statt eine Null stehen zu lassen, die die
        // Speicherung wieder auf „egal" zurückdrehen würde.
        importance:
          direction === "neutral" ? 0 : current[themeId].importance === 0 ? 1 : current[themeId].importance,
      },
    }));
  };

  const setImportance = (themeId: string, importance: Importance) => {
    notiere(themeId);
    setState((current) => ({ ...current, [themeId]: { ...current[themeId], importance } }));
  };

  return (
    <div className="space-y-4">
      {themeIds.map((themeId) => {
        const gewaehlt = state[themeId];
        const text = copy.themes[themeId];
        return (
          <section
            key={themeId}
            className="rounded-2xl border border-slate-200 bg-white p-5"
            aria-labelledby={`thema-${themeId}`}
          >
            <h3 id={`thema-${themeId}`} className="text-base font-semibold text-slate-900">
              {text?.title ?? themeId}
            </h3>
            {text?.text && <p className="mt-1 text-sm leading-7 text-slate-600">{text.text}</p>}

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-slate-900">{copy.directionLabel}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIRECTIONS.map((direction) => (
                  <label
                    key={direction}
                    className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm ${
                      gewaehlt.direction === direction
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`direction-${themeId}`}
                      className="sr-only"
                      checked={gewaehlt.direction === direction}
                      onChange={() => setDirection(themeId, direction)}
                    />
                    {copy.directions[direction]}
                  </label>
                ))}
              </div>
            </fieldset>

            {gewaehlt.direction !== "neutral" && (
              <fieldset className="mt-4 border-t border-slate-100 pt-4">
                <legend className="text-sm font-medium text-slate-900">
                  {copy.importanceLabel}
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([1, 2, 3] as const).map((importance) => (
                    <label
                      key={importance}
                      className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm ${
                        gewaehlt.importance === importance
                          ? "border-slate-900 bg-slate-100 text-slate-900"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`importance-${themeId}`}
                        className="sr-only"
                        checked={gewaehlt.importance === importance}
                        onChange={() => setImportance(themeId, importance)}
                      />
                      {copy.importances[String(importance) as "1" | "2" | "3"]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setStatus("idle");
              const jetzt = Date.now();
              const result = await saveDiscoveryPreferences(
                themeIds.map((themeId) => ({ themeId, ...state[themeId] })),
                Object.entries(messung.current).map(([themeId, gemessen]) => ({
                  themeId,
                  changes: gemessen.changes,
                  durationMs: jetzt - gemessen.seit,
                })),
              );
              setStatus(result.ok ? "saved" : "error");
            })
          }
        >
          {pending ? copy.saving : copy.save}
        </button>
        {status === "saved" && <span className="text-sm text-slate-600">{copy.saved}</span>}
        <span className="text-sm text-slate-500">{copy.changeLater}</span>
      </div>

      {status === "error" && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {copy.saveFailed}
        </p>
      )}
    </div>
  );
}
