import assert from "node:assert/strict";
import test from "node:test";
import { prefillCapabilityAreas } from "@/features/find/prefillAreas";

const AREAS = [
  { area_id: "fin_a", family_id: "finance_funding", sort_order: 2 },
  { area_id: "fin_b", family_id: "finance_funding", sort_order: 1 },
  { area_id: "leg_a", family_id: "legal_governance", sort_order: 3 },
];

test("Die Bereiche der Familie kommen dazu, die gespeicherten bleiben", () => {
  assert.deepEqual(prefillCapabilityAreas(["leg_a"], "finance_funding", AREAS, 5), ["leg_a", "fin_b", "fin_a"]);
});

test("Ohne oder mit unbekannter Familie aendert sich nichts", () => {
  assert.deepEqual(prefillCapabilityAreas(["leg_a"], undefined, AREAS, 5), ["leg_a"]);
  assert.deepEqual(prefillCapabilityAreas(["leg_a"], "gibt_es_nicht", AREAS, 5), ["leg_a"]);
});

test("Die Grenze der Auswahl gilt, und nichts doppelt", () => {
  assert.deepEqual(prefillCapabilityAreas([], "finance_funding", AREAS, 1), ["fin_b"]);
  assert.deepEqual(prefillCapabilityAreas(["fin_b"], "finance_funding", AREAS, 5), ["fin_b", "fin_a"]);
});
