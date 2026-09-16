import { getTranslations } from "next-intl/server";
import type { CapabilityArea, CapabilityFamily } from "@/features/capability/capabilityTypes";

/**
 * Bestimmte Faehigkeiten verlangen - fuer gemerkte Suchen.
 *
 * Steht in Connect und in Discovery an derselben Stelle einer gespeicherten
 * Suche, deshalb liegt er hier und nicht in einem der beiden Bereiche.
 *
 * Eingeklappt, weil das die seltenere Einschraenkung ist: Die meisten suchen
 * nach Rolle und Ort, nicht nach einem Capability-Bereich. Wer ausdruecklich
 * jemanden zum Programmieren sucht, findet die Liste trotzdem.
 */
export async function CapabilityAreaPicker({
  families,
  areas,
  title,
  text,
  selected = [],
}: {
  families: CapabilityFamily[];
  areas: CapabilityArea[];
  title: string;
  text: string;
  selected?: string[];
}) {
  const capability = await getTranslations("capability");

  const groups = families
    .map((family) => ({
      family,
      areas: areas.filter((area) => area.family_id === family.family_id),
    }))
    .filter((group) => group.areas.length > 0);

  if (!groups.length) return null;

  const chosen = new Set(selected);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200">
        {title}
      </summary>
      <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
      <div className="mt-3 grid gap-4">
        {groups.map((group) => (
          <fieldset key={group.family.family_id}>
            <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {capability(`families.${group.family.family_id}`)}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {group.areas.map((area) => (
                <label
                  key={area.area_id}
                  className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="capability_area_ids"
                    value={area.area_id}
                    defaultChecked={chosen.has(area.area_id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{capability(`areaLabels.${area.area_id}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </details>
  );
}
