import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import de from "../../../../messages/de/founderLibrary.json" with { type: "json" };
import en from "../../../../messages/en/founderLibrary.json" with { type: "json" };
import {
  FOUNDER_LIBRARY_CATEGORY_KEYS,
  FOUNDER_LIBRARY_TERMS,
  filterFounderLibraryTerms,
  retainVisibleFounderLibraryOpenTerm,
  sortFounderLibraryTerms,
  toggleFounderLibraryOpenTerm,
  type LocalizedFounderLibraryTerm,
} from "@/features/founderLibrary/founderLibraryRegistry";
import {
  FOUNDER_LIBRARY_OFFICIAL_SOURCES,
  FOUNDER_LIBRARY_UPDATES,
  FOUNDER_LIBRARY_UPDATE_STATUSES,
  sortFounderLibraryUpdates,
} from "@/features/founderLibrary/founderLibraryUpdatesRegistry";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";
import { getMessages } from "@/i18n/messages";

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

function localizedTerms(locale: "de" | "en"): LocalizedFounderLibraryTerm[] {
  const messages = locale === "de" ? de : en;
  return FOUNDER_LIBRARY_TERMS.map((entry) => ({
    ...entry,
    term: messages.terms[entry.id].term,
    shortDefinition: messages.terms[entry.id].shortDefinition,
  }));
}

test("Glossary registry contains twenty unique, available terms in populated categories", () => {
  assert.equal(FOUNDER_LIBRARY_CATEGORY_KEYS.length, 3);
  assert.equal(FOUNDER_LIBRARY_TERMS.length, 20);
  assert.equal(new Set(FOUNDER_LIBRARY_TERMS.map((entry) => entry.id)).size, FOUNDER_LIBRARY_TERMS.length);
  assert.equal(new Set(FOUNDER_LIBRARY_TERMS.map((entry) => entry.slug)).size, FOUNDER_LIBRARY_TERMS.length);
  assert.ok(FOUNDER_LIBRARY_TERMS.every((entry) => entry.status === "available"));
  assert.ok(FOUNDER_LIBRARY_CATEGORY_KEYS.every((category) => FOUNDER_LIBRARY_TERMS.some((entry) => entry.category === category)));
  const ids = FOUNDER_LIBRARY_TERMS.map((entry) => String(entry.id));
  assert.equal(ids.includes("roles_responsibilities"), false);
  assert.equal(ids.includes("decision_rights"), false);
});

test("Glossary contract stays narrow and only maps real Founder Setup keys", () => {
  const setupKeys = new Set<string>(FOUNDER_SETUP_ITEM_KEYS);
  for (const entry of FOUNDER_LIBRARY_TERMS) {
    assert.ok(FOUNDER_LIBRARY_CATEGORY_KEYS.includes(entry.category));
    assert.ok(["draft", "available"].includes(entry.status));
    assert.ok((entry.setupTopicKeys ?? []).every((key) => setupKeys.has(key)), entry.id);
    assert.doesNotMatch(JSON.stringify(entry), /phases|resourceTypes/);
  }
  assert.deepEqual(FOUNDER_LIBRARY_TERMS.find((entry) => entry.id === "vesting")?.setupTopicKeys, ["vesting"]);
  assert.deepEqual(FOUNDER_LIBRARY_TERMS.find((entry) => entry.id === "deadlock")?.setupTopicKeys, ["conflict_deadlock"]);
});

test("DE and EN contain every term and complete glossary chrome", () => {
  assert.deepEqual(Object.keys(de), Object.keys(en));
  assert.deepEqual(Object.keys(de.categories), [...FOUNDER_LIBRARY_CATEGORY_KEYS]);
  assert.deepEqual(Object.keys(de.categories), Object.keys(en.categories));
  assert.deepEqual(Object.keys(de.terms), FOUNDER_LIBRARY_TERMS.map((entry) => entry.id));
  assert.deepEqual(Object.keys(de.terms), Object.keys(en.terms));
  assert.ok(FOUNDER_LIBRARY_TERMS.every((entry) => de.terms[entry.id].term && de.terms[entry.id].shortDefinition));
  assert.ok(FOUNDER_LIBRARY_TERMS.every((entry) => en.terms[entry.id].term && en.terms[entry.id].shortDefinition));
  assert.equal("phases" in de || "resourceTypes" in de || "resources" in de, false);
  assert.equal("phases" in en || "resourceTypes" in en || "resources" in en, false);
  assert.ok("founderLibrary" in getMessages("de"));
  assert.ok("founderLibrary" in getMessages("en"));
});

