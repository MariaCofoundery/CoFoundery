/**
 * IDF-Snapshot für CONNECT text_relevance (Spec §11, §11.2).
 *
 *   idf(tok) = ln((N + 1) / (df(tok) + 1));   ein Token, das im Korpus fehlt, erhält ln(N + 1).
 *
 * Die Engine rechnet den Korpus NIE live aus der Produktion. Sie bekommt einen vorberechneten,
 * versionierten Snapshot (N + df-Tabelle + Hash, keine Texte, keine Eintrags-IDs) als Eingabe.
 * Ein Snapshot einer anderen normalization_version wird abgelehnt.
 */
import { createHash } from "node:crypto";

import { textTokens, tokenMatch } from "@/lib/matching/v01/normalization";
import { NORMALIZATION_VERSION } from "@/lib/matching/v01/version";

export type IdfSnapshot = Readonly<{
  idfCorpusVersion: string;
  normalizationVersion: string;
  n: number;
  df: Readonly<Record<string, number>>;
  sha256: string;
}>;

export type IdfIndex = Readonly<{
  idfCorpusVersion: string;
  idf: (token: string) => number;
  /** IDF-gewichteter Anteil der Bedarfs-Token, die im Angebot vorkommen (0..1); null ohne Gewicht. */
  overlap: (need: readonly string[], have: readonly string[]) => number | null;
}>;

/** Kanonische Form wie im Python-Generator: json.dumps({"df":…, "n":…}, sort_keys, ohne Leerzeichen). */
export function canonicalIdfPayload(n: number, df: Readonly<Record<string, number>>): string {
  const keys = Object.keys(df).sort();
  const body = keys.map((k) => `${JSON.stringify(k)}:${df[k]}`).join(",");
  return `{"df":{${body}},"n":${n}}`;
}

export function idfSnapshotHash(n: number, df: Readonly<Record<string, number>>): string {
  return createHash("sha256").update(canonicalIdfPayload(n, df), "utf8").digest("hex");
}

/**
 * Baut einen Snapshot aus bereits gefilterten Einträgen. Der Aufrufer ist verantwortlich, nur
 * matching-erlaubte Einträge zu übergeben (aktiv, nicht abgelaufen, Profil aktiv, Sichtbarkeit erlaubt).
 */
export function buildIdfSnapshot(
  listings: ReadonlyArray<Readonly<{ title: string; summary: string; topics: readonly string[] }>>,
  idfCorpusVersion: string,
): IdfSnapshot {
  if (!idfCorpusVersion.trim()) throw new Error("idf_corpus_version fehlt");
  const df: Record<string, number> = {};
  for (const l of listings) for (const tok of textTokens(l.title, l.summary, l.topics)) df[tok] = (df[tok] ?? 0) + 1;
  const sorted: Record<string, number> = {};
  for (const k of Object.keys(df).sort()) sorted[k] = df[k];
  return {
    idfCorpusVersion,
    normalizationVersion: NORMALIZATION_VERSION,
    n: listings.length,
    df: sorted,
    sha256: idfSnapshotHash(listings.length, sorted),
  };
}

export function createIdfIndex(snapshot: IdfSnapshot): IdfIndex {
  if (!snapshot.idfCorpusVersion || !snapshot.idfCorpusVersion.trim()) throw new Error("idf_corpus_version fehlt");
  if (snapshot.normalizationVersion !== NORMALIZATION_VERSION) {
    throw new Error(`IDF-Snapshot gehört zu ${snapshot.normalizationVersion}, erwartet ${NORMALIZATION_VERSION}`);
  }
  if (idfSnapshotHash(snapshot.n, snapshot.df) !== snapshot.sha256) throw new Error("IDF-Snapshot: Hash stimmt nicht");
  const { n, df } = snapshot;
  const idf = (token: string) => Math.log((n + 1) / ((df[token] ?? 0) + 1));
  const overlap = (need: readonly string[], have: readonly string[]): number | null => {
    const tokens = [...new Set(need)].sort();
    let total = 0;
    let hit = 0;
    for (const t of tokens) {
      const w = idf(t);
      total += w;
      if (have.some((h) => tokenMatch(t, h))) hit += w;
    }
    return total ? hit / total : null;
  };
  return { idfCorpusVersion: snapshot.idfCorpusVersion, idf, overlap };
}
