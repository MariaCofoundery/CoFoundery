/**
 * Die gemeinsame Liste auf /connect: Gesuche, Angebote, Probleme, Menschen und
 * Unternehmen in einer Reihenfolge - nach Aktualitaet, nie nach Passung.
 *
 * Reine Funktionen, damit sie ohne Datenbank testbar sind. Die Abfragen stehen
 * in connectFeedData.ts.
 */
export const FEED_KINDS = ["seeking", "offering", "problem", "person", "venture"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

/** Beim ersten Besuch: was man sucht und was andere brauchen. Menschen und Unternehmen haben eigene Reiter. */
export const DEFAULT_FEED_KINDS: readonly FeedKind[] = ["seeking", "offering", "problem"];

export const FEED_WORK = ["remote", "onsite"] as const;
export type FeedWork = (typeof FEED_WORK)[number];

/** Mehr als so viele Seiten laedt die gemeinsame Liste nicht nach - bei vier Quellen wuerde jede weitere teurer. */
export const FEED_MAX_PAGES = 8;

function tokens(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : [value ?? ""]).flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
}

/** Gueltige Arten in fester Reihenfolge; ohne Angabe gilt der Standard. */
export function parseFeedKinds(value: string | string[] | undefined): FeedKind[] {
  const wanted = new Set(tokens(value));
  const picked = FEED_KINDS.filter((kind) => wanted.has(kind));
  return picked.length ? picked : [...DEFAULT_FEED_KINDS];
}

export function parseFeedWork(value: string | string[] | undefined): FeedWork[] {
  const wanted = new Set(tokens(value));
  return FEED_WORK.filter((item) => wanted.has(item));
}

/**
 * Welche Arbeitsweisen ein Eintrag haben darf. "Remote moeglich" schliesst
 * hybrid und flexibel mit ein, "Vor Ort" ebenso. Beides angehakt oder nichts
 * angehakt heisst: keine Einschraenkung.
 */
export function workToRemoteModes(work: readonly FeedWork[]): string[] | null {
  if (work.length !== 1) return null;
  return work[0] === "remote" ? ["remote", "hybrid", "flexible"] : ["onsite", "hybrid", "flexible"];
}

export type FeedSortable = { at: string; key: string };

/** Neueste zuerst; bei gleichem Zeitpunkt entscheidet der Schluessel, damit die Reihenfolge stabil bleibt. */
export function sortFeed<T extends FeedSortable>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => (a.at === b.at ? a.key.localeCompare(b.key) : a.at < b.at ? 1 : -1));
}

/**
 * Eine Seite aus den vereinigten Quellen. Jede Quelle liefert ihre ersten
 * `page * size + 1` Eintraege; die ersten `page * size` der Vereinigung sind
 * damit sicher vollstaendig, der eine zusaetzliche zeigt, ob es weitergeht.
 */
export function pickFeedPage<T extends FeedSortable>(entries: readonly T[], page: number, size: number) {
  const sorted = sortFeed(dedupe(entries));
  const start = (page - 1) * size;
  return { entries: sorted.slice(start, start + size), hasMore: sorted.length > start + size };
}

function dedupe<T extends FeedSortable>(entries: readonly T[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => (seen.has(entry.key) ? false : (seen.add(entry.key), true)));
}

/** Die haeufigsten Werte aus mehreren Listen - fuer die Auswahl "Thema" und "Ort". */
export function topValues(lists: ReadonlyArray<ReadonlyArray<string> | null | undefined>, limit: number) {
  const counts = new Map<string, number>();
  for (const list of lists) for (const raw of list ?? []) {
    const value = raw.trim();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([value]) => value);
}
