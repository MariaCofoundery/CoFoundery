import assert from "node:assert/strict";
import test from "node:test";
import {
  compareFounders,
  FOUNDER_MATCHING_ENGINE_EXAMPLES,
  FOUNDER_MATCHING_TEST_CASES,
} from "@/features/reporting/founderMatchingEngine";
import {
  buildHumanReadableCompareAudit,
  runFounderMatchingAuditExamples,
} from "@/features/reporting/founderMatchingAudit";

test("compareFounders classifies a complementary but workable founder pair", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.complementary_builders;

  assert.equal(result.overallMatchScore, 74.2);
  assert.equal(result.alignmentScore, 86.18);
  assert.equal(result.workingCompatibilityScore, 68.24);
  assert.deepEqual(
    result.tensionMap.map((entry) => [entry.dimension, entry.tensionType]),
    [
      ["Entscheidungslogik", "productive"],
      ["Risikoorientierung", "productive"],
      ["Arbeitsstruktur & Zusammenarbeit", "coordination"],
      ["Konfliktstil", "coordination"],
    ]
  );
});

test("compareFounders identifies critical pressure mismatches", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.misaligned_pressure_pair;

  assert.equal(result.overallMatchScore, 29.8);
  assert.equal(result.alignmentScore, 37.64);
  assert.equal(result.workingCompatibilityScore, 26.08);

  const commitment = result.dimensions.find((entry) => entry.dimension === "Commitment");
  const work = result.dimensions.find(
    (entry) => entry.dimension === "Arbeitsstruktur & Zusammenarbeit"
  );
  const conflict = result.dimensions.find((entry) => entry.dimension === "Konfliktstil");

  assert.equal(commitment?.interactionType, "critical_tension");
  assert.equal(work?.interactionType, "critical_tension");
  assert.equal(conflict?.interactionType, "critical_tension");
});

test("compareFounders is deterministic for direct calls", () => {
  const a = {
    Unternehmenslogik: 68,
    Entscheidungslogik: 34,
    Risikoorientierung: 64,
    "Arbeitsstruktur & Zusammenarbeit": 72,
    Commitment: 81,
    Konfliktstil: 38,
  } as const;

  const b = {
    Unternehmenslogik: 62,
    Entscheidungslogik: 67,
    Risikoorientierung: 43,
    "Arbeitsstruktur & Zusammenarbeit": 58,
    Commitment: 76,
    Konfliktstil: 61,
  } as const;

  assert.deepEqual(compareFounders(a, b), compareFounders(a, b));
});

test("compareFounders classifies a balanced but manageable pair", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.balanced_but_manageable_pair;

  assert.equal(result.overallMatchScore, 75.53);
  assert.equal(result.alignmentScore, 87.14);
  assert.equal(result.workingCompatibilityScore, 68.72);
  assert.deepEqual(
    result.tensionMap.map((entry) => [entry.dimension, entry.tensionType]),
    [
      ["Risikoorientierung", "productive"],
      ["Arbeitsstruktur & Zusammenarbeit", "coordination"],
      ["Konfliktstil", "coordination"],
    ]
  );
});

test("compareFounders exposes similarity without tension for a highly similar pair", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.highly_similar_but_blind_spot_pair;

  assert.equal(result.overallMatchScore, 92);
  assert.equal(result.alignmentScore, 92);
  assert.equal(result.workingCompatibilityScore, 92);
  assert.equal(result.tensionMap.length, 0);
  assert.ok(result.dimensions.every((entry) => entry.relationType === "similar"));
});

test("buildHumanReadableCompareAudit returns readable structure for complementary builders", () => {
  const audit = buildHumanReadableCompareAudit(
    FOUNDER_MATCHING_TEST_CASES.complementary_builders.a,
    FOUNDER_MATCHING_TEST_CASES.complementary_builders.b
  );

  assert.equal(audit.dimensionOverview.length, 6);
  assert.equal(audit.matchStructure.overallMatchScore, 74.2);
  assert.match(audit.summary.strongestComplement, /Ergänzung|ergänzt|korrigieren/);
  assert.equal(audit.tensionMap[0]?.dimension, "Entscheidungslogik");
});

test("runFounderMatchingAuditExamples exposes all compare demo cases", () => {
  const demos = runFounderMatchingAuditExamples();

  assert.deepEqual(Object.keys(demos), [
    "complementary_builders",
    "misaligned_pressure_pair",
    "balanced_but_manageable_pair",
    "highly_similar_but_blind_spot_pair",
  ]);
  assert.equal(
    demos.highly_similar_but_blind_spot_pair.matchStructure.overallMatchScore,
    92
  );
});
