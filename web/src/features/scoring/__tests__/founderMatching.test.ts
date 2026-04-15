import assert from "node:assert/strict";
import test from "node:test";
import {
  applyInteractionRules,
  classifyBaseMatch,
  compareFounderProfiles,
  computeOverallScore,
  escalateRiskLevel,
  getExtremeFlags,
  getJointState,
  getPositionBand,
  type FounderMatchProfile,
} from "@/features/scoring/founderMatching";

function createProfile(overrides: Partial<FounderMatchProfile> = {}): FounderMatchProfile {
  return {
    company_logic: 50,
    decision_logic: 50,
    work_structure: 50,
    commitment: 50,
    risk_orientation: 50,
    conflict_style: 50,
    ...overrides,
  };
}

test("joint position helpers classify bands, states and extremes deterministically", () => {
  assert.equal(getPositionBand(10), "LOW");
  assert.equal(getPositionBand(50), "MID");
  assert.equal(getPositionBand(90), "HIGH");

  assert.deepEqual(getExtremeFlags(10), ["EXTREME_LOW"]);
  assert.deepEqual(getExtremeFlags(90), ["EXTREME_HIGH"]);
  assert.deepEqual(getExtremeFlags(50), []);

  assert.equal(getJointState("LOW", "LOW"), "BOTH_LOW");
  assert.equal(getJointState("MID", "MID"), "BOTH_MID");
  assert.equal(getJointState("HIGH", "HIGH"), "BOTH_HIGH");
  assert.equal(getJointState("LOW", "MID"), "LOW_MID");
  assert.equal(getJointState("HIGH", "MID"), "MID_HIGH");
  assert.equal(getJointState("LOW", "HIGH"), "OPPOSITE");
});

test("classifyBaseMatch combines distance with shared position meaning", () => {
  const bothMid = classifyBaseMatch("company_logic", 48, 56);
  assert.equal(bothMid.jointState, "BOTH_MID");
  assert.equal(bothMid.category, "aligned");
  assert.equal(bothMid.riskLevel, "low");

  const bothHigh = classifyBaseMatch("commitment", 88, 92);
  assert.equal(bothHigh.jointState, "BOTH_HIGH");
  assert.equal(bothHigh.category, "aligned");
  assert.equal(bothHigh.riskLevel, "medium");
  assert.equal(bothHigh.hasSharedExtremeHigh, true);

  const strategicAdjacent = classifyBaseMatch("risk_orientation", 24, 61);
  assert.equal(strategicAdjacent.jointState, "LOW_MID");
  assert.equal(strategicAdjacent.category, "complementary");
  assert.equal(strategicAdjacent.riskLevel, "medium");

  const workingOpposite = classifyBaseMatch("work_structure", 12, 88);
  assert.equal(workingOpposite.jointState, "OPPOSITE");
  assert.equal(workingOpposite.category, "tension");
  assert.equal(workingOpposite.riskLevel, "high");
});

test("RULE_A_COMMITMENT_HARD_PENALTY forces high tension for an extreme commitment gap", () => {
  const result = compareFounderProfiles(
    createProfile({ commitment: 20 }),
    createProfile({ commitment: 80 })
  );

  const commitment = result.dimensions.find((entry) => entry.dimensionId === "commitment");

  assert.equal(commitment?.category, "tension");
  assert.equal(commitment?.riskLevel, "high");
  assert.deepEqual(commitment?.appliedRules, ["RULE_A_COMMITMENT_HARD_PENALTY"]);
});

test("RULE_B_WORK_STRUCTURE_CLASH escalates a polar work structure mismatch", () => {
  const result = compareFounderProfiles(
    createProfile({ work_structure: 10 }),
    createProfile({ work_structure: 90 })
  );

  const workStructure = result.dimensions.find((entry) => entry.dimensionId === "work_structure");

  assert.equal(workStructure?.category, "tension");
  assert.equal(workStructure?.riskLevel, "high");
  assert.deepEqual(workStructure?.appliedRules, ["RULE_B_WORK_STRUCTURE_CLASH"]);
});

test("RULE_C_CONFLICT_DECISION_ESCALATION escalates both dimensions", () => {
  const result = compareFounderProfiles(
    createProfile({
      decision_logic: 10,
      conflict_style: 10,
    }),
    createProfile({
      decision_logic: 60,
      conflict_style: 50,
    })
  );

  const decision = result.dimensions.find((entry) => entry.dimensionId === "decision_logic");
  const conflict = result.dimensions.find((entry) => entry.dimensionId === "conflict_style");

  assert.equal(decision?.riskLevel, "high");
  assert.ok(decision?.appliedRules?.includes("RULE_C_CONFLICT_DECISION_ESCALATION"));
  assert.equal(conflict?.riskLevel, "high");
  assert.ok(conflict?.appliedRules?.includes("RULE_C_CONFLICT_DECISION_ESCALATION"));
});

