"use client";

import { useMemo, useState } from "react";

import { OWNERSHIP_WISHES, type ApplicationLevel, type OwnershipWish } from "./capabilityTypes";

/**
 * Bereiche, Erfahrung und Verantwortung an EINEM Ort.
 *
 * Bis 21.10.2026 waren das drei Schritte und eine Liste mit 54 Kaestchen in
 * elf zugeklappten Kaesten: Erfahrung gab es nur ueber das eine Beispiel, die
 * Verantwortung auf einer eigenen Seite mit bis zu 54 Auswahlfeldern.
 * Jetzt steht beides direkt am gewaehlten Bereich - und bleibt zwei getrennte,
 * freiwillige Angaben: Koennen ist nicht Wollen.
 *
 * LAYOUT: zwei Spalten (Felder, Bereiche), der Ueberblick darunter ueber die
 * volle Breite. Drei Spalten passten nicht in die Karte der Seite (max-w-4xl):
 * Die Mitte schrumpfte auf 240 Pixel, und jedes Wort stand in einer eigenen
 * Zeile. Gefunden von Maria im Ausdruck, 21.10.2026.
 *
 * Die Komponente steckt in einem Formular der Seite und liefert nur Felder:
 * `area_id` (mehrfach), `level_<id>` und `wish_<id>`. Gespeichert wird, wenn
 * die Person speichert - nicht bei jedem Tipp.
 *
 * Ein Bereich mit Beispiel laesst sich hier nicht abwaehlen: Das Beispiel
 * begruendet die Einstufung. Das stand vorher nirgends, und das Abwaehlen blieb
 * stumm wirkungslos.
 *
 * Alle Texte kommen fertig aufgeloest - eine Uebersetzungsfunktion laesst sich
 * nicht ueber die Client-Grenze reichen.
 */
export type EditorArea = { id: string; label: string; hasExample: boolean };
export type EditorFamily = { id: string; label: string; areas: EditorArea[] };
export type EditorInitial = Record<string, { level: ApplicationLevel | null; wish: OwnershipWish | null }>;

export type EditorCopy = {
  searchLabel: string;
  searchPlaceholder: string;
  noResults: string;
  levelTitle: string;
  wishTitle: string;
  overviewTitle: string;
  overviewEmpty: string;
  overviewNote: string;
  hasExample: string;
  levels: Record<string, string>;
  wishes: Record<OwnershipWish, string>;
  familiesLabel: string;
};

// Die Stufe 1 ("noch nicht praktisch angewandt") passt nicht zu "hier habe ich
// gearbeitet" und wird nicht angeboten - nur gezeigt, wenn sie schon dasteht.
const OFFERED_LEVELS: ApplicationLevel[] = [2, 3, 4, 5];

