import registryJson from "../../../docs/founder-compatibility-item-registry-v1.json";

export const REGISTRY_DIMENSION_IDS = [
  "company_logic",
  "decision_logic",
  "work_structure",
  "commitment",
  "risk_orientation",
  "conflict_style",
] as const;

export type DimensionId = (typeof REGISTRY_DIMENSION_IDS)[number];
export type ItemLayer = "core" | "support";
export type ItemType = "likert" | "forced_choice" | "scenario";
export type RegistryItemPolarity =
  | "left_pole_keyed"
  | "right_pole_keyed"
  | "forced_choice_left_to_right"
  | "scenario_left_to_right";
export type RegistryChoiceValue = 0 | 25 | 33 | 50 | 67 | 75 | 100;
export type ItemId = `${"cl" | "dl" | "ws" | "cm" | "ro" | "cs"}_${ItemLayer}_${number}`;

export type RegistryChoice = {
  value: RegistryChoiceValue;
  label: string;
};

export type RegistryDimension = {
  dimensionId: DimensionId;
  dimensionLabel: string;
  order: number;
  leftPoleLabel: string;
  rightPoleLabel: string;
  expectedCoreItems: number;
  expectedSupportItems: number;
  implementationNote?: string;
};

export type RegistryItem = {
  itemId: ItemId;
  version: string;
  dimensionId: DimensionId;
  dimensionLabel: string;
  layer: ItemLayer;
  type: ItemType;
  prompt: string;
  choices: RegistryChoice[];
  polarity: RegistryItemPolarity;
  status: string;
  isActive: boolean;
  order: number;
  reportUsage: {
    role: string;
    drivesDimensionScore?: boolean;
    drivesExecutiveSummary?: boolean;
    canAnchorDimensionCard?: boolean;
    canEnrichDimensionCard?: boolean;
    canConcretizeExecutiveSummary?: boolean;
    canAddTensionHint?: boolean;
  };
  workbookUsage: {
    role: string;
    canTriggerPriority: boolean;
    topicTitle: string;
    conversationFoci: string[];
  };
  rationale: {
    whyHere: string;
    whyLayer: string;
  };
};

export type FounderCompatibilityRegistry = {
  registryVersion: string;
  modelVersion: string;
  createdAt: string;
  dimensions: RegistryDimension[];
  namingConventions: {
    aggregateFitMetric: string;
    aggregateTensionMetric: string;
    deprecatedAggregateTerms: string[];
    coreLayerMeaning: string;
    supportLayerMeaning: string;
    choiceValueScale: Record<ItemType, RegistryChoiceValue[]>;
    polarityConvention: string;
  };
  items: RegistryItem[];
};

const EXPECTED_DIMENSION_COUNT = 6;
const EXPECTED_ACTIVE_ITEM_COUNT = 36;
const EXPECTED_CORE_COUNT_PER_DIMENSION = 4;
const EXPECTED_SUPPORT_COUNT_PER_DIMENSION = 2;

