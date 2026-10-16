import "server-only";

import { createShadowServiceClient } from "@/features/discovery/findMatchingInputs";

/**
 * FIND Matching v0.1 – aggregierte technische Beobachtbarkeit des Rankingpfads (E3d).
 *
 * Aus einer Suchanfrage wird eine Liste von Zähler-Erhöhungen (Kennzahl, Bucket, Wert).
 * Sie landen als Tageszähler in find_ranking_metrics_daily (Migration 20261204120000).
 *
 * VERTRAG
 *   - Die Beobachtung hat KEIN Feld für Personen, IDs, Namen, Orte, Kriterien, Capability,
 *     Reasons, Scores, Ränge oder Texte - nur Enums und Zahlen.
 *   - Zahlen werden vor dem Schreiben in Buckets gefasst (Pool-Größe, Laufzeiten) bzw.
 *     über den Tag aufsummiert (Gate-Zählungen). Es gibt keine Zeile je Anfrage.
 *   - Fehlergründe nur als Zähler; unbekannte fallen in "unexpected".
 *   - Die Datenbank lässt nur die Paare aus FIND_RANKING_METRICS zu (gleiche Liste,
 *     find_ranking_metric_allowed) - ein Test hält beide gleich.
 *   - Geschrieben wird nach der Antwort (after()) über den Service-Client; schlägt das
 *     fehl, wird es verworfen. Nie ein Fehler an die Suche, nie Logs.
 *   - Nur aktiv, solange MATCHING_FIND_V01_RANKING_ENABLED=true (der Aufrufer prüft das).
 *
 * Die UI erfährt davon nichts: Für sie gibt es weiterhin nur rankingMode.
 */

export const FIND_FALLBACK_BUCKETS = [
  "session_invalid",
  "viewer_mismatch",
  "viewer_not_searching",
  "service_unavailable",
  "pool_failed",
  "inputs_failed",
  "engine_failed",
  "detail_failed",
  "presenter_failed",
  "unexpected",
] as const;
export type FindFallbackBucket = (typeof FIND_FALLBACK_BUCKETS)[number];

const RUNTIME_BUCKETS = ["lt_50", "lt_100", "lt_250", "lt_500", "lt_1000", "lt_2500", "ge_2500", "sum_ms", "n"] as const;

/** Kennzahlen und ihre erlaubten Buckets - identisch mit find_ranking_metric_allowed. */
export const FIND_RANKING_METRICS = {
  requests: ["all"],
  ranking_mode: ["legacy", "v01"],
  v01_attempts: ["all"],
  v01_success: ["all"],
  fallback: FIND_FALLBACK_BUCKETS,
  presenter: ["ok", "failed"],
  pool_size: ["lt_10", "lt_100", "lt_1000", "lt_10000", "ge_10000", "sum", "n"],
  gate: ["eligible", "uncertain", "excluded"],
  page_visible: ["full", "short_last_page", "short_detail_dropped", "empty"],
  runtime_pool: RUNTIME_BUCKETS,
  runtime_inputs: RUNTIME_BUCKETS,
  runtime_engine: RUNTIME_BUCKETS,
  runtime_detail: RUNTIME_BUCKETS,
  runtime_total: RUNTIME_BUCKETS,
} as const satisfies Record<string, readonly string[]>;

export type FindRankingMetric = keyof typeof FIND_RANKING_METRICS;
export type FindRankingIncrement = Readonly<{ metric: FindRankingMetric; bucket: string; value: number }>;

export type FindRankingStage = "pool" | "inputs" | "engine" | "detail" | "total";
export type FindPageVisibility = "full" | "short_last_page" | "short_detail_dropped" | "empty";

/**
 * Was der Rankingpfad über eine Anfrage weitergibt - ausschließlich technische Aggregate.
 * Alle Felder optional außer dem Ergebnis: Ein früher Fehler hat noch keine Pool-Zahlen.
 */
export type FindRankingDiagnostics = Readonly<{
  timingsMs?: Readonly<Partial<Record<FindRankingStage, number>>>;
  poolSize?: number;
  gate?: Readonly<{ eligible: number; uncertain: number; excluded: number }>;
  presenter?: "ok" | "failed";
  pageVisible?: FindPageVisibility;
}>;

