import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  matchDiscoverySavedSearch,
  matchDiscoverySavedSearches,
  type DiscoverySavedSearchCriteria,
  type SearchableDiscoveryProfile,
} from "@/features/discovery/discoverySavedSearchMatching";

const source = (path: string) => readFileSync(path, "utf8");

const search = (over: Partial<DiscoverySavedSearchCriteria> = {}): DiscoverySavedSearchCriteria => ({
  id: "search-1",
  userId: "sucherin",
  query: "",
  topics: [],
  industries: [],
  locations: [],
  remoteMode: null,
  capabilityAreaIds: [],
  alignmentDimensions: [],
  ...over,
});

const profile = (over: Partial<SearchableDiscoveryProfile> = {}): SearchableDiscoveryProfile => ({
  userId: "neue-person",
  displayName: "Neue Person",
  headline: "Baut Backends für kleine Teams",
  ownRoles: ["tech"],
  expertise: ["Software Development", "Architektur"],
  industries: ["HealthTech"],
  locationLabel: "Berlin",
  remoteMode: "hybrid",
  capabilityAreaIds: ["software_engineering"],
  ...over,
});

test("a structural criterion that fits is a match with its reason", () => {
  const match = matchDiscoverySavedSearch(search({ topics: ["Software Development"] }), profile());
  assert.ok(match);
  assert.deepEqual(match.reasons, [{ key: "expertise", value: "Software Development" }]);
});

test("every set criterion must fit", () => {
  const criteria = search({ topics: ["Software Development"], industries: ["FinTech"] });
  assert.equal(matchDiscoverySavedSearch(criteria, profile()), null);
});

test("an explicitly sought capability uses the vocabulary", () => {
  // Genau der Fall aus dem Gespraech: Wer im IT-Bereich gruenden will und
  // ausdruecklich Programmierfaehigkeiten sucht.
  assert.ok(matchDiscoverySavedSearch(search({ capabilityAreaIds: ["software_engineering"] }), profile()));
  assert.equal(
    matchDiscoverySavedSearch(search({ capabilityAreaIds: ["b2b_sales"] }), profile()),
    null
  );
  // Nicht freigegeben heisst nie ein Treffer.
  assert.equal(
    matchDiscoverySavedSearch(
      search({ capabilityAreaIds: ["software_engineering"] }),
      profile({ capabilityAreaIds: [] })
    ),
    null
  );
});

test("a place matches as part of the label", () => {
  assert.ok(matchDiscoverySavedSearch(search({ locations: ["berlin"] }), profile()));
  assert.equal(matchDiscoverySavedSearch(search({ locations: ["Hamburg"] }), profile()), null);
});

test("nobody matches their own profile", () => {
  const criteria = search({ userId: "neue-person", topics: ["Architektur"] });
  assert.equal(matchDiscoverySavedSearch(criteria, profile()), null);
});

test("the alignment filter is carried, not applied here", () => {
  // Die Tendenz entsteht aus den Antworten der suchenden Person und laesst
  // sich beim Veroeffentlichen nicht berechnen - die Sitzung gehoert der
  // neuen Person.
  const match = matchDiscoverySavedSearch(
    search({ topics: ["Architektur"], alignmentDimensions: ["decision_logic"] }),
    profile()
  );
  assert.ok(match);
  assert.equal(match.hasAlignmentFilter, true, "die Meldung sagt dazu, dass noch ein Filter wirkt");

  const matcherSource = source("src/features/discovery/discoverySavedSearchMatching.ts");
  // Und hier wird keine Tendenz berechnet - kein zweiter Ort fuer das
  // Scoring-Modell.
  assert.doesNotMatch(matcherSource, /aggregateFounderBaseScores|getSelfDimensionTendency/);
});

test("there is no score here either", () => {
  const matcherSource = source("src/features/discovery/discoverySavedSearchMatching.ts");
  assert.doesNotMatch(matcherSource, /\bscore\b|weight|ranking/i);
});

test("several searches are checked independently", () => {
  const matches = matchDiscoverySavedSearches(
    [
      search({ id: "a", topics: ["Architektur"] }),
      search({ id: "b", industries: ["FinTech"] }),
    ],
    profile()
  );
  assert.deepEqual(matches.map((match) => match.searchId), ["a"]);
});