test("curated updates registry contains exactly three chronological official-source entries", () => {
  assert.equal(FOUNDER_LIBRARY_UPDATES.length, 3);
  assert.equal(new Set(FOUNDER_LIBRARY_UPDATES.map((entry) => entry.id)).size, 3);
  assert.deepEqual(sortFounderLibraryUpdates(FOUNDER_LIBRARY_UPDATES).map((entry) => entry.id), [
    "ki_mig_2026",
    "electronic_withdrawal_function_2026",
    "dadg_2026",
  ]);
  assert.ok(FOUNDER_LIBRARY_UPDATES.every((entry) => FOUNDER_LIBRARY_UPDATE_STATUSES.includes(entry.status)));
  assert.ok(FOUNDER_LIBRARY_UPDATES.every((entry) => entry.status === "in_force"));
  assert.deepEqual(FOUNDER_LIBRARY_UPDATES.map((entry) => entry.date), ["2026-07-29", "2026-05-30", "2026-06-19"]);
  assert.deepEqual(FOUNDER_LIBRARY_UPDATES.map((entry) => entry.sourceUrl), [
    "https://www.gesetze-im-internet.de/ki-mig/BJNR0DF0B0026.html",
    "https://www.gesetze-im-internet.de/dadg/BJNR09D0B0026.html",
    "https://www.gesetze-im-internet.de/bgb/__356a.html",
  ]);
  assert.ok(FOUNDER_LIBRARY_UPDATES.every((entry) => !/risk|impact|urgency|personal/i.test(JSON.stringify(entry))));
});

test("updates and official sources are complete in DE and EN", () => {
  assert.deepEqual(Object.keys(de.updates), Object.keys(en.updates));
  assert.deepEqual(Object.keys(de.updates.entries), FOUNDER_LIBRARY_UPDATES.map((entry) => entry.id));
  assert.deepEqual(Object.keys(de.updates.entries), Object.keys(en.updates.entries));
  assert.deepEqual(Object.keys(de.updates.statusDatePrefixes), [...FOUNDER_LIBRARY_UPDATE_STATUSES]);
  assert.deepEqual(Object.keys(de.updates.statusDatePrefixes), Object.keys(en.updates.statusDatePrefixes));
  assert.deepEqual(de.updates.statusDatePrefixes, {
    consultation: "Stand:",
    promulgated: "Verkündet am",
    in_force: "In Kraft seit",
  });
  assert.deepEqual(en.updates.statusDatePrefixes, {
    consultation: "Status as of",
    promulgated: "Promulgated on",
    in_force: "In force since",
  });
  assert.equal(FOUNDER_LIBRARY_OFFICIAL_SOURCES.length, 4);
  assert.deepEqual(Object.keys(de.updates.sources), FOUNDER_LIBRARY_OFFICIAL_SOURCES.map((source) => source.id));
  assert.deepEqual(Object.keys(de.updates.sources), Object.keys(en.updates.sources));
  for (const update of FOUNDER_LIBRARY_UPDATES) {
    assert.ok(de.updates.entries[update.id].title && de.updates.entries[update.id].relevance);
    assert.ok(en.updates.entries[update.id].title && en.updates.entries[update.id].relevance);
  }
  assert.ok(de.updates.disclaimer);
  assert.ok(en.updates.disclaimer);
});

test("search is case-insensitive across terms and definitions", () => {
  const terms = localizedTerms("en");
  assert.deepEqual(filterFounderLibraryTerms(terms, "CAP TABLE", "all").map((entry) => entry.id), ["cap_table"]);
  assert.ok(filterFounderLibraryTerms(terms, "available cash", "all").some((entry) => entry.id === "runway"));
  assert.equal(filterFounderLibraryTerms(terms, "not-a-real-glossary-term", "all").length, 0);
});

test("category filter combines with search and alphabetical sorting is locale-aware", () => {
  const terms = localizedTerms("de");
  assert.deepEqual(
    filterFounderLibraryTerms(terms, "Beteilig", "contracts_governance").map((entry) => entry.id),
    ["founder_agreement", "founder_exit", "good_bad_leaver"],
  );
  assert.equal(filterFounderLibraryTerms(terms, "Runway", "company_building").length, 0);
  const sorted = sortFounderLibraryTerms(terms, "de").map((entry) => entry.term);
  assert.deepEqual(sorted, [...sorted].sort((left, right) => left.localeCompare(right, "de", { sensitivity: "base" })));
});

