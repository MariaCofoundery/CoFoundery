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
  assert.equal(result.alignmentScore, raw.overallScore);
  assert.equal(result.workingCompatibilityScore, raw.overallScore);
});

test("compareFounders maps topAlignments and topTensions from the new engine", () => {
  const source = FOUNDER_MATCHING_TEST_CASES.complementary_builders;
  const result = compareFounders(source.a, source.b);

  assert.deepEqual(result.topAlignments, ["Commitment", "Unternehmenslogik", "Risikoorientierung"]);
  assert.deepEqual(result.topTensions, [
    "Entscheidungslogik",
    "Konfliktstil",
    "Arbeitsstruktur & Zusammenarbeit",
  ]);
});

test("compareFounders exposes the new V1 categories and rule-based explanations on dimensions", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.misaligned_pressure_pair;

  const commitment = result.dimensions.find((entry) => entry.dimension === "Commitment");
  const work = result.dimensions.find(
    (entry) => entry.dimension === "Arbeitsstruktur & Zusammenarbeit"
  );
  const company = result.dimensions.find((entry) => entry.dimension === "Unternehmenslogik");

  assert.equal(commitment?.category, "tension");
  assert.equal(commitment?.riskLevel, "high");
  assert.equal(commitment?.explanationKey, "commitment_gap_critical");

  assert.equal(work?.category, "tension");
  assert.equal(work?.riskLevel, "high");
  assert.ok(work?.appliedRules?.includes("RULE_B_WORK_STRUCTURE_CLASH"));

  assert.equal(company?.category, "tension");
  assert.equal(company?.riskLevel, "high");
  assert.ok(company?.appliedRules?.includes("RULE_E_COMPANY_LOGIC_STRATEGIC_TENSION"));
});

test("compareFounders remains deterministic for direct calls", () => {
  const a = FOUNDER_MATCHING_TEST_CASES.complementary_builders.a;
  const b = FOUNDER_MATCHING_TEST_CASES.complementary_builders.b;

  assert.deepEqual(compareFounders(a, b), compareFounders(a, b));
});

test("highly similar pairs expose no top tensions and stay aligned", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.highly_similar_but_blind_spot_pair;

  assert.equal(result.topTensions.length, 0);
  assert.ok(result.dimensions.every((entry) => entry.category === "aligned"));
});
