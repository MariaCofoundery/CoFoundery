import assert from "node:assert/strict";
import test from "node:test";
import { findEnglishReportCopyQualityIssues } from "@/features/reporting/content/reportCopyGuards";
import { FOUNDER_DIMENSION_ORDER, type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import { getSelfReportMisreadingCopy } from "@/features/reporting/selfReportMisreadingContent";
import {
  type SelfReportDimensionFamily,
  type SelfReportSignal,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";

const TENDENCIES: SelfReportTendencyKey[] = ["left", "center", "right"];

const FAMILY_BY_DIMENSION: Record<FounderDimensionKey, SelfReportDimensionFamily> = {
  Unternehmenslogik: "direction",
  Entscheidungslogik: "decision_under_uncertainty",
  Risikoorientierung: "decision_under_uncertainty",
  "Arbeitsstruktur & Zusammenarbeit": "collaboration_under_pressure",
  Commitment: "collaboration_under_pressure",
  Konfliktstil: "collaboration_under_pressure",
};

function makeSignal(
  dimension: FounderDimensionKey,
  tendencyKey: SelfReportTendencyKey
): SelfReportSignal {
  return {
    dimension,
    score: tendencyKey === "left" ? 25 : tendencyKey === "center" ? 50 : 75,
    orientationStrength: tendencyKey === "center" ? 0 : 25,
    tendencyKey,
    tendencyLabel: tendencyKey,
    family: FAMILY_BY_DIMENSION[dimension],
    strengthBand: tendencyKey === "center" ? "balanced" : "clear",
    isClear: tendencyKey !== "center",
    isModerate: false,
    isBalanced: tendencyKey === "center",
    socialImpactWeight: 1,
    coordinationRiskWeight: 1,
    poleFrictionScore: 1,
    openTensionScore: 1,
    frictionScore: 1,
    duplicationGroup: dimension,
    frictionReason: tendencyKey === "center" ? "open_coordination_field" : "clear_pole",
  };
}

function collectVisibleText(values: Array<{ title: string; text: string }>) {
  return values.flatMap((entry) => [entry.title, entry.text]).join("\n");
}

test("self report misreading content keeps German copy stable by default", () => {
  const companyLogic = getSelfReportMisreadingCopy(makeSignal("Unternehmenslogik", "left"));
  const risk = getSelfReportMisreadingCopy(makeSignal("Risikoorientierung", "right"));

  assert.equal(companyLogic.title, "Das kann nach Bremsen aussehen");
  assert.equal(
    companyLogic.text,
    "Andere können deinen Blick auf Aufbau und Tragfähigkeit als Vorsicht lesen. Für dich geht es meist nicht um Blockade, sondern darum, dass eine Chance den Kern nicht aufweicht."
  );
  assert.equal(risk.title, "Das kann nach Wette wirken");
});

test("self report misreading content returns English copy for locale en", () => {
  const commitment = getSelfReportMisreadingCopy(makeSignal("Commitment", "right"), "en");
  const conflict = getSelfReportMisreadingCopy(makeSignal("Konfliktstil", "left"), "en");

  assert.equal(commitment.title, "This can look like an unspoken expectation");
  assert.match(commitment.text, /same mode/);
  assert.equal(conflict.title, "This can look like avoidance");
});

test("self report misreading content falls back to German for unknown locale", () => {
  assert.deepEqual(
    getSelfReportMisreadingCopy(makeSignal("Entscheidungslogik", "left"), "fr"),
    getSelfReportMisreadingCopy(makeSignal("Entscheidungslogik", "left"), "de")
  );
});

test("center and right tendencies intentionally share the non-left misreading copy", () => {
  assert.deepEqual(
    getSelfReportMisreadingCopy(makeSignal("Arbeitsstruktur & Zusammenarbeit", "center"), "en"),
    getSelfReportMisreadingCopy(makeSignal("Arbeitsstruktur & Zusammenarbeit", "right"), "en")
  );
});

test("English self report misreading copy passes report copy guards", () => {
  const englishBlocks = FOUNDER_DIMENSION_ORDER.flatMap((dimension) =>
    TENDENCIES.map((tendency) =>
      getSelfReportMisreadingCopy(makeSignal(dimension, tendency), "en")
    )
  );

  assert.deepEqual(findEnglishReportCopyQualityIssues(collectVisibleText(englishBlocks)), []);
});

test("self report misreading content does not change signal identity", () => {
  for (const dimension of FOUNDER_DIMENSION_ORDER) {
    for (const tendency of TENDENCIES) {
      const signal = makeSignal(dimension, tendency);
      assert.equal(signal.dimension, dimension);
      assert.equal(signal.tendencyKey, tendency);
      assert.equal(typeof getSelfReportMisreadingCopy(signal, "en").title, "string");
    }
  }
});
