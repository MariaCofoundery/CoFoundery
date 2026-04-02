import assert from "node:assert/strict";
import test from "node:test";
import {
  getFounderDimensionPoleLabels,
  getFounderDimensionPoleTendency,
} from "@/features/reporting/founderDimensionMeta";

test("dimension pole labels reflect the V2 registry semantics", () => {
  const companyLogic = getFounderDimensionPoleLabels("Unternehmenslogik");
  const conflictStyle = getFounderDimensionPoleLabels("Konfliktstil");
  const riskOrientation = getFounderDimensionPoleLabels("Risikoorientierung");

  assert.equal(companyLogic?.left, "substanz & aufbauorientiert");
  assert.equal(companyLogic?.right, "chancen & hebelorientiert");
  assert.equal(conflictStyle?.left, "sortierend");
  assert.equal(riskOrientation?.right, "unsicherheitsbereit");
});

test("pole tendencies stay aligned with the corrected left-right semantics", () => {
  assert.equal(
    getFounderDimensionPoleTendency("Unternehmenslogik", 20)?.label,
    "substanz & aufbauorientiert"
  );
  assert.equal(
    getFounderDimensionPoleTendency("Unternehmenslogik", 80)?.label,
    "chancen & hebelorientiert"
  );
});
