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
  assert.match(page, /profile\.seekingRoles/);
  assert.match(page, /commitmentLevels/);
  assert.match(page, /ventureStages/);
  assert.match(page, /ventureGoals/);
  assert.match(page, /profile\.searchIntent \?/);
  assert.match(page, /profile\.startHorizon \?/);
  assert.doesNotMatch(page, /high_intent|seriousFounder|readinessScore/);
  assert.match(page, /candidate\.practicalMatches/);
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
  const interestsIndex = page.indexOf('t("detail.sections.interests.title")');
  assert.ok(introIndex > 0 && interestsIndex > introIndex);
  assert.match(page, /detail\.sections\.brings\.title/);
  assert.match(page, /detail\.sections\.seeks\.title/);
  assert.match(page, /detail\.sections\.founding\.title/);
});

test("all Discovery routes use the founder access guard", () => {
  const access = readFileSync("src/features/discovery/discoveryAccess.ts", "utf8");
  assert.match(access, /\.catch\(\(\) => null\)/);
  assert.match(access, /hasProfileRole\(profile\.roles, "founder"\)/);
  for (const route of [
    "src/app/(product)/discovery/page.tsx",
    "src/app/(product)/discovery/profile/page.tsx",
    "src/app/(product)/discovery/[profileId]/page.tsx",
    "src/app/(product)/discovery/intros/page.tsx",
    "src/app/(product)/discovery/intros/[introRequestId]/matching/page.tsx",
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
    data.indexOf("export async function upsertOwnDiscoveryProfile")
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
  assert.equal(de.v2.cards.practicalMatches, "Passt zu deiner Suche");
  assert.equal(en.v2.cards.practicalMatches, "Matches your search");
  const intros = readFileSync("src/app/(product)/discovery/intros/page.tsx", "utf8");
  assert.doesNotMatch(intros, />\s*Discovery Intros\s*</);
  assert.match(intros, /t\("intros\.eyebrow"\)/);
});
