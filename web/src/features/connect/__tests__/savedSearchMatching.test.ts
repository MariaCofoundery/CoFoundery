import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  matchSavedSearch,
  matchSavedSearches,
  type SavedSearchCriteria,
  type SearchableConnectSubject,
} from "@/features/connect/savedSearchMatching";

const source = (path: string) => readFileSync(path, "utf8");

const search = (over: Partial<SavedSearchCriteria> = {}): SavedSearchCriteria => ({
  id: "search-1",
  userId: "sucherin",
  query: "",
  topics: [],
  industries: [],
  locations: [],
  geographicScope: null,
  remoteMode: null,
  capabilityAreaIds: [],
  connectDirection: null,
  connectCategory: null,
  includeListings: true,
  includeProblems: true,
  ...over,
});

const subject = (over: Partial<SearchableConnectSubject> = {}): SearchableConnectSubject => ({
  kind: "listing",
  id: "subject-1",
  ownerUserId: "anbieterin",
  title: "Unterstützung beim Aufbau von Vertriebsstrukturen",
  summary: "Ich helfe jungen Teams, ihre ersten Enterprise-Kunden zu gewinnen.",
  topics: ["B2B Sales"],
  industries: ["HealthTech"],
  locations: ["Berlin"],
  geographicScope: "germany",
  remoteMode: "hybrid",
  direction: "offering",
  category: "expertise",
  capabilityAreaIds: ["b2b_sales"],
  ...over,
});

// ---------------------------------------------------------------------------
// Jedes gesetzte Kriterium muss zutreffen
// ---------------------------------------------------------------------------
test("one criterion that fits is a match, with its reason", () => {
  const match = matchSavedSearch(search({ topics: ["B2B Sales"] }), subject());
  assert.ok(match);
  assert.deepEqual(match.reasons, [{ key: "topic", value: "B2B Sales" }]);
});

test("a criterion that does not fit makes the whole thing no match", () => {
  // Keine Punktzahl, die man ueberschreiten kann: Wer drei Kriterien setzt,
  // will alle drei.
  const criteria = search({ topics: ["B2B Sales"], industries: ["FinTech"] });
  assert.equal(matchSavedSearch(criteria, subject()), null);
});

test("every fitting criterion contributes its own reason", () => {
  const match = matchSavedSearch(
    search({ topics: ["B2B Sales"], industries: ["HealthTech"], locations: ["Berlin"] }),
    subject()
  );
  assert.ok(match);
  assert.deepEqual(
    match.reasons.map((reason) => reason.key),
    ["topic", "industry", "location"]
  );
});

test("matching ignores case and stray spaces", () => {
  const match = matchSavedSearch(search({ topics: ["  b2b sales "] }), subject());
  assert.ok(match, "sonst haengt ein Treffer an der Schreibweise");
});

// ---------------------------------------------------------------------------
// Freitext
// ---------------------------------------------------------------------------
test("the free text searches title, summary, topics, industries and locations", () => {
  for (const term of ["Vertriebsstrukturen", "Enterprise", "B2B", "HealthTech", "Berlin"]) {
    assert.ok(matchSavedSearch(search({ query: term }), subject()), `${term} sollte treffen`);
  }
  assert.equal(matchSavedSearch(search({ query: "Buchhaltung" }), subject()), null);
});

test("a word fragment finds the compound", () => {
  // Deutsche Komposita, wie bei der Suche im Brett.
  assert.ok(matchSavedSearch(search({ query: "vertrieb" }), subject()));
});

// ---------------------------------------------------------------------------
// Faehigkeiten - die Verbindung zum Capability-Modell
// ---------------------------------------------------------------------------
test("a capability criterion uses the vocabulary, not words in the text", () => {
  assert.ok(matchSavedSearch(search({ capabilityAreaIds: ["b2b_sales"] }), subject()));

  // Der Text enthaelt "Vertrieb", aber die Person hat software_engineering
  // nicht freigegeben - also trifft es nicht zu. Wir raten nicht aus dem Text.
  assert.equal(
    matchSavedSearch(search({ capabilityAreaIds: ["software_engineering"] }), subject()),
    null
  );
});

