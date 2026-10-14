import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildIdfSnapshot, createIdfIndex, idfSnapshotHash, type IdfIndex, type IdfSnapshot } from "@/lib/matching/v01/idf";
import { MATCHING_VERSION, NORMALIZATION_VERSION } from "@/lib/matching/v01/version";

/**
 * Eingefrorener IDF-Snapshot für CONNECT Matching v0.1 (Spec §11.2): Bauen und Laden.
 *
 * Die Engine (`v01/idf.ts`) bleibt unverändert: Sie bekommt einen Hash-geprüften
 * `IdfSnapshot`. Dieses Modul legt fest, woher er kommt.
 *
 *   Korpus     public.connect_idf_corpus_documents(as_of): ein Dokument je
 *              matching-erlaubtem CONNECT-Eintrag (Titel, Beschreibung, Themen)
 *   Ablage     public.matching_idf_snapshots, nur anhängen, nur service_role
 *   Version    connect-idf-<matching_version>-<YYYYMMDD>-<hash8>
 *
 * Gebaut wird nur bewusst über scripts/matching-idf-snapshot.ts - nie bei einer
 * Suche, einem Request oder einer Profiländerung. Geladen wird immer genau eine
 * benannte Version; es gibt kein „latest“, keinen Rückgriff auf eine andere
 * Version und kein Live-IDF. Jede Abweichung wirft (fail closed).
 *
 * NOCH NICHT ANGESCHLOSSEN: Kein CONNECT- oder FIND-Pfad ruft dieses Modul auf.
 */

export const CONNECT_IDF_SCOPE = "connect";

export type ConnectIdfDocument = Readonly<{
  title: string | null;
  summary: string | null;
  topics: readonly string[] | null;
}>;

export type ConnectIdfSnapshotRecord = Readonly<{
  idfCorpusVersion: string;
  scope: typeof CONNECT_IDF_SCOPE;
  matchingVersion: string;
  normalizationVersion: string;
  corpusAsOf: string;
  documentCount: number;
  documentFrequencies: Readonly<Record<string, number>>;
  sha256: string;
}>;

export type ConnectIdfSnapshotErrorCode =
  | "invalid_version"
  | "load_failed"
  | "not_found"
  | "malformed"
  | "matching_version_mismatch"
  | "normalization_version_mismatch"
  | "hash_mismatch";

