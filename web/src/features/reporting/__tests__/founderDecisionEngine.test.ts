import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderDecisionEngine,
  getDecisionRiskScore,
} from "@/features/reporting/founderDecisionEngine";
import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
} from "@/features/reporting/founderMatchingEngine";
import { buildFounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";

test("getDecisionRiskScore weights opposite direction fields above balanced collaboration fields", () => {
  assert.equal(
    getDecisionRiskScore({
      dimension: "Unternehmenslogik",
      jointState: "OPPOSITE",
      riskLevel: "high",
      hasSharedBlindSpotRisk: false,
    }),
    9
  );

  assert.equal(
    getDecisionRiskScore({
      dimension: "Arbeitsstruktur & Zusammenarbeit",
      jointState: "BOTH_MID",
      riskLevel: "low",
      hasSharedBlindSpotRisk: false,
    }),
    3
  );

  assert.equal(
    getDecisionRiskScore({
      dimension: "Risikoorientierung",
      jointState: "BOTH_HIGH",
      riskLevel: "high",
      hasSharedBlindSpotRisk: true,
    }),
    11
  );
});

test("buildFounderDecisionEngine prioritizes the most decision-relevant dimensions for high-tension pairs", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
  );
  const selection = buildFounderMatchingSelection(compareResult);
  const cards = buildFounderDecisionEngine(compareResult, selection);

  assert.equal(cards.length, 3);
  assert.deepEqual(
    cards.map((card) => card.dimension),
    ["Unternehmenslogik", "Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"]
  );
  assert.equal(cards[0]?.severity, "critical");
  assert.equal(cards[1]?.severity, "important");
  assert.equal(cards[0]?.clarificationPoints.length, 3);
});

test("buildFounderDecisionEngine surfaces shared blind-spot direction fields for similar pairs", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
  );
  const selection = buildFounderMatchingSelection(compareResult);
  const cards = buildFounderDecisionEngine(compareResult, selection);

  assert.deepEqual(
    cards.map((card) => card.dimension),
    ["Risikoorientierung", "Unternehmenslogik", "Commitment"]
  );
  assert.equal(cards[0]?.severity, "critical");
  assert.equal(cards[1]?.severity, "critical");
  assert.equal(cards[2]?.severity, "critical");
});
