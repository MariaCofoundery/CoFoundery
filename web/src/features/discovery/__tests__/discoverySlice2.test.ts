import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getPrioritizedDiscoveryAlignmentDimensions,
  normalizeDiscoveryAlignmentPreferences,
  selectPrioritizedAlignmentSignals,
} from "@/features/discovery/discoveryV2Alignment";
import { normalizeDiscoveryProfileInput } from "@/features/discovery/discoveryValidation";
import {
  attachDiscoveryV2AlignmentSignals,
  buildDiscoveryV2Candidate,
} from "@/features/discovery/discoveryV2Search";
import type { FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import {
  FOUNDER_DIMENSION_ORDER,
  getFounderDimensionPoleTendency,
} from "@/features/reporting/founderDimensionMeta";
import type { SelfRadarSeries } from "@/features/reporting/selfReportTypes";

const emptyScores: SelfRadarSeries = {
  Unternehmenslogik: null,
  Entscheidungslogik: null,
  "Arbeitsstruktur & Zusammenarbeit": null,
  Commitment: null,
  Risikoorientierung: null,
  Konfliktstil: null,
};

const profile: FounderDiscoveryProfile = {
  id: "profile-a",
  userId: "user-a",
  status: "active",
  displayName: "Alex",
  headline: "Product founder",
  bio: "",
  ownRoles: ["product"],
  seekingRoles: ["tech"],
  expertise: ["Product"],
  industries: [],
  locationLabel: null,
  locationRegion: "Berlin",
  remoteMode: "remote",
  availabilityHoursPerWeek: 20,
  commitmentLevel: "part_time",
  ventureStage: "idea_validating",
  ventureGoal: "venture_scale",
  searchIntent: "actively_exploring",
  startHorizon: "next_3_months",
  publishedAt: null,
  createdAt: "",
  updatedAt: "",
};

test("search intent and start horizon stay explicit and nullable", () => {
  assert.equal(normalizeDiscoveryProfileInput({}).searchIntent, null);
  assert.equal(normalizeDiscoveryProfileInput({}).startHorizon, null);
  const normalized = normalizeDiscoveryProfileInput({
    searchIntent: "ready_now",
    startHorizon: "next_6_months",
  });
  assert.equal(normalized.searchIntent, "ready_now");
  assert.equal(normalized.startHorizon, "next_6_months");
  assert.equal(normalizeDiscoveryProfileInput({ searchIntent: "high_intent" }).searchIntent, null);
});

test("Alignment preferences accept three explicit priorities and all neutral relation modes", () => {
  const normalized = normalizeDiscoveryAlignmentPreferences({
    company_logic: { importance: "very_important", relationPreference: "prefer_similar" },
    decision_logic: {
      importance: "important",
      relationPreference: "different_perspective_welcome",
    },
    commitment: { importance: "important", relationPreference: "no_direction_preference" },
    risk_orientation: { importance: "important", relationPreference: "prefer_similar" },
    conflict_style: { importance: "not_prioritized", relationPreference: "prefer_similar" },
  });
  assert.deepEqual(getPrioritizedDiscoveryAlignmentDimensions(normalized), [
    "company_logic",
    "decision_logic",
    "commitment",
  ]);
  assert.equal(normalized.decision_logic?.relationPreference, "different_perspective_welcome");
  assert.equal(normalized.commitment?.relationPreference, "no_direction_preference");
  assert.equal(normalized.risk_orientation, undefined);
  assert.equal(normalized.conflict_style, undefined);
});

test("coarse Alignment signals distinguish similar, different, and insufficient data", () => {
  const ownerScores = {
    ...emptyScores,
    Unternehmenslogik: 20,
    Entscheidungslogik: 20,
  };
  const candidateScores = {
    ...emptyScores,
    Unternehmenslogik: 25,
    Entscheidungslogik: 80,
  };
  assert.deepEqual(
    selectPrioritizedAlignmentSignals({
      prioritizedDimensions: ["company_logic", "decision_logic", "commitment"],
      ownerScores,
      candidateScores,
    }),
    [
      { dimension: "company_logic", signal: "similar_tendency" },
      { dimension: "decision_logic", signal: "different_tendency" },
      { dimension: "commitment", signal: "insufficient_data" },
    ]
  );
});

test("coarse buckets keep boundary-adjacent and distant differences in the same restrained category", () => {
  function companyLogicSignal(ownerScore: number, candidateScore: number) {
    return selectPrioritizedAlignmentSignals({
      prioritizedDimensions: ["company_logic"],
      ownerScores: { ...emptyScores, Unternehmenslogik: ownerScore },
      candidateScores: { ...emptyScores, Unternehmenslogik: candidateScore },
    })[0]?.signal;
  }

  assert.equal(companyLogicSignal(20, 40), "similar_tendency");
  assert.equal(companyLogicSignal(40, 41), "different_tendency");
  assert.equal(companyLogicSignal(0, 100), "different_tendency");
});

test("all six dimensions reuse bilingual qualitative report anchors", () => {
  for (const dimension of FOUNDER_DIMENSION_ORDER) {
    for (const locale of ["de", "en"] as const) {
      assert.ok(getFounderDimensionPoleTendency(dimension, 25, "report", locale)?.label);
      assert.ok(getFounderDimensionPoleTendency(dimension, 50, "report", locale)?.label);
      assert.ok(getFounderDimensionPoleTendency(dimension, 75, "report", locale)?.label);
    }
  }
});

test("Alignment signals neither rank candidates nor add a score", () => {
  const first = buildDiscoveryV2Candidate(profile, {
    minimumAvailabilityHoursPerWeek: null,
    acceptedRemoteModes: [],
    requiredRolesAny: [],
    requiredExpertiseAny: [],
    desiredLocationRegion: null,
    requiredIndustriesAny: [],
    acceptedCommitmentLevels: [],
    acceptedVentureStages: [],
    acceptedVentureGoals: [],
  });
  const second = { ...first, profile: { ...first.profile, id: "profile-b" } };
  const result = attachDiscoveryV2AlignmentSignals(
    [first, second],
    new Map([
      ["user-a", [{ dimension: "company_logic" as const, signal: "different_tendency" as const }]],
    ]),
    new Map([
      ["profile-a", "user-a"],
      ["profile-b", "user-b"],
    ])
  );
  assert.deepEqual(result.map((entry) => entry.profile.id), ["profile-a", "profile-b"]);
  assert.equal(result[0]?.score, undefined);
  assert.equal(result[1]?.score, undefined);
});

test("profile editor and cards only render explicitly stored intent and horizon", () => {
  const editor = readFileSync("src/app/(product)/discovery/profile/page.tsx", "utf8");
  const search = readFileSync("src/features/discovery/FounderDiscoveryCard.tsx", "utf8");
  assert.match(editor, /name="searchIntent"/);
  assert.match(editor, /name="startHorizon"/);
  assert.match(search, /profile\.searchIntent \?/);
  assert.match(search, /profile\.startHorizon \?/);
  assert.match(search, /alignmentSignals\?\.slice\(0, 2\)/);
  assert.doesNotMatch(search, /high_intent|serious_founder|startHorizon.*ventureStage/);
});

test("bilateral Alignment projection returns categories without client scores or raw answers", () => {
  const source = readFileSync("src/features/discovery/discoveryAssessmentSignals.ts", "utf8");
  const publicTypes = readFileSync("src/features/discovery/discoveryTypes.ts", "utf8");
  assert.match(source, /discovery_v2_alignment_enabled === true/);
  assert.match(source, /selectPrioritizedAlignmentSignals/);
  assert.match(publicTypes, /"similar_tendency"[\s\S]*"different_tendency"[\s\S]*"insufficient_data"/);
  assert.doesNotMatch(publicTypes, /candidateScore|dimensionScore|rawAnswer/);
});

test("own Alignment context stays owner-only and serializes qualitative labels without scores", () => {
  const source = readFileSync("src/features/discovery/discoveryAssessmentSignals.ts", "utf8");
  const editorPage = readFileSync("src/app/(product)/discovery/profile/page.tsx", "utf8");
  const candidatePage = readFileSync("src/app/(product)/discovery/[profileId]/page.tsx", "utf8");
  const publicTypes = readFileSync("src/features/discovery/discoveryTypes.ts", "utf8");

  assert.match(source, /getOwnDiscoveryV2AlignmentTendencies/);
  assert.match(source, /\.eq\("user_id", normalizedOwnerUserId\)/);
  assert.match(editorPage, /ownTendencies=\{ownAlignmentTendencies\}/);
  assert.doesNotMatch(candidatePage, /getOwnDiscoveryV2AlignmentTendencies|ownAlignmentTendencies/);
  assert.match(publicTypes, /DiscoveryOwnAlignmentTendency[\s\S]*tendency:[\s\S]*label: string/);
  assert.doesNotMatch(publicTypes, /DiscoveryOwnAlignmentTendency[\s\S]{0,180}(score|rawAnswer)/);
});

test("importance and relation preferences do not evaluate or alter observed signals", () => {
  const baseline = selectPrioritizedAlignmentSignals({
    prioritizedDimensions: ["company_logic"],
    ownerScores: { ...emptyScores, Unternehmenslogik: 20 },
    candidateScores: { ...emptyScores, Unternehmenslogik: 80 },
  });
  for (const importance of ["important", "very_important"] as const) {
    for (const relationPreference of [
      "prefer_similar",
      "different_perspective_welcome",
      "no_direction_preference",
    ] as const) {
      const preferences = normalizeDiscoveryAlignmentPreferences({
        company_logic: { importance, relationPreference },
      });
      assert.ok(preferences.company_logic);
      assert.deepEqual(
        selectPrioritizedAlignmentSignals({
          prioritizedDimensions: getPrioritizedDiscoveryAlignmentDimensions(preferences),
          ownerScores: { ...emptyScores, Unternehmenslogik: 20 },
          candidateScores: { ...emptyScores, Unternehmenslogik: 80 },
        }),
        baseline
      );
    }
  }
});

test("DE and EN use restrained Alignment language without prohibited claims", () => {
  const de = JSON.parse(readFileSync("messages/de/discovery.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/discovery.json", "utf8"));
  for (const messages of [de, en]) {
    assert.ok(messages.searchIntents.ready_now.long);
    assert.ok(messages.startHorizons.next_6_months.long);
    assert.ok(messages.v2.alignment.info.risk_orientation.body);
    assert.ok(messages.v2.alignment.disclaimer);
    assert.ok(messages.v2.alignment.ownContext.description);
  }
  assert.equal(de.v2.alignment.signals.different_tendency, "nicht dieselbe grobe Tendenz");
  assert.equal(en.v2.alignment.signals.different_tendency, "not the same broad tendency");
  const scopedCopy = JSON.stringify({
    de: { searchIntents: de.searchIntents, alignment: de.v2.alignment },
    en: { searchIntents: en.searchIntents, alignment: en.v2.alignment },
  });
  assert.doesNotMatch(
    scopedCopy,
    /perfect match|perfektes match|compatibility\s*%|kompatibilität\s*%|opposites are better|gegensätze sind besser|success probability|erfolgswahrscheinlichkeit|personality type|persönlichkeitstyp/i
  );
});
