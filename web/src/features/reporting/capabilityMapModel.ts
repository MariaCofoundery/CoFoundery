import {
  DEPTH_LEVEL,
  type ApplicationLevel,
  type AreaSourcing,
  type CapabilityArea,
  type CapabilityEntry,
  type CapabilityFamily,
  type OwnershipWish,
} from "@/features/capability/capabilityTypes";

/**
 * „Was du mitbringst" - die Capability Map auf „Das bist du" (Phase 1, Profil).
 *
 * Vorher stand unter „Deine Faehigkeiten" eine Deckungskarte („1 von 5
 * Bereichen") - eine Zaehlung, wie weit etwas ausgefuellt ist, keine Aussage
 * ueber die Person. Die Angaben selbst lagen verteilt auf vier Abschnitte.
 *
 * Hier stehen sie je Bereich nebeneinander, ABER GETRENNT:
 *
 *   Erfahrung   `application_level` 1-5 (oder noch nicht eingestuft)
 *   Rolle       `ownership_wish` - genau das, was angegeben ist
 *   Einordnung  `capability_areas.sourcing` - redaktionell, je Bereich, nicht je Person
 *
 * Keine Gesamtzahl, keine Gewichtung, keine Rangfolge: Die Bereiche stehen in
 * der Reihenfolge des Vokabulars, gruppiert nach Familie. Erfahrung und Rolle
 * werden NICHT miteinander verrechnet - „will verantworten" mit niedriger
 * Stufe bleibt genau das und wird nicht zu „will hineinwachsen" umgedeutet.
 */

/** Die angegebene Rolle - oder `unset`, wenn nichts angegeben ist. */
export type CapabilityRole = OwnershipWish | "unset";

export type CapabilityMapRow = {
  areaId: string;
  /** null: noch nicht eingestuft. Keine 0. */
  level: ApplicationLevel | null;
  role: CapabilityRole;
  /** Nur gesetzt, wenn die Einordnung etwas sagt (nicht `unclassified`). */
  sourcing: Exclude<AreaSourcing, "unclassified"> | null;
  /**
   * Will verantworten (`own`) und hat eine ausdruecklich niedrige Stufe
   * angegeben. Wird als Kombination gezeigt - nicht als Wachstum.
   */
  ownsWithLessExperience: boolean;
};

export type CapabilityMapFamily = { familyId: string; rows: CapabilityMapRow[] };

export type CapabilityMap = {
  families: CapabilityMapFamily[];
  /** Nur als dezente Angabe darunter - keine Bewertung. */
  counts: { areas: number; levelled: number; withRole: number };
};

export function buildCapabilityMap(
  entries: CapabilityEntry[],
  areas: CapabilityArea[],
  families: CapabilityFamily[],
): CapabilityMap {
  const areaById = new Map(areas.map((area) => [area.area_id, area]));
  const rowsByFamily = new Map<string, { sort: number; row: CapabilityMapRow }[]>();

  for (const entry of entries) {
    const area = areaById.get(entry.area_id);
    // Ein Eintrag zu einem Bereich, den das Vokabular nicht (mehr) kennt, hat
    // keine Familie und keinen Namen - er erscheint nicht als leere Zeile.
    if (!area) continue;
    const sourcing = area.sourcing && area.sourcing !== "unclassified" ? area.sourcing : null;
    const row: CapabilityMapRow = {
      areaId: entry.area_id,
      level: entry.application_level,
      role: entry.ownership_wish ?? "unset",
      sourcing,
      ownsWithLessExperience:
        entry.ownership_wish === "own" &&
        entry.application_level !== null &&
        entry.application_level < DEPTH_LEVEL,
    };
    const list = rowsByFamily.get(area.family_id) ?? [];
    list.push({ sort: area.sort_order, row });
    rowsByFamily.set(area.family_id, list);
  }

  const orderedFamilies = families
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((family) => {
      const list = rowsByFamily.get(family.family_id);
      if (!list || list.length === 0) return [];
      return [{ familyId: family.family_id, rows: list.sort((a, b) => a.sort - b.sort).map((x) => x.row) }];
    });

  const shown = orderedFamilies.flatMap((family) => family.rows);
  return {
    families: orderedFamilies,
    counts: {
      areas: shown.length,
      levelled: shown.filter((row) => row.level !== null).length,
      withRole: shown.filter((row) => row.role !== "unset").length,
    },
  };
}
