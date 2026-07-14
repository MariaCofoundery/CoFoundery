import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderCompatibilityBaseQuestionnaire,
  getFounderCompatibilityBasePersistedChoiceValue,
  getFounderCompatibilityBasePersistenceQuestionId,
  hasIncompatibleLegacyFounderBaseAnswers,
  isActiveFounderCompatibilityBaseItemId,
  isValidFounderCompatibilityBaseChoiceValue,
  normalizeFounderCompatibilityBaseDraftAnswerMap,
} from "@/features/questionnaire/founderCompatibilityBaseQuestionnaire";
import { EN_FOUNDER_COMPATIBILITY_BASE_ITEM_TRANSLATIONS } from "@/features/questionnaire/founderCompatibilityBaseQuestionnaireTranslations";
import { getOrderedActiveRegistryItems } from "@/features/scoring/founderCompatibilityRegistry";

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

test("base questionnaire localizes visible copy without changing ids, dimensions, order or values", () => {
  const de = buildFounderCompatibilityBaseQuestionnaire("de");
  const en = buildFounderCompatibilityBaseQuestionnaire("en");
  const fallback = buildFounderCompatibilityBaseQuestionnaire("fr");

  assert.equal(en.questions.length, de.questions.length);
  assert.equal(en.choices.length, de.choices.length);
  assert.deepEqual(
    en.questions.map((question) => question.id),
    de.questions.map((question) => question.id)
  );
  assert.deepEqual(
    en.questions.map((question) => question.dimension),
    de.questions.map((question) => question.dimension)
  );
  assert.deepEqual(
    en.choices.map((choice) => `${choice.question_id}:${choice.value}:${choice.sort_order}`),
    de.choices.map((choice) => `${choice.question_id}:${choice.value}:${choice.sort_order}`)
  );
  assert.deepEqual(fallback, de);

  assert.equal(
    de.questions[0]?.prompt,
    "Wenn ich neue Möglichkeiten für das Unternehmen bewerte, ist für mich vor allem wichtig, ob sie das Unternehmen langfristig solide aufbauen."
  );
  assert.equal(
    en.questions[0]?.prompt,
    "When I evaluate new opportunities for the company, what matters most to me is whether they help build the company solidly for the long term."
  );
  assert.equal(
    en.choices.find((choice) => choice.question_id === "cl_core_1" && choice.value === "75")?.label,
    "Somewhat agree"
  );
  assert.equal(
    en.questions.find((question) => question.id === "cl_core_2")?.optionA,
    "I evaluate new opportunities mainly by whether they make the company more stable and clearer."
  );
});

test("English base questionnaire translations cover every active item and choice", () => {
  const activeItems = getOrderedActiveRegistryItems();
  assert.equal(Object.keys(EN_FOUNDER_COMPATIBILITY_BASE_ITEM_TRANSLATIONS).length, activeItems.length);

  for (const item of activeItems) {
    const translation = EN_FOUNDER_COMPATIBILITY_BASE_ITEM_TRANSLATIONS[item.itemId];
    assert.ok(translation, `${item.itemId}:missing_translation`);
    assert.ok(translation.prompt.trim().length > 0, `${item.itemId}:missing_prompt`);
    assert.deepEqual(
      Object.keys(translation.choices),
      item.choices.map((choice) => String(choice.value)),
      `${item.itemId}:choice_values_changed`
    );
    for (const choice of item.choices) {
      assert.ok(
        translation.choices[String(choice.value)]?.trim(),
        `${item.itemId}:${choice.value}:missing_choice_label`
      );
    }
  }
});

test("English base questionnaire visible copy avoids German questionnaire remnants", () => {
  const { questions, choices } = buildFounderCompatibilityBaseQuestionnaire("en");
  const visibleText = [
    ...questions.map((question) => question.prompt),
    ...questions.flatMap((question) => [question.optionA ?? "", question.optionB ?? ""]),
    ...choices.map((choice) => choice.label),
  ].join(" ");

  assert.equal(
    /\b(?:Welche|Aussage|passt|eher|trifft|überhaupt|teils|gleich|würde|klären|geklärt|Unternehmen|Zusammenarbeit|Risikoorientierung|Konfliktstil)\b/i.test(
      visibleText
    ),
    false
  );
});

test("registry-native questionnaire items map onto canonical persisted legacy question ids", () => {
  assert.equal(getFounderCompatibilityBasePersistenceQuestionId("cl_core_1"), "q01_vision_l1");
  assert.equal(getFounderCompatibilityBasePersistenceQuestionId("cl_core_3"), "q13_vision_s1");
  assert.equal(getFounderCompatibilityBasePersistenceQuestionId("cl_support_1"), "q37_vision_s3");
  assert.equal(getFounderCompatibilityBasePersistenceQuestionId("cs_support_2"), "q48_conflict_s4");
});

test("registry-native questionnaire choices are transformed into compatible legacy stored values", () => {
  assert.equal(getFounderCompatibilityBasePersistedChoiceValue("cl_core_1", "75"), "25");
  assert.equal(getFounderCompatibilityBasePersistedChoiceValue("cl_core_2", "0"), "100");
  assert.equal(getFounderCompatibilityBasePersistedChoiceValue("cl_core_3", "67"), "33");
  assert.equal(getFounderCompatibilityBasePersistedChoiceValue("dl_core_4", "67"), "67");
});

test("saved legacy base answers hydrate back into the 36-item questionnaire answer map", () => {
  const normalized = normalizeFounderCompatibilityBaseDraftAnswerMap({
    q01_vision_l1: "25",
    q13_vision_s1: "33",
    q37_vision_s3: "33",
  });

  assert.deepEqual(normalized, {
    cl_core_1: "75",
    cl_core_3: "67",
    cl_support_1: "67",
  });
});

test("only non-canonical old 48-question drafts are treated as incompatible", () => {
  assert.equal(
    hasIncompatibleLegacyFounderBaseAnswers({
      q01_vision_l1: "25",
      q13_vision_s1: "33",
      q37_vision_s3: "33",
    }),
    false
  );

  assert.equal(
    hasIncompatibleLegacyFounderBaseAnswers({
      q25_vision_fc2: "50",
    }),
    true
  );
});
