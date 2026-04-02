import {
  getOrderedActiveRegistryItems,
  getRegistryItem,
  type ItemId,
  type RegistryItem,
} from "@/features/scoring/founderCompatibilityRegistry";
import type { AnswerMap } from "@/features/assessments/actions";
import { type QuestionnaireQuestion } from "@/features/questionnaire/questionnaireShared";
import { getFounderBaseQuestionScoreMeta } from "@/features/scoring/founderBaseQuestionMeta";

export type FounderCompatibilityBaseQuestionnaireChoice = {
  id: string;
  question_id: string;
  label: string;
  value: string;
  sort_order: number;
};

const ACTIVE_BASE_REGISTRY_ITEMS = getOrderedActiveRegistryItems();
const ACTIVE_BASE_REGISTRY_ITEM_IDS = new Set(
  ACTIVE_BASE_REGISTRY_ITEMS.map((item) => item.itemId)
);

function forcedChoiceStatementsFromPrompt(prompt: string) {
  const match = prompt.match(/^\s*Welche Aussage passt eher zu dir\?\s*A:\s*(.+?)\s*B:\s*(.+?)\s*$/i);
  if (!match) {
    return {
      optionA: null,
      optionB: null,
    };
  }

  return {
    optionA: match[1]?.trim() || null,
    optionB: match[2]?.trim() || null,
  };
}

function toQuestion(item: RegistryItem): QuestionnaireQuestion {
  const forcedChoice = item.type === "forced_choice" ? forcedChoiceStatementsFromPrompt(item.prompt) : null;

  return {
    id: item.itemId,
    dimension: item.dimensionLabel,
    type: item.type,
    prompt: item.prompt,
    sort_order: item.order,
    is_active: item.isActive,
    category: "basis",
    optionA: forcedChoice?.optionA ?? null,
    optionB: forcedChoice?.optionB ?? null,
    option_a: forcedChoice?.optionA ?? null,
    option_b: forcedChoice?.optionB ?? null,
  };
}

function toChoices(item: RegistryItem): FounderCompatibilityBaseQuestionnaireChoice[] {
  return item.choices.map((choice, index) => ({
    id: `${item.itemId}:${choice.value}`,
    question_id: item.itemId,
    label: choice.label,
    value: String(choice.value),
    sort_order: index,
  }));
}

export function buildFounderCompatibilityBaseQuestionnaire() {
  const questions = ACTIVE_BASE_REGISTRY_ITEMS.map(toQuestion);
  const choices = ACTIVE_BASE_REGISTRY_ITEMS.flatMap(toChoices);

  return {
    questions,
    choices,
  };
}

export function isActiveFounderCompatibilityBaseItemId(value: string): value is ItemId {
  return ACTIVE_BASE_REGISTRY_ITEM_IDS.has(value as ItemId);
}

export function getFounderCompatibilityBaseItem(itemId: string) {
  if (!isActiveFounderCompatibilityBaseItemId(itemId)) {
    return null;
  }
  return getRegistryItem(itemId);
}

export function isValidFounderCompatibilityBaseChoiceValue(itemId: string, choiceValue: string) {
  const item = getFounderCompatibilityBaseItem(itemId);
  if (!item) {
    return false;
  }

  return item.choices.some((choice) => String(choice.value) === choiceValue);
}

export function hasLegacyFounderBaseAnswers(answerMap: AnswerMap) {
  return Object.keys(answerMap).some((questionId) => Boolean(getFounderBaseQuestionScoreMeta(questionId)));
}