export function CapabilityAreasEditor({
  families,
  initial,
  copy,
}: {
  families: EditorFamily[];
  initial: EditorInitial;
  copy: EditorCopy;
}) {
  const [chosen, setChosen] = useState<Record<string, { level: ApplicationLevel | null; wish: OwnershipWish | null }>>(initial);
  const [activeFamily, setActiveFamily] = useState(
    families.find((family) => family.areas.some((area) => chosen[area.id]))?.id ?? families[0]?.id ?? ""
  );
  const [query, setQuery] = useState("");

  const all = useMemo(
    () => families.flatMap((family) => family.areas.map((area) => ({ ...area, familyId: family.id, familyLabel: family.label }))),
    [families]
  );
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? all.filter((area) => area.label.toLowerCase().includes(needle))
    : all.filter((area) => area.familyId === activeFamily);
  const countIn = (familyId: string) =>
    families.find((family) => family.id === familyId)?.areas.filter((area) => chosen[area.id]).length ?? 0;

  const toggle = (area: EditorArea) => {
    if (area.hasExample && chosen[area.id]) return;
    setChosen((current) => {
      const next = { ...current };
      if (next[area.id]) delete next[area.id];
      else next[area.id] = { level: null, wish: null };
      return next;
    });
  };
  const setLevel = (areaId: string, level: ApplicationLevel) =>
    setChosen((current) => ({
      ...current,
      [areaId]: { ...current[areaId], level: current[areaId].level === level ? null : level },
    }));
  const setWish = (areaId: string, wish: OwnershipWish) =>
    setChosen((current) => ({
      ...current,
      [areaId]: { ...current[areaId], wish: current[areaId].wish === wish ? null : wish },
    }));

  const chip = (on: boolean) =>
    `min-h-11 rounded-full border px-3.5 text-sm transition ${
      on ? "border-violet-600 bg-violet-600 font-semibold text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
    }`;

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
      {/* Gewaehlte Bereiche reisen als Formularfelder mit. */}
      {Object.entries(chosen).map(([areaId, value]) => (
        <span key={areaId} hidden>
          <input type="hidden" name="area_id" value={areaId} />
          {value.level ? <input type="hidden" name={`level_${areaId}`} value={value.level} /> : null}
          {value.wish ? <input type="hidden" name={`wish_${areaId}`} value={value.wish} /> : null}
        </span>
      ))}

      <div className="lg:col-start-1">
        <label className="block">
          <span className="sr-only">{copy.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            // Enter in der Suche darf das Formular nicht abschicken.
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
          />
        </label>
        <nav aria-label={copy.familiesLabel} className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {families.map((family) => {
            const count = countIn(family.id);
            const on = !needle && family.id === activeFamily;
            return (
              <button
                key={family.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setQuery("");
                  setActiveFamily(family.id);
                }}
                className={`flex min-h-11 shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3 text-left text-sm lg:whitespace-normal ${
                  on ? "bg-violet-50 font-semibold text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{family.label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">{count}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-w-0 space-y-2.5 lg:col-start-2 lg:row-start-1">
        {visible.length === 0 ? <p className="text-sm text-slate-600">{copy.noResults}</p> : null}
        {visible.map((area) => {
          const value = chosen[area.id];
          const levels: ApplicationLevel[] = value?.level === 1 ? [1, ...OFFERED_LEVELS] : OFFERED_LEVELS;
          return (
            <div
              key={area.id}
              className={`rounded-2xl border px-4 ${value ? "border-violet-500 bg-violet-50/40" : "border-slate-200 bg-white"}`}
            >
              <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px]">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  disabled={area.hasExample && Boolean(value)}
                  onChange={() => toggle(area)}
                  className="h-5 w-5 shrink-0"
                />
                <span className={value ? "font-semibold" : ""}>{area.label}</span>
                {needle ? <span className="ml-auto text-xs text-slate-500">{area.familyLabel}</span> : null}
              </label>
              {value ? (
                <div className="space-y-4 pb-4 sm:pl-8">
                  {area.hasExample ? <p className="text-xs text-slate-600">{copy.hasExample}</p> : null}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{copy.levelTitle}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {levels.map((level) => (
                        <button key={level} type="button" aria-pressed={value.level === level} onClick={() => setLevel(area.id, level)} className={chip(value.level === level)}>
                          {copy.levels[String(level)]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{copy.wishTitle}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {OWNERSHIP_WISHES.map((wish) => (
                        <button key={wish} type="button" aria-pressed={value.wish === wish} onClick={() => setWish(area.id, wish)} className={chip(value.wish === wish)}>
                          {copy.wishes[wish]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <aside aria-label={copy.overviewTitle} className="rounded-2xl bg-slate-50 p-5 lg:col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{copy.overviewTitle}</h3>
        {Object.keys(chosen).length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{copy.overviewEmpty}</p>
        ) : (
          <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {families.map((family) => {
              const picked = family.areas.filter((area) => chosen[area.id]);
              if (picked.length === 0) return null;
              return (
                <div key={family.id}>
                  <p className="text-xs text-slate-500">{family.label}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {picked.map((area) => (
                      <span key={area.id} className="rounded-full bg-violet-100 px-2.5 py-1 text-xs text-violet-900">{area.label}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-500">{copy.overviewNote}</p>
      </aside>
    </div>
  );
}
