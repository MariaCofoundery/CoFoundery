import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  normalizeDiscoveryPreferencesInput,
  normalizeDiscoveryProfileInput,
} from "@/features/discovery/discoveryValidation";
import {
  selectSimilarPrioritizedAlignmentDimensions,
} from "@/features/discovery/discoveryV2Alignment";
import {
  attachDiscoveryV2AlignmentSimilarities,
  buildDiscoveryV2Candidate,
  getDiscoveryV2PracticalMatches,
} from "@/features/discovery/discoveryV2Search";
import type {
  DiscoveryMustHaves,
  FounderDiscoveryProfile,
} from "@/features/discovery/discoveryTypes";
import type { SelfRadarSeries } from "@/features/reporting/selfReportTypes";

const profile: FounderDiscoveryProfile = {
  id: "profile-a",
  userId: "user-a",
  status: "active",
  displayName: "Alex",
  headline: "AI engineer",
  bio: "Builds products",
  ownRoles: ["tech"],
  seekingRoles: ["product"],
  expertise: ["AI", "React"],
  industries: ["Legacy interest"],
  locationLabel: "Legacy Berlin",
  locationRegion: "Berlin",
  remoteMode: "remote",
  availabilityHoursPerWeek: 25,
  commitmentLevel: "part_time",
  ventureStage: "already_building",
  ventureGoal: "venture_scale",
  publishedAt: "2026-08-24T10:00:00.000Z",
  createdAt: "2026-08-24T09:00:00.000Z",
  updatedAt: "2026-08-24T10:00:00.000Z",
};

const filters: DiscoveryMustHaves = {
  minimumAvailabilityHoursPerWeek: 20,
  acceptedRemoteModes: ["remote"],
  requiredRolesAny: ["tech"],
  requiredExpertiseAny: ["ai"],
  desiredLocationRegion: "berlin",
  requiredIndustriesAny: [],
  acceptedCommitmentLevels: [],
  acceptedVentureStages: [],
  acceptedVentureGoals: [],
};

const ownerScores: SelfRadarSeries = {
  Unternehmenslogik: 70,
  Entscheidungslogik: 30,
  "Arbeitsstruktur & Zusammenarbeit": 50,
  Commitment: 75,
  Risikoorientierung: 20,
  Konfliktstil: 65,
};

test("keeps own and sought expertise and roles semantically separate", () => {
  const normalizedProfile = normalizeDiscoveryProfileInput({
    ownRoles: ["product"],
    seekingRoles: ["tech"],
    expertise: ["Product discovery"],
  });
  const normalizedSearch = normalizeDiscoveryPreferencesInput({
    mustHaves: { requiredExpertiseAny: ["AI"] },
  });

  assert.deepEqual(normalizedProfile.ownRoles, ["product"]);
  assert.deepEqual(normalizedProfile.seekingRoles, ["tech"]);
  assert.deepEqual(normalizedProfile.expertise, ["Product discovery"]);
  assert.deepEqual(normalizedSearch.mustHaves.requiredExpertiseAny, ["AI"]);
});

test("normalizes only the six measured alignment dimensions and at most three", () => {
  const normalized = normalizeDiscoveryPreferencesInput({
    discoveryV2AlignmentEnabled: true,
    discoveryV2AlignmentDimensions: [
      "company_logic",
      "decision_logic",
      "commitment",
      "execution_strength",
      "conflict_style",
    ],
  });

  assert.equal(normalized.discoveryV2AlignmentEnabled, true);
  assert.deepEqual(normalized.discoveryV2AlignmentDimensions, [
    "company_logic",
    "decision_logic",
    "commitment",
  ]);
});

test("alignment opt-in defaults off", () => {
  const normalized = normalizeDiscoveryPreferencesInput({});
  assert.equal(normalized.discoveryV2AlignmentEnabled, false);
  assert.deepEqual(normalized.discoveryV2AlignmentDimensions, []);
});

test("practical match reasons only reflect explicit filters", () => {
  assert.deepEqual(getDiscoveryV2PracticalMatches(profile, filters), [
    "role",
    "expertise",
    "location",
    "remote",
    "availability",
  ]);
  const candidate = buildDiscoveryV2Candidate(profile, filters);
  assert.deepEqual(candidate.reasons, []);
  assert.deepEqual(candidate.conversationTopics, []);
  assert.equal(candidate.score, undefined);
});

test("alignment compares only prioritized dimensions using neutral existing tendency buckets", () => {
  const candidateScores: SelfRadarSeries = {
    ...ownerScores,
    Entscheidungslogik: 80,
    Konfliktstil: 10,
  };
  const similarities = selectSimilarPrioritizedAlignmentDimensions({
    prioritizedDimensions: ["commitment", "decision_logic"],
    ownerScores,
    candidateScores,
  });
  assert.deepEqual(similarities, ["commitment"]);
});

test("missing candidate assessment is neutral", () => {
  assert.deepEqual(
    selectSimilarPrioritizedAlignmentDimensions({
      prioritizedDimensions: ["commitment"],
      ownerScores,
      candidateScores: null,
    }),
    []
  );
});

test("alignment similarities stay visible without changing server result order", () => {
  const firstProfile = { ...profile, id: "profile-first", userId: "user-first" };
  const secondProfile = { ...profile, id: "profile-second", userId: "user-second" };
  const candidates = [
    buildDiscoveryV2Candidate(firstProfile, filters),
    buildDiscoveryV2Candidate(secondProfile, filters),
  ];

  const enriched = attachDiscoveryV2AlignmentSimilarities(
    candidates,
    new Map([
      ["user-first", []],
      ["user-second", ["commitment", "decision_logic"]],
    ]),
    new Map([
      ["profile-first", "user-first"],
      ["profile-second", "user-second"],
    ])
  );

  assert.deepEqual(
    enriched.map((candidate) => candidate.profile.id),
    ["profile-first", "profile-second"]
  );
  assert.deepEqual(enriched[0]?.alignmentSimilarDimensions, []);
  assert.deepEqual(enriched[1]?.alignmentSimilarDimensions, ["commitment", "decision_logic"]);
  assert.equal(enriched.length, candidates.length);
  assert.equal(enriched.some((candidate) => candidate.score != null), false);
});

test("Discovery V2 copy describes alignment as orientation rather than evaluative ranking", () => {
  const de = readFileSync("messages/de/discovery.json", "utf8");
  const en = readFileSync("messages/en/discovery.json", "utf8");

  assert.match(de, /Ähnliche Vorstellungen in Bereichen, die dir wichtig sind/);
  assert.match(en, /Similar perspectives in areas that matter to you/);
  for (const messages of [de, en]) {
    assert.doesNotMatch(
      messages,
      /psychologisch passend|beste psychologische|best psychological|psychologically compatible|nach Alignment sortiert|sorted by alignment/i
    );
  }
});