export type FindRankingObservation = Readonly<{
  rankingMode: "legacy" | "v01";
  /** Nur bei rankingMode "legacy" nach einem v0.1-Versuch. */
  fallback: unknown;
  diagnostics: FindRankingDiagnostics;
}>;

/** Bekannte Fehlerklasse oder der sichere Sammel-Bucket. */
export function toFallbackBucket(value: unknown): FindFallbackBucket {
  return typeof value === "string" && (FIND_FALLBACK_BUCKETS as readonly string[]).includes(value)
    ? (value as FindFallbackBucket)
    : "unexpected";
}

const count = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : null);

function sizeBucket(n: number): string {
  if (n < 10) return "lt_10";
  if (n < 100) return "lt_100";
  if (n < 1000) return "lt_1000";
  if (n < 10000) return "lt_10000";
  return "ge_10000";
}

function runtimeBucket(ms: number): (typeof RUNTIME_BUCKETS)[number] {
  if (ms < 50) return "lt_50";
  if (ms < 100) return "lt_100";
  if (ms < 250) return "lt_250";
  if (ms < 500) return "lt_500";
  if (ms < 1000) return "lt_1000";
  if (ms < 2500) return "lt_2500";
  return "ge_2500";
}

/** Rein: Beobachtung -> Zähler-Erhöhungen. Wirft nie. */
export function findRankingIncrements(observation: FindRankingObservation): FindRankingIncrement[] {
  const out: FindRankingIncrement[] = [];
  const add = (metric: FindRankingMetric, bucket: string, value = 1) => {
    if ((FIND_RANKING_METRICS[metric] as readonly string[]).includes(bucket) && value >= 0) out.push({ metric, bucket, value });
  };
  const mode = observation.rankingMode === "v01" ? "v01" : "legacy";
  add("requests", "all");
  add("v01_attempts", "all");
  add("ranking_mode", mode);
  if (mode === "v01") add("v01_success", "all");
  else add("fallback", toFallbackBucket(observation.fallback));

  const d = observation.diagnostics ?? {};
  const pool = count(d.poolSize);
  if (pool !== null) {
    add("pool_size", sizeBucket(pool));
    add("pool_size", "sum", pool);
    add("pool_size", "n");
  }
  if (d.gate) {
    for (const key of ["eligible", "uncertain", "excluded"] as const) {
      const n = count(d.gate[key]);
      if (n !== null) add("gate", key, n);
    }
  }
  if (d.presenter === "ok" || d.presenter === "failed") add("presenter", d.presenter);
  if (d.pageVisible) add("page_visible", d.pageVisible);
  for (const stage of ["pool", "inputs", "engine", "detail", "total"] as const) {
    const ms = count(d.timingsMs?.[stage]);
    if (ms === null) continue;
    const metric = `runtime_${stage}` as FindRankingMetric;
    add(metric, runtimeBucket(ms));
    add(metric, "sum_ms", ms);
    add(metric, "n");
  }
  return out;
}

type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ error: unknown }> };

export type RecordFindRankingOptions = Readonly<{
  /** Next.js after(): nach der Antwort ausführen. */
  schedule: (task: () => Promise<void>) => void;
  createClient?: () => RpcClient | null;
}>;

/**
 * Plant das Schreiben der Zähler nach der Antwort. Synchron nur das Bilden der Liste
 * (Mikrosekunden); kein Netzwerkzugriff auf dem Suchpfad. Fehler werden verworfen.
 */
export function recordFindRankingObservation(observation: FindRankingObservation, options: RecordFindRankingOptions): void {
  let increments: FindRankingIncrement[];
  try {
    increments = findRankingIncrements(observation);
  } catch {
    return;
  }
  if (increments.length === 0) return;
  try {
    options.schedule(async () => {
      try {
        const client = (options.createClient ?? (createShadowServiceClient as unknown as () => RpcClient | null))();
        if (!client) return;
        await client.rpc("record_find_ranking_metrics", { p_increments: increments });
      } catch {
        // verworfen: Beobachtbarkeit darf die Suche nie stören
      }
    });
  } catch {
    // after() nicht verfügbar (z. B. außerhalb einer Anfrage): nichts schreiben
  }
}
