import "server-only";
import { Pool } from "pg";
import type { CollectorDb, DueSource } from "@/features/problem-radar/collector/runCollection";

/**
 * Verbindung unter der Rolle `radar_collector`. Die Adresse steht nur in
 * RADAR_COLLECTOR_DATABASE_URL; ohne sie laeuft kein Sammler (kein Rueckfall auf
 * den Service-Role-Schluessel). Die Rolle darf ausschliesslich vier Funktionen
 * ausfuehren, siehe die Migration 20261222120000.
 */
export function collectorDatabaseUrl() {
  return process.env.RADAR_COLLECTOR_DATABASE_URL?.trim() || null;
}

export async function withCollectorDb<T>(work: (db: CollectorDb) => Promise<T>): Promise<T | "not_configured"> {
  const url = collectorDatabaseUrl();
  if (!url) return "not_configured";
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 8000, statement_timeout: 15000 });
  try {
    return await work({
      async due(minGapSeconds) {
        const { rows } = await pool.query("select * from public.radar_collector_due(make_interval(secs => $1))", [minGapSeconds]);
        return rows as DueSource[];
      },
      async start(sourceId, revision) {
        const { rows } = await pool.query("select public.radar_collector_start($1, $2) as id", [sourceId, revision]);
        return rows[0].id as string;
      },
      async ingest(runId, items) {
        const { rows } = await pool.query("select public.radar_collector_ingest($1, $2::jsonb) as added", [runId, JSON.stringify(items)]);
        return Number(rows[0].added);
      },
      async finish(runId, outcome, fetched, added) {
        await pool.query("select public.radar_collector_finish($1, $2, $3, $4)", [runId, outcome, fetched, added]);
      },
    });
  } finally {
    await pool.end().catch(() => undefined);
  }
}
