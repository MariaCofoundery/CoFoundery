import assert from "node:assert/strict";
import test from "node:test";
import {
  SELF_REPORT_SELECTION_DEBUG_CASES,
  SELF_REPORT_SELECTION_SENSITIVITY_CASES,
  buildSelfReportSignals,
  debugSelfReportSelectionTestCases,
  runSelfReportSensitivityChecks,
} from "@/features/reporting/selfReportSelection";

test("self report selection debug cases stay deterministic", () => {
  const results = debugSelfReportSelectionTestCases();

  assert.equal(results.length, SELF_REPORT_SELECTION_DEBUG_CASES.length);
  for (const result of results) {
    assert.equal(result.passed, true, result.name);
    assert.deepEqual(result.actual, result.expected, result.name);
  }
});

test("friction reasons follow the explicit strength-band rules", () => {
  const strongSignals = buildSelfReportSignals({
    Unternehmenslogik: 80,
    Entscheidungslogik: 38,
    Risikoorientierung: 72,
    "Arbeitsstruktur & Zusammenarbeit": 74,
    Commitment: 86,
    Konfliktstil: 33,
  });
  const balancedSignals = buildSelfReportSignals({
    Unternehmenslogik: 55,
    Entscheidungslogik: 45,
    Risikoorientierung: 52,
    "Arbeitsstruktur & Zusammenarbeit": 54,
    Commitment: 53,
    Konfliktstil: 49,
  });
  const mixedSignals = buildSelfReportSignals({
    Unternehmenslogik: 68,
    Entscheidungslogik: 57,
    Risikoorientierung: 59,
    "Arbeitsstruktur & Zusammenarbeit": 43,
    Commitment: 55,
    Konfliktstil: 62,
  });

  assert.equal(
    strongSignals.find((entry) => entry.dimension === "Commitment")?.frictionReason,
    "clear_pole"
  );
  assert.equal(
    mixedSignals.find((entry) => entry.dimension === "Risikoorientierung")?.frictionReason,
    "moderate_pole_dominant"
  );
  assert.equal(
    mixedSignals.find((entry) => entry.dimension === "Entscheidungslogik")?.frictionReason,
    "moderate_coordination_risk"
  );
  assert.equal(
    balancedSignals.find((entry) => entry.dimension === "Arbeitsstruktur & Zusammenarbeit")?.frictionReason,
    "open_coordination_field"
  );
});

test("self report sensitivity checks expose stable vs changed selections for small score shifts", () => {
  const results = runSelfReportSensitivityChecks();

  assert.equal(results.length, SELF_REPORT_SELECTION_SENSITIVITY_CASES.length);
  for (const result of results) {
    assert.ok(result.variants.length >= 2, result.name);
    for (const variant of result.variants) {
      assert.equal(typeof variant.changesComparedToBase.primarySignalChanged, "boolean");
      assert.equal(typeof variant.changesComparedToBase.workModeSignalChanged, "boolean");
      assert.equal(typeof variant.changesComparedToBase.tensionCarrierChanged, "boolean");
      assert.equal(typeof variant.changesComparedToBase.patternDimensionsChanged, "boolean");
    }
  }
});
