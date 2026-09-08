import type { DisclosedCapabilityRow } from "./capabilityTypes";

/**
 * Der Block "Was diese Person mitbringt" auf einer fremden Profilseite.
 *
 * Zwei Regeln aus dem Modell stecken in der Darstellung:
 *
 * 1. Wer nichts freigegeben hat, erzeugt keinen Block. Kein "keine Angaben",
 *    kein ausgegrauter Platzhalter - ein sichtbarer Leerplatz macht aus einem
 *    fehlenden Eintrag eine Aussage.
 * 2. Tiefe erscheint nur, wenn sie da ist. Fehlt sie, steht der Bereich allein
 *    da; es wird nicht erklaert, dass etwas zurueckgehalten wird.
 */
export function DisclosedCapability({
  rows,
  copy,
}: {
  rows: DisclosedCapabilityRow[];
  copy: {
    title: string;
    familyLabel: (familyId: string) => string;
    areaLabel: (areaId: string) => string;
    levelLabel: (level: number) => string;
    ownershipLabel: (wish: string) => string;
  };
}) {
  if (rows.length === 0) return null;

  const families = rows.reduce<{ familyId: string; rows: DisclosedCapabilityRow[] }[]>((groups, row) => {
    const existing = groups.find((group) => group.familyId === row.family_id);
    if (existing) {
      existing.rows.push(row);
      return groups;
    }
    return [...groups, { familyId: row.family_id, rows: [row] }];
  }, []);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <div className="mt-4 space-y-5">
        {families.map((family) => (
          <div key={family.familyId}>
            <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
              {copy.familyLabel(family.familyId)}
            </h3>
            <ul className="mt-2 space-y-2">
              {family.rows.map((row) => (
                <li key={row.area_id} className="text-sm">
                  <span className="font-medium">{copy.areaLabel(row.area_id)}</span>
                  {row.application_level || row.ownership_wish ? (
                    <span className="mt-1 block text-slate-600">
                      {[
                        row.application_level ? copy.levelLabel(row.application_level) : null,
                        row.ownership_wish ? copy.ownershipLabel(row.ownership_wish) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
