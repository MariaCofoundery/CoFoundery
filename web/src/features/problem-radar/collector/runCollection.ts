import { CollectorError, fetchHnItems, type HnItem } from "@/features/problem-radar/collector/hackerNews";

export type DueSource = { source_id: string; source_revision: number; adapter: string; queries: string[] };

/** Die vier Funktionen, die die Sammler-Rolle ausfuehren darf - mehr kennt der Lauf nicht. */
export interface CollectorDb {
  due(minGapSeconds: number): Promise<DueSource[]>;
  start(sourceId: string, revision: number): Promise<string>;
  ingest(runId: string, items: HnItem[]): Promise<number>;
  finish(runId: string, outcome: string, fetched: number, added: number): Promise<void>;
}

export type CollectionSummary = { sources: number; fetched: number; added: number; failed: number };

const MAX_ITEMS = 50;
const PAUSE_MS = 300;

/**
 * Ein Lauf ueber alle faelligen Quellen.
 *
 * Eine Quelle, die scheitert, bricht die anderen nicht ab. Das Ergebnis sind
 * nur Zahlen - nie Titel, Adressen oder Fehlertexte der Quelle.
 */
export async function runRadarCollection(options: {
  db: CollectorDb;
  minGapSeconds: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}): Promise<CollectionSummary> {
  const { db, minGapSeconds, fetchImpl, now = () => Date.now(), sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = options;
  const summary: CollectionSummary = { sources: 0, fetched: 0, added: 0, failed: 0 };

  for (const source of await db.due(minGapSeconds)) {
    summary.sources += 1;
    let runId: string;
    try {
      runId = await db.start(source.source_id, source.source_revision);
    } catch {
      summary.failed += 1; // Quelle zwischenzeitlich geaendert oder gesperrt: kein Lauf.
      continue;
    }
    try {
      if (source.adapter !== "hn_algolia") throw new CollectorError("format_error");
      const found = new Map<string, HnItem>();
      for (const query of source.queries) {
        for (const item of await fetchHnItems(query, now() / 1000, fetchImpl)) found.set(item.item_id, item);
        await sleep(PAUSE_MS);
      }
      const items = [...found.values()].slice(0, MAX_ITEMS);
      const added = items.length ? await db.ingest(runId, items) : 0;
      await db.finish(runId, items.length ? "ok" : "empty", items.length, added);
      summary.fetched += items.length;
      summary.added += added;
    } catch (error) {
      summary.failed += 1;
      const outcome = error instanceof CollectorError ? error.code : (error as { code?: string })?.code === "40001" ? "source_changed" : "http_error";
      await db.finish(runId, outcome, 0, 0).catch(() => undefined);
    }
  }
  return summary;
}
