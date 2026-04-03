import {
  getRegistryItem,
  getOrderedActiveRegistryItems,
  getOrderedRegistryDimensions,
  getRegistryItemsByDimension,
  type DimensionId,
  type ItemId,
  type ItemLayer,
  type ItemType,
} from "@/features/scoring/founderCompatibilityRegistry";
import {
  FOUNDER_BASE_QUESTION_SCORE_META,
  applyFounderBaseItemPolarity,
  getFounderBaseQuestionScoreMeta,
  scoreStoredBaseAnswerToFounderPercent,
} from "@/features/scoring/founderBaseQuestionMeta";
import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";

// V2-native founder answer runtime.
// Item ids from the registry are the meaningful interface here. Legacy `q..` ids are
// translated only at the boundary so scoring/reporting can work against registry items.

export type FounderCompatibilityAnswerV2 = {
  itemId: ItemId;
  value: number;
  source: "legacy_bridge" | "registry";
  legacyQuestionId?: string;
};

export type FounderCompatibilityAnswerMapV2 = Partial<Record<ItemId, number>>;

export type LegacyFounderStoredAnswerRow = {
  question_id: string;
  choice_value: string;
};

export type LegacyFounderQuestionMetaLike = {
  id: string;
  category: string | null;
};

type LegacyFounderBridgeMeta = {
  questionId: string;
  itemId: ItemId;
  dimensionId: DimensionId;
  layer: ItemLayer;
  type: ItemType;
  legacySlot: number;
};

type FounderCompatibilityDimensionAggregate = {
  scoresByDimension: Partial<Record<DimensionId, number | null>>;
  answeredCountByDimension: Record<DimensionId, number>;
  expectedCountByDimension: Record<DimensionId, number>;
  itemsByDimension: Record<DimensionId, Array<{ itemId: ItemId; value: number }>>;
  answeredTotal: number;
  expectedTotal: number;
};

const CANONICAL_TO_DIMENSION_ID: Record<FounderDimensionKey, DimensionId> = {
  Unternehmenslogik: "company_logic",
  Entscheidungslogik: "decision_logic",
  "Arbeitsstruktur & Zusammenarbeit": "work_structure",
  Commitment: "commitment",
  Risikoorientierung: "risk_orientation",
  Konfliktstil: "conflict_style",
};

const ORDERED_DIMENSION_IDS = getOrderedRegistryDimensions().map(
  (dimension) => dimension.dimensionId
) as DimensionId[];

