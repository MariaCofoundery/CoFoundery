import assert from "node:assert/strict";
import test from "node:test";
import {
  compareFounderProfiles,
} from "@/features/scoring/founderMatching";
import {
  compareFounders,
  FOUNDER_MATCHING_ENGINE_EXAMPLES,
  FOUNDER_MATCHING_TEST_CASES,
} from "@/features/reporting/founderMatchingEngine";

function toMatchProfiles(
  scores: (typeof FOUNDER_MATCHING_TEST_CASES)[keyof typeof FOUNDER_MATCHING_TEST_CASES]
) {
  return {
    a: {
      company_logic: scores.a.Unternehmenslogik,
      decision_logic: scores.a.Entscheidungslogik,
      work_structure: scores.a["Arbeitsstruktur & Zusammenarbeit"],
      commitment: scores.a.Commitment,
      risk_orientation: scores.a.Risikoorientierung,
      conflict_style: scores.a.Konfliktstil,
    },
    b: {
      company_logic: scores.b.Unternehmenslogik,
      decision_logic: scores.b.Entscheidungslogik,
      work_structure: scores.b["Arbeitsstruktur & Zusammenarbeit"],
      commitment: scores.b.Commitment,
      risk_orientation: scores.b.Risikoorientierung,
      conflict_style: scores.b.Konfliktstil,
    },
  };
}

test("compareFounders is driven by compareFounderProfiles overallScore", () => {
  const source = FOUNDER_MATCHING_TEST_CASES.complementary_builders;
  const raw = compareFounderProfiles(toMatchProfiles(source).a, toMatchProfiles(source).b);
  const result = compareFounders(source.a, source.b);

  assert.equal(result.overallMatchScore, raw.overallScore);
  assert.equal(result.alignmentScore, raw.alignmentScore);
  assert.equal(result.workingCompatibilityScore, raw.workingCompatibilityScore);
});

test("compareFounders maps topAlignments and topTensions from the new engine", () => {
  const source = FOUNDER_MATCHING_TEST_CASES.complementary_builders;
  const result = compareFounders(source.a, source.b);

  assert.deepEqual(result.topAlignments, ["Konfliktstil", "Unternehmenslogik", "Risikoorientierung"]);
  assert.deepEqual(result.topTensions, [
    "Entscheidungslogik",
    "Arbeitsstruktur & Zusammenarbeit",
    "Unternehmenslogik",
  ]);
});

test("compareFounders exposes the new V1 categories and rule-based explanations on dimensions", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.misaligned_pressure_pair;

  const commitment = result.dimensions.find((entry) => entry.dimension === "Commitment");
  const work = result.dimensions.find(
    (entry) => entry.dimension === "Arbeitsstruktur & Zusammenarbeit"
  );
  const company = result.dimensions.find((entry) => entry.dimension === "Unternehmenslogik");
  const decision = result.dimensions.find((entry) => entry.dimension === "Entscheidungslogik");

  assert.equal(commitment?.category, "tension");
  assert.equal(commitment?.riskLevel, "medium");
  assert.equal(commitment?.explanationKey, "commitment_expectation_gap");

  assert.equal(work?.category, "tension");
  assert.equal(work?.riskLevel, "high");
  assert.ok(work?.appliedRules?.includes("RULE_B_WORK_STRUCTURE_CLASH"));

  assert.equal(company?.category, "tension");
  assert.equal(company?.riskLevel, "high");
  assert.ok(company?.appliedRules?.includes("RULE_E_COMPANY_LOGIC_STRATEGIC_TENSION"));
  assert.equal(decision?.category, "complementary");
  assert.equal(decision?.riskLevel, "high");
});

test("compareFounders remains deterministic for direct calls", () => {
  const a = FOUNDER_MATCHING_TEST_CASES.complementary_builders.a;
  const b = FOUNDER_MATCHING_TEST_CASES.complementary_builders.b;

  assert.deepEqual(compareFounders(a, b), compareFounders(a, b));
});

test("highly similar pairs now expose shared blind-spot risk instead of automatic positivity", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.highly_similar_but_blind_spot_pair;

  assert.equal(result.topTensions.length, 1);
  assert.equal(
    result.dimensions.filter((entry) => entry.hasSharedBlindSpotRisk).length >= 4,
    true
  );
  assert.equal(
    result.dimensions.some((entry) => entry.explanationKey === "commitment_shared_high"),
    true
  );
});
