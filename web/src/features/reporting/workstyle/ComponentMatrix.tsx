import copy from "../../../../messages/de/capability.json";
import { componentRows, type CapabilityPerson } from "@/features/reporting/workstyle/componentsModel";
import type { CapabilityArea } from "@/features/capability/capabilityTypes";

const areaName = (key: string) =>
  (copy.areaLabels as Record<string, string>)[key] ?? key;
const familyName = (key: string) =>
  (copy.families as Record<string, string>)[key] ?? key;

/** Ab "Wiederholt angewandt" (Stufe 4) - dieselbe Tiefe wie im Profil (DEPTH_LEVEL). Selbstauskunft, keine Pruefung. */
const EXPERIENCED = 4;

/** Erfahrung als Textchip - eigene Angabe (application_level 1-5). */
function experienceChip(level: number | null): string | null {
  if (level === null || level === undefined) return null;
  return level >= EXPERIENCED ? "viel Erfahrung" : level >= 2 ? "etwas Erfahrung" : "noch keine Praxis";
}

/** Verantwortungswunsch als Textchip - nur `own` heisst "moechte verantworten". */
const WISH: Record<string, string> = {
  own: "möchte verantworten",
  contribute: "möchte beitragen",
  grow_into: "möchte hineinwachsen",
  prefer_other: "lieber jemand anderes",
  prefer_external: "lieber extern",
  unclear: "noch offen",
};

type Row = ReturnType<typeof componentRows>[number];

