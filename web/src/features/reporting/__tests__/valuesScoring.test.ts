import assert from "node:assert/strict";
import test from "node:test";
import { scoreSelfValuesProfile } from "@/features/reporting/values_scoring";
import {
  VALUES_QUESTION_DEFINITIONS,
  getCanonicalValuesQuestionIds,
  getValuesQuestionArchetypeId,
  getValuesQuestionVersionMismatch,
} from "@/features/reporting/valuesQuestionMeta";

test("values question registry is versioned, unique and covers the active ten-question set", () => {
  assert.equal(VALUES_QUESTION_DEFINITIONS.length, 10);
  assert.equal(new Set(VALUES_QUESTION_DEFINITIONS.map((entry) => entry.questionId)).size, 10);
  assert.deepEqual(getCanonicalValuesQuestionIds(), VALUES_QUESTION_DEFINITIONS.map((entry) => entry.questionId));
});

test("values question mapping resolves canonical ids and legacy aliases explicitly", () => {
  assert.equal(getValuesQuestionArchetypeId("qv_1"), "impact_idealist");
  assert.equal(getValuesQuestionArchetypeId("qv_8"), "verantwortungs_stratege");
  assert.equal(getValuesQuestionArchetypeId("qv_9"), "business_pragmatiker");
  assert.equal(getValuesQuestionArchetypeId("d1_q1"), "impact_idealist");
  assert.equal(getValuesQuestionArchetypeId("w1"), "impact_idealist");
  assert.equal(getValuesQuestionArchetypeId("w8"), "verantwortungs_stratege");
  assert.equal(getValuesQuestionArchetypeId("w9"), "business_pragmatiker");
});

test("values question contract detects drift between repo registry and active DB ids", () => {
  const aligned = getValuesQuestionVersionMismatch(getCanonicalValuesQuestionIds());
  assert.equal(aligned.isAligned, true);

  const liveAligned = getValuesQuestionVersionMismatch([
    "w1",
    "w2",
    "w3",
    "w4",
    "w5",
    "w6",
    "w7",
    "w8",
    "w9",
    "w10",
  ]);
  assert.equal(liveAligned.isAligned, true);
  assert.deepEqual(liveAligned.unknownIds, []);
  assert.deepEqual(liveAligned.missingIds, []);

  const drifted = getValuesQuestionVersionMismatch(["qv_1", "qv_2", "qv_99"]);
  assert.equal(drifted.isAligned, false);
  assert.deepEqual(drifted.unknownIds, ["qv_99"]);
  assert.ok(drifted.missingIds.length > 0);
});

test("values scoring uses explicit mapping and ignores unknown ids instead of distributing across all archetypes", () => {
  const profile = scoreSelfValuesProfile(
    [
      { questionId: "qv_1", choiceValue: "6", prompt: null, dimension: null },
      { questionId: "qv_7", choiceValue: "5", prompt: null, dimension: null },
      { questionId: "qv_5", choiceValue: "2", prompt: null, dimension: null },
      { questionId: "unknown", choiceValue: "7", prompt: null, dimension: null },
    ],
    10
  );

  assert.ok(profile);
  assert.equal(profile?.primaryArchetypeId, "impact_idealist");
  assert.equal(profile?.secondaryArchetypeId, "business_pragmatiker");
  assert.equal(profile?.answered, 3);
});

test("values scoring returns null if only unmapped questions are present", () => {
  const profile = scoreSelfValuesProfile(
    [{ questionId: "mystery", choiceValue: "5", prompt: null, dimension: null }],
    10
  );

  assert.equal(profile, null);
});
