/**
 * Werte (20270413120000): drei bis fuenf Werte einer Person, in ihrer eigenen Reihenfolge und mit eigenen Worten.
 * Keine Punkte, keine Passung: Die Reihenfolge ist die Ordnung der Person; das Tool vergleicht Plaetze nie.
 */
export const VALUE_KEYS = [
  "sinnhaftigkeit", "wirkung", "freiheit", "verlaesslichkeit", "ehrlichkeit", "fairness", "lernen", "qualitaet", "tempo", "sicherheit",
  "zusammenhalt", "nachhaltigkeit", "verantwortung", "mut", "vertrauen", "respekt", "kreativitaet", "unabhaengigkeit", "balance",
  "erfolg", "transparenz", "neugier", "humor", "grosszuegigkeit",
] as const;
export type ValueKey = (typeof VALUE_KEYS)[number];
export const VALUES_MIN = 3;
export const VALUES_MAX = 5;

export type PersonValue = { key: ValueKey | "custom"; label: string | null; meaning: string | null };
export type TeamValueRow = PersonValue & { userId: string; slot: number };
export type TeamSharing = { userId: string; name: string; shared: boolean; isSelf: boolean };

export const isValueKey = (value: unknown): value is ValueKey => (VALUE_KEYS as readonly unknown[]).includes(value);

/** Den Text eines Werts: der Name aus den Uebersetzungen oder der eigene Begriff. */
export const valueName = (value: Pick<PersonValue, "key" | "label">, catalog: (key: ValueKey) => string): string =>
  value.key === "custom" ? value.label ?? "" : catalog(value.key);

/** Gleicher Begriff heisst: gleich geschrieben, ohne Beachtung von Gross-/Kleinschreibung, Leerzeichen und Akzenten. Ein eigener Wert "ehrlichkeit" ist derselbe Begriff wie der Katalogwert Ehrlichkeit. */
export const normalizeValueName = (name: string): string =>
  name.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export type ValueGroup = { name: string; rows: TeamValueRow[] };

/** Die Werte des Teams nach Begriff gruppiert. */
export function groupByName(rows: TeamValueRow[], catalog: (key: ValueKey) => string): ValueGroup[] {
  const groups = new Map<string, ValueGroup>();
  for (const row of rows) {
    const name = valueName(row, catalog).trim();
    if (!name) continue;
    const id = normalizeValueName(name);
    const group = groups.get(id) ?? { name, rows: [] };
    group.rows.push(row);
    groups.set(id, group);
  }
  return [...groups.values()];
}

/** Gemeinsam: mindestens zwei verschiedene Personen nennen denselben Begriff - auch wenn einer ein eigener Wert ist. */
export const sharedGroups = (rows: TeamValueRow[], catalog: (key: ValueKey) => string): ValueGroup[] =>
  groupByName(rows, catalog).filter((group) => new Set(group.rows.map((row) => row.userId)).size >= 2);

/** Eine Person nach der anderen, jede in ihrer eigenen Reihenfolge. */
export function groupByUser(rows: TeamValueRow[]): Map<string, TeamValueRow[]> {
  const grouped = new Map<string, TeamValueRow[]>();
  for (const row of [...rows].sort((a, b) => a.slot - b.slot)) grouped.set(row.userId, [...(grouped.get(row.userId) ?? []), row]);
  return grouped;
}

/** Regeln fuer die Gespraechsfragen: aus den genannten Begriffen, nach festen Mustern. Kein Modell, keine Bewertung. */
export function conversationNames(rows: TeamValueRow[], catalog: (key: ValueKey) => string): { shared: string[]; single: string[] } {
  const groups = groupByName(rows, catalog);
  const shared = groups.filter((group) => new Set(group.rows.map((row) => row.userId)).size >= 2);
  return { shared: shared.map((group) => group.name), single: groups.filter((group) => !shared.includes(group)).map((group) => group.name) };
}
