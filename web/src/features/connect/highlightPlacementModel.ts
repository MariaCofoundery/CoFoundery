/**
 * Highlight-Plaetze der Verwaltung: was aus einem eingefuegten Link wird.
 *
 * Wer einen Platz vergibt, kopiert den Link des Eintrags aus der Adresszeile.
 * Das ist einfacher als eine Auswahlliste ueber alle Gesuche, Angebote,
 * Unternehmen, Profile und Probleme - und der Titel steht danach in der Liste,
 * damit man sieht, ob es der richtige war.
 */
export const PLACEMENT_SOURCES = ["editorial", "sponsored"] as const;
export type PlacementSource = (typeof PLACEMENT_SOURCES)[number];

export const PLACEMENT_KINDS = ["listing", "venture", "person", "problem"] as const;
export type PlacementKind = (typeof PLACEMENT_KINDS)[number];

const PATH_KIND: Record<string, PlacementKind> = {
  listings: "listing",
  ventures: "venture",
  people: "person",
  problems: "problem",
};

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function parsePlacementTarget(input: unknown): { kind: PlacementKind; id: string } | null {
  if (typeof input !== "string") return null;
  const match = input.match(new RegExp(`/connect/(listings|ventures|people|problems)/(${UUID})(?:[/?#]|$)`, "i"));
  if (!match) return null;
  return { kind: PATH_KIND[match[1].toLowerCase()], id: match[2].toLowerCase() };
}

export function isPlacementSource(value: unknown): value is PlacementSource {
  return typeof value === "string" && (PLACEMENT_SOURCES as readonly string[]).includes(value);
}

/** Das Ende ist der Schluss des gewaehlten Tages (UTC). Vergangenes oder Unlesbares gilt nicht. */
export function placementEndFromDate(value: unknown, now = new Date()): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const end = new Date(`${value}T23:59:59.000Z`);
  if (Number.isNaN(end.getTime()) || end <= now) return null;
  return end;
}

export type PlacementRow = {
  id: string;
  source: PlacementSource;
  kind: PlacementKind;
  target_id: string;
  note: string | null;
  starts_at: string;
  ends_at: string;
  title: string | null;
  owner_name: string | null;
};

export function placementState(row: Pick<PlacementRow, "starts_at" | "ends_at">, now = new Date()) {
  if (new Date(row.ends_at) <= now) return "ended" as const;
  if (new Date(row.starts_at) > now) return "planned" as const;
  return "running" as const;
}
