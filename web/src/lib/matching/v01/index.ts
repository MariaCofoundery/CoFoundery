/**
 * Made2Found Matching Engine v0.1 – NICHT-PRODUKTIVER PROTOTYP.
 *
 * Verbindliche Quelle: docs/research/matching-engine-v0.1-spec.md (eingefroren, Hash in .sha256).
 * Kein Produktpfad, keine Route, keine DB-Schreibzugriffe nutzen diese Bibliothek. Aufrufer sind
 * die Tests unter __tests__/ und das Dev-Skript scripts/matching-v01-harness.ts.
 */
export { MATCHING_VERSION, NORMALIZATION_VERSION } from "@/lib/matching/v01/version";
export { matchFindPair, rankFindCandidates } from "@/lib/matching/v01/findMatcher";
export { matchConnect, rankConnectOffers } from "@/lib/matching/v01/connectMatcher";
export { buildIdfSnapshot, createIdfIndex } from "@/lib/matching/v01/idf";
export type { IdfIndex, IdfSnapshot } from "@/lib/matching/v01/idf";
export { attachWorkstyleContext } from "@/lib/matching/v01/workstyle";
export {
  connectListingFromRow,
  connectOfferFromRows,
  findPersonFromDiscovery,
  mustHavesFromDiscovery,
} from "@/lib/matching/v01/adapters";
export type * from "@/lib/matching/v01/types";
