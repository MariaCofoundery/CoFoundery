import test from "node:test";
import assert from "node:assert/strict";
import {
  FOUNDER_BASE_QUESTION_SCORE_META,
  assertFounderBaseQuestionVersionContract,
  getFounderBaseQuestionScoreMeta,
  scoreStoredBaseAnswerToFounderPercent,
} from "@/features/scoring/founderBaseQuestionMeta";

test("all basis questions have explicit polarity metadata", () => {
  assert.equal(FOUNDER_BASE_QUESTION_SCORE_META.length, 48);

  const uniqueIds = new Set(FOUNDER_BASE_QUESTION_SCORE_META.map((entry) => entry.id));
  assert.equal(uniqueIds.size, 48);

  assert.doesNotThrow(() => {
    assertFounderBaseQuestionVersionContract([...uniqueIds], "test_basis_question_contract");
  });
});

test("question contract also accepts the active 36-item registry questionnaire ids", () => {
  const registryIds = [
    "cl_core_1",
    "cl_core_2",
    "cl_core_3",
    "cl_core_4",
    "cl_support_1",
    "cl_support_2",
    "dl_core_1",
    "dl_core_2",
    "dl_core_3",
    "dl_core_4",
    "dl_support_1",
    "dl_support_2",
    "ws_core_1",
    "ws_core_2",
    "ws_core_3",
    "ws_core_4",
    "ws_support_1",
    "ws_support_2",
    "cm_core_1",
    "cm_core_2",
    "cm_core_3",
    "cm_core_4",
    "cm_support_1",
    "cm_support_2",
    "ro_core_1",
    "ro_core_2",
    "ro_core_3",
    "ro_core_4",
    "ro_support_1",
    "ro_support_2",
    "cs_core_1",
    "cs_core_2",
    "cs_core_3",
    "cs_core_4",
    "cs_support_1",
    "cs_support_2",
  ];

  assert.doesNotThrow(() => {
    assertFounderBaseQuestionVersionContract(registryIds, "test_registry_basis_question_contract");
  });
});

test("critical example items are explicitly corrected via polarity metadata", () => {
  assert.equal(getFounderBaseQuestionScoreMeta("q11_commitment_fc1")?.polarity, "high_is_left_pole");
  assert.equal(getFounderBaseQuestionScoreMeta("q12_conflict_fc1")?.polarity, "high_is_right_pole");
  assert.equal(getFounderBaseQuestionScoreMeta("q30_conflict_fc2")?.polarity, "high_is_left_pole");
  assert.equal(getFounderBaseQuestionScoreMeta("q03_decision_l1")?.polarity, "high_is_right_pole");
  assert.equal(getFounderBaseQuestionScoreMeta("q21_decision_l2")?.polarity, "high_is_left_pole");
  assert.equal(getFounderBaseQuestionScoreMeta("q02_collaboration_l1")?.polarity, "high_is_right_pole");
  assert.equal(getFounderBaseQuestionScoreMeta("q20_collaboration_l2")?.polarity, "high_is_left_pole");
});

test("polarity scoring flips raw values only when the item points to the left pole", () => {
  assert.equal(scoreStoredBaseAnswerToFounderPercent("q11_commitment_fc1", "100"), 0);
  assert.equal(scoreStoredBaseAnswerToFounderPercent("q12_conflict_fc1", "75"), 75);
  assert.equal(scoreStoredBaseAnswerToFounderPercent("q30_conflict_fc2", "50"), 50);
  assert.equal(scoreStoredBaseAnswerToFounderPercent("q03_decision_l1", "75"), 75);
  assert.equal(scoreStoredBaseAnswerToFounderPercent("q21_decision_l2", "75"), 25);
  assert.equal(scoreStoredBaseAnswerToFounderPercent("q17_commitment_s1", "100"), 100);
});