test("RULE_D_RISK_COMMITMENT_ESCALATION marks risk orientation as high tension", () => {
  const result = compareFounderProfiles(
    createProfile({
      risk_orientation: 10,
      commitment: 20,
    }),
    createProfile({
      risk_orientation: 70,
      commitment: 60,
    })
  );

  const risk = result.dimensions.find((entry) => entry.dimensionId === "risk_orientation");

  assert.equal(risk?.category, "tension");
  assert.equal(risk?.riskLevel, "high");
  assert.ok(risk?.appliedRules?.includes("RULE_D_RISK_COMMITMENT_ESCALATION"));
});

test("RULE_E_COMPANY_LOGIC_COMMITMENT_DEPENDENCY uses the complementary branch when commitment is aligned", () => {
  const result = compareFounderProfiles(
    createProfile({
      company_logic: 10,
      commitment: 50,
    }),
    createProfile({
      company_logic: 50,
      commitment: 55,
    })
  );

  const company = result.dimensions.find((entry) => entry.dimensionId === "company_logic");

  assert.equal(company?.category, "complementary");
  assert.equal(company?.riskLevel, "medium");
  assert.deepEqual(company?.appliedRules, ["RULE_E_COMPANY_LOGIC_COMPLEMENTARY_TENSION"]);
});

test("RULE_E_COMPANY_LOGIC_COMMITMENT_DEPENDENCY uses the strategic tension branch when commitment also differs strongly", () => {
  const result = compareFounderProfiles(
    createProfile({
      company_logic: 10,
      commitment: 20,
    }),
    createProfile({
      company_logic: 50,
      commitment: 50,
    })
  );

  const company = result.dimensions.find((entry) => entry.dimensionId === "company_logic");

  assert.equal(company?.category, "tension");
  assert.equal(company?.riskLevel, "high");
  assert.deepEqual(company?.appliedRules, ["RULE_E_COMPANY_LOGIC_STRATEGIC_TENSION"]);
});

test("RULE_E_COMPANY_LOGIC_COMMITMENT_DEPENDENCY keeps medium tension in the middle branch", () => {
  const result = compareFounderProfiles(
    createProfile({
      company_logic: 10,
      commitment: 40,
    }),
    createProfile({
      company_logic: 50,
      commitment: 55,
    })
  );

  const company = result.dimensions.find((entry) => entry.dimensionId === "company_logic");

  assert.equal(company?.category, "tension");
  assert.equal(company?.riskLevel, "medium");
  assert.deepEqual(company?.appliedRules, ["RULE_E_COMPANY_LOGIC_COMMITMENT_DEPENDENCY"]);
});

test("computeOverallScore uses weighted base compatibility only", () => {
  const dimensions = applyInteractionRules([
    {
      dimensionId: "company_logic",
      scoreA: 50,
      scoreB: 40,
      distance: 10,
      positionA: "MID",
      positionB: "MID",
      jointState: "BOTH_MID",
      extremeFlagsA: [],
      extremeFlagsB: [],
      hasSharedExtremeHigh: false,
      hasSharedExtremeLow: false,
      hasSharedBlindSpotRisk: false,
      baseCompatibility: 90,
      weight: 1.2,
      weightedCompatibility: 108,
      category: "aligned",
      riskLevel: "low",
    },
    {
      dimensionId: "commitment",
      scoreA: 50,
      scoreB: 30,
      distance: 20,
      positionA: "MID",
      positionB: "LOW",
      jointState: "LOW_MID",
      extremeFlagsA: [],
      extremeFlagsB: [],
      hasSharedExtremeHigh: false,
      hasSharedExtremeLow: false,
      hasSharedBlindSpotRisk: false,
      baseCompatibility: 80,
      weight: 1.5,
      weightedCompatibility: 120,
      category: "tension",
      riskLevel: "medium",
    },
  ]);

  assert.equal(computeOverallScore(dimensions), 84.44);
});

test("escalateRiskLevel only moves one step and saturates at high", () => {
  assert.equal(escalateRiskLevel("low"), "medium");
  assert.equal(escalateRiskLevel("medium"), "high");
  assert.equal(escalateRiskLevel("high"), "high");
});
