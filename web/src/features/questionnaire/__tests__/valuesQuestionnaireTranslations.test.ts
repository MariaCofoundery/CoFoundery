import assert from "node:assert/strict";
import test from "node:test";
import type { QuestionnaireChoice } from "@/features/questionnaire/QuestionnaireClient";
import type { QuestionnaireQuestion } from "@/features/questionnaire/questionnaireShared";
import {
  EN_VALUES_QUESTION_TRANSLATIONS,
  localizeValuesQuestionsAndChoices,
} from "@/features/questionnaire/valuesQuestionnaireTranslations";
import { getCanonicalValuesQuestionIds } from "@/features/reporting/valuesQuestionMeta";

function buildQuestions(): QuestionnaireQuestion[] {
  return getCanonicalValuesQuestionIds().map((questionId, index) => ({
    id: questionId,
    dimension: "Werte & Ethik",
    type: "scenario",
    prompt: `Deutsche Wertefrage ${questionId}`,
    sort_order: index + 37,
    is_active: true,
    category: "values",
  }));
}

function buildChoices(): QuestionnaireChoice[] {
  return getCanonicalValuesQuestionIds().flatMap((questionId) =>
    ["1", "2", "3", "4"].map((value, index) => ({
      id: `${questionId}-choice-${value}`,
      question_id: questionId,
      label: `Deutsche Antwort ${questionId}.${value}`,
      value,
      sort_order: index + 1,
    }))
  );
}

test("English values questionnaire translations cover every active values question and choice value", () => {
  const expectedQuestionIds = getCanonicalValuesQuestionIds();
  assert.deepEqual(Object.keys(EN_VALUES_QUESTION_TRANSLATIONS), expectedQuestionIds);

  for (const questionId of expectedQuestionIds) {
    const translation = EN_VALUES_QUESTION_TRANSLATIONS[questionId];
    assert.ok(translation, `${questionId}:missing_translation`);
    assert.ok(translation.prompt.trim(), `${questionId}:missing_prompt`);
    assert.deepEqual(Object.keys(translation.choices), ["1", "2", "3", "4"]);

    for (const value of ["1", "2", "3", "4"]) {
      assert.ok(translation.choices[value]?.trim(), `${questionId}:${value}:missing_choice_label`);
    }
  }
});

test("values questionnaire overlay localizes visible copy without changing ids, values, order or scoring inputs", () => {
  const questions = buildQuestions();
  const choices = buildChoices();
  const localized = localizeValuesQuestionsAndChoices({ questions, choices, locale: "en" });

  assert.equal(localized.questions.length, questions.length);
  assert.equal(localized.choices.length, choices.length);
  assert.deepEqual(
    localized.questions.map((question) => question.id),
    questions.map((question) => question.id)
  );
  assert.deepEqual(
    localized.questions.map((question) => question.dimension),
    questions.map((question) => question.dimension)
  );
  assert.deepEqual(
    localized.questions.map((question) => question.category),
    questions.map((question) => question.category)
  );
  assert.deepEqual(
    localized.questions.map((question) => question.type),
    questions.map((question) => question.type)
  );
  assert.deepEqual(
    localized.questions.map((question) => question.sort_order),
    questions.map((question) => question.sort_order)
  );
  assert.deepEqual(
    localized.choices.map((choice) => `${choice.id}:${choice.question_id}:${choice.value}:${choice.sort_order}`),
    choices.map((choice) => `${choice.id}:${choice.question_id}:${choice.value}:${choice.sort_order}`)
  );

  assert.equal(
    localized.questions.find((question) => question.id === "wv2_1")?.prompt,
    EN_VALUES_QUESTION_TRANSLATIONS.wv2_1.prompt
  );
  assert.equal(
    localized.choices.find((choice) => choice.question_id === "wv2_1" && choice.value === "3")?.label,
    EN_VALUES_QUESTION_TRANSLATIONS.wv2_1.choices["3"]
  );
});

test("values questionnaire overlay leaves Supabase copy untouched for de and unknown locales", () => {
  const questions = buildQuestions();
  const choices = buildChoices();

  assert.deepEqual(localizeValuesQuestionsAndChoices({ questions, choices, locale: "de" }), {
    questions,
    choices,
  });
  assert.deepEqual(localizeValuesQuestionsAndChoices({ questions, choices, locale: "fr" }), {
    questions,
    choices,
  });
});

test("English values questionnaire visible copy avoids German assessment remnants", () => {
  const localized = localizeValuesQuestionsAndChoices({
    questions: buildQuestions(),
    choices: buildChoices(),
    locale: "en",
  });

  const visibleText = [
    ...localized.questions.map((question) => question.prompt),
    ...localized.choices.map((choice) => choice.label),
  ].join(" ");

  assert.equal(
    /\b(?:Dein|deine|deinen|du|Kund:innen|Bestandskund|Maßnahmen|Maßnahme|Vertriebspartner|Partnerschaft|Runway-Ziele|Übergang|Klärung|Entscheidungen|Wertefrage|Antwort)\b/i.test(
      visibleText
    ),
    false
  );
  assert.equal(/\b(?:perfect match|bad match|weak founder|diagnosis)\b/i.test(visibleText), false);
});
