import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  compactDiscoveryValues,
  getDiscoverySearchBriefCriteria,
} from "@/features/discovery/discoveryPresentation";
import type { DiscoveryMustHaves } from "@/features/discovery/discoveryTypes";

const emptyFilters: DiscoveryMustHaves = {
  minimumAvailabilityHoursPerWeek: null,
  acceptedRemoteModes: [],
  requiredRolesAny: [],
  requiredExpertiseAny: [],
  requiredCapabilityAreasAny: [],
  acceptedSearchIntents: [],
  acceptedStartHorizons: [],
  desiredLocationRegion: null,
  requiredIndustriesAny: [],
  acceptedCommitmentLevels: [],
  acceptedVentureStages: [],
  acceptedVentureGoals: [],
};

test("Search Brief contains only active existing practical filters", () => {
  assert.deepEqual(getDiscoverySearchBriefCriteria(emptyFilters), []);
  assert.deepEqual(
    getDiscoverySearchBriefCriteria({
      ...emptyFilters,
      requiredRolesAny: ["tech"],
      requiredExpertiseAny: ["AI", "React"],
      desiredLocationRegion: "Berlin",
      acceptedRemoteModes: ["remote"],
      minimumAvailabilityHoursPerWeek: 20,
    }),
    [
      { key: "role", values: ["tech"] },
      { key: "expertise", values: ["AI", "React"] },
      { key: "location", values: ["Berlin"] },
      { key: "remote", values: ["remote"] },
      { key: "availability", values: ["20"] },
    ]
  );
});

test("card values stay compact without changing their meaning", () => {
  assert.deepEqual(compactDiscoveryValues(["Tech", "AI", "React", "Data"]), {
    visible: ["Tech", "AI", "React"],
    remaining: 1,
  });
});

test("Search cards expose sought roles, founding context, and only explicit Slice 2 intent", () => {
  const page = readFileSync("src/app/(product)/discovery/page.tsx", "utf8");
  const card = readFileSync("src/features/discovery/FounderDiscoveryCard.tsx", "utf8");
  assert.match(card, /profile\.seekingRoles/);
  assert.match(card, /commitmentLevels/);
  assert.match(card, /ventureStages/);
  assert.match(card, /ventureGoals/);
  assert.match(card, /profile\.searchIntent \?/);
  assert.match(card, /profile\.startHorizon \?/);
  assert.doesNotMatch(card, /high_intent|seriousFounder|readinessScore/);
  assert.match(card, /candidate\.practicalMatches/);
  assert.match(page, /showMatchReasons=\{mode === "search"\}/);
});

test("Search empty state offers an explicit user-controlled reset", () => {
  const page = readFileSync("src/app/(product)/discovery/page.tsx", "utf8");
  assert.match(page, /<form action=\{resetSearch\}/);
  assert.match(page, /v2\.results\.reset/);
});

test("profile detail uses editorial sections and moves the existing intro state above them", () => {
  const page = readFileSync("src/app/(product)/discovery/[profileId]/page.tsx", "utf8");
  const introIndex = page.indexOf("<IntroRequestCard");
  // Phase 11: Person -> Sucht -> Faehigkeiten & Verantwortung -> Arbeitsweise
  // -> Warum ein Gespraech -> Frueh besprechen -> Intro.
  const order = [
    'detail.sections.search.title',
    'detail.sections.capability.title',
    '<DiscoveryWorkstyle',
    'kind="why"',
    'kind="discuss"',
  ].map((marker) => page.indexOf(marker));
  assert.ok(introIndex > 0 && order[0] > introIndex);
  order.forEach((at, n) => assert.ok(at > (n ? order[n - 1] : 0), `Reihenfolge ${n}`));
  assert.ok(page.lastIndexOf("<IntroRequestCard") > order.at(-1)!, "die Frage steht am Ende");
});

test("all Discovery routes use the founder access guard", () => {
  const access = readFileSync("src/features/discovery/discoveryAccess.ts", "utf8");
  assert.match(access, /\.catch\(\(\) => null\)/);
  assert.match(access, /hasProfileRole\(profile\.roles, "founder"\)/);
  for (const route of [
    "src/app/(product)/discovery/page.tsx",
    "src/app/(product)/discovery/profile/page.tsx",
    "src/app/(product)/discovery/[profileId]/page.tsx",
    "src/app/(product)/discovery/saved/page.tsx",
    "src/app/(product)/discovery/intros/page.tsx",
    "src/app/(product)/discovery/intros/[introRequestId]/matching/page.tsx",
    // Phase 11: auch die private Suche und die gemerkten Suchen.
    "src/app/(product)/discovery/suche/page.tsx",
    "src/app/(product)/discovery/searches/page.tsx",
  ]) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /hasFounderDiscoveryAccess/);
    assert.match(source, /redirect\("\/advisor\/dashboard"\)/);
  }
});

test("Discovery profile editor loads the owner profile without an active-status filter", () => {
  const page = readFileSync("src/app/(product)/discovery/profile/page.tsx", "utf8");
  const data = readFileSync("src/features/discovery/discoveryData.ts", "utf8");
  const ownProfileLoader = data.slice(
    data.indexOf("export async function getOwnDiscoveryProfile"),
    data.indexOf("export async function getActiveDiscoveryProfilesByIds")
  );
  assert.match(page, /getOwnDiscoveryProfile\(user\.id\)/);
  assert.match(ownProfileLoader, /\.eq\("user_id", normalizedUserId\)\s*\.maybeSingle\(\)/);
  assert.doesNotMatch(ownProfileLoader, /\.eq\("status", "active"\)/);
});

test("Discovery Slice 1 copy is parallel and removes the hardcoded Intros eyebrow", () => {
  const de = JSON.parse(readFileSync("messages/de/discovery.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/discovery.json", "utf8"));
  assert.equal(de.v2.search.edit, "Suche bearbeiten");
  assert.equal(en.v2.search.edit, "Edit search");
  // Phase 11: keine Passungssprache - es sind erfuellte Kriterien.
  assert.equal(de.v2.cards.practicalMatches, "Entspricht deinen Kriterien");
  assert.equal(en.v2.cards.practicalMatches, "Meets your criteria");
  const intros = readFileSync("src/app/(product)/discovery/intros/page.tsx", "utf8");
  assert.doesNotMatch(intros, />\s*Discovery Intros\s*</);
  assert.match(intros, /t\("intros\.eyebrow"\)/);
});
