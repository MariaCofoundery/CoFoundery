import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createMockProfileResult,
  generateCompareReport,
} from "@/features/reporting/generateCompareReport";
import { type RadarSeries } from "@/features/reporting/types";

function loadSnapshot(name: string) {
  const path = join(process.cwd(), "src/features/reporting/__tests__/snapshots", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function compact(report: ReturnType<typeof generateCompareReport>) {
  return {
    summaryType: report.executiveSummary.summaryType,
    topMatches: report.executiveSummary.topMatches,
    topTensions: report.executiveSummary.topTensions,
    labels: report.deepDive.map((item) => ({
      dimension: item.dimension,
      label: item.label,
      diffClass: item.diffClass,
    })),
    conversationGuideCount: report.conversationGuide.length,
  };
}

test("generateCompareReport - match-heavy snapshot", () => {
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

  const report = generateCompareReport(
    createMockProfileResult("A", "Maria", aScores, 3.0, "verantwortungs_stratege"),
    createMockProfileResult("B", "Luca", bScores, 3.1, "verantwortungs_stratege")
  );

  assert.deepEqual(compact(report), loadSnapshot("match-heavy"));
});

test("generateCompareReport - tension-heavy snapshot", () => {
  const aScores: RadarSeries = {
    Vision: 1.2,
    Entscheidung: 1.4,
    Risiko: 1.5,
    Autonomie: 1.6,
    Verbindlichkeit: 1.8,
    Konflikt: 1.7,
  };
  const bScores: RadarSeries = {
    Vision: 5.8,
    Entscheidung: 5.4,
    Risiko: 5.6,
    Autonomie: 5.1,
    Verbindlichkeit: 5.2,
    Konflikt: 5.5,
  };

  const report = generateCompareReport(
    createMockProfileResult("A", "Maria", aScores, 2.0, "impact_idealist"),
    createMockProfileResult("B", "Kai", bScores, 4.5, "business_pragmatiker")
  );

  assert.deepEqual(compact(report), loadSnapshot("tension-heavy"));
});

test("generateCompareReport - mixed snapshot", () => {
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

  const report = generateCompareReport(
    createMockProfileResult("A", "Maria", aScores, 2.8, "verantwortungs_stratege"),
    createMockProfileResult("B", "Noah", bScores, 3.9, "business_pragmatiker")
  );

  assert.deepEqual(compact(report), loadSnapshot("mixed"));
});
