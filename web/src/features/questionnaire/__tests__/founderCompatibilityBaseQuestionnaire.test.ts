import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderCompatibilityBaseQuestionnaire,
  getFounderCompatibilityBasePersistenceQuestionId,
  hasIncompatibleLegacyFounderBaseAnswers,
  isActiveFounderCompatibilityBaseItemId,
  isValidFounderCompatibilityBaseChoiceValue,
  normalizeFounderCompatibilityBaseDraftAnswerMap,
} from "@/features/questionnaire/founderCompatibilityBaseQuestionnaire";

test("base questionnaire runtime exposes the active 36-item founder compatibility flow", () => {
  const { questions, choices } = buildFounderCompatibilityBaseQuestionnaire();

  assert.equal(questions.length, 36);
  assert.equal(questions[0]?.id, "cl_core_1");
  assert.equal(questions[35]?.id, "cs_support_2");
  assert.equal(new Set(questions.map((question) => question.id)).size, 36);

  const choicesForFirst = choices.filter((choice) => choice.question_id === "cl_core_1");
  const choicesForForcedChoice = choices.filter((choice) => choice.question_id === "cl_core_2");
  const choicesForScenario = choices.filter((choice) => choice.question_id === "cl_core_4");

  assert.deepEqual(
    choicesForFirst.map((choice) => choice.value),
    ["0", "25", "50", "75", "100"]
  );
  assert.deepEqual(
    choicesForForcedChoice.map((choice) => choice.value),
    ["0", "25", "50", "75", "100"]
  );
  assert.deepEqual(
    choicesForScenario.map((choice) => choice.value),
    ["0", "33", "67", "100"]
  );
});

test("base questionnaire runtime validates active registry item ids and choice values", () => {
  assert.equal(isActiveFounderCompatibilityBaseItemId("cl_core_1"), true);
  assert.equal(isActiveFounderCompatibilityBaseItemId("q01_vision_l1"), false);
  assert.equal(isValidFounderCompatibilityBaseChoiceValue("cl_core_1", "75"), true);
  assert.equal(isValidFounderCompatibilityBaseChoiceValue("cl_core_1", "4"), false);
});

test("registry-native questionnaire items map onto canonical persisted legacy question ids", () => {
  assert.equal(getFounderCompatibilityBasePersistenceQuestionId("cl_core_1"), "q01_vision_l1");
  assert.equal(getFounderCompatibilityBasePersistenceQuestionId("cl_core_3"), "q25_vision_fc2");
  assert.equal(getFounderCompatibilityBasePersistenceQuestionId("cl_support_1"), "q31_vision_s2");
  assert.equal(getFounderCompatibilityBasePersistenceQuestionId("cs_support_2"), "q48_conflict_s4");
});

test("saved legacy base answers hydrate back into the 36-item questionnaire answer map", () => {
  const normalized = normalizeFounderCompatibilityBaseDraftAnswerMap({
    q01_vision_l1: "75",
    q25_vision_fc2: "50",
    q31_vision_s2: "67",
  });

  assert.deepEqual(normalized, {
    cl_core_1: "75",
    cl_core_3: "50",
    cl_support_1: "67",
  });
});

test("only non-canonical old 48-question drafts are treated as incompatible", () => {
  assert.equal(
    hasIncompatibleLegacyFounderBaseAnswers({
      q01_vision_l1: "75",
      q25_vision_fc2: "50",
      q31_vision_s2: "67",
    }),
    false
  );

  assert.equal(
    hasIncompatibleLegacyFounderBaseAnswers({
      q43_vision_s4: "67",
    }),
    true
  );
});