export class ConnectIdfSnapshotError extends Error {
  readonly code: ConnectIdfSnapshotErrorCode;
  constructor(code: ConnectIdfSnapshotErrorCode, detail?: string) {
    super(detail ? `connect_idf_snapshot_${code}: ${detail}` : `connect_idf_snapshot_${code}`);
    this.name = "ConnectIdfSnapshotError";
    this.code = code;
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const VERSION_PATTERN = new RegExp(`^connect-idf-${escapeRegExp(MATCHING_VERSION)}-(\\d{8})-([0-9a-f]{8})$`);
const TOKEN_PATTERN = /^[a-z0-9]{3,}$/;

/** `connect-idf-<matching_version>-<YYYYMMDD in UTC>-<erste 8 Zeichen des Hash>` (Spec §11.2). */
export function connectIdfCorpusVersion(matchingVersion: string, corpusAsOf: string, sha256: string): string {
  const day = new Date(corpusAsOf).toISOString().slice(0, 10).replaceAll("-", "");
  return `connect-idf-${matchingVersion}-${day}-${sha256.slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// Bauen
// ---------------------------------------------------------------------------

/**
 * N und df über die Korpus-Dokumente, mit derselben Normalisierung wie C1
 * (`buildIdfSnapshot` -> `textTokens`: je Dokument jedes Token einmal).
 * Rein und deterministisch: gleiche Dokumente in beliebiger Reihenfolge und
 * gleicher Zeitpunkt ergeben dieselbe Version und denselben Hash.
 */
export function buildConnectIdfSnapshot(
  documents: readonly ConnectIdfDocument[],
  corpusAsOf: string,
): ConnectIdfSnapshotRecord {
  if (typeof corpusAsOf !== "string" || Number.isNaN(Date.parse(corpusAsOf))) {
    throw new Error("connect_idf_corpus_as_of_invalid");
  }
  const asOf = new Date(corpusAsOf).toISOString();
  const draft = buildIdfSnapshot(
    documents.map((d) => ({ title: d.title ?? "", summary: d.summary ?? "", topics: d.topics ?? [] })),
    "connect-idf-pending",
  );
  const record: ConnectIdfSnapshotRecord = {
    idfCorpusVersion: connectIdfCorpusVersion(MATCHING_VERSION, asOf, draft.sha256),
    scope: CONNECT_IDF_SCOPE,
    matchingVersion: MATCHING_VERSION,
    normalizationVersion: draft.normalizationVersion,
    corpusAsOf: asOf,
    documentCount: draft.n,
    documentFrequencies: draft.df,
    sha256: draft.sha256,
  };
  // Dieselbe Prüfung wie beim Laden: Was hier entsteht, muss die Engine annehmen.
  createIdfIndex(toIdfSnapshot(record));
  return record;
}

/** Zeile für public.matching_idf_snapshots. created_at setzt die Datenbank. */
export function connectIdfSnapshotRow(record: ConnectIdfSnapshotRecord) {
  return {
    idf_corpus_version: record.idfCorpusVersion,
    scope: record.scope,
    matching_version: record.matchingVersion,
    normalization_version: record.normalizationVersion,
    corpus_as_of: record.corpusAsOf,
    document_count: record.documentCount,
    document_frequencies: record.documentFrequencies,
    sha256: record.sha256,
  };
}

function toIdfSnapshot(record: ConnectIdfSnapshotRecord): IdfSnapshot {
  return {
    idfCorpusVersion: record.idfCorpusVersion,
    normalizationVersion: record.normalizationVersion,
    n: record.documentCount,
    df: record.documentFrequencies,
    sha256: record.sha256,
  };
}

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------

type SnapshotClient = Pick<SupabaseClient, "from">;

const SNAPSHOT_COLUMNS =
  "idf_corpus_version, scope, matching_version, normalization_version, corpus_as_of, document_count, document_frequencies, sha256";

function parseRow(row: Record<string, unknown>): ConnectIdfSnapshotRecord {
  const df = row.document_frequencies;
  const n = row.document_count;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) throw new ConnectIdfSnapshotError("malformed", "document_count");
  if (df === null || typeof df !== "object" || Array.isArray(df)) throw new ConnectIdfSnapshotError("malformed", "document_frequencies");
  for (const [token, count] of Object.entries(df as Record<string, unknown>)) {
    if (!TOKEN_PATTERN.test(token) || typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > n) {
      throw new ConnectIdfSnapshotError("malformed", "document_frequencies");
    }
  }
  for (const key of ["idf_corpus_version", "scope", "matching_version", "normalization_version", "corpus_as_of", "sha256"]) {
    if (typeof row[key] !== "string") throw new ConnectIdfSnapshotError("malformed", key);
  }
  return {
    idfCorpusVersion: row.idf_corpus_version as string,
    scope: row.scope as typeof CONNECT_IDF_SCOPE,
    matchingVersion: row.matching_version as string,
    normalizationVersion: row.normalization_version as string,
    corpusAsOf: row.corpus_as_of as string,
    documentCount: n,
    documentFrequencies: df as Record<string, number>,
    sha256: row.sha256 as string,
  };
}

/**
 * Lädt genau die benannte Version und prüft sie vollständig. Braucht einen
 * serverseitigen Service-Role-Client: Die Tabelle ist für Nutzer nicht lesbar.
 *
 * Wirft ConnectIdfSnapshotError bei falschem Versionsformat, fehlendem Snapshot,
 * Ladefehler, fremder matching_version oder normalization_version, Hash- oder
 * Versionsabweichung. Es gibt keinen Rückgriff.
 */
export async function getConnectIdfSnapshot(
  client: SnapshotClient,
  corpusVersion: string,
): Promise<Readonly<{ snapshot: IdfSnapshot; index: IdfIndex; corpusAsOf: string }>> {
  if (typeof corpusVersion !== "string" || !VERSION_PATTERN.test(corpusVersion)) {
    throw new ConnectIdfSnapshotError("invalid_version", String(corpusVersion));
  }

  let data: unknown;
  try {
    const result = await client
      .from("matching_idf_snapshots")
      .select(SNAPSHOT_COLUMNS)
      .eq("idf_corpus_version", corpusVersion)
      .eq("scope", CONNECT_IDF_SCOPE)
      .maybeSingle();
    if (result.error) throw new ConnectIdfSnapshotError("load_failed", result.error.code ?? "unknown");
    data = result.data;
  } catch (error) {
    if (error instanceof ConnectIdfSnapshotError) throw error;
    throw new ConnectIdfSnapshotError("load_failed");
  }
  if (data === null || data === undefined || typeof data !== "object") throw new ConnectIdfSnapshotError("not_found", corpusVersion);

  const record = parseRow(data as Record<string, unknown>);
  if (record.idfCorpusVersion !== corpusVersion || record.scope !== CONNECT_IDF_SCOPE) {
    throw new ConnectIdfSnapshotError("not_found", corpusVersion);
  }
  if (record.matchingVersion !== MATCHING_VERSION) {
    throw new ConnectIdfSnapshotError("matching_version_mismatch", record.matchingVersion);
  }
  if (record.normalizationVersion !== NORMALIZATION_VERSION) {
    throw new ConnectIdfSnapshotError("normalization_version_mismatch", record.normalizationVersion);
  }
  if (idfSnapshotHash(record.documentCount, record.documentFrequencies) !== record.sha256) {
    throw new ConnectIdfSnapshotError("hash_mismatch", corpusVersion);
  }
  if (connectIdfCorpusVersion(record.matchingVersion, record.corpusAsOf, record.sha256) !== corpusVersion) {
    throw new ConnectIdfSnapshotError("hash_mismatch", "Version passt nicht zu Hash oder Zeitpunkt");
  }

  const snapshot = toIdfSnapshot(record);
  return { snapshot, index: createIdfIndex(snapshot), corpusAsOf: record.corpusAsOf };
}
