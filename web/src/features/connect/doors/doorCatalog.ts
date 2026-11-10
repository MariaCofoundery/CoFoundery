/**
 * Tueren (20270417120000): der Katalog "Wen kannst du erreichen?" - zwei Achsen, die Art von Mensch nach Funktion und die Branche
 * getrennt davon. Der Katalog liegt hier, die Datenbank prueft nur die Form der Schluessel. Neue Arten kommen ohne Migration
 * dazu (Eintrag hier plus Texte in beiden Sprachen). "other" ist die Zeile "Anderes" mit eigenem Text.
 */
export const DOOR_GROUPS = [
  { key: "money", types: ["angel", "vc_early", "funding_body", "bank"] },
  { key: "customers", types: ["purchasing_midsize", "corporate_innovation", "public_procurement", "pilot_customer"] },
  { key: "programs", types: ["accelerator", "university_hub", "mentor"] },
  { key: "legal", types: ["lawyer", "tax", "privacy"] },
  { key: "team", types: ["recruiting", "coaching"] },
  { key: "tech", types: ["cto_level", "ai_expert", "certification"] },
  { key: "reach", types: ["trade_press", "podcast_newsletter", "trade_association"] },
  { key: "research", types: ["chair_institute", "transfer_office"] },
  { key: "public", types: ["city_admin", "state_ministry", "chamber"] },
  { key: "international", types: ["export_support"] },
  { key: "exit", types: ["ma_advisor", "board"] },
  { key: "peers", types: ["founders_in_sector", "serial_founder", "program_alumni"] },
] as const;

export const DOOR_SECTORS = ["health", "industry", "energy", "mobility", "education", "construction", "agri_food", "finance", "retail", "media_culture", "public_sector", "software", "sustainability"] as const;
export const DOOR_CLOSENESS = ["personal", "introduce", "via"] as const;
export const MAX_DOORS = 5;

export type DoorGroupKey = (typeof DOOR_GROUPS)[number]["key"];
export type DoorTypeKey = (typeof DOOR_GROUPS)[number]["types"][number];
export type DoorSector = (typeof DOOR_SECTORS)[number];
export type DoorCloseness = (typeof DOOR_CLOSENESS)[number];

export const ALL_DOOR_TYPES: readonly string[] = DOOR_GROUPS.flatMap((group) => group.types as readonly string[]);
export const isDoorType = (value: unknown): value is DoorTypeKey => typeof value === "string" && ALL_DOOR_TYPES.includes(value);
export const isDoorSector = (value: unknown): value is DoorSector => typeof value === "string" && (DOOR_SECTORS as readonly string[]).includes(value);
export const isDoorCloseness = (value: unknown): value is DoorCloseness => typeof value === "string" && (DOOR_CLOSENESS as readonly string[]).includes(value);
export const groupOfType = (type: string) => DOOR_GROUPS.find((group) => (group.types as readonly string[]).includes(type))?.key ?? null;

export type Door = {
  id: string; typeKey: string; otherLabel: string | null; sectorKey: string | null; region: string | null; closeness: DoorCloseness; note: string | null;
};
export type DoorResult = Door & { userId: string; displayName: string; headline: string | null; doorsOpen: boolean };

/** Suchfilter der Seite "Menschen": die gewaehlten Arten (aus einer Gruppe oder einzeln), Branche, Region. */
export type DoorFilters = { group: DoorGroupKey | null; types: DoorTypeKey[]; sector: DoorSector | null; region: string };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
export function parseDoorFilters(sp: Record<string, string | string[] | undefined>): DoorFilters | null {
  const group = DOOR_GROUPS.find((entry) => entry.key === one(sp.tuer_gruppe))?.key ?? null;
  const rawTypes = (Array.isArray(sp.tuer_art) ? sp.tuer_art : sp.tuer_art ? [sp.tuer_art] : []).filter(isDoorType);
  const sector = isDoorSector(one(sp.tuer_branche)) ? (one(sp.tuer_branche) as DoorSector) : null;
  const region = one(sp.tuer_region).trim().slice(0, 60);
  if (!group && rawTypes.length === 0 && !sector && !region) return null;
  return { group, types: [...new Set(rawTypes)], sector, region };
}

/** Die Arten, die eine Suche meint: die einzeln gewaehlten, sonst alle der Gruppe, sonst alle. */
export function typesForFilter(filters: DoorFilters): string[] {
  if (filters.types.length > 0) return filters.types;
  const group = DOOR_GROUPS.find((entry) => entry.key === filters.group);
  return group ? [...group.types] : [];
}

/** Nur der Teil nach dem Komma ist freier Text; der Titel der Vorstellung kommt aus dem Katalog. */
export function cleanRegion(value: string): string | null {
  const text = value.trim().slice(0, 60);
  return text ? text : null;
}
