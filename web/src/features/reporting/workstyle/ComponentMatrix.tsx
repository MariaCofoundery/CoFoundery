import copy from "../../../../messages/de/capability.json";
import { componentRows } from "@/features/reporting/workstyle/componentsModel";
import { memberInitials } from "@/features/reporting/workstyle/model";
import type { ProductTeam } from "@/features/reporting/workstyle/model";

const areaName = (key: string) =>
  (copy.areaLabels as Record<string, string>)[key] ?? key;
const familyName = (key: string) =>
  (copy.families as Record<string, string>)[key] ?? key;

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

          <CapabilityMosaic rows={rows} hiddenCount={allRows.length - rows.length} />
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

/** Kurze, gleichwertige Zustandslabels mit Symbol - lesbar auch in Graustufen. */
const WISH: Record<string, { symbol: string; label: string }> = {
  own: { symbol: "◆", label: "möchte verantworten" },
  contribute: { symbol: "＋", label: "möchte beitragen" },
  grow_into: { symbol: "↗", label: "möchte hineinwachsen" },
  prefer_other: { symbol: "↪", label: "lieber eine andere Person" },
  prefer_external: { symbol: "◇", label: "lieber extern" },
  unclear: { symbol: "?", label: "noch unklar" },
};

/**
 * Faehigkeiten-Karte (Phase 11.5): ein Baustein je Bereich mit Angaben,
 * gruppiert nach Familie. Je Person: Erfahrung (nur ab "Wiederholt angewandt",
 * eigene Angabe) und Verantwortungswunsch - getrennt. Bereichsweite Hinweise
 * nur aus dem bestehenden Modell: Verantwortung ungeklaert, mehrere moechten
 * verantworten, extern denkbar (Sourcing des Bereichs), noch nicht alle
 * Angaben. Kein Fuellstand, kein "fehlt euch", keine Wertungsfarbe.
 */
function CapabilityMosaic({
  rows,
  hiddenCount,
}: {
  rows: ReturnType<typeof componentRows>;
  hiddenCount: number;
}) {
  const families = [...new Set(rows.map((r) => r.area.family_id))];
  return (
    <div>
      <h3 className="text-lg font-semibold">Fähigkeiten-Karte</h3>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
        Ein Baustein je Bereich, zu dem jemand Angaben gemacht hat. Erfahrung und Verantwortungswunsch stehen getrennt;
        beides sind eigene Angaben.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legende">
        <span>★ wiederholt angewandt</span>
        {Object.values(WISH).map((w) => (
          <span key={w.label}>
            {w.symbol} {w.label}
          </span>
        ))}
      </p>
      <div className="ws-mosaic mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {families
                .flatMap((family) => rows.filter((r) => r.area.family_id === family))
                .map((row) => {
                  const notes = [
                    row.states.includes("OPEN_INTERNAL") ? "Verantwortung ungeklärt" : null,
                    row.states.includes("MULTI_COVERED") ? "Mehrere möchten verantworten" : null,
                    row.sourcing === "component" ? "Extern denkbar" : null,
                    row.states.includes("INSUFFICIENT_DATA") && row.owners.length === 0 ? "Noch nicht alle Angaben" : null,
                  ].filter((n): n is string => Boolean(n));
                  return (
                    <article
                      key={row.area.area_id}
                      className={`ws-tile rounded-2xl border bg-white p-3 ${row.owners.length ? "border-slate-300" : "border-dashed border-slate-300"}`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{familyName(row.area.family_id)}</p>
                      <h4 className="mt-0.5 text-sm font-semibold text-slate-900">{areaName(row.area.area_id)}</h4>
                      {notes.length ? (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {notes.map((n) => (
                            <span key={n} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                              {n}
                            </span>
                          ))}
                        </p>
                      ) : null}
                      <ul className="mt-2 space-y-1">
                        {row.cells.map((c, n) => {
                          const wish = c.entry?.ownership_wish ? WISH[c.entry.ownership_wish] : null;
                          const experienced = (c.entry?.application_level ?? 0) >= EXPERIENCED;
                          return (
                            <li key={c.personId} className="flex items-center gap-2 text-xs leading-5">
                              <span aria-hidden="true" className={`ws-token ws-token-${n % 4} scale-75`}>
                                {memberInitials(c.name)}
                              </span>
                              <span className="sr-only">{c.name}: </span>
                              {c.entry ? (
                                <span className="text-slate-700">
                                  {[experienced ? "★ wiederholt angewandt" : null, wish ? `${wish.symbol} ${wish.label}` : null]
                                    .filter(Boolean)
                                    .join(" · ") || "Angabe ohne Erfahrungsstufe und Wunsch"}
                                </span>
                              ) : (
                                <span className="text-slate-400">keine Angabe</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  );
                })}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        {hiddenCount > 0
          ? `Zu ${hiddenCount} weiteren Bereichen hat niemand Angaben gemacht oder freigegeben. Daraus wird keine fehlende Fähigkeit abgeleitet.`
          : null}{" "}
        „Extern denkbar“ ist eine Eigenschaft des Bereichs und heißt noch nicht, dass etwas beauftragt ist.
      </p>
    </div>
  );
}
