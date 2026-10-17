import { APPLICATION_LEVELS } from "@/features/capability/capabilityTypes";
import type { CapabilityMap as CapabilityMapData, CapabilityRole } from "@/features/reporting/capabilityMapModel";

/**
 * Die Capability Map: je Familie eine Karte, je Bereich eine Zeile.
 *
 * ERFAHRUNG UND ROLLE STEHEN GETRENNT. Fuenf Punkte zeigen die angegebene
 * Anwendungsstufe (eine Selbstauskunft ueber Haeufigkeit, keine Note); das
 * Etikett daneben zeigt, was die Person dort uebernehmen will. Alle Etiketten
 * haben dieselbe neutrale Farbe - „beitragen" ist keine Absage und
 * „verantworten" keine Auszeichnung.
 *
 * Die Punkte sind Schmuck (`aria-hidden`): Dieselbe Auskunft steht als Text
 * daneben, fuer Screenreader und fuer den Fall, dass die Farbe nicht ankommt.
 */
export function CapabilityMap({
  map,
  copy,
}: {
  map: CapabilityMapData;
  copy: {
    familyLabel: (familyId: string) => string;
    areaLabel: (areaId: string) => string;
    experience: string;
    role: string;
    /** Beschriftung der Stufe, z. B. „Selbststaendig angewandt". */
    levelLabel: (level: number) => string;
    levelUnset: string;
    roleLabel: (role: CapabilityRole) => string;
    sourcingLabel: (sourcing: "internal_only" | "component" | "depends") => string;
    lessExperience: string;
  };
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {map.families.map((family) => (
        <section
          key={family.familyId}
          className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-5 print:rounded-none print:border-none print:px-0"
          aria-labelledby={`capability-family-${family.familyId}`}
        >
          <h3
            id={`capability-family-${family.familyId}`}
            className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"
          >
            {copy.familyLabel(family.familyId)}
          </h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {family.rows.map((row) => (
              <li key={row.areaId} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-slate-900">{copy.areaLabel(row.areaId)}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
                  <dt className="text-slate-500">{copy.experience}</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    {row.level !== null ? (
                      <>
                        <span className="flex gap-1" aria-hidden="true">
                          {APPLICATION_LEVELS.map((step) => (
                            <span
                              key={step}
                              className={`h-2.5 w-2.5 rounded-full ${
                                step <= (row.level ?? 0)
                                  ? "bg-emerald-600"
                                  : "border border-slate-300 bg-white"
                              }`}
                            />
                          ))}
                        </span>
                        <span className="text-slate-700">{copy.levelLabel(row.level)}</span>
                      </>
                    ) : (
                      <span className="text-slate-500">{copy.levelUnset}</span>
                    )}
                  </dd>
                  <dt className="text-slate-500">{copy.role}</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-800">
                      {copy.roleLabel(row.role)}
                    </span>
                    {row.ownsWithLessExperience ? (
                      <span className="text-slate-500">{copy.lessExperience}</span>
                    ) : null}
                  </dd>
                </dl>
                {row.sourcing ? (
                  <p className="mt-1.5 text-xs text-slate-500">{copy.sourcingLabel(row.sourcing)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