test("no disclosed capabilities means a capability criterion never fits", () => {
  // Leer heisst nicht freigegeben oder nicht eingetragen. Beides darf keinen
  // Treffer erzeugen - sonst waere eine Nichtangabe eine Aussage.
  assert.equal(
    matchSavedSearch(search({ capabilityAreaIds: ["b2b_sales"] }), subject({ capabilityAreaIds: [] })),
    null
  );
});

// ---------------------------------------------------------------------------
// Was nie eine Meldung ausloest
// ---------------------------------------------------------------------------
test("nobody is notified about their own entry", () => {
  const criteria = search({ userId: "anbieterin", topics: ["B2B Sales"] });
  assert.equal(matchSavedSearch(criteria, subject({ ownerUserId: "anbieterin" })), null);
});

test("a search can exclude listings or problems", () => {
  const onlyProblems = search({ topics: ["B2B Sales"], includeListings: false });
  assert.equal(matchSavedSearch(onlyProblems, subject({ kind: "listing" })), null);
  assert.ok(matchSavedSearch(onlyProblems, subject({ kind: "problem" })));

  const onlyListings = search({ topics: ["B2B Sales"], includeProblems: false });
  assert.equal(matchSavedSearch(onlyListings, subject({ kind: "problem" })), null);
});

test("a match without a reason is impossible", () => {
  // Eine Meldung ohne Begruendung waere das Schlimmste, was hier herauskommen
  // koennte - die Datenbank verbietet leere Suchen, und hier steht der Riegel
  // noch einmal.
  assert.equal(matchSavedSearch(search(), subject()), null);
  const matching = source("src/features/connect/savedSearchMatching.ts");
  assert.match(matching, /if \(!reasons\.length\) return null;/);
});

// ---------------------------------------------------------------------------
// Einzelne Kriterien
// ---------------------------------------------------------------------------
test("a flexible entry fits every remote wish", () => {
  // "flexible" heisst auf der Anzeige: Ich lege mich nicht fest.
  for (const wish of ["onsite", "hybrid", "remote"]) {
    assert.ok(
      matchSavedSearch(search({ remoteMode: wish }), subject({ remoteMode: "flexible" })),
      `${wish} sollte zu flexible passen`
    );
  }
  assert.equal(
    matchSavedSearch(search({ remoteMode: "onsite" }), subject({ remoteMode: "remote" })),
    null
  );
});

test("direction and category are exact", () => {
  assert.ok(matchSavedSearch(search({ connectDirection: "offering" }), subject()));
  assert.equal(matchSavedSearch(search({ connectDirection: "seeking" }), subject()), null);
  assert.ok(matchSavedSearch(search({ connectCategory: "expertise" }), subject()));
  assert.equal(matchSavedSearch(search({ connectCategory: "investment" }), subject()), null);
});

// ---------------------------------------------------------------------------
// Mehrere Suchen
// ---------------------------------------------------------------------------
test("several searches are checked independently", () => {
  const matches = matchSavedSearches(
    [
      search({ id: "a", topics: ["B2B Sales"] }),
      search({ id: "b", topics: ["Buchhaltung"] }),
      search({ id: "c", userId: "andere", industries: ["HealthTech"] }),
    ],
    subject()
  );
  assert.deepEqual(
    matches.map((match) => match.searchId),
    ["a", "c"]
  );
});

// ---------------------------------------------------------------------------
// Keine Bewertung
// ---------------------------------------------------------------------------
test("there is no score in the matching at all", () => {
  const matching = source("src/features/connect/savedSearchMatching.ts");
  // Eine Punktzahl waere der Anfang einer Rangliste, und eine Rangliste ist
  // eine Bewertung von Menschen.
  assert.doesNotMatch(matching, /score|weight|ranking|rank\b/i);
  const match = matchSavedSearch(search({ topics: ["B2B Sales"] }), subject());
  assert.ok(match);
  assert.equal("score" in match, false);
});
