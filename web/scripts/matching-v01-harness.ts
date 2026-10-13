/**
 * Nicht-produktiver Harness für die Matching Engine v0.1 (Prototyp).
 *
 *   npm run matching:harness -- find <personA> <personB>     zwei FIND-Fixtures vergleichen
 *   npm run matching:harness -- rank-find <person> [n]       FIND-Rangliste für eine Person
 *   npm run matching:harness -- connect <seekListing> [n]    ein CONNECT-Gesuch gegen alle Angebote ranken
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
