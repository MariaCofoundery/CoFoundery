import assert from "node:assert/strict";
import test from "node:test";
import { findEnglishReportCopyQualityIssues } from "@/features/reporting/content/reportCopyGuards";
import { FOUNDER_DIMENSION_ORDER, type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import { getSelfReportTeamBreakCopy } from "@/features/reporting/selfReportTeamBreakContent";
import {
  type SelfReportDimensionFamily,
  type SelfReportSignal,
} from "@/features/reporting/selfReportSelection";

const FAMILY_BY_DIMENSION: Record<FounderDimensionKey, SelfReportDimensionFamily> = {
  Unternehmenslogik: "direction",
  Entscheidungslogik: "decision_under_uncertainty",
  Risikoorientierung: "decision_under_uncertainty",
  "Arbeitsstruktur & Zusammenarbeit": "collaboration_under_pressure",
  Commitment: "collaboration_under_pressure",
  Konfliktstil: "collaboration_under_pressure",
};

function makeSignal(dimension: FounderDimensionKey): SelfReportSignal {
  return {
    dimension,
    score: 75,
    orientationStrength: 25,
    tendencyKey: "right",
    tendencyLabel: "right",
    family: FAMILY_BY_DIMENSION[dimension],
    strengthBand: "clear",
    isClear: true,
    isModerate: false,
    isBalanced: false,
    socialImpactWeight: 1,
    coordinationRiskWeight: 1,
    poleFrictionScore: 1,
    openTensionScore: 1,
    frictionScore: 1,
    duplicationGroup: dimension,
    frictionReason: "clear_pole",
  };
}

function collectVisibleText(values: Array<{ title: string; text: string }>) {
  return values.flatMap((entry) => [entry.title, entry.text]).join("\n");
}

test("self report team break content keeps German copy stable by default", () => {
  const companyLogic = getSelfReportTeamBreakCopy(makeSignal("Unternehmenslogik"));
  const risk = getSelfReportTeamBreakCopy(makeSignal("Risikoorientierung"));

  assert.equal(companyLogic.dimension, "Unternehmenslogik");
  assert.equal(companyLogic.title, "Wenn eine Chance gut aussieht, aber den Fokus verschiebt");
  assert.equal(
    companyLogic.text,
    "Hier wird es haeufig schwierig, wenn eine Moeglichkeit fuer andere schon attraktiv genug ist, du aber zuerst wissen willst, was sie mit Klarheit, Aufbau oder Richtung des Unternehmens macht."
  );
  assert.equal(risk.title, "Wenn dieselbe Lage für euch nicht gleich riskant ist");
});

test("self report team break content returns English copy for locale en", () => {
  const commitment = getSelfReportTeamBreakCopy(makeSignal("Commitment"), "en");
  const conflict = getSelfReportTeamBreakCopy(makeSignal("Konfliktstil"), "en");

  assert.equal(commitment.dimension, "Commitment");
  assert.equal(commitment.title, "When commitment is read differently");
  assert.match(commitment.text, /quiet pressure points/);
  assert.equal(conflict.title, "When differences are not clarified at the same pace");
});

test("self report team break content falls back to German for unknown locale", () => {
  assert.deepEqual(
    getSelfReportTeamBreakCopy(makeSignal("Entscheidungslogik"), "fr"),
    getSelfReportTeamBreakCopy(makeSignal("Entscheidungslogik"), "de")
  );
});

test("English self report team break copy passes report copy guards", () => {
  const englishBlocks = FOUNDER_DIMENSION_ORDER.map((dimension) =>
    getSelfReportTeamBreakCopy(makeSignal(dimension), "en")
  );

  assert.deepEqual(findEnglishReportCopyQualityIssues(collectVisibleText(englishBlocks)), []);
});

test("self report team break content keeps dimension identity unchanged", () => {
  for (const dimension of FOUNDER_DIMENSION_ORDER) {
    assert.equal(getSelfReportTeamBreakCopy(makeSignal(dimension), "en").dimension, dimension);
    assert.equal(getSelfReportTeamBreakCopy(makeSignal(dimension), "de").dimension, dimension);
  }
});
