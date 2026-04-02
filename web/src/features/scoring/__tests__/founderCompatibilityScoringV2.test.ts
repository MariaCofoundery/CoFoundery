import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderMatchProfileFromLegacyAnswers,
  buildFounderMatchProfileFromRegistryAnswers,
  scoreFounderAlignmentV2,
  scoreFounderAlignmentV2FromAnswersV2,
  scoreFounderAlignmentV2FromRegistryAnswers,
} from "@/features/scoring/founderCompatibilityScoringV2";
import { scoreFounderAlignment, type Answer } from "@/features/scoring/founderScoring";

function buildLegacyInput(overrides?: {
  personA?: Partial<Record<string, number>>;
  personB?: Partial<Record<string, number>>;
}) {
  const baseA: Record<string, number> = {
    Unternehmenslogik: 20,
    Entscheidungslogik: 40,
    "Arbeitsstruktur & Zusammenarbeit": 60,
    Commitment: 70,
    Risikoorientierung: 35,
    Konfliktstil: 45,
  };
  const baseB: Record<string, number> = {
    Unternehmenslogik: 60,
    Entscheidungslogik: 55,
    "Arbeitsstruktur & Zusammenarbeit": 30,
    Commitment: 75,
    Risikoorientierung: 65,
    Konfliktstil: 70,
  };

  const personA = Object.entries({ ...baseA, ...(overrides?.personA ?? {}) }).flatMap(
    ([dimension, value], index) => {
      const numericValue = value ?? 0;
      return [
        { question_id: `${dimension}-a-${index}-1`, dimension, value: numericValue },
        { question_id: `${dimension}-a-${index}-2`, dimension, value: numericValue },
      ] satisfies Answer[];
    }
  );
  const personB = Object.entries({ ...baseB, ...(overrides?.personB ?? {}) }).flatMap(
    ([dimension, value], index) => {
      const numericValue = value ?? 0;
      return [
        { question_id: `${dimension}-b-${index}-1`, dimension, value: numericValue },
        { question_id: `${dimension}-b-${index}-2`, dimension, value: numericValue },
      ] satisfies Answer[];
    }
  );

  return { personA, personB };
}

test("registry-native profile scoring only uses CORE items", () => {
  const coreOnly = buildFounderMatchProfileFromRegistryAnswers([
    { itemId: "cl_core_1", value: 0 },
    { itemId: "cl_core_2", value: 100 },
    { itemId: "cl_core_3", value: 0 },
    { itemId: "cl_core_4", value: 100 },
  ]);

  const withSupportNoise = buildFounderMatchProfileFromRegistryAnswers([
    { itemId: "cl_core_1", value: 0 },
    { itemId: "cl_core_2", value: 100 },
    { itemId: "cl_core_3", value: 0 },
    { itemId: "cl_core_4", value: 100 },
    { itemId: "cl_support_1", value: 100 },
    { itemId: "cl_support_2", value: 100 },
  ]);

  assert.equal(coreOnly.company_logic, 50);
  assert.deepEqual(withSupportNoise, coreOnly);
});

test("registry-native scoring ignores support-only answers numerically", () => {
  const result = scoreFounderAlignmentV2FromRegistryAnswers({
    personA: [
      { itemId: "cl_support_1", value: 0 },
      { itemId: "cl_support_2", value: 100 },
    ],
    personB: [
      { itemId: "cl_support_1", value: 100 },
      { itemId: "cl_support_2", value: 0 },
    ],
  });

  assert.equal(result.dimensions.length, 0);
  assert.equal(result.overallScore, 0);
});

test("legacy answer aggregation maps normalized dimensions into the V2 profile", () => {
  const profile = buildFounderMatchProfileFromLegacyAnswers([
    { question_id: "1", dimension: "Vision & Unternehmenshorizont", value: 25 },
    { question_id: "2", dimension: "Vision & Unternehmenshorizont", value: 75 },
    { question_id: "3", dimension: "Konflikt", value: 80 },
    { question_id: "4", dimension: "Konfliktstil", value: 60 },
  ]);

  assert.equal(profile.company_logic, 50);
  assert.equal(profile.conflict_style, 70);
  assert.equal(profile.commitment, null);
});

test("the active founder scoring entry point delegates to the V2 scorer", () => {
  const input = buildLegacyInput();

  const delegated = scoreFounderAlignment(input);
  const direct = scoreFounderAlignmentV2(input);

  assert.deepEqual(delegated, direct);
});

test("the V2 scoring path exposes overallTension and keeps conflictRiskIndex as an alias only", () => {
  const result = scoreFounderAlignmentV2(
    buildLegacyInput({
      personA: { Commitment: 10 },
      personB: { Commitment: 90 },
    })
  );

  assert.equal(result.overallTension, result.conflictRiskIndex);
  assert.ok(result.overallTension != null);

  const commitment = result.dimensions.find((dimension) => dimension.dimension === "Commitment");
  assert.equal(commitment?.conflictRisk, "high");
  assert.equal(commitment?.tensionCategory, "elevated");
});

test("missing or invalid registry answers are ignored defensively", () => {
  const profile = buildFounderMatchProfileFromRegistryAnswers([
    { itemId: "dl_core_1", value: null },
    { itemId: "dl_core_2", value: Number.NaN },
    { itemId: "dl_core_3", value: 40 },
    { itemId: "dl_core_4", value: 60 },
  ]);

  assert.equal(profile.decision_logic, 50);
  assert.equal(profile.company_logic, null);
});

test("the V2 scorer accepts V2-shaped item answers directly", () => {
  const result = scoreFounderAlignmentV2FromAnswersV2({
    personA: [
      { itemId: "cm_core_1", value: 20, source: "registry" },
      { itemId: "cm_core_2", value: 20, source: "registry" },
      { itemId: "cm_core_3", value: 20, source: "registry" },
      { itemId: "cm_core_4", value: 20, source: "registry" },
    ],
    personB: [
      { itemId: "cm_core_1", value: 80, source: "registry" },
      { itemId: "cm_core_2", value: 80, source: "registry" },
      { itemId: "cm_core_3", value: 80, source: "registry" },
      { itemId: "cm_core_4", value: 80, source: "registry" },
    ],
  });

  const commitment = result.dimensions.find((dimension) => dimension.dimension === "Commitment");
  assert.equal(commitment?.conflictRisk, "high");
  assert.ok(result.overallTension != null);
});