test("accordion keeps at most one term open and toggles the current term closed", () => {
  let openTermId: string | null = null;
  assert.equal(openTermId, null);

  openTermId = toggleFounderLibraryOpenTerm(openTermId, "vesting");
  assert.equal(openTermId, "vesting");

  openTermId = toggleFounderLibraryOpenTerm(openTermId, "runway");
  assert.equal(openTermId, "runway");

  openTermId = toggleFounderLibraryOpenTerm(openTermId, "runway");
  assert.equal(openTermId, null);
});

test("search or category filtering clears an open term once it is no longer visible", () => {
  const terms = localizedTerms("en");
  const financingTerms = filterFounderLibraryTerms(terms, "", "equity_financing");
  assert.equal(retainVisibleFounderLibraryOpenTerm("runway", financingTerms), "runway");

  const searchResults = filterFounderLibraryTerms(terms, "Vesting", "all");
  assert.equal(retainVisibleFounderLibraryOpenTerm("runway", searchResults), null);
  assert.equal(retainVisibleFounderLibraryOpenTerm(null, terms), null);
});

test("team-scoped route remains server-authorized for founders and fails closed for advisors", () => {
  const page = source("../../../app/(product)/teams/[teamId]/founder-library/page.tsx");
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /getFounderTeamHomebase\(teamId, user\.id, supabase\)/);
  assert.match(page, /if \(!team\) notFound\(\)/);
  assert.doesNotMatch(page, /Advisor|advisor|serviceRole|service_role/);
  assert.match(page, /active="library"/);
});

test("glossary UI provides accessible search, filters, accordions, and deferred Setup links", () => {
  const glossary = source("../FounderLibraryGlossary.tsx");
  const page = source("../../../app/(product)/teams/[teamId]/founder-library/page.tsx");
  assert.match(glossary, /type="search"/);
  assert.match(glossary, /<label htmlFor="founder-library-search"/);
  assert.match(glossary, /aria-pressed=\{selected\}/);
  assert.match(glossary, /aria-expanded=\{isOpen\}/);
  assert.match(glossary, /aria-controls=\{panelId\}/);
  assert.match(glossary, /useState<string \| null>\(null\)/);
  assert.doesNotMatch(glossary, /ReadonlySet|new Set|openIds/);
  assert.match(glossary, /<button/);
  assert.match(glossary, /flex flex-wrap/);
  assert.match(glossary, /setup\/\$\{encodeURIComponent\(topicKey\)\}/);
  assert.match(glossary, /isOpen \? \(/);
  assert.equal(glossary.match(/\{entry\.shortDefinition\}/g)?.length, 1);
  assert.doesNotMatch(glossary, /aria-describedby|definitionId/);
  assert.doesNotMatch(glossary, /href=.*founder-library.*entry|grid-cols-[234]/);
  assert.doesNotMatch(page + glossary, /resourceTypes|resource\.phases|phaseLabel/);
});

test("Founder Library defaults to Glossary and exposes a minimal Updates & Sources view", () => {
  const page = source("../../../app/(product)/teams/[teamId]/founder-library/page.tsx");
  const updates = source("../FounderLibraryUpdates.tsx");
  assert.match(page, /\?\.view === "updates" \? "updates" : "glossary"/);
  assert.match(page, /views\.glossary/);
  assert.match(page, /views\.updates/);
  assert.match(page, /<FounderLibraryGlossary/);
  assert.match(page, /<FounderLibraryUpdates/);
  assert.match(updates, /sortFounderLibraryUpdates\(updates\)/);
  assert.match(updates, /target="_blank"/);
  assert.match(updates, /rel="noopener noreferrer"/);
  assert.match(updates, /labels\.officialSourceLink/);
  assert.match(updates, /labels\.statusDatePrefixes\[update\.status\]/);
  assert.match(updates, /<time dateTime=\{update\.date\}>/);
  assert.match(updates, /labels\.disclaimer/);
  assert.doesNotMatch(updates, /search|filter|favorite|notification|riskScore|grid-cols/iu);
});

test("team homebase keeps Founder Setup before the concise glossary entry", () => {
  const homebase = source("../../../app/(product)/teams/[teamId]/page.tsx");
  const card = source("../FounderLibraryHomebaseCard.tsx");
  const navigation = source("../../teams/FounderTeamNavigation.tsx");
  assert.match(homebase, /<FounderLibraryHomebaseCard teamId=\{teamId\}/);
  assert.match(card, /\/founder-library/);
  assert.match(card, /<Link/);
  assert.match(navigation, /key: "library"/);
  assert.ok(homebase.indexOf('aria-labelledby="team-setup-title"') < homebase.indexOf("<FounderLibraryHomebaseCard"));
});
