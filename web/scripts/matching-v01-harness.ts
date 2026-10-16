/**
 * Nicht-produktiver Harness für die Matching Engine v0.1 (Prototyp).
 *
 *   npm run matching:harness -- find <personA> <personB>     zwei FIND-Fixtures vergleichen
 *   npm run matching:harness -- rank-find <person> [n]       FIND-Rangliste für eine Person
 *   npm run matching:harness -- connect <seekListing> [n]    ein CONNECT-Gesuch gegen alle Angebote ranken
 *   npm run matching:harness -- find-shadow <person> [page]  FIND-Shadow (E1): heutige Reihenfolge vs. v0.1, Seite vs. global
 *   npm run matching:harness -- list                         verfügbare Fixture-IDs
 *
 * Läuft ausschließlich gegen die synthetischen Test-Fixtures (ohne Holdout-Personen).
 * Keine DB, kein Netz, keine Route, keine Schreibzugriffe. Ausgabe: Resultatobjekte als JSON.
 */
import { createIdfIndex, matchFindPair, rankConnectOffers, rankFindCandidates } from "@/lib/matching/v01";
import {
  NOW,
  findPerson,
  listingsById,
  offerInput,
  profilesById,
  regression,
  seekInput,
  synthetic,
  syntheticIdfSnapshot,
} from "@/lib/matching/v01/__tests__/helpers/synthetic";

const [command = "list", x, y] = process.argv.slice(2);
const pool = new Set(regression.pool_ids);
const IDF_VERSION = "synthetic-v03-all-listings";
const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));

function requireProfile(id: string | undefined) {
  const raw = id ? profilesById.get(id) : undefined;
  if (!raw || !raw.find_profile) throw new Error(`Unbekannte FIND-Fixture: ${id ?? "(leer)"} – siehe "list"`);
  return findPerson(raw);
}

if (command === "list") {
  print({
    find: synthetic.profiles.filter((p) => pool.has(p.id) && p.find_profile?.status === "active").map((p) => p.id),
    connectSeeks: [...listingsById.values()].filter(({ raw, owner }) => raw.direction === "seeking" && pool.has(owner.id)).map(({ raw }) => raw.id),
  });
} else if (command === "find") {
  print(matchFindPair(requireProfile(x), requireProfile(y), {
    familyOfArea: synthetic.family_of,
    idfCorpusVersion: IDF_VERSION,
    blocked: false,
    computedAt: null,
  }));
} else if (command === "rank-find") {
  const viewer = requireProfile(x);
  const candidates = synthetic.profiles
    .filter((p) => pool.has(p.id) && p.id !== viewer.personId && p.find_profile?.status === "active")
    .map((p) => findPerson(p));
  const ranked = rankFindCandidates(viewer, candidates, {
    familyOfArea: synthetic.family_of,
    idfCorpusVersion: IDF_VERSION,
    computedAt: null,
    blockedPersonIds: new Set(),
  });
  print(ranked.slice(0, Number(y ?? 10)).map((r) => ({
    rank: r.rank,
    candidate: r.result.subject.b,
    tieGroup: r.tieGroup,
    eligibility: r.result.eligibility.status,
    explanations: r.result.explanations.filter((e) => e.audience === "a"),
    internal: { mutuality: r.result.relevance.mutuality, aToB: r.result.relevance.aToB, bToA: r.result.relevance.bToA },
  })));
} else if (command === "find-shadow") {
  // Wie FIND heute: published_at absteigend, dann ID, Seiten zu 12 - ohne die Suchfilter der RPC.
  // Der Shadow rankt nur die geladene Seite; "global" zeigt, was dabei verloren geht (Pool-Bias).
  const viewer = requireProfile(x);
  const pageSize = Number(y ?? 12);
  const visible = synthetic.profiles
    .filter((p) => pool.has(p.id) && p.id !== viewer.personId && p.find_profile?.status === "active")
    .map((p) => findPerson(p))
    .sort((m, n) => (m.publishedAt === n.publishedAt ? (m.personId < n.personId ? -1 : 1) : (n.publishedAt ?? "") < (m.publishedAt ?? "") ? -1 : 1));
  const ctx = { familyOfArea: synthetic.family_of, idfCorpusVersion: "none-find-does-not-use-idf", computedAt: null, blockedPersonIds: new Set<string>() };
  const rankOn = (people: typeof visible) => new Map(rankFindCandidates(viewer, people, ctx).map((r) => [r.result.subject.b, r.rank]));
  const onPage = rankOn(visible.slice(0, pageSize));
  const global = rankOn(visible);
  print(visible.map((p, i) => ({
    candidate: p.personId,
    visiblePosition: i + 1,
    onFirstPage: i < pageSize,
    shadowRankOnPage: onPage.get(p.personId) ?? null,
    shadowRankGlobal: global.get(p.personId) ?? null,
  })).filter((row) => row.onFirstPage || (row.shadowRankGlobal !== null && row.shadowRankGlobal <= pageSize)));
} else if (command === "connect") {
  const seek = seekInput(x ?? "");
  const offers = [...listingsById.values()]
    .filter(({ raw, owner }) => raw.direction === "offering" && pool.has(owner.id) && owner.id !== seek.ownerId)
    .map(({ raw }) => offerInput(raw.id));
  const ranked = rankConnectOffers(seek, offers, {
    now: NOW,
    viewerIsNetworkMember: true,
    purpose: "listing_match",
    blockedOwnerIds: new Set(),
    computedAt: null,
  }, createIdfIndex(syntheticIdfSnapshot()));
  print(ranked.slice(0, Number(y ?? 10)));
} else {
  console.error(`Unbekannter Befehl: ${command}`);
  process.exitCode = 1;
}
