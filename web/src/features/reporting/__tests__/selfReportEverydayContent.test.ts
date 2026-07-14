import assert from "node:assert/strict";
import test from "node:test";
import { findEnglishReportCopyQualityIssues } from "@/features/reporting/content/reportCopyGuards";
import { FOUNDER_DIMENSION_ORDER, type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  getSelfReportEverydayCopy,
  getSelfReportEverydayFallbackBlock,
} from "@/features/reporting/selfReportEverydayContent";
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

function collectVisibleText(values: Array<{ title: string; statement: string; situation: string }>) {
  return values.flatMap((entry) => [entry.title, entry.statement, entry.situation]).join("\n");
}

test("self report everyday content keeps German copy stable by default", () => {
  const companyLogic = getSelfReportEverydayCopy(makeSignal("Unternehmenslogik", "left"));
  const conflictFallback = getSelfReportEverydayFallbackBlock("Konfliktstil");

  assert.equal(companyLogic.dimension, "Unternehmenslogik");
  assert.equal(companyLogic.title, "Du prüfst Chancen gegen den Aufbau");
  assert.equal(
    companyLogic.statement,
    "Neue Möglichkeiten müssen für dich erst zeigen, dass sie das Unternehmen tragfähiger machen und nicht nur kurzfristig attraktiv sind."
  );
  assert.equal(conflictFallback.title, "Dein Klärungsstil bleibt hier noch offen");
});

test("self report everyday content returns English copy for locale en", () => {
  const commitment = getSelfReportEverydayCopy(makeSignal("Commitment", "right"), "en");
  const workStructureFallback = getSelfReportEverydayFallbackBlock(
    "Arbeitsstruktur & Zusammenarbeit",
    "en"
  );

  assert.equal(commitment.dimension, "Commitment");
  assert.equal(commitment.title, "You read priority through visible commitment");
  assert.match(commitment.statement, /time, energy and availability/);
  assert.equal(workStructureFallback.title, "Your working rhythm is not clear enough yet");
});

test("self report everyday content falls back to German for unknown locale", () => {
  assert.deepEqual(
    getSelfReportEverydayCopy(makeSignal("Risikoorientierung", "center"), "fr"),
    getSelfReportEverydayCopy(makeSignal("Risikoorientierung", "center"), "de")
  );
  assert.deepEqual(
    getSelfReportEverydayFallbackBlock("Commitment", "fr"),
    getSelfReportEverydayFallbackBlock("Commitment", "de")
  );
});

test("English self report everyday copy passes report copy guards", () => {
  const allEnglishBlocks = [
    ...FOUNDER_DIMENSION_ORDER.flatMap((dimension) =>
      TENDENCIES.map((tendency) => getSelfReportEverydayCopy(makeSignal(dimension, tendency), "en"))
    ),
    ...FOUNDER_DIMENSION_ORDER.map((dimension) =>
      getSelfReportEverydayFallbackBlock(dimension, "en")
    ),
  ];

  assert.deepEqual(
    findEnglishReportCopyQualityIssues(collectVisibleText(allEnglishBlocks)),
    []
  );
});

test("self report everyday content does not change dimensions or signal identity", () => {
  for (const dimension of FOUNDER_DIMENSION_ORDER) {
    for (const tendency of TENDENCIES) {
      const signal = makeSignal(dimension, tendency);
      assert.equal(getSelfReportEverydayCopy(signal, "en").dimension, dimension);
      assert.equal(getSelfReportEverydayCopy(signal, "de").dimension, dimension);
    }
  }
});
