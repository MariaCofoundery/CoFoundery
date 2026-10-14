/**
 * Baut einen eingefrorenen CONNECT-IDF-Snapshot (Matching v0.1, Spec §11.2).
 *
 *   npm run matching:idf-snapshot                       Probelauf: Korpus laden, bauen, Kennzahlen zeigen
 *   npm run matching:idf-snapshot -- --write            zusätzlich einfügen und zurückladen
 *   npm run matching:idf-snapshot -- --as-of=<ISO>      Stichtag (Standard: jetzt, auf Sekunden)
 *   npm run matching:idf-snapshot -- --confirm-remote=<host>
 *                                                       nötig für jede nicht-lokale Datenbank
 *
 * Bewusst von Hand: Kein Request, keine Suche, keine Profiländerung baut einen
 * Snapshot. Der Lauf liest mit dem Dienstschlüssel (aus web/.env.local) nur die
 * matching-erlaubten Einträge über connect_idf_corpus_documents und schreibt
 * höchstens eine neue Zeile in matching_idf_snapshots - bestehende Versionen
 * bleiben unberührt (die Tabelle lässt nichts anderes zu).
 *
 * Ausgegeben werden nur Kennzahlen, nie Token oder Texte.
 *
 * Betriebsdoku: docs/research/matching-v0.1-connect-idf-snapshot.md
 */
import { createClient } from "@supabase/supabase-js";

import { isLocalSupabaseUrl } from "@/features/auth/devLogin";
import {
  buildConnectIdfSnapshot,
  connectIdfSnapshotRow,
  getConnectIdfSnapshot,
  type ConnectIdfDocument,
} from "@/lib/matching/connectIdfSnapshot";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length > 0 ? rest.join("=") : "true"] as const;
  }),
);
const known = new Set(["write", "as-of", "confirm-remote"]);
for (const key of args.keys()) if (!known.has(key)) throw new Error(`Unbekannte Option --${key}`);

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen (web/.env.local).");
}

const host = new URL(url).host;
if (!isLocalSupabaseUrl(url) && args.get("confirm-remote") !== host) {
  throw new Error(
    [
      "",
      "  ABGEBROCHEN. Die Datenbank ist nicht lokal:",
      `    ${host}`,
      "  Ein Snapshot aus echten CONNECT-Daten ist eine bewusste Versionsänderung.",
      `  Wer das will, bestätigt den Host ausdrücklich: --confirm-remote=${host}`,
      "",
    ].join("\n"),
  );
}

const asOfArg = args.get("as-of");
const asOf = new Date(asOfArg ?? Date.now());
if (Number.isNaN(asOf.getTime())) throw new Error(`--as-of ist kein Zeitpunkt: ${asOfArg}`);
asOf.setUTCMilliseconds(0);
const corpusAsOf = asOf.toISOString();

const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await client.rpc("connect_idf_corpus_documents", { p_as_of: corpusAsOf });
if (error) throw new Error(`Korpus nicht ladbar: ${error.code ?? ""} ${error.message}`);
const documents = (data ?? []) as ConnectIdfDocument[];

const record = buildConnectIdfSnapshot(documents, corpusAsOf);
const counts = Object.values(record.documentFrequencies);
const summary = {
  database: isLocalSupabaseUrl(url) ? "lokal" : host,
  idfCorpusVersion: record.idfCorpusVersion,
  matchingVersion: record.matchingVersion,
  normalizationVersion: record.normalizationVersion,
  corpusAsOf: record.corpusAsOf,
  documentCount: record.documentCount,
  distinctTokens: counts.length,
  tokensWithDf1: counts.filter((c) => c === 1).length,
  tokensWithDf2: counts.filter((c) => c === 2).length,
  sha256: record.sha256,
};

if (args.get("write") !== "true") {
  console.log(JSON.stringify({ mode: "probelauf (nichts geschrieben)", ...summary }, null, 2));
  process.exit(0);
}

const insert = await client.from("matching_idf_snapshots").insert(connectIdfSnapshotRow(record));
if (insert.error && insert.error.code !== "23505") {
  throw new Error(`Snapshot nicht gespeichert: ${insert.error.code ?? ""} ${insert.error.message}`);
}

// Zurückladen über denselben Weg wie später der Matcher: Version, Hash, Versionen.
const loaded = await getConnectIdfSnapshot(client, record.idfCorpusVersion);
if (loaded.snapshot.sha256 !== record.sha256) throw new Error("Gespeicherter Snapshot weicht ab.");

console.log(
  JSON.stringify(
    { mode: insert.error ? "bereits vorhanden (identisch, unverändert)" : "gespeichert", ...summary },
    null,
    2,
  ),
);
