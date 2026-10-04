import type { CSSProperties } from "react";
import copy from "../../../../messages/de/capability.json";
import {
  componentRows,
  COMPONENT_LABELS,
  OWNERSHIP_LABELS,
} from "@/features/reporting/workstyle/componentsModel";
import type { ProductTeam } from "@/features/reporting/workstyle/model";
const areaName = (key: string) =>
  (copy.areaLabels as Record<string, string>)[key] ?? key;
const familyName = (key: string) =>
  (copy.families as Record<string, string>)[key] ?? key;
export function ComponentMatrix({ team }: { team: ProductTeam }) {
  const allRows = componentRows(team.people, team.taxonomy.areas);
  const rows = allRows.filter((r) => r.cells.some((c) => c.entry));
  return (
    <section className="space-y-6" id="komponenten">
      <h2 className="text-2xl font-semibold">Was ihr als Team mitbringt</h2>
      <p className="leading-7 text-slate-600">
        Team-Komponenten: Erfahrung, gewünschte Verantwortung und die Frage, was
        intern liegen sollte, stehen getrennt nebeneinander. Ein
        Verantwortungswunsch ist noch keine gemeinsame Vereinbarung.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {team.people.map((p) => (
          <div
            key={p.person_id}
            className="ws-text-card rounded-xl bg-slate-50 p-4"
          >
            <h3 className="font-semibold">{p.name} möchte übernehmen</h3>
            <p className="mt-2 text-sm">
              {p.capabilities
                .filter((e) => e.ownership_wish === "own")
                .map((e) => areaName(e.area_id))
                .join(" · ") || "Keine Übernahmewünsche sichtbar."}
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm leading-6 text-slate-600">
        Nicht alles muss im Founder-Team liegen. Die Sourcing-Einordnung folgt
        dem Komponentenprinzip: Geeignete Aufgaben lassen sich extern beziehen.
        Sie ist kein Founder-Rollenmodell. „Extern lösbar“ bedeutet noch nicht,
        dass eine externe Komponente beauftragt ist.
      </p>
      <p className="text-sm text-slate-500">
        Gezeigt werden Bereiche mit mindestens einer sichtbaren Angabe. Zu{" "}
        {allRows.length - rows.length} weiteren Bereichen liegen hier keine
        Angaben vor; daraus wird keine fehlende Fähigkeit abgeleitet.
      </p>
      <div className="ws-matrix" aria-label="Komponentenmatrix">
        {rows.map((row) => (
          <article key={row.area.area_id} className="ws-component">
            <p className="text-xs text-slate-500">
              {familyName(row.area.family_id)}
            </p>
            <h3 className="mt-1 font-semibold">{areaName(row.area.area_id)}</h3>
            <p className="my-3 text-sm">
              {row.states.map((s) => COMPONENT_LABELS[s]).join(" · ") ||
                "Sourcing noch nicht eingeordnet"}
            </p>
            <div
              className="ws-component-members"
              style={{ "--members": team.people.length } as CSSProperties}
            >
              {row.cells.map((c) => (
                <div key={c.personId} className="ws-component-cell">
                  <h4 className="text-sm font-semibold">{c.name}</h4>
                  <p className="mt-2 text-xs leading-5">
                    ○ Erfahrung:{" "}
                    {c.entry?.application_level
                      ? (copy.levels as Record<string, string>)[
                          String(c.entry.application_level)
                        ]
                      : "Keine Angabe sichtbar"}
                  </p>
                  <p className="mt-2 text-xs leading-5">
                    {c.entry?.ownership_wish
                      ? OWNERSHIP_LABELS[c.entry.ownership_wish]
                      : "? Verantwortung nicht sichtbar"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-dashed border-slate-300 pt-3 text-sm">
              <b>◇ Externe Komponente:</b>{" "}
              {row.sourcing === "internal_only"
                ? "Dieser Bereich sollte intern verankert bleiben."
                : row.sourcing === "component"
                  ? "Kann extern bezogen werden; Beauftragung und interne Schnittstelle klären."
                  : row.sourcing === "depends"
                    ? "Hängt von eurem Vorhaben ab."
                    : "Noch nicht fachlich eingeordnet."}
              {row.externalPreference.length > 0 && (
                <p className="mt-1">
                  Extern lösen möchten: {row.externalPreference.join(", ")}.{" "}
                  {row.sourcing === "internal_only"
                    ? "Klärt, wer die interne Verantwortung behält."
                    : "Prüft, welche Abhängigkeit und welche interne Ansprechperson daraus entstehen."}
                </p>
              )}
            </div>
            {row.states.includes("SINGLE_POINT_OF_FAILURE") && (
              <p className="mt-2 text-sm">
                Nur eine Person möchte die interne Verantwortung tragen.
                Besprecht Vertretung und Wissenstransfer.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function ComponentSummary({ team }: { team: ProductTeam }) {
  const rows = componentRows(team.people, team.taxonomy.areas).filter((r) =>
    r.cells.some((c) => c.entry),
  );
  const groups = [
    {
      label: "Im Team bereits getragen",
      rows: rows.filter((r) => r.owners.length === 1),
    },
    {
      label: "Mehrfach getragen",
      rows: rows.filter((r) => r.owners.length > 1),
    },
    {
      label: "Noch zu klären",
      rows: rows.filter(
        (r) =>
          r.states.includes("OPEN_INTERNAL") || r.states.includes("DEPENDS"),
      ),
    },
    {
      label: "Kann extern gelöst werden",
      rows: rows.filter((r) => r.sourcing === "component"),
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <div
          key={g.label}
          className="ws-text-card rounded-2xl border border-slate-200 p-4"
        >
          <h3 className="font-semibold">{g.label}</h3>
          <p className="mt-2 text-sm leading-6">
            {g.rows.map((r) => areaName(r.area.area_id)).join(" · ") ||
              "Aus den sichtbaren Angaben noch nicht ableitbar."}
          </p>
        </div>
      ))}
    </div>
  );
}
