import assert from "node:assert/strict";
import test from "node:test";
import { scoreSelfValuesProfile } from "@/features/reporting/values_scoring";
import {
  VALUES_QUESTION_DEFINITIONS,
  getCanonicalValuesQuestionIds,
  getValuesQuestionArchetypeId,
  getValuesQuestionVersionMismatch,
} from "@/features/reporting/valuesQuestionMeta";

test("values question registry is versioned, unique and covers the active twelve-question set", () => {
  assert.equal(VALUES_QUESTION_DEFINITIONS.length, 12);
  assert.equal(new Set(VALUES_QUESTION_DEFINITIONS.map((entry) => entry.questionId)).size, 12);
  assert.deepEqual(getCanonicalValuesQuestionIds(), VALUES_QUESTION_DEFINITIONS.map((entry) => entry.questionId));
});

test("values question mapping resolves the canonical v2 ids explicitly", () => {
  assert.equal(getValuesQuestionArchetypeId("wv2_1"), "impact_idealist");
  assert.equal(getValuesQuestionArchetypeId("wv2_5"), "verantwortungs_stratege");
  assert.equal(getValuesQuestionArchetypeId("wv2_12"), "business_pragmatiker");
  assert.equal(getValuesQuestionArchetypeId("w1"), null);
  assert.equal(getValuesQuestionArchetypeId("qv_1"), null);
});

test("values question contract detects drift between repo registry and active DB ids", () => {
  const aligned = getValuesQuestionVersionMismatch(getCanonicalValuesQuestionIds());
  assert.equal(aligned.isAligned, true);

  const liveAligned = getValuesQuestionVersionMismatch([
    "wv2_1",
    "wv2_2",
    "wv2_3",
    "wv2_4",
    "wv2_5",
    "wv2_6",
    "wv2_7",
    "wv2_8",
    "wv2_9",
    "wv2_10",
    "wv2_11",
    "wv2_12",
  ]);
  assert.equal(liveAligned.isAligned, true);
  assert.deepEqual(liveAligned.unknownIds, []);
  assert.deepEqual(liveAligned.missingIds, []);

  const drifted = getValuesQuestionVersionMismatch(["wv2_1", "w1", "qv_99"]);
  assert.equal(drifted.isAligned, false);
  assert.deepEqual(drifted.unknownIds, ["w1", "qv_99"]);
  assert.ok(drifted.missingIds.length > 0);
});

test("values scoring uses explicit mapping and ignores unknown ids instead of distributing across all archetypes", () => {
  const profile = scoreSelfValuesProfile(
    [
      { questionId: "wv2_1", choiceValue: "4", prompt: null, dimension: null },
      { questionId: "wv2_7", choiceValue: "3", prompt: null, dimension: null },
      { questionId: "wv2_6", choiceValue: "2", prompt: null, dimension: null },
      { questionId: "unknown", choiceValue: "7", prompt: null, dimension: null },
    ],
    12
  );

  assert.ok(profile);
  assert.equal(profile?.primaryArchetypeId, "impact_idealist");
  assert.equal(profile?.secondaryArchetypeId, "business_pragmatiker");
  assert.equal(profile?.answered, 3);
});

test("values scoring returns null if only unmapped questions are present", () => {
  const profile = scoreSelfValuesProfile(
    [{ questionId: "mystery", choiceValue: "5", prompt: null, dimension: null }],
    12
  );

  assert.equal(profile, null);
});
