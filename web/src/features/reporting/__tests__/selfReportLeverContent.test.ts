import assert from "node:assert/strict";
import test from "node:test";
import { findEnglishReportCopyQualityIssues } from "@/features/reporting/content/reportCopyGuards";
import { FOUNDER_DIMENSION_ORDER, type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import { getSelfReportLeverCopy } from "@/features/reporting/selfReportLeverContent";
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

test("self report lever content keeps German copy stable by default", () => {
  const companyLogic = getSelfReportLeverCopy(makeSignal("Unternehmenslogik", "left"));
  const conflict = getSelfReportLeverCopy(makeSignal("Konfliktstil", "right"));

  assert.equal(companyLogic.title, "Sag früher, woran du eine Chance misst");
  assert.equal(
    companyLogic.text,
    "Mach frueh konkret, was fuer dich tragfaehig genug ist. Dann wirkt dein Nein weniger pauschal und deine Logik wird fuer andere besser lesbar."
  );
  assert.equal(conflict.title, "Rahme direkte Ansprache kurz ein");
});

test("self report lever content returns English copy for locale en", () => {
  const commitment = getSelfReportLeverCopy(makeSignal("Commitment", "right"), "en");
  const risk = getSelfReportLeverCopy(makeSignal("Risikoorientierung", "left"), "en");

  assert.equal(commitment.title, "Make commitment expectations explicit");
  assert.match(commitment.text, /silent measuring stick/);
  assert.equal(risk.title, "Name your boundary before the decision");
});

test("self report lever content falls back to German for unknown locale", () => {
  assert.deepEqual(
    getSelfReportLeverCopy(makeSignal("Entscheidungslogik", "left"), "fr"),
    getSelfReportLeverCopy(makeSignal("Entscheidungslogik", "left"), "de")
  );
});

test("center and right tendencies intentionally share the non-left lever copy", () => {
  assert.deepEqual(
    getSelfReportLeverCopy(makeSignal("Arbeitsstruktur & Zusammenarbeit", "center"), "en"),
    getSelfReportLeverCopy(makeSignal("Arbeitsstruktur & Zusammenarbeit", "right"), "en")
  );
});

test("English self report lever copy passes report copy guards", () => {
  const englishBlocks = FOUNDER_DIMENSION_ORDER.flatMap((dimension) =>
    TENDENCIES.map((tendency) => getSelfReportLeverCopy(makeSignal(dimension, tendency), "en"))
  );

  assert.deepEqual(findEnglishReportCopyQualityIssues(collectVisibleText(englishBlocks)), []);
});

test("self report lever content does not change signal identity", () => {
  for (const dimension of FOUNDER_DIMENSION_ORDER) {
    for (const tendency of TENDENCIES) {
      const signal = makeSignal(dimension, tendency);
      assert.equal(signal.dimension, dimension);
      assert.equal(signal.tendencyKey, tendency);
      assert.equal(typeof getSelfReportLeverCopy(signal, "en").title, "string");
    }
  }
});
