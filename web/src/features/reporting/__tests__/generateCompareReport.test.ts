import test from "node:test";
import assert from "node:assert/strict";
import {
  compareProfileResults,
  type CompareFoundersResult,
} from "@/features/reporting/founderMatchingEngine";
import {
  createMockProfileResult,
  generateCompareReport,
} from "@/features/reporting/generateCompareReport";
import { type RadarSeries, type ReportDimension } from "@/features/reporting/types";

const FOUNDER_TO_REPORT_DIMENSION: Record<
  CompareFoundersResult["topAlignments"][number],
  ReportDimension
> = {
  Unternehmenslogik: "Vision",
  Entscheidungslogik: "Entscheidung",
  Risikoorientierung: "Risiko",
  "Arbeitsstruktur & Zusammenarbeit": "Autonomie",
  Commitment: "Verbindlichkeit",
  Konfliktstil: "Konflikt",
};

function toReportDimensions(dimensions: CompareFoundersResult["topAlignments"]) {
  return dimensions.map((dimension) => FOUNDER_TO_REPORT_DIMENSION[dimension]);
}

function labelForDimension(
  result: CompareFoundersResult,
  dimension: CompareFoundersResult["topAlignments"][number]
) {
  const match = result.dimensions.find((entry) => entry.dimension === dimension);
  if (!match || !match.category) return "DATEN_UNVOLLSTAENDIG";
  if (match.category === "aligned") return "MATCH";
  if (match.category === "complementary") return "KOMPLEMENTAER";
  return "FOKUS_THEMA";
}

test("generateCompareReport derives top matches and tensions from the V1 engine", () => {
  const aScores: RadarSeries = {
    Vision: 2.3,
    Entscheidung: 4.6,
    Risiko: 2.9,
    Autonomie: 4.8,
    Verbindlichkeit: 3.0,
    Konflikt: 4.1,
  };
  const bScores: RadarSeries = {
    Vision: 3.1,
    Entscheidung: 3.7,
    Risiko: 4.9,
    Autonomie: 3.6,
    Verbindlichkeit: 2.7,
    Konflikt: 3.4,
  };

  const profileA = createMockProfileResult("A", "Maria", aScores, 2.8, "verantwortungs_stratege");
  const profileB = createMockProfileResult("B", "Noah", bScores, 3.9, "business_pragmatiker");
  const engine = compareProfileResults(profileA, profileB);
  const report = generateCompareReport(profileA, profileB);

  assert.deepEqual(report.executiveSummary.topMatches, toReportDimensions(engine.topAlignments));
  assert.deepEqual(report.executiveSummary.topTensions, toReportDimensions(engine.topTensions));
  assert.equal(report.deepDive.find((entry) => entry.dimension === "Vision")?.label, "KOMPLEMENTAER");
  assert.equal(report.deepDive.find((entry) => entry.dimension === "Risiko")?.label, "FOKUS_THEMA");
  assert.equal(report.deepDive.find((entry) => entry.dimension === "Autonomie")?.label, "FOKUS_THEMA");
});

test("generateCompareReport maps hard-rule tension states from the V1 engine into compare labels", () => {
  const aScores: RadarSeries = {
    Vision: 1.4,
    Entscheidung: 2.9,
    Risiko: 1.8,
    Autonomie: 1.7,
    Verbindlichkeit: 1.6,
    Konflikt: 2.6,
  };
  const bScores: RadarSeries = {
    Vision: 5.5,
    Entscheidung: 4.8,
    Risiko: 5.2,
    Autonomie: 5.4,
    Verbindlichkeit: 5.6,
    Konflikt: 4.1,
  };

  const profileA = createMockProfileResult("A", "Maria", aScores);
  const profileB = createMockProfileResult("B", "Kai", bScores);
  const engine = compareProfileResults(profileA, profileB);
  const report = generateCompareReport(profileA, profileB);

  assert.ok(
    engine.dimensions
      .find((entry) => entry.dimension === "Commitment")
      ?.appliedRules?.includes("RULE_A_COMMITMENT_HARD_PENALTY")
  );
  assert.ok(
    engine.dimensions
      .find((entry) => entry.dimension === "Arbeitsstruktur & Zusammenarbeit")
      ?.appliedRules?.includes("RULE_B_WORK_STRUCTURE_CLASH")
  );
  assert.equal(report.deepDive.find((entry) => entry.dimension === "Verbindlichkeit")?.label, "FOKUS_THEMA");
  assert.equal(report.deepDive.find((entry) => entry.dimension === "Autonomie")?.label, "FOKUS_THEMA");
  assert.ok(report.executiveSummary.topTensions.includes("Verbindlichkeit"));
  assert.ok(report.executiveSummary.topTensions.includes("Autonomie"));
});

test("generateCompareReport keeps compare JSON structure stable while sourcing labels from the engine", () => {
  const aScores: RadarSeries = {
    Vision: 3.2,
    Entscheidung: 3.4,
    Risiko: 3.1,
    Autonomie: 3.5,
    Verbindlichkeit: 3.7,
    Konflikt: 3.3,
  };
  const bScores: RadarSeries = {
    Vision: 3.1,
    Entscheidung: 3.6,
    Risiko: 3.3,
    Autonomie: 3.4,
    Verbindlichkeit: 3.8,
    Konflikt: 3.2,
  };

  const profileA = createMockProfileResult("A", "Maria", aScores, 3.0, "verantwortungs_stratege");
  const profileB = createMockProfileResult("B", "Luca", bScores, 3.1, "verantwortungs_stratege");
  const engine = compareProfileResults(profileA, profileB);
  const report = generateCompareReport(profileA, profileB);

  assert.equal(report.sections.length > 0, true);
  assert.equal(report.deepDive.length, 6);
  assert.equal(report.coverage.comparableDimensions, 6);
  assert.equal(report.executiveSummary.summaryType, "Die Harmonischen Stabilisatoren");
  assert.deepEqual(report.executiveSummary.topMatches, toReportDimensions(engine.topAlignments));

  for (const dimension of engine.dimensions) {
    const reportDimension = FOUNDER_TO_REPORT_DIMENSION[dimension.dimension];
    assert.equal(
      report.deepDive.find((entry) => entry.dimension === reportDimension)?.label,
      labelForDimension(engine, dimension.dimension)
    );
  }
});
