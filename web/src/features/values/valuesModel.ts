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

/** Ein Wert gilt als "gemeinsam", wenn mindestens zwei Personen denselben Katalogwert nennen. Eigene Werte zaehlen nie als gemeinsam. */
export function sharedKeys(rows: TeamValueRow[]): ValueKey[] {
  const byKey = new Map<ValueKey, Set<string>>();
  for (const row of rows) if (row.key !== "custom") byKey.set(row.key, (byKey.get(row.key) ?? new Set()).add(row.userId));
  return [...byKey.entries()].filter(([, users]) => users.size >= 2).map(([key]) => key);
}

/** Eine Person nach der anderen, jede in ihrer eigenen Reihenfolge. */
export function groupByUser(rows: TeamValueRow[]): Map<string, TeamValueRow[]> {
  const grouped = new Map<string, TeamValueRow[]>();
  for (const row of [...rows].sort((a, b) => a.slot - b.slot)) grouped.set(row.userId, [...(grouped.get(row.userId) ?? []), row]);
  return grouped;
}

/** Regeln fuer die Gespraechsfragen: aus den genannten Werten, nach festen Mustern. Kein Modell, keine Bewertung. */
export function conversationKeys(rows: TeamValueRow[]): { shared: ValueKey[]; single: ValueKey[] } {
  const shared = sharedKeys(rows);
  const single = [...new Set(rows.filter((row) => row.key !== "custom" && !shared.includes(row.key)).map((row) => row.key as ValueKey))];
  return { shared, single };
}