const DIMENSION_ID_SET = new Set<string>(REGISTRY_DIMENSION_IDS);
const ALLOWED_CHOICE_VALUES: Record<ItemType, RegistryChoiceValue[]> = {
  likert: [0, 25, 50, 75, 100],
  forced_choice: [0, 25, 50, 75, 100],
  scenario: [0, 33, 67, 100],
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`founder_compatibility_registry_invalid:${message}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function isDimensionId(value: unknown): value is DimensionId {
  return typeof value === "string" && DIMENSION_ID_SET.has(value);
}

function isItemLayer(value: unknown): value is ItemLayer {
  return value === "core" || value === "support";
}

function isItemType(value: unknown): value is ItemType {
  return value === "likert" || value === "forced_choice" || value === "scenario";
}

function isRegistryItemPolarity(value: unknown): value is RegistryItemPolarity {
  return (
    value === "left_pole_keyed" ||
    value === "right_pole_keyed" ||
    value === "forced_choice_left_to_right" ||
    value === "scenario_left_to_right"
  );
}

function asString(value: unknown, field: string) {
  invariant(typeof value === "string" && value.trim().length > 0, `${field}:expected_string`);
  return value;
}

function asNumber(value: unknown, field: string) {
  invariant(typeof value === "number" && Number.isFinite(value), `${field}:expected_number`);
  return value;
}

function parseChoices(value: unknown, itemType: ItemType, field: string): RegistryChoice[] {
  invariant(Array.isArray(value), `${field}:expected_array`);
  const expectedScale = ALLOWED_CHOICE_VALUES[itemType];
  invariant(value.length === expectedScale.length, `${field}:invalid_choice_count`);

  const parsed = value.map((entry, index) => {
    invariant(isRecord(entry), `${field}[${index}]:expected_object`);
    const rawChoiceValue = asNumber(entry.value, `${field}[${index}].value`);
    invariant(
      expectedScale.includes(rawChoiceValue as RegistryChoiceValue),
      `${field}[${index}].value:invalid_scale_value`
    );

    return {
      value: rawChoiceValue as RegistryChoiceValue,
      label: asString(entry.label, `${field}[${index}].label`),
    };
  });

  invariant(
    parsed.map((entry) => entry.value).join(",") === expectedScale.join(","),
    `${field}:scale_mismatch`
  );

  return parsed;
}

function parseDimensions(value: unknown): RegistryDimension[] {
  invariant(Array.isArray(value), "dimensions:expected_array");

  const parsed = value.map((entry, index) => {
    invariant(isRecord(entry), `dimensions[${index}]:expected_object`);
    const dimensionId = entry.dimensionId;
    invariant(isDimensionId(dimensionId), `dimensions[${index}].dimensionId:unknown_dimension`);

    return {
      dimensionId,
      dimensionLabel: asString(entry.dimensionLabel, `dimensions[${index}].dimensionLabel`),
      order: asNumber(entry.order, `dimensions[${index}].order`),
      leftPoleLabel: asString(entry.leftPoleLabel, `dimensions[${index}].leftPoleLabel`),
      rightPoleLabel: asString(entry.rightPoleLabel, `dimensions[${index}].rightPoleLabel`),
      expectedCoreItems: asNumber(entry.expectedCoreItems, `dimensions[${index}].expectedCoreItems`),
      expectedSupportItems: asNumber(entry.expectedSupportItems, `dimensions[${index}].expectedSupportItems`),
      implementationNote:
        typeof entry.implementationNote === "string" ? entry.implementationNote : undefined,
    } satisfies RegistryDimension;
  });

  return parsed;
}

function parseItems(value: unknown): RegistryItem[] {
  invariant(Array.isArray(value), "items:expected_array");

  return value.map((entry, index) => {
    invariant(isRecord(entry), `items[${index}]:expected_object`);
    const dimensionId = entry.dimensionId;
    const layer = entry.layer;
    const itemType = entry.type;
    const polarity = entry.polarity;

    invariant(isDimensionId(dimensionId), `items[${index}].dimensionId:unknown_dimension`);
    invariant(isItemLayer(layer), `items[${index}].layer:invalid_layer`);
    invariant(isItemType(itemType), `items[${index}].type:invalid_type`);
    invariant(isRegistryItemPolarity(polarity), `items[${index}].polarity:invalid_polarity`);
    const reportUsage = isRecord(entry.reportUsage) ? entry.reportUsage : null;
    const workbookUsage = isRecord(entry.workbookUsage) ? entry.workbookUsage : null;
    const rationale = isRecord(entry.rationale) ? entry.rationale : null;

    return {
      itemId: asString(entry.itemId, `items[${index}].itemId`) as ItemId,
      version: asString(entry.version, `items[${index}].version`),
      dimensionId,
      dimensionLabel: asString(entry.dimensionLabel, `items[${index}].dimensionLabel`),
      layer,
      type: itemType,
      prompt: asString(entry.prompt, `items[${index}].prompt`),
      choices: parseChoices(entry.choices, itemType, `items[${index}].choices`),
      polarity,
      status: asString(entry.status, `items[${index}].status`),
      isActive: entry.isActive === true,
      order: asNumber(entry.order, `items[${index}].order`),
      reportUsage: {
        role: asString(reportUsage?.role ?? null, `items[${index}].reportUsage.role`),
        drivesDimensionScore:
          typeof reportUsage?.drivesDimensionScore === "boolean"
            ? reportUsage.drivesDimensionScore
            : undefined,
        drivesExecutiveSummary:
          typeof reportUsage?.drivesExecutiveSummary === "boolean"
            ? reportUsage.drivesExecutiveSummary
            : undefined,
        canAnchorDimensionCard:
          typeof reportUsage?.canAnchorDimensionCard === "boolean"
            ? reportUsage.canAnchorDimensionCard
            : undefined,
        canEnrichDimensionCard:
          typeof reportUsage?.canEnrichDimensionCard === "boolean"
            ? reportUsage.canEnrichDimensionCard
            : undefined,
        canConcretizeExecutiveSummary:
          typeof reportUsage?.canConcretizeExecutiveSummary === "boolean"
            ? reportUsage.canConcretizeExecutiveSummary
            : undefined,
        canAddTensionHint:
          typeof reportUsage?.canAddTensionHint === "boolean"
            ? reportUsage.canAddTensionHint
            : undefined,
      },
      workbookUsage: {
        role: asString(workbookUsage?.role ?? null, `items[${index}].workbookUsage.role`),
        canTriggerPriority: workbookUsage?.canTriggerPriority === true,
        topicTitle: asString(
          workbookUsage?.topicTitle ?? null,
          `items[${index}].workbookUsage.topicTitle`
        ),
        conversationFoci: Array.isArray(workbookUsage?.conversationFoci)
          ? workbookUsage.conversationFoci.map((focus, focusIndex) =>
              asString(focus, `items[${index}].workbookUsage.conversationFoci[${focusIndex}]`)
            )
          : [],
      },
      rationale: {
        whyHere: asString(rationale?.whyHere ?? null, `items[${index}].rationale.whyHere`),
        whyLayer: asString(rationale?.whyLayer ?? null, `items[${index}].rationale.whyLayer`),
      },
    } satisfies RegistryItem;
  });
}

export function assertFounderCompatibilityRegistryIntegrity(registry: FounderCompatibilityRegistry) {
  invariant(registry.dimensions.length === EXPECTED_DIMENSION_COUNT, "dimensions:unexpected_count");

  const dimensionIdSet = new Set<DimensionId>();
  const dimensionLabelSet = new Set<string>();
  const dimensionOrderSet = new Set<number>();

  for (const dimension of registry.dimensions) {
    invariant(!dimensionIdSet.has(dimension.dimensionId), `dimensions:${dimension.dimensionId}:duplicate_id`);
    invariant(!dimensionLabelSet.has(dimension.dimensionLabel), `dimensions:${dimension.dimensionLabel}:duplicate_label`);
    invariant(!dimensionOrderSet.has(dimension.order), `dimensions:${dimension.dimensionId}:duplicate_order`);
    dimensionIdSet.add(dimension.dimensionId);
    dimensionLabelSet.add(dimension.dimensionLabel);
    dimensionOrderSet.add(dimension.order);
  }

  const activeItems = registry.items.filter((item) => item.isActive);
  invariant(activeItems.length === EXPECTED_ACTIVE_ITEM_COUNT, "items:unexpected_active_count");

  const itemIdSet = new Set<string>();
  const itemOrderSet = new Set<number>();

  for (const item of registry.items) {
    invariant(!itemIdSet.has(item.itemId), `items:${item.itemId}:duplicate_id`);
    invariant(!itemOrderSet.has(item.order), `items:${item.itemId}:duplicate_order`);
    invariant(dimensionIdSet.has(item.dimensionId), `items:${item.itemId}:unknown_dimension_reference`);
    itemIdSet.add(item.itemId);
    itemOrderSet.add(item.order);
  }

  for (const dimension of registry.dimensions) {
    const activeItemsForDimension = activeItems.filter((item) => item.dimensionId === dimension.dimensionId);
    const activeCoreItems = activeItemsForDimension.filter((item) => item.layer === "core");
    const activeSupportItems = activeItemsForDimension.filter((item) => item.layer === "support");

    invariant(
      activeCoreItems.length === EXPECTED_CORE_COUNT_PER_DIMENSION,
      `dimension:${dimension.dimensionId}:unexpected_core_count`
    );
    invariant(
      activeSupportItems.length === EXPECTED_SUPPORT_COUNT_PER_DIMENSION,
      `dimension:${dimension.dimensionId}:unexpected_support_count`
    );
    invariant(
      activeCoreItems.length === dimension.expectedCoreItems,
      `dimension:${dimension.dimensionId}:core_count_mismatch`
    );
    invariant(
      activeSupportItems.length === dimension.expectedSupportItems,
      `dimension:${dimension.dimensionId}:support_count_mismatch`
    );
  }
}

export function createFounderCompatibilityRegistryRuntime(raw: unknown): FounderCompatibilityRegistry {
  invariant(isRecord(raw), "root:expected_object");
  const dimensions = parseDimensions(raw.dimensions);
  const items = parseItems(raw.items);

  const namingConventions = raw.namingConventions;
  invariant(isRecord(namingConventions), "namingConventions:expected_object");

  const choiceValueScale = namingConventions.choiceValueScale;
  invariant(isRecord(choiceValueScale), "namingConventions.choiceValueScale:expected_object");

  const registry: FounderCompatibilityRegistry = {
    registryVersion: asString(raw.registryVersion, "registryVersion"),
    modelVersion: asString(raw.modelVersion, "modelVersion"),
    createdAt: asString(raw.createdAt, "createdAt"),
    dimensions,
    namingConventions: {
      aggregateFitMetric: asString(namingConventions.aggregateFitMetric, "namingConventions.aggregateFitMetric"),
      aggregateTensionMetric: asString(namingConventions.aggregateTensionMetric, "namingConventions.aggregateTensionMetric"),
      deprecatedAggregateTerms: Array.isArray(namingConventions.deprecatedAggregateTerms)
        ? namingConventions.deprecatedAggregateTerms.map((term, index) =>
            asString(term, `namingConventions.deprecatedAggregateTerms[${index}]`)
          )
        : [],
      coreLayerMeaning: asString(namingConventions.coreLayerMeaning, "namingConventions.coreLayerMeaning"),
      supportLayerMeaning: asString(namingConventions.supportLayerMeaning, "namingConventions.supportLayerMeaning"),
      choiceValueScale: {
        likert: parseChoices(
          (choiceValueScale.likert as RegistryChoiceValue[]).map((value) => ({ value, label: String(value) })),
          "likert",
          "namingConventions.choiceValueScale.likert"
        ).map((choice) => choice.value),
        forced_choice: parseChoices(
          (choiceValueScale.forced_choice as RegistryChoiceValue[]).map((value) => ({ value, label: String(value) })),
          "forced_choice",
          "namingConventions.choiceValueScale.forced_choice"
        ).map((choice) => choice.value),
        scenario: parseChoices(
          (choiceValueScale.scenario as RegistryChoiceValue[]).map((value) => ({ value, label: String(value) })),
          "scenario",
          "namingConventions.choiceValueScale.scenario"
        ).map((choice) => choice.value),
      },
      polarityConvention: asString(namingConventions.polarityConvention, "namingConventions.polarityConvention"),
    },
    items,
  };

  assertFounderCompatibilityRegistryIntegrity(registry);
  return registry;
}

export const FOUNDER_COMPATIBILITY_REGISTRY = createFounderCompatibilityRegistryRuntime(registryJson as unknown);

const REGISTRY_DIMENSIONS = [...FOUNDER_COMPATIBILITY_REGISTRY.dimensions].sort((a, b) => a.order - b.order);
const REGISTRY_ITEMS = [...FOUNDER_COMPATIBILITY_REGISTRY.items];
const ACTIVE_REGISTRY_ITEMS = REGISTRY_ITEMS.filter((item) => item.isActive);
const ORDERED_ACTIVE_REGISTRY_ITEMS = [...ACTIVE_REGISTRY_ITEMS].sort((a, b) => a.order - b.order);
const ORDERED_REGISTRY_ITEMS = [...REGISTRY_ITEMS].sort((a, b) => a.order - b.order);
const REGISTRY_ITEM_MAP = new Map<ItemId, RegistryItem>(REGISTRY_ITEMS.map((item) => [item.itemId, item]));
const REGISTRY_DIMENSION_MAP = new Map<DimensionId, RegistryDimension>(
  REGISTRY_DIMENSIONS.map((dimension) => [dimension.dimensionId, dimension])
);

export function getFounderCompatibilityRegistry() {
  return FOUNDER_COMPATIBILITY_REGISTRY;
}

export function getRegistryDimensions() {
  return REGISTRY_DIMENSIONS;
}

export function getOrderedRegistryDimensions() {
  return REGISTRY_DIMENSIONS;
}

export function getAllRegistryItems() {
  return REGISTRY_ITEMS;
}

export function getActiveRegistryItems() {
  return ACTIVE_REGISTRY_ITEMS;
}

export function getOrderedRegistryItems() {
  return ORDERED_REGISTRY_ITEMS;
}

export function getOrderedActiveRegistryItems() {
  return ORDERED_ACTIVE_REGISTRY_ITEMS;
}

export function getRegistryItemsByLayer(layer: ItemLayer) {
  return ORDERED_REGISTRY_ITEMS.filter((item) => item.layer === layer);
}

export function getCoreRegistryItems() {
  return getRegistryItemsByLayer("core");
}

export function getSupportRegistryItems() {
  return getRegistryItemsByLayer("support");
}

export function getRegistryItemsByDimension(dimensionId: DimensionId) {
  return ORDERED_REGISTRY_ITEMS.filter((item) => item.dimensionId === dimensionId);
}

export function getRegistryItemMap() {
  return REGISTRY_ITEM_MAP;
}

export function getRegistryDimensionMap() {
  return REGISTRY_DIMENSION_MAP;
}

export function getRegistryItem(itemId: ItemId) {
  return REGISTRY_ITEM_MAP.get(itemId) ?? null;
}

export function getRegistryDimension(dimensionId: DimensionId) {
  return REGISTRY_DIMENSION_MAP.get(dimensionId) ?? null;
}

export function getCanonicalRegistryItemIds() {
  return ORDERED_REGISTRY_ITEMS.map((item) => item.itemId);
}
