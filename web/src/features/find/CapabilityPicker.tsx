"use client";

import { useMemo, useState } from "react";

export type PickerArea = { areaId: string; familyId: string; label: string };
export type PickerFamily = { familyId: string; label: string };

export type CapabilityPickerCopy = {
  searchPlaceholder: string;
  showAll: string;
  hideAll: string;
  noMatch: string;
  selected: string;
  /**
   * Die Beschriftung zum Entfernen, mit `{label}` als Platzhalter.
   *
   * KEINE FUNKTION. Diese Datei läuft im Browser; eine Funktion aus einem
   * Servermodul käme dort nie an. Deshalb kommt der Satz als Text herüber und
   * der Name wird hier eingesetzt.
   */
  removeTemplate: string;
  limitReached: string;
};

/**
 * „Was soll die Person mitbringen?"
 *
 * ---------------------------------------------------------------------------
 * KEINE CHECKBOX-WAND
 * ---------------------------------------------------------------------------
 *
 * Es gibt 54 Bereiche in elf Familien. Alle gleichzeitig offen hinzustellen
 * heißt: niemand liest sie, alle haken das an, was oben steht, und die
 * Auswahl sagt am Ende nichts. Die FIND-Spec, Abschnitt 5.2: „Die aktuelle
 * lange Checkbox-Wand soll UX-seitig reduziert werden."
 *
 * Deshalb ein Suchfeld, darunter die gewählten als Chips, und die Familien
 * erst auf Wunsch. Wer weiß, was er sucht, tippt; wer stöbern will, klappt
 * auf.
 *
 * ---------------------------------------------------------------------------
 * DIE DATEN BLEIBEN, NUR DIE DARSTELLUNG WIRD KOMPAKTER
 * ---------------------------------------------------------------------------
 *
 * Dieselben Bereichskennungen wie im Fähigkeiten-Interview — gesucht wird
 * gegen das, was Menschen dort eingetragen haben. Kein zweites Vokabular.
 */
export function CapabilityPicker({
  areas,
  families,
  initial,
  max,
  copy,
}: {
  areas: readonly PickerArea[];
  families: readonly PickerFamily[];
  initial: readonly string[];
  max: number;
  copy: CapabilityPickerCopy;
}) {
  const [selected, setSelected] = useState<string[]>(() =>
    initial.filter((areaId) => areas.some((area) => area.areaId === areaId)),
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const labelOf = useMemo(
    () => new Map(areas.map((area) => [area.areaId, area.label])),
    [areas],
  );

  const treffer = useMemo(() => {
    const gesucht = query.trim().toLowerCase();
    if (!gesucht) return [];
    return areas
      .filter((area) => area.label.toLowerCase().includes(gesucht))
      .filter((area) => !selected.includes(area.areaId))
      .slice(0, 8);
  }, [areas, query, selected]);

  const voll = selected.length >= max;

  const toggle = (areaId: string) =>
    setSelected((current) =>
      current.includes(areaId)
        ? current.filter((entry) => entry !== areaId)
        : current.length >= max
          ? current
          : [...current, areaId],
    );

  return (
    <div>
      {/* Die Auswahl reist als verstecktes Feld mit — dasselbe Formular, das
          auch die praktischen Kriterien speichert. Zwei Formulare wuerden
          einander beim Speichern loeschen. */}
      {selected.map((areaId) => (
        <input key={areaId} type="hidden" name="requiredCapabilityAreasAny" value={areaId} />
      ))}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={copy.searchPlaceholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
      />

      {query.trim() && (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2">
          {treffer.length === 0 ? (
            <p className="px-2 py-1 text-sm text-slate-500">{copy.noMatch}</p>
          ) : (
            <ul className="space-y-1">
              {treffer.map((area) => (
                <li key={area.areaId}>
                  <button
                    type="button"
                    disabled={voll}
                    onClick={() => {
                      toggle(area.areaId);
                      setQuery("");
                    }}
                    className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    + {area.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {copy.selected}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map((areaId) => (
              <button
                key={areaId}
                type="button"
                onClick={() => toggle(areaId)}
                aria-label={copy.removeTemplate.replace("{label}", labelOf.get(areaId) ?? areaId)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-4 text-sm text-white"
              >
                {labelOf.get(areaId) ?? areaId}
                <span aria-hidden className="text-white/70">×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {voll && <p className="mt-2 text-xs text-amber-800">{copy.limitReached}</p>}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-4 text-sm font-medium text-slate-900 underline"
      >
        {open ? copy.hideAll : copy.showAll}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {families.map((family) => {
            const darin = areas.filter((area) => area.familyId === family.familyId);
            if (darin.length === 0) return null;
            return (
              <details key={family.familyId} className="rounded-2xl border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  {family.label}
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {darin.map((area) => {
                    const gewaehlt = selected.includes(area.areaId);
                    return (
                      <button
                        key={area.areaId}
                        type="button"
                        disabled={!gewaehlt && voll}
                        onClick={() => toggle(area.areaId)}
                        className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm disabled:opacity-40 ${
                          gewaehlt
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {area.label}
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