/** Bereiche, die Klaerung brauchen - dieselbe Quelle wie die Gespraechskarten. */
export function openResponsibilityRows(people: CapabilityPerson[], areas: CapabilityArea[]) {
  return componentRows(people, areas).filter(
    (r) => r.cells.some((c) => c.entry) && (r.states.includes("OPEN_INTERNAL") || r.states.includes("MULTI_COVERED")),
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={`ws-chip inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        tone === "accent" ? "border-violet-200 bg-violet-50 text-violet-900" : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}

function AreaBlock({ row }: { row: Row }) {
  const withEntry = row.cells.filter((c) => c.entry);
  const without = row.cells.filter((c) => !c.entry).map((c) => c.name);
  return (
    <article className="ws-text-card rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{familyName(row.area.family_id)}</p>
      <h4 className="mt-0.5 text-base font-semibold text-slate-950">{areaName(row.area.area_id)}</h4>
      <ul className="mt-3 space-y-2">
        {withEntry.map((c) => {
          const experience = experienceChip(c.entry!.application_level);
          const wish = c.entry!.ownership_wish ? WISH[c.entry!.ownership_wish] : null;
          return (
            <li key={c.personId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="min-w-[5rem] text-sm font-medium text-slate-900">{c.name}</span>
              <span className="flex flex-wrap gap-1.5">
                {experience ? <Chip>{experience}</Chip> : null}
                {wish ? <Chip tone={c.entry!.ownership_wish === "own" ? "accent" : "neutral"}>{wish}</Chip> : null}
                {!experience && !wish ? <span className="text-xs text-slate-500">Bereich angegeben, ohne Stufe und Wunsch</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {without.length > 0 && <p className="mt-2 text-xs text-slate-400">Keine Angabe: {without.join(", ")}</p>}
    </article>
  );
}

/**
 * Faehigkeiten & Verantwortung im Teamreport (Phase 11.7B).
 *
 * Drei getrennte Achsen, nie verrechnet:
 * - Erfahrung (application_level): was jemand nach eigener Angabe anwenden kann,
 * - Verantwortungswunsch (ownership_wish): nur `own` heisst "moechte verantworten",
 * - Sourcing (capability_areas.sourcing): ob ein Bereich intern liegen sollte.
 * Eine vereinbarte Rolle entsteht erst im Founder Setup.
 *
 * Aufbau: A) "Wo Verantwortung noch offen ist" (kompakt), B) "Wer was
 * mitbringt" mit Textchips statt Symbolen - prominent nur Bereiche mit einem
 * Verantwortungswunsch, viel Erfahrung oder offener Verantwortung, alle
 * weiteren eingeklappt. Personen ohne Angabe nur als grauer Einzeiler.
 *
 * Phase 11.7B.1: dieselbe Komponente auf /teams/[id]/roles (`heading={false}`,
 * die Seite traegt den Titel selbst) - keine zweite Darstellung.
 */
export function ComponentMatrix({
  people,
  areas,
  heading = true,
}: {
  people: CapabilityPerson[];
  areas: CapabilityArea[];
  heading?: boolean;
}) {
  const allRows = componentRows(people, areas);
  const rows = allRows.filter((r) => r.cells.some((c) => c.entry));
  const open = rows.filter((r) => r.states.includes("OPEN_INTERNAL") || r.states.includes("MULTI_COVERED") ||
    (r.externalPreference.length > 0 && r.sourcing === "internal_only"));
  const relevant = rows.filter(
    (r) => open.includes(r) || r.owners.length > 0 || r.cells.some((c) => (c.entry?.application_level ?? 0) >= EXPERIENCED),
  );
  const further = rows.filter((r) => !relevant.includes(r));
  const families = (list: Row[]) => [...new Set(list.map((r) => r.area.family_id))].flatMap((f) => list.filter((r) => r.area.family_id === f));
  const empty = allRows.length - rows.length;
  return (
    <section className="space-y-6" id="komponenten" aria-labelledby={heading ? "ws-components-title" : undefined}>
      <div>
        {heading ? (
          <h2 id="ws-components-title" className="text-2xl font-semibold tracking-tight text-slate-950">Fähigkeiten & Verantwortung</h2>
        ) : null}
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Was ihr nach eigener Angabe mitbringt und was ihr verantworten möchtet – getrennt nebeneinander.{" "}
          Erfahrung ist kein Verantwortungswunsch, ein Verantwortungswunsch ist noch keine Rolle,{" "}
          und „extern lösbar“ sagt nichts über eure Kompetenz. Vereinbart wird im Founder Setup.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm">Es sind noch keine Angaben zu Fähigkeiten sichtbar.</p>
      ) : (
        <>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Wo Verantwortung noch offen ist</h3>
            {open.length ? (
              <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {open.map((row) => (
                  <li key={row.area.area_id} className="ws-text-card px-4 py-3 text-sm leading-6">
                    <span className="font-semibold text-slate-950">{areaName(row.area.area_id)}</span>
                    <span className="text-slate-700">
                      {" – "}
                      {row.states.includes("OPEN_INTERNAL")
                        ? "bisher möchte es niemand verantworten"
                        : row.states.includes("MULTI_COVERED")
                          ? `mehrere möchten es verantworten: ${row.owners.map((o) => o.name).join(", ")}`
                          : `${row.externalPreference.join(", ")} ${row.externalPreference.length === 1 ? "möchte" : "möchten"} es lieber extern lösen; der Bereich ist als intern einzuordnen`}
                      {row.sourcing === "component" || row.sourcing === "depends" ? " · extern denkbar" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">In den Bereichen mit Angaben ist keine Verantwortung offen.</p>
            )}
          </div>

          {relevant.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Wer was mitbringt</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {families(relevant).map((row) => (
                  <AreaBlock key={row.area.area_id} row={row} />
                ))}
              </div>
            </div>
          )}

          {further.length > 0 && (
            <details className="ws-details rounded-2xl border border-slate-200 bg-white/70 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
                Weitere Bereiche mit Angaben ({further.length})
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {families(further).map((row) => (
                  <AreaBlock key={row.area.area_id} row={row} />
                ))}
              </div>
            </details>
          )}

          <p className="text-sm leading-6 text-slate-600">
            {empty > 0 ? `Zu ${empty} weiteren Bereichen hat niemand etwas angegeben – das heißt nicht, dass etwas fehlt. ` : ""}
            Alle Angaben sind Selbstauskünfte. „Extern denkbar“ ist eine Eigenschaft des Bereichs und heißt noch nicht, dass
            etwas beauftragt ist.
          </p>
        </>
      )}
    </section>
  );
}
