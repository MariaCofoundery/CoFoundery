import assert from "node:assert/strict";
import test from "node:test";
import registryJson from "../../../../docs/founder-compatibility-item-registry-v1.json";
import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";
import {
  FOUNDER_COMPATIBILITY_REGISTRY,
  assertFounderCompatibilityRegistryIntegrity,
  createFounderCompatibilityRegistryRuntime,
  getActiveRegistryItems,
  getCanonicalRegistryItemIds,
  getCoreRegistryItems,
  getOrderedActiveRegistryItems,
  getOrderedRegistryDimensions,
  getRegistryDimensionMap,
  getRegistryItemMap,
  getRegistryItemsByDimension,
  getSupportRegistryItems,
} from "@/features/scoring/founderCompatibilityRegistry";

function cloneRegistryFixture() {
  return JSON.parse(JSON.stringify(registryJson)) as typeof registryJson;
}

test("registry runtime loads the finalized v1 registry with the expected counts", () => {
  assert.equal(FOUNDER_COMPATIBILITY_REGISTRY.dimensions.length, 6);
  assert.equal(getActiveRegistryItems().length, 36);
  assert.equal(getCoreRegistryItems().length, 24);
  assert.equal(getSupportRegistryItems().length, 12);
  assert.equal(getCanonicalRegistryItemIds().length, 36);
  assert.equal(new Set(getCanonicalRegistryItemIds()).size, 36);
});

test("registry dimensions and items stay ordered by the registry", () => {
  const dimensionOrder = getOrderedRegistryDimensions().map((dimension) => dimension.dimensionLabel);
  assert.deepEqual(dimensionOrder, FOUNDER_DIMENSION_ORDER);

  const orderedItemIds = getOrderedActiveRegistryItems().map((item) => item.itemId);
  assert.equal(orderedItemIds[0], "cl_core_1");
  assert.equal(orderedItemIds.at(-1), "cs_support_2");
});

test("each dimension exposes exactly four core and two support items", () => {
  for (const dimension of getOrderedRegistryDimensions()) {
    const items = getRegistryItemsByDimension(dimension.dimensionId).filter((item) => item.isActive);
    assert.equal(items.length, 6);
    assert.equal(items.filter((item) => item.layer === "core").length, 4);
    assert.equal(items.filter((item) => item.layer === "support").length, 2);
  }
});

test("registry selectors expose stable dimension and item maps", () => {
  const dimensionMap = getRegistryDimensionMap();
  const itemMap = getRegistryItemMap();

  assert.equal(dimensionMap.get("company_logic")?.dimensionLabel, "Unternehmenslogik");
  assert.equal(dimensionMap.get("conflict_style")?.rightPoleLabel, "direkt");
  assert.equal(itemMap.get("cl_core_1")?.dimensionId, "company_logic");
  assert.equal(itemMap.get("cs_support_2")?.layer, "support");
});

test("registry integrity rejects malformed counts and invalid choice scales", () => {
  const missingItemRegistry = cloneRegistryFixture();
  missingItemRegistry.items = missingItemRegistry.items.filter((item) => item.itemId !== "cs_support_2");

  assert.throws(
    () => createFounderCompatibilityRegistryRuntime(missingItemRegistry),
    /founder_compatibility_registry_invalid:items:unexpected_active_count/
  );

  const invalidScaleRegistry = cloneRegistryFixture();
  invalidScaleRegistry.items[0].choices[0].value = 10;

  assert.throws(
    () => createFounderCompatibilityRegistryRuntime(invalidScaleRegistry),
    /founder_compatibility_registry_invalid:items\[0\]\.choices\[0\]\.value:invalid_scale_value/
  );
});

test("integrity assertion accepts the validated runtime registry", () => {
  assert.doesNotThrow(() => {
    assertFounderCompatibilityRegistryIntegrity(FOUNDER_COMPATIBILITY_REGISTRY);
  });
});
