import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateBaseScoresFromAnswers,
  assertValuesTotalCategoryContract,
} from "@/features/reporting/base_scoring";
import {
  MIN_COMPARABLE_DIMENSIONS,
  classifyDelta,
  createMockProfileResult,
  generateCompareReport,
} from "@/features/reporting/generateCompareReport";
import { REPORT_DIMENSIONS, type RadarSeries, type ReportDimension } from "@/features/reporting/types";
import { getDiffClass } from "@/features/reporting/report_texts.de";

type BaseAnswerRow = {
  question_id: string;
  choice_value: string;
};

type BaseQuestionMeta = {
  id: string;
  dimension: string;
  category: string;
  prompt: string | null;
};

function questionMetaMap(entries: BaseQuestionMeta[]) {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function emptyDimensionCounts() {
  return REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = 0;
    return acc;
  }, {} as Record<ReportDimension, number>);
}

function germanDimensionLabel(dimension: ReportDimension) {
  if (dimension === "Vision") return "Vision & Richtung";
  if (dimension === "Entscheidung") return "Entscheidungsstil";
  if (dimension === "Risiko") return "Umgang mit Unsicherheit & Risiko";
  if (dimension === "Autonomie") return "Zusammenarbeit & Nähe";
  if (dimension === "Verbindlichkeit") return "Verantwortung & Verbindlichkeit";
  return "Konfliktverhalten";
}

function nullSeries(): RadarSeries {
  return REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = null;
    return acc;
  }, {} as RadarSeries);
}

test("aggregation: all non-numeric base answers -> all scores null", () => {
  const meta = questionMetaMap([
    { id: "q1", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "q2", dimension: germanDimensionLabel("Entscheidung"), category: "basis", prompt: null },
  ]);
  const answers: BaseAnswerRow[] = [
    { question_id: "q1", choice_value: "abc" },
    { question_id: "q2", choice_value: "x" },
  ];

  const result = aggregateBaseScoresFromAnswers(answers as never[], meta as never);
  assert.deepEqual(result.scores, nullSeries());
  assert.equal(result.numericAnsweredTotal, 0);
  assert.equal(result.baseCoveragePercent, 0);
});

test("aggregation: partial numeric answers -> only affected dimensions set", () => {
  const meta = questionMetaMap([
    { id: "q1", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "q2", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "q3", dimension: germanDimensionLabel("Entscheidung"), category: "basis", prompt: null },
  ]);
  const answers: BaseAnswerRow[] = [
    { question_id: "q1", choice_value: "1" },
    { question_id: "q2", choice_value: "4" },
    { question_id: "q3", choice_value: "not-a-number" },
  ];

  const result = aggregateBaseScoresFromAnswers(answers as never[], meta as never);
  assert.equal(result.scores.Vision, 3.5);
  assert.equal(result.scores.Entscheidung, null);
  assert.equal(result.scores.Risiko, null);
  assert.equal(result.answeredNumericByDimension.Vision, 2);
  assert.equal(result.answeredNumericByDimension.Entscheidung, 0);
});

test("aggregation: coverage metrics use expected question counts per dimension", () => {
  const meta = questionMetaMap([
    { id: "q1", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "q2", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "q3", dimension: germanDimensionLabel("Konflikt"), category: "basis", prompt: null },
  ]);
  const answers: BaseAnswerRow[] = [
    { question_id: "q1", choice_value: "2" },
    { question_id: "q2", choice_value: "3" },
  ];
  const expected = emptyDimensionCounts();
  expected.Vision = 2;
  expected.Konflikt = 1;

  const result = aggregateBaseScoresFromAnswers(answers as never[], meta as never, expected);
  assert.equal(result.numericAnsweredTotal, 2);
  assert.equal(result.expectedTotal, 3);
  assert.equal(result.baseCoveragePercent, 66.67);
  assert.equal(result.expectedByDimension.Vision, 2);
  assert.equal(result.expectedByDimension.Konflikt, 1);
});

test("compare: delta logic only uses comparable dimensions", () => {
  const a: RadarSeries = {
    Vision: 2,
    Entscheidung: 2,
    Risiko: 2,
    Autonomie: 2,
    Verbindlichkeit: null,
    Konflikt: null,
  };
  const b: RadarSeries = {
    Vision: 3,
    Entscheidung: 3,
    Risiko: 3,
    Autonomie: 3,
    Verbindlichkeit: null,
    Konflikt: null,
  };

  const report = generateCompareReport(
    createMockProfileResult("A", "A", a),
    createMockProfileResult("B", "B", b)
  );

  assert.equal(report.coverage.comparableDimensions, 4);
  assert.equal(report.coverage.totalDimensions, 6);
  assert.deepEqual(report.deepDive.filter((block) => block.diff == null).map((block) => block.dimension).sort(), [
    "Konflikt",
    "Verbindlichkeit",
  ]);
});

test("<4 comparable dimensions -> neutral summary and data warning", () => {
  const a: RadarSeries = {
    Vision: 2.1,
    Entscheidung: 3.1,
    Risiko: 4.1,
    Autonomie: null,
    Verbindlichkeit: null,
    Konflikt: null,
  };
  const b: RadarSeries = {
    Vision: 2.6,
    Entscheidung: 2.9,
    Risiko: 4.5,
    Autonomie: null,
    Verbindlichkeit: null,
    Konflikt: null,
  };

  const report = generateCompareReport(
    createMockProfileResult("A", "A", a),
    createMockProfileResult("B", "B", b)
  );

  assert.equal(report.coverage.comparableDimensions, 3);
  assert.equal(report.coverage.minimumComparableDimensions, MIN_COMPARABLE_DIMENSIONS);
  assert.equal(report.coverage.isDataSufficient, false);
  assert.equal(report.executiveSummary.summaryType, "Datenlage unvollständig");
  assert.match(report.coverage.note, /Datenlage unvollständig/i);
});

test("missing dimensions are flagged as DATEN_UNVOLLSTAENDIG and not suggested as high fit", () => {
  const a: RadarSeries = {
    Vision: null,
    Entscheidung: null,
    Risiko: null,
    Autonomie: null,
    Verbindlichkeit: null,
    Konflikt: null,
  };
  const b: RadarSeries = { ...a };

  const report = generateCompareReport(
    createMockProfileResult("A", "A", a),
    createMockProfileResult("B", "B", b)
  );

  assert.equal(report.coverage.comparableDimensions, 0);
  assert.equal(report.keyInsights.length, 0);
  assert.ok(report.deepDive.every((block) => block.label === "DATEN_UNVOLLSTAENDIG"));
});

test("delta label boundaries map deterministically via DiffClass thresholds", () => {
  const classify = (diff: number) =>
    classifyDelta({
      diff,
      diffClass: getDiffClass(diff, "Vision"),
    });

  assert.equal(classify(0.99), "Hohe Passung");
  assert.equal(classify(1.0), "Produktive Ergänzung");
  assert.equal(classify(2.0), "Produktive Ergänzung");
  assert.equal(classify(2.01), "Braucht bewusste Abstimmung");
});

test("values flow contract check enforces valuesTotal == count(category='values')", () => {
  assert.doesNotThrow(() => {
    assertValuesTotalCategoryContract(10, 10, "values_flow_test");
  });
  assert.throws(
    () => assertValuesTotalCategoryContract(10, 9, "values_flow_test"),
    /values_total_contract_mismatch/
  );
});
