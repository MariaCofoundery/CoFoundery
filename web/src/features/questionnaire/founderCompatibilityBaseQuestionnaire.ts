import {
  getOrderedActiveRegistryItems,
  getRegistryItem,
  type ItemId,
  type RegistryItem,
} from "@/features/scoring/founderCompatibilityRegistry";
import { normalizeLocale, type AppLocale } from "@/i18n/config";
import type { AnswerMap } from "@/features/assessments/actions";
import { getEnglishFounderCompatibilityBaseItemTranslation } from "@/features/questionnaire/founderCompatibilityBaseQuestionnaireTranslations";
import {
  getCanonicalLegacyFounderQuestionIdForItem,
  getLegacyFounderQuestionBridgeMeta,
  isActiveFounderCompatibilityItemId,
  isCanonicalLegacyFounderQuestionId,
  mapFounderPercentToRegistryChoiceValue,
  mapLegacyFounderAnswerToV2Answer,
  mapRegistryFounderChoiceToPersistedLegacyChoice,
} from "@/features/scoring/founderCompatibilityAnswerRuntime";
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
  const lineParts = prompt
    .split(/\r?\n+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const optionA = lineParts
    .map((part) => part.match(/^(?:aussage\s*a|a)\s*[:)\-]\s*(.+)$/i)?.[1]?.trim() ?? null)
    .find((value): value is string => Boolean(value));
  const optionB = lineParts
    .map((part) => part.match(/^(?:aussage\s*b|b)\s*[:)\-]\s*(.+)$/i)?.[1]?.trim() ?? null)
    .find((value): value is string => Boolean(value));

  if (!optionA || !optionB) {
    return {
      optionA: null,
      optionB: null,
    };
  }

  return {
    optionA,
    optionB,
  };
}

function getVisiblePrompt(item: RegistryItem, locale: AppLocale) {
  if (locale !== "en") {
    return item.prompt;
  }

  return getEnglishFounderCompatibilityBaseItemTranslation(item.itemId)?.prompt ?? item.prompt;
}

function getVisibleChoiceLabel(item: RegistryItem, choiceValue: string, fallbackLabel: string, locale: AppLocale) {
  if (locale !== "en") {
    return fallbackLabel;
  }

  return getEnglishFounderCompatibilityBaseItemTranslation(item.itemId)?.choices[choiceValue] ?? fallbackLabel;
}

function toQuestion(item: RegistryItem, locale: AppLocale): QuestionnaireQuestion {
  const prompt = getVisiblePrompt(item, locale);
  const forcedChoice = item.type === "forced_choice" ? forcedChoiceStatementsFromPrompt(prompt) : null;

  return {
    id: item.itemId,
    dimension: item.dimensionLabel,
    type: item.type,
    prompt,
    sort_order: item.order,
    is_active: item.isActive,
    category: "basis",
    optionA: forcedChoice?.optionA ?? null,
    optionB: forcedChoice?.optionB ?? null,
    option_a: forcedChoice?.optionA ?? null,
    option_b: forcedChoice?.optionB ?? null,
  };
}

function toChoices(item: RegistryItem, locale: AppLocale): FounderCompatibilityBaseQuestionnaireChoice[] {
  return item.choices.map((choice, index) => ({
    id: `${item.itemId}:${choice.value}`,
    question_id: item.itemId,
    label: getVisibleChoiceLabel(item, String(choice.value), choice.label, locale),
    value: String(choice.value),
    sort_order: index,
  }));
}

export function buildFounderCompatibilityBaseQuestionnaire(locale?: AppLocale | string | null) {
  const resolvedLocale = normalizeLocale(locale);
  const questions = ACTIVE_BASE_REGISTRY_ITEMS.map((item) => toQuestion(item, resolvedLocale));
  const choices = ACTIVE_BASE_REGISTRY_ITEMS.flatMap((item) => toChoices(item, resolvedLocale));

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

export function getFounderCompatibilityBasePersistenceQuestionId(itemId: string) {
  if (!isActiveFounderCompatibilityBaseItemId(itemId)) {
    return null;
  }

  return getCanonicalLegacyFounderQuestionIdForItem(itemId) ?? null;
}

export function getFounderCompatibilityBasePersistedChoiceValue(itemId: string, choiceValue: string) {
  if (!isActiveFounderCompatibilityBaseItemId(itemId)) {
    return null;
  }

  return mapRegistryFounderChoiceToPersistedLegacyChoice(itemId, choiceValue);
}

export function normalizeFounderCompatibilityBaseDraftAnswerMap(answerMap: AnswerMap): AnswerMap {
  const normalized: AnswerMap = {};

  for (const [questionId, choiceValue] of Object.entries(answerMap)) {
    if (isActiveFounderCompatibilityItemId(questionId) && isValidFounderCompatibilityBaseChoiceValue(questionId, choiceValue)) {
      normalized[questionId] = choiceValue;
      continue;
    }

    const bridgeMeta = getLegacyFounderQuestionBridgeMeta(questionId);
    if (!bridgeMeta) {
      continue;
    }

    const mapped = mapLegacyFounderAnswerToV2Answer(questionId, choiceValue);
    if (!mapped) {
      continue;
    }

    const displayChoiceValue = mapFounderPercentToRegistryChoiceValue(mapped.itemId, mapped.value);
    if (!displayChoiceValue) {
      continue;
    }

    normalized[bridgeMeta.itemId] = displayChoiceValue;
  }

  return normalized;
}

export function hasIncompatibleLegacyFounderBaseAnswers(answerMap: AnswerMap) {
  return Object.keys(answerMap).some((questionId) => {
    if (isActiveFounderCompatibilityItemId(questionId)) {
      return false;
    }

    if (!getFounderBaseQuestionScoreMeta(questionId)) {
      return false;
    }

    return !isCanonicalLegacyFounderQuestionId(questionId);
  });
}
