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
const levelName = (level: number | null) =>
  level ? (copy.levels as Record<string, string>)[String(level)] : null;

/** Ab "Wiederholt angewandt" (Stufe 4) - dieselbe Tiefe wie im Profil (DEPTH_LEVEL). Selbstauskunft, keine Pruefung. */
const EXPERIENCED = 4;

/**
 * Faehigkeiten & Verantwortung im Teamreport.
 *
 * Drei getrennte Achsen, nie verrechnet:
 * - Erfahrung (application_level): was jemand nach eigener Angabe anwenden kann,
 * - Verantwortungswunsch (ownership_wish): nur `own` heisst "moechte verantworten",
 * - Sourcing (capability_areas.sourcing): ob ein Bereich intern liegen sollte.
 * Eine vereinbarte Rolle entsteht erst im Founder Setup.
 *
 * Hauptansicht: je Person die drei Achsen kompakt, dazu nur die Bereiche, die
 * Klaerung brauchen. Die vollstaendige Matrix steht im Anhang.
 */
export function ComponentMatrix({ team }: { team: ProductTeam }) {
  const allRows = componentRows(team.people, team.taxonomy.areas);
  const rows = allRows.filter((r) => r.cells.some((c) => c.entry));
  const attention = rows.filter(
    (r) =>
      r.states.includes("OPEN_INTERNAL") ||
      r.states.includes("MULTI_COVERED") ||
      r.states.includes("SINGLE_POINT_OF_FAILURE") ||
      (r.externalPreference.length > 0 && r.sourcing === "internal_only"),
  );
  return (
    <section className="space-y-6" id="komponenten" aria-labelledby="ws-components-title">
      <h2 id="ws-components-title" className="text-2xl font-semibold">Fähigkeiten & Verantwortung</h2>
      <p className="max-w-3xl leading-7 text-slate-600">
        Was ihr nach eigener Angabe anwenden könnt, was ihr verantworten möchtet und was ihr lieber abgebt oder
        extern löst – getrennt nebeneinander. Erfahrung ist kein Verantwortungswunsch, ein Verantwortungswunsch ist
        keine Fähigkeit und noch keine Rolle, und „extern lösbar“ sagt nichts über eure Kompetenz. Vereinbart wird im
        Founder Setup.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm">Es sind noch keine freigegebenen Angaben zu Fähigkeiten sichtbar.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {team.people.map((p) => {
              const by = (test: (e: (typeof p.capabilities)[number]) => boolean) =>
                p.capabilities.filter(test).map((e) => areaName(e.area_id));
              const lines = [
                { label: "Nach eigener Angabe wiederholt angewandt", areas: by((e) => (e.application_level ?? 0) >= EXPERIENCED) },
                { label: "Möchte verantworten", areas: by((e) => e.ownership_wish === "own") },
                { label: "Möchte hineinwachsen", areas: by((e) => e.ownership_wish === "grow_into") },
                {
                  label: "Möchte abgeben oder extern lösen",
                  areas: by((e) => e.ownership_wish === "prefer_other" || e.ownership_wish === "prefer_external"),
                },
              ];
              return (
                <div key={p.person_id} className="ws-text-card rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <h3 className="font-semibold">{p.name}</h3>
                  {lines.some((l) => l.areas.length) ? (
                    <dl className="mt-2 space-y-1.5 text-sm leading-6">
                      {lines
                        .filter((l) => l.areas.length)
                        .map((l) => (
                          <div key={l.label}>
                            <dt className="inline font-medium">{l.label}: </dt>
                            <dd className="inline">{l.areas.join(" · ")}</dd>
                          </div>
                        ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">Keine freigegebenen Angaben sichtbar.</p>
                  )}
                </div>
              );
            })}
          </div>

          {attention.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold">Wo Verantwortung noch zu klären ist</h3>
              <ul className="mt-3 space-y-3">
                {attention.map((row) => (
                  <li key={row.area.area_id} className="ws-text-card rounded-xl border border-slate-200 p-4 text-sm leading-6">
                    <p className="font-semibold">{areaName(row.area.area_id)}</p>
                    {row.states.includes("OPEN_INTERNAL") && (
                      <p>Dieser Bereich ist als intern zu verankern eingeordnet, aber niemand möchte ihn bisher verantworten.</p>
                    )}
                    {row.states.includes("MULTI_COVERED") && (
                      <p>Mehrere möchten ihn verantworten: {row.owners.map((o) => o.name).join(", ")}. Klärt, wie ihr das aufteilt.</p>
                    )}
                    {row.states.includes("SINGLE_POINT_OF_FAILURE") && (
                      <p>Nur {row.owners[0]?.name} möchte ihn intern verantworten. Besprecht Vertretung und Wissenstransfer.</p>
                    )}
                    {row.externalPreference.length > 0 && row.sourcing === "internal_only" && (
                      <p>
                        {row.externalPreference.join(", ")} {row.externalPreference.length === 1 ? "möchte" : "möchten"} ihn extern
                        lösen; der Bereich ist als intern zu verankern eingeordnet. Klärt, wer die interne Verantwortung behält.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="ws-appendix rounded-2xl border border-slate-200 bg-white/70 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
              Alle Bereiche mit Angaben im Detail ({rows.length})
            </summary>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Nicht alles muss im Founder-Team liegen: „Extern lösbar“ folgt dem Komponentenprinzip und heißt noch nicht,
              dass etwas beauftragt ist. Zu {allRows.length - rows.length} weiteren Bereichen liegen keine Angaben vor;
              daraus wird keine fehlende Fähigkeit abgeleitet.
            </p>
            <div className="ws-matrix mt-4" aria-label="Fähigkeiten und Verantwortung je Bereich">
              {rows.map((row) => (
                <article key={row.area.area_id} className="ws-component">
                  <p className="text-xs text-slate-500">{familyName(row.area.family_id)}</p>
                  <h4 className="mt-1 font-semibold">{areaName(row.area.area_id)}</h4>
                  <p className="my-3 text-sm">
                    {row.states
                      // "Angaben fehlen" nur dort, wo es die Deutung aendert: wenn niemand verantworten moechte.
                      .filter((s) => s !== "INSUFFICIENT_DATA" || row.owners.length === 0)
                      .map((s) => COMPONENT_LABELS[s])
                      .join(" · ") || "Sourcing noch nicht eingeordnet"}
                  </p>
                  <div className="ws-component-members" style={{ "--members": team.people.length } as CSSProperties}>
                    {row.cells.map((c) => (
                      <div key={c.personId} className="ws-component-cell">
                        <h5 className="text-sm font-semibold">{c.name}</h5>
                        {c.entry ? (
                          <>
                            <p className="mt-2 text-xs leading-5">Erfahrung: {levelName(c.entry.application_level) ?? "nicht eingestuft"}</p>
                            <p className="mt-1 text-xs leading-5">
                              {c.entry.ownership_wish ? OWNERSHIP_LABELS[c.entry.ownership_wish] : "Verantwortung: keine Angabe"}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-slate-500">Keine Angabe</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 border-t border-dashed border-slate-300 pt-3 text-sm">
                    {row.sourcing === "internal_only"
                      ? "Sollte intern verankert bleiben."
                      : row.sourcing === "component"
                        ? "Kann extern bezogen werden; Beauftragung und interne Schnittstelle klären."
                        : row.sourcing === "depends"
                          ? "Ob intern oder extern, hängt von eurem Vorhaben ab."
                          : "Noch nicht fachlich eingeordnet."}
                  </p>
                </article>
              ))}
            </div>
          </details>
        </>
      )}
    </section>
  );
}

/** Kurzfassung fuer "Auf einen Blick": vier klar getrennte Gruppen, keine Vermischung mit "haengt vom Vorhaben ab". */
export function ComponentSummary({ team }: { team: ProductTeam }) {
  const rows = componentRows(team.people, team.taxonomy.areas).filter((r) =>
    r.cells.some((c) => c.entry),
  );
  if (!rows.length) return null;
  const groups = [
    { label: "Eine Person möchte verantworten", rows: rows.filter((r) => r.owners.length === 1) },
    { label: "Mehrere möchten verantworten", rows: rows.filter((r) => r.owners.length > 1) },
    { label: "Intern wichtig, aber niemand möchte verantworten", rows: rows.filter((r) => r.states.includes("OPEN_INTERNAL")) },
    { label: "Extern lösbar", rows: rows.filter((r) => r.sourcing === "component") },
  ].filter((g) => g.rows.length);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.label} className="ws-text-card rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold">{g.label}</h3>
          <p className="mt-2 text-sm leading-6">{g.rows.map((r) => areaName(r.area.area_id)).join(" · ")}</p>
        </div>
      ))}
    </div>
  );
}
