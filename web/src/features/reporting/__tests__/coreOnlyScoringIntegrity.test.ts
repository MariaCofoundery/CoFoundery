import assert from "node:assert/strict";
import test from "node:test";
import { aggregateBaseScoresFromAnswers } from "@/features/reporting/base_scoring";
import { aggregateFounderBaseScoresFromAnswers } from "@/features/reporting/selfReportScoring";

function basisMeta(questionIds: string[]) {
  return new Map(
    questionIds.map((id) => [
      id,
      {
        id,
        category: "basis",
        dimension: null,
        prompt: null,
      },
    ])
  );
}

test("self report scoring uses only CORE items numerically while keeping SUPPORT items in debug enrichment", () => {
  const answers = [
    { question_id: "q08_collaboration_fc1", choice_value: "100" }, // ws_core_1 -> 100
    { question_id: "q14_collaboration_s1", choice_value: "100" }, // ws_core_2 -> 0
    { question_id: "q32_collaboration_s2", choice_value: "100" }, // ws_core_3 -> 0
    { question_id: "q20_collaboration_l2", choice_value: "100" }, // ws_core_4 -> 0
    { question_id: "q38_collaboration_s3", choice_value: "100" }, // ws_support_1 -> 0
    { question_id: "q44_collaboration_s4", choice_value: "0" },   // ws_support_2 -> 100
  ];
  const meta = basisMeta(answers.map((entry) => entry.question_id));

  const result = aggregateFounderBaseScoresFromAnswers(answers, meta);
  const workDimension = result.debugDimensions.find(
    (entry) => entry.dimension === "Arbeitsstruktur & Zusammenarbeit"
  );

  assert.equal(result.scores["Arbeitsstruktur & Zusammenarbeit"], 25);
  assert.equal(result.answeredNumericByDimension["Arbeitsstruktur & Zusammenarbeit"], 4);
  assert.equal(result.expectedByDimension["Arbeitsstruktur & Zusammenarbeit"], 4);
  assert.equal(result.numericAnsweredTotal, 4);
  assert.equal(result.expectedTotal, 24);
  assert.deepEqual(
    workDimension?.questions.map((entry) => entry.questionId),
    ["ws_core_1", "ws_core_2", "ws_core_3", "ws_core_4", "ws_support_1", "ws_support_2"]
  );
});

test("base scoring uses only CORE items numerically while leaving SUPPORT visible for enrichment/debug", () => {
  const answers = [
    { question_id: "q08_collaboration_fc1", choice_value: "100" },
    { question_id: "q14_collaboration_s1", choice_value: "100" },
    { question_id: "q32_collaboration_s2", choice_value: "100" },
    { question_id: "q20_collaboration_l2", choice_value: "100" },
    { question_id: "q38_collaboration_s3", choice_value: "100" },
    { question_id: "q44_collaboration_s4", choice_value: "0" },
  ];
  const meta = basisMeta(answers.map((entry) => entry.question_id));

  const result = aggregateBaseScoresFromAnswers(answers, meta);
  const autonomyDimension = result.debugDimensions.find((entry) => entry.dimension === "Autonomie");

  assert.equal(result.scores.Autonomie, 2.25);
  assert.equal(result.answeredNumericByDimension.Autonomie, 4);
  assert.equal(result.expectedByDimension.Autonomie, 4);
  assert.equal(result.numericAnsweredTotal, 4);
  assert.equal(result.expectedTotal, 24);
  assert.deepEqual(
    autonomyDimension?.questions.map((entry) => entry.questionId),
    ["ws_core_1", "ws_core_2", "ws_core_3", "ws_core_4", "ws_support_1", "ws_support_2"]
  );
});
