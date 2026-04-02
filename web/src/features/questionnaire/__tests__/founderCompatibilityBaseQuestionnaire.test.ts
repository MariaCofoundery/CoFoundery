import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderCompatibilityBaseQuestionnaire,
  isActiveFounderCompatibilityBaseItemId,
  isValidFounderCompatibilityBaseChoiceValue,
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