const ACTIVE_ITEM_BY_ID = new Set(getOrderedActiveRegistryItems().map((item) => item.itemId));

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normalizeCategory(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isBasisCategory(value: string | null | undefined) {
  return normalizeCategory(value) === "basis";
}

function extractLegacySlot(questionId: string) {
  const match = questionId.match(/_(?:l|fc|s)(\d+)$/i);
  const raw = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function clampLegacySlot(slot: number, max: number) {
  return Math.min(Math.max(slot, 1), max);
}

function buildLegacyQuestionBridgeMeta() {
  const cache = new Map<string, LegacyFounderBridgeMeta>();

  for (const entry of FOUNDER_BASE_QUESTION_SCORE_META) {
    const dimensionId = CANONICAL_TO_DIMENSION_ID[entry.dimension];
    const registryItems = getRegistryItemsByDimension(dimensionId)
      .filter((item) => item.isActive && item.type === entry.type)
      .sort((left, right) => left.order - right.order);

    if (registryItems.length === 0) {
      continue;
    }

    const legacySlot = extractLegacySlot(entry.id);
    const registryItem = registryItems[clampLegacySlot(legacySlot, registryItems.length) - 1];
    if (!registryItem || !ACTIVE_ITEM_BY_ID.has(registryItem.itemId)) {
      continue;
    }

    cache.set(entry.id, {
      questionId: entry.id,
      itemId: registryItem.itemId,
      dimensionId,
      layer: registryItem.layer,
      type: registryItem.type,
      legacySlot,
    });
  }

  return cache;
}

const LEGACY_QUESTION_TO_V2_ITEM = buildLegacyQuestionBridgeMeta();
const CANONICAL_LEGACY_QUESTION_ID_BY_ITEM = (() => {
  const cache = new Map<ItemId, string>();
  for (const [questionId, meta] of LEGACY_QUESTION_TO_V2_ITEM.entries()) {
    if (!cache.has(meta.itemId)) {
      cache.set(meta.itemId, questionId);
    }
  }
  return cache;
})();
const CANONICAL_LEGACY_QUESTION_ID_SET = new Set(CANONICAL_LEGACY_QUESTION_ID_BY_ITEM.values());

function founderPercentFromRegistryChoice(itemId: ItemId, rawValue: number) {
  const item = getRegistryItem(itemId);
  if (!item?.isActive) {
    return null;
  }
  if (!item.choices.some((choice) => choice.value === rawValue)) {
    return null;
  }

  return round(item.polarity === "left_pole_keyed" ? 100 - rawValue : rawValue);
}

function registryChoiceFromFounderPercent(itemId: ItemId, founderPercent: number) {
  const item = getRegistryItem(itemId);
  if (!item?.isActive) {
    return null;
  }

  const displayValue = round(
    item.polarity === "left_pole_keyed" ? 100 - founderPercent : founderPercent
  );

  return item.choices.some((choice) => choice.value === displayValue) ? displayValue : null;
}

function emptyCountRecord() {
  return ORDERED_DIMENSION_IDS.reduce((acc, dimensionId) => {
    acc[dimensionId] = 0;
    return acc;
  }, {} as Record<DimensionId, number>);
}

function emptyItemsRecord() {
  return ORDERED_DIMENSION_IDS.reduce((acc, dimensionId) => {
    acc[dimensionId] = [];
    return acc;
  }, {} as Record<DimensionId, Array<{ itemId: ItemId; value: number }>>);
}

export function getLegacyFounderQuestionBridgeMeta(questionId: string) {
  return LEGACY_QUESTION_TO_V2_ITEM.get(questionId) ?? null;
}

export function isActiveFounderCompatibilityItemId(questionId: string): questionId is ItemId {
  return ACTIVE_ITEM_BY_ID.has(questionId as ItemId);
}

export function getCanonicalLegacyFounderQuestionIdForItem(itemId: ItemId) {
  return CANONICAL_LEGACY_QUESTION_ID_BY_ITEM.get(itemId) ?? null;
}

export function isCanonicalLegacyFounderQuestionId(questionId: string) {
  return CANONICAL_LEGACY_QUESTION_ID_SET.has(questionId);
}

export function mapRegistryFounderChoiceToFounderPercent(itemId: ItemId, rawValue: string | number) {
  const numericValue =
    typeof rawValue === "number" ? rawValue : Number.parseFloat(String(rawValue).trim());
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return founderPercentFromRegistryChoice(itemId, numericValue);
}

export function mapFounderPercentToRegistryChoiceValue(
  itemId: ItemId,
  founderPercent: string | number
) {
  const numericValue =
    typeof founderPercent === "number"
      ? founderPercent
      : Number.parseFloat(String(founderPercent).trim());
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const displayValue = registryChoiceFromFounderPercent(itemId, numericValue);
  return displayValue == null ? null : String(displayValue);
}

export function mapRegistryFounderChoiceToPersistedLegacyChoice(
  itemId: ItemId,
  rawValue: string
) {
  const legacyQuestionId = getCanonicalLegacyFounderQuestionIdForItem(itemId);
  const legacyMeta = legacyQuestionId ? getFounderBaseQuestionScoreMeta(legacyQuestionId) : null;
  const founderPercent = mapRegistryFounderChoiceToFounderPercent(itemId, rawValue);

  if (!legacyQuestionId || !legacyMeta || founderPercent == null) {
    return null;
  }

  const persistedValue = round(
    legacyMeta.polarity === "high_is_right_pole"
      ? founderPercent
      : applyFounderBaseItemPolarity(founderPercent, legacyMeta.polarity)
  );

  return String(persistedValue);
}

export function mapLegacyFounderAnswerToV2Answer(
  questionId: string,
  rawValue: string
): FounderCompatibilityAnswerV2 | null {
  const bridgeMeta = getLegacyFounderQuestionBridgeMeta(questionId);
  if (!bridgeMeta) {
    return null;
  }

  const normalizedValue = scoreStoredBaseAnswerToFounderPercent(questionId, rawValue);
  if (normalizedValue == null || !Number.isFinite(normalizedValue)) {
    return null;
  }

  return {
    itemId: bridgeMeta.itemId,
    value: round(normalizedValue),
    source: "legacy_bridge",
    legacyQuestionId: questionId,
  };
}

export function mapLegacyFounderAnswersToV2Answers(
  rows: LegacyFounderStoredAnswerRow[],
  questionById?: Map<string, LegacyFounderQuestionMetaLike>
) {
  return rows.flatMap((row) => {
    if (isActiveFounderCompatibilityItemId(row.question_id)) {
      const item = getRegistryItem(row.question_id);
      if (!item?.isActive) {
        return [];
      }

      if (questionById) {
        const meta = questionById.get(row.question_id);
        if (meta && !isBasisCategory(meta.category)) {
          return [];
        }
      }

      const founderPercent = mapRegistryFounderChoiceToFounderPercent(item.itemId, row.choice_value);
      if (founderPercent == null) {
        return [];
      }

      return [
        {
          itemId: row.question_id,
          value: founderPercent,
          source: "registry",
        } satisfies FounderCompatibilityAnswerV2,
      ];
    }

    const meta = questionById?.get(row.question_id);
    if (questionById && !meta) {
      return [];
    }
    if (meta && !isBasisCategory(meta.category)) {
      return [];
    }

    const mapped = mapLegacyFounderAnswerToV2Answer(row.question_id, row.choice_value);
    return mapped ? [mapped] : [];
  });
}

export function buildFounderCompatibilityAnswerMapV2(
  answers: FounderCompatibilityAnswerV2[]
): FounderCompatibilityAnswerMapV2 {
  const registryBuckets = new Map<ItemId, number[]>();
  const legacyBuckets = new Map<ItemId, number[]>();

  for (const answer of answers) {
    if (!ACTIVE_ITEM_BY_ID.has(answer.itemId)) {
      continue;
    }

    const buckets = answer.source === "registry" ? registryBuckets : legacyBuckets;
    const existing = buckets.get(answer.itemId);
    if (existing) {
      existing.push(answer.value);
      continue;
    }

    buckets.set(answer.itemId, [answer.value]);
  }

  const map: FounderCompatibilityAnswerMapV2 = {};
  const itemIds = new Set<ItemId>([...legacyBuckets.keys(), ...registryBuckets.keys()]);
  for (const itemId of itemIds) {
    const values = registryBuckets.get(itemId) ?? legacyBuckets.get(itemId) ?? [];
    if (values.length === 0) continue;
    map[itemId] = round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  return map;
}

export function founderCompatibilityAnswerMapToAnswers(
  answerMap: FounderCompatibilityAnswerMapV2,
  source: FounderCompatibilityAnswerV2["source"] = "registry"
) {
  return Object.entries(answerMap).flatMap(([itemId, value]) => {
    if (!ACTIVE_ITEM_BY_ID.has(itemId as ItemId)) {
      return [];
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return [];
    }

    return [
      {
        itemId: itemId as ItemId,
        value: round(value),
        source,
      } satisfies FounderCompatibilityAnswerV2,
    ];
  });
}

export function aggregateFounderCompatibilityAnswerMapByDimension(
  answerMap: FounderCompatibilityAnswerMapV2,
  options?: {
    layer?: ItemLayer | "all";
  }
): FounderCompatibilityDimensionAggregate {
  const layer = options?.layer ?? "all";
  const scoresByDimension: Partial<Record<DimensionId, number | null>> = {};
  const answeredCountByDimension = emptyCountRecord();
  const expectedCountByDimension = emptyCountRecord();
  const itemsByDimension = emptyItemsRecord();

  for (const dimensionId of ORDERED_DIMENSION_IDS) {
    const registryItems = getRegistryItemsByDimension(dimensionId)
      .filter((item) => item.isActive && (layer === "all" || item.layer === layer))
      .sort((left, right) => left.order - right.order);

    expectedCountByDimension[dimensionId] = registryItems.length;

    const scoredItems = registryItems.flatMap((item) => {
      const value = answerMap[item.itemId];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return [];
      }

      return [{ itemId: item.itemId, value: round(value) }];
    });

    answeredCountByDimension[dimensionId] = scoredItems.length;
    itemsByDimension[dimensionId] = scoredItems;
    scoresByDimension[dimensionId] =
      scoredItems.length > 0
        ? round(scoredItems.reduce((sum, item) => sum + item.value, 0) / scoredItems.length)
        : null;
  }

  const answeredTotal = ORDERED_DIMENSION_IDS.reduce(
    (sum, dimensionId) => sum + answeredCountByDimension[dimensionId],
    0
  );
  const expectedTotal = ORDERED_DIMENSION_IDS.reduce(
    (sum, dimensionId) => sum + expectedCountByDimension[dimensionId],
    0
  );

  return {
    scoresByDimension,
    answeredCountByDimension,
    expectedCountByDimension,
    itemsByDimension,
    answeredTotal,
    expectedTotal,
  };
}

// Numeric founder compatibility scoring must only use CORE items.
// SUPPORT items remain available through the generic aggregate helper for
// report/workbook enrichment and debug inspection.
export function aggregateFounderCompatibilityAnswerMapForScoring(
  answerMap: FounderCompatibilityAnswerMapV2
) {
  return aggregateFounderCompatibilityAnswerMapByDimension(answerMap, {
    layer: "core",
  });
}

export function aggregateFounderCompatibilityAnswerMapForEnrichment(
  answerMap: FounderCompatibilityAnswerMapV2
) {
  return aggregateFounderCompatibilityAnswerMapByDimension(answerMap, {
    layer: "all",
  });
}
