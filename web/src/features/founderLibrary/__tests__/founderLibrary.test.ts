import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import de from "../../../../messages/de/founderLibrary.json" with { type: "json" };
import en from "../../../../messages/en/founderLibrary.json" with { type: "json" };
import {
  FOUNDER_LIBRARY_CATEGORY_KEYS,
  FOUNDER_LIBRARY_PHASES,
  FOUNDER_LIBRARY_RESOURCES,
  FOUNDER_LIBRARY_RESOURCE_TYPES,
} from "@/features/founderLibrary/founderLibraryRegistry";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";
import { getMessages } from "@/i18n/messages";

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("Founder Library registry contains five categories and eight unique draft resources", () => {
  assert.equal(FOUNDER_LIBRARY_CATEGORY_KEYS.length, 5);
  assert.equal(FOUNDER_LIBRARY_RESOURCES.length, 8);
  assert.equal(new Set(FOUNDER_LIBRARY_RESOURCES.map((resource) => resource.id)).size, 8);
  assert.equal(new Set(FOUNDER_LIBRARY_RESOURCES.map((resource) => resource.slug)).size, 8);
  assert.ok(FOUNDER_LIBRARY_RESOURCES.every((resource) => resource.status === "draft"));
  assert.deepEqual(
    new Set(FOUNDER_LIBRARY_RESOURCES.map((resource) => resource.category)),
    new Set(FOUNDER_LIBRARY_CATEGORY_KEYS)
  );
});

test("resource metadata only uses declared phases, types, and real Founder Setup keys", () => {
  const phases = new Set<string>(FOUNDER_LIBRARY_PHASES);
  const types = new Set<string>(FOUNDER_LIBRARY_RESOURCE_TYPES);
  const setupKeys = new Set<string>(FOUNDER_SETUP_ITEM_KEYS);
  for (const resource of FOUNDER_LIBRARY_RESOURCES) {
    assert.ok(resource.phases.length > 0, resource.id);
    assert.ok(resource.resourceTypes.length > 0, resource.id);
    assert.ok(resource.phases.every((phase) => phases.has(phase)), resource.id);
    assert.ok(resource.resourceTypes.every((type) => types.has(type)), resource.id);
    assert.ok(resource.setupTopicKeys.every((key) => setupKeys.has(key)), resource.id);
  }
  assert.deepEqual(
    FOUNDER_LIBRARY_RESOURCES.find((resource) => resource.id === "commitment")?.setupTopicKeys,
    ["time_commitment", "changing_commitment"]
  );
});

test("DE and EN cover the complete static information architecture", () => {
  assert.deepEqual(Object.keys(de), Object.keys(en));
  assert.deepEqual(Object.keys(de.categories), [...FOUNDER_LIBRARY_CATEGORY_KEYS]);
  assert.deepEqual(Object.keys(de.categories), Object.keys(en.categories));
  assert.deepEqual(Object.keys(de.resourceTypes), [...FOUNDER_LIBRARY_RESOURCE_TYPES]);
  assert.deepEqual(Object.keys(de.resourceTypes), Object.keys(en.resourceTypes));
  assert.deepEqual(Object.keys(de.phases), [...FOUNDER_LIBRARY_PHASES]);
  assert.deepEqual(Object.keys(de.phases), Object.keys(en.phases));
  assert.deepEqual(Object.keys(de.resources), FOUNDER_LIBRARY_RESOURCES.map((resource) => resource.id));
  assert.deepEqual(Object.keys(de.resources), Object.keys(en.resources));
  assert.ok(FOUNDER_LIBRARY_RESOURCES.every((resource) => de.resources[resource.id].title && de.resources[resource.id].description));
  assert.ok(FOUNDER_LIBRARY_RESOURCES.every((resource) => en.resources[resource.id].title && en.resources[resource.id].description));
  assert.ok("founderLibrary" in getMessages("de"));
  assert.ok("founderLibrary" in getMessages("en"));
});

test("team-scoped route is server-authorized for founders and fails closed for advisors", () => {
  const page = source("../../../app/(product)/teams/[teamId]/founder-library/page.tsx");
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /getFounderTeamHomebase\(teamId, user\.id, supabase\)/);
  assert.match(page, /if \(!team\) notFound\(\)/);
  assert.doesNotMatch(page, /Advisor|advisor|serviceRole|service_role/);
  assert.match(page, /active="library"/);
});

test("draft cards are semantic, mobile-first, and expose only real Founder Setup links", () => {
  const page = source("../../../app/(product)/teams/[teamId]/founder-library/page.tsx");
  assert.match(page, /<section key=\{category\} aria-labelledby=/);
  assert.match(page, /<article key=\{resource\.id\}/);
  assert.match(page, /grid gap-4 lg:grid-cols-2/);
  assert.match(page, /flex flex-wrap/);
  assert.match(page, /setup\/\$\{encodeURIComponent\(topicKey\)\}/);
  assert.match(page, /focus-visible:ring-2/);
  assert.doesNotMatch(page, /resource\.slug\}|href=.*founder-library.*resource/);
  assert.doesNotMatch(page, /onClick=/);
});

test("team homebase and navigation expose the Founder Library without advisor integration", () => {
  const homebase = source("../../../app/(product)/teams/[teamId]/page.tsx");
  const card = source("../FounderLibraryHomebaseCard.tsx");
  const navigation = source("../../teams/FounderTeamNavigation.tsx");
  assert.match(homebase, /<FounderLibraryHomebaseCard teamId=\{teamId\}/);
  assert.match(card, /\/founder-library/);
  assert.match(card, /<Link/);
  assert.match(navigation, /key: "library"/);
  assert.doesNotMatch(card, />8<|8 resources|8 Ressourcen|resources available|Ressourcen verfügbar/i);
});
