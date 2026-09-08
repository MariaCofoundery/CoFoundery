/**
 * Fachliche Grundlage: web/docs/capability-model-technical-brief.md
 *
 * Die fuenf Anwendungsstufen. Bewusst keine abstrakte Skala von 1 bis 10:
 * jede Stufe beschreibt eine Anwendungssituation, nicht ein Koennensniveau.
 * Es gibt keine 0 - "noch nichts eingetragen" ist null, nicht die
 * niedrigste Stufe.
 */
export const APPLICATION_LEVELS = [1, 2, 3, 4, 5] as const;
export type ApplicationLevel = (typeof APPLICATION_LEVELS)[number];

/**
 * Die sechs Ownership-Zustaende. CAN ist nicht WANT TO OWN: eine hohe
 * Anwendungsstufe zusammen mit `prefer_other` ist ein ausdruecklich gueltiger
 * Zustand, kein Widerspruch.
 *
 * Diese Liste muss mit dem Check-Constraint in
 * 20260907160000_create_capability_snapshot_v01.sql uebereinstimmen. Der Test
 * in __tests__/capabilitySnapshot.test.ts vergleicht beide.
 */
export const OWNERSHIP_WISHES = [
  "own",
  "contribute",
  "grow_into",
  "prefer_other",
  "prefer_external",
  "unclear",
] as const;
export type OwnershipWish = (typeof OWNERSHIP_WISHES)[number];

export const SNAPSHOT_STEPS = ["evidence", "areas", "ownership"] as const;
export type SnapshotStep = (typeof SNAPSHOT_STEPS)[number];

export const NARRATIVE_MIN_LENGTH = 10;
export const NARRATIVE_MAX_LENGTH = 2000;

export type CapabilityFamily = { family_id: string; sort_order: number };
export type CapabilityArea = { area_id: string; family_id: string; sort_order: number };

export type CapabilityEvidence = { id: string; narrative: string };

export type CapabilityEntry = {
  id: string;
  area_id: string;
  application_level: ApplicationLevel | null;
  ownership_wish: OwnershipWish | null;
  evidence: CapabilityEvidence[];
};

export function isApplicationLevel(value: unknown): value is ApplicationLevel {
  return typeof value === "number" && (APPLICATION_LEVELS as readonly number[]).includes(value);
}

export function isOwnershipWish(value: unknown): value is OwnershipWish {
  return typeof value === "string" && (OWNERSHIP_WISHES as readonly string[]).includes(value);
}

export function isSnapshotStep(value: unknown): value is SnapshotStep {
  return typeof value === "string" && (SNAPSHOT_STEPS as readonly string[]).includes(value);
}

export function parseApplicationLevel(value: FormDataEntryValue | null): ApplicationLevel | null {
  const parsed = Number(String(value ?? "").trim());
  return isApplicationLevel(parsed) ? parsed : null;
}

export function parseOwnershipWish(value: FormDataEntryValue | null): OwnershipWish | null {
  const raw = String(value ?? "").trim();
  return isOwnershipWish(raw) ? raw : null;
}

/**
 * Gruppiert Eintraege nach Familie, in der Sortierreihenfolge des Vokabulars.
 * Familien ohne Eintrag entfallen - eine leere Familie ist keine Aussage.
 */
export function groupEntriesByFamily(
  entries: CapabilityEntry[],
  areas: CapabilityArea[],
  families: CapabilityFamily[]
) {
  const familyOfArea = new Map(areas.map((area) => [area.area_id, area.family_id]));
  const areaOrder = new Map(areas.map((area) => [area.area_id, area.sort_order]));
  const grouped = new Map<string, CapabilityEntry[]>();

  for (const entry of entries) {
    const familyId = familyOfArea.get(entry.area_id);
    if (!familyId) continue;
    grouped.set(familyId, [...(grouped.get(familyId) ?? []), entry]);
  }

  return families
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((family) => {
      const familyEntries = grouped.get(family.family_id);
      if (!familyEntries?.length) return [];
      return [
        {
          familyId: family.family_id,
          entries: familyEntries
            .slice()
            .sort((a, b) => (areaOrder.get(a.area_id) ?? 0) - (areaOrder.get(b.area_id) ?? 0)),
        },
      ];
    });
}

/**
 * Eine Zeile der freigegebenen Sicht. `application_level` und `ownership_wish`
 * sind null, solange die Tiefe nicht freigegeben ist - der Leser kann nicht
 * unterscheiden, ob sie fehlt oder zurueckgehalten wird.
 */
export type DisclosedCapabilityRow = {
  area_id: string;
  family_id: string;
  application_level: ApplicationLevel | null;
  ownership_wish: OwnershipWish | null;
};

export const CAPABILITY_DISCLOSURE_LEVELS = [
  "private",
  "areas",
  "areas_depth_on_contact",
] as const;
export type CapabilityDisclosure = (typeof CAPABILITY_DISCLOSURE_LEVELS)[number];

export function parseCapabilityDisclosure(value: FormDataEntryValue | null): CapabilityDisclosure {
  const raw = String(value ?? "").trim();
  return (CAPABILITY_DISCLOSURE_LEVELS as readonly string[]).includes(raw)
    ? (raw as CapabilityDisclosure)
    : "private";
}
