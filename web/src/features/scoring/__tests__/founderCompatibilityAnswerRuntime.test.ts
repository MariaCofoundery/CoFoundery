import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateFounderCompatibilityAnswerMapByDimension,
  aggregateFounderCompatibilityAnswerMapForEnrichment,
  aggregateFounderCompatibilityAnswerMapForScoring,
  buildFounderCompatibilityAnswerMapV2,
  founderCompatibilityAnswerMapToAnswers,
  getLegacyFounderQuestionBridgeMeta,
  mapLegacyFounderAnswerToV2Answer,
  mapLegacyFounderAnswersToV2Answers,
} from "@/features/scoring/founderCompatibilityAnswerRuntime";

test("legacy question ids map into V2 registry item ids", () => {
  assert.equal(getLegacyFounderQuestionBridgeMeta("q01_vision_l1")?.itemId, "cl_core_1");
  assert.equal(getLegacyFounderQuestionBridgeMeta("q25_vision_fc2")?.itemId, "cl_core_3");
  assert.equal(getLegacyFounderQuestionBridgeMeta("q31_vision_s2")?.itemId, "cl_support_1");
  assert.equal(getLegacyFounderQuestionBridgeMeta("q48_conflict_s4")?.itemId, "cs_support_2");
});

test("legacy answer mapping normalizes values and ignores unknown ids", () => {
  const known = mapLegacyFounderAnswerToV2Answer("q11_commitment_fc1", "100");
  const unknown = mapLegacyFounderAnswerToV2Answer("q99_unknown", "100");

  assert.deepEqual(known, {
    itemId: "cm_core_2",
    value: 0,
    source: "legacy_bridge",
    legacyQuestionId: "q11_commitment_fc1",
  });
  assert.equal(unknown, null);
});

test("legacy rows are filtered through the basis boundary before V2 conversion", () => {
  const rows = [
    { question_id: "q01_vision_l1", choice_value: "75" },
    { question_id: "q07_vision_fc1", choice_value: "25" },
    { question_id: "q49_values_1", choice_value: "100" },
  ];
  const questionById = new Map([
    ["q01_vision_l1", { id: "q01_vision_l1", category: "basis" }],
    ["q07_vision_fc1", { id: "q07_vision_fc1", category: "basis" }],
    ["q49_values_1", { id: "q49_values_1", category: "values" }],
  ]);

  const mapped = mapLegacyFounderAnswersToV2Answers(rows, questionById);

  assert.deepEqual(
    mapped.map((entry) => ({ itemId: entry.itemId, value: entry.value })),
    [
      { itemId: "cl_core_1", value: 75 },
      { itemId: "cl_core_2", value: 75 },
    ]
  );
});

test("registry-native base rows map directly without legacy question metadata", () => {
  const rows = [
    { question_id: "cl_core_1", choice_value: "75" },
    { question_id: "cl_support_1", choice_value: "67" },
    { question_id: "q49_values_1", choice_value: "100" },
  ];

  const mapped = mapLegacyFounderAnswersToV2Answers(rows);

  assert.deepEqual(
    mapped.map((entry) => ({ itemId: entry.itemId, value: entry.value, source: entry.source })),
    [
      { itemId: "cl_core_1", value: 75, source: "registry" },
      { itemId: "cl_support_1", value: 67, source: "registry" },
    ]
  );
});

test("V2 answer maps average duplicate legacy mappings onto one canonical item id", () => {
  const answerMap = buildFounderCompatibilityAnswerMapV2([
    { itemId: "cl_core_1", value: 0, source: "legacy_bridge", legacyQuestionId: "q01_vision_l1" },
    { itemId: "cl_core_1", value: 100, source: "legacy_bridge", legacyQuestionId: "q19_vision_l2" },
    { itemId: "cl_core_2", value: 25, source: "legacy_bridge", legacyQuestionId: "q07_vision_fc1" },
  ]);

  assert.equal(answerMap.cl_core_1, 50);
  assert.equal(answerMap.cl_core_2, 25);
});

test("registry-native answers override legacy bridge answers for the same canonical item", () => {
  const answerMap = buildFounderCompatibilityAnswerMapV2([
    { itemId: "cl_core_1", value: 0, source: "legacy_bridge", legacyQuestionId: "q01_vision_l1" },
    { itemId: "cl_core_1", value: 75, source: "registry" },
  ]);

  assert.equal(answerMap.cl_core_1, 75);
});

test("dimension aggregates operate on V2 item ids instead of legacy question ids", () => {
  const answerMap = buildFounderCompatibilityAnswerMapV2([
    { itemId: "ws_core_1", value: 0, source: "registry" },
    { itemId: "ws_core_2", value: 50, source: "registry" },
    { itemId: "ws_support_1", value: 100, source: "registry" },
  ]);
  const aggregate = aggregateFounderCompatibilityAnswerMapByDimension(answerMap, {
    layer: "all",
  });
  const coreOnlyAggregate = aggregateFounderCompatibilityAnswerMapByDimension(answerMap, {
    layer: "core",
  });
  const enrichmentAggregate = aggregateFounderCompatibilityAnswerMapForEnrichment(answerMap);
  const scoringAggregate = aggregateFounderCompatibilityAnswerMapForScoring(answerMap);

  assert.equal(aggregate.scoresByDimension.work_structure, 50);
  assert.equal(aggregate.answeredCountByDimension.work_structure, 3);
  assert.equal(aggregate.expectedCountByDimension.work_structure, 6);
  assert.equal(coreOnlyAggregate.scoresByDimension.work_structure, 25);
  assert.equal(coreOnlyAggregate.expectedCountByDimension.work_structure, 4);
  assert.deepEqual(
    enrichmentAggregate.itemsByDimension.work_structure.map((item) => item.itemId),
    ["ws_core_1", "ws_core_2", "ws_support_1"]
  );
  assert.deepEqual(
    scoringAggregate.itemsByDimension.work_structure.map((item) => item.itemId),
    ["ws_core_1", "ws_core_2"]
  );
});

test("answer maps can be converted back into V2 answer arrays without legacy semantics", () => {
  const answers = founderCompatibilityAnswerMapToAnswers({
    cl_core_1: 20,
    cl_support_2: 80,
  });

  assert.deepEqual(answers, [
    { itemId: "cl_core_1", value: 20, source: "registry" },
    { itemId: "cl_support_2", value: 80, source: "registry" },
  ]);
});
