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
import { VALUES_QUESTION_DEFINITIONS } from "@/features/reporting/valuesQuestionMeta";
import { getCoreRegistryItems } from "@/features/scoring/founderCompatibilityRegistry";

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

test("aggregation: complete registered CORE answers produce complete base coverage", () => {
  const coreItems = getCoreRegistryItems().filter((item) => item.isActive);
  const meta = questionMetaMap(
    coreItems.map((item) => ({
      id: item.itemId,
      dimension: item.dimensionLabel,
      category: "basis",
      prompt: item.prompt,
    }))
  );
  const answers = coreItems.map((item) => ({
    question_id: item.itemId,
    choice_value: String(item.choices[0]?.value),
  }));

  const result = aggregateBaseScoresFromAnswers(answers as never[], meta as never);
  assert.equal(coreItems.length, 24);
  assert.equal(result.numericAnsweredTotal, 24);
  assert.equal(result.expectedTotal, 24);
  assert.equal(result.baseCoveragePercent, 100);
  for (const dimension of REPORT_DIMENSIONS) {
    assert.notEqual(result.scores[dimension], null);
  }
});

test("aggregation: non-numeric registered base answers -> all scores null", () => {
  const meta = questionMetaMap([
    { id: "cl_core_1", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "dl_core_1", dimension: germanDimensionLabel("Entscheidung"), category: "basis", prompt: null },
  ]);
  const answers: BaseAnswerRow[] = [
    { question_id: "cl_core_1", choice_value: "abc" },
    { question_id: "dl_core_1", choice_value: "x" },
  ];

  const result = aggregateBaseScoresFromAnswers(answers as never[], meta as never);
  assert.deepEqual(result.scores, nullSeries());
  assert.equal(result.numericAnsweredTotal, 0);
  assert.equal(result.baseCoveragePercent, 0);
});

test("aggregation: partial registered CORE answers -> only affected dimensions set", () => {
  const meta = questionMetaMap([
    { id: "cl_core_1", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "cl_core_2", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "dl_core_1", dimension: germanDimensionLabel("Entscheidung"), category: "basis", prompt: null },
  ]);
  const answers: BaseAnswerRow[] = [
    { question_id: "cl_core_1", choice_value: "100" },
    { question_id: "cl_core_2", choice_value: "100" },
    { question_id: "dl_core_1", choice_value: "not-a-number" },
  ];

  const result = aggregateBaseScoresFromAnswers(answers as never[], meta as never);
  assert.equal(result.scores.Vision, 3.5);
  assert.equal(result.scores.Entscheidung, null);
  assert.equal(result.scores.Risiko, null);
  assert.equal(result.answeredNumericByDimension.Vision, 2);
  assert.equal(result.answeredNumericByDimension.Entscheidung, 0);
  assert.equal(result.numericAnsweredTotal, 2);
  assert.equal(result.expectedTotal, 24);
  assert.equal(result.baseCoveragePercent, 8.33);
});

test("aggregation: coverage metrics use expected question counts per dimension", () => {
  const meta = questionMetaMap([
    { id: "cl_core_1", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "cl_core_2", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "cs_core_1", dimension: germanDimensionLabel("Konflikt"), category: "basis", prompt: null },
  ]);
  const answers: BaseAnswerRow[] = [
    { question_id: "cl_core_1", choice_value: "25" },
    { question_id: "cl_core_2", choice_value: "75" },
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

test("aggregation: unregistered item ids are ignored instead of creating report values", () => {
  const meta = questionMetaMap([
    { id: "cl_core_1", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
    { id: "legacy_dummy_id", dimension: germanDimensionLabel("Vision"), category: "basis", prompt: null },
  ]);
  const answers: BaseAnswerRow[] = [
    { question_id: "cl_core_1", choice_value: "50" },
    { question_id: "legacy_dummy_id", choice_value: "100" },
  ];

  const result = aggregateBaseScoresFromAnswers(answers as never[], meta as never);
  assert.equal(result.numericAnsweredTotal, 1);
  assert.equal(result.answeredNumericByDimension.Vision, 1);
  assert.equal(result.scores.Vision, 3.5);
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

test("classifyDelta remains deterministic for engine-backed label classes", () => {
  assert.equal(classifyDelta({ diff: 8, diffClass: "SMALL" }), "Hohe Passung");
  assert.equal(classifyDelta({ diff: 24, diffClass: "MEDIUM" }), "Produktive Ergänzung");
  assert.equal(classifyDelta({ diff: 44, diffClass: "LARGE" }), "Braucht bewusste Abstimmung");
  assert.equal(classifyDelta({ diff: null, diffClass: "MEDIUM" }), "Datenlage unvollständig");
});

test("values flow contract check enforces valuesTotal == count(category='values')", () => {
  const expectedValuesTotal = VALUES_QUESTION_DEFINITIONS.length;
  assert.doesNotThrow(() => {
    assertValuesTotalCategoryContract(expectedValuesTotal, expectedValuesTotal, "values_flow_test");
  });
  assert.throws(
    () => assertValuesTotalCategoryContract(expectedValuesTotal, expectedValuesTotal - 1, "values_flow_test"),
    /values_total_contract_mismatch/
  );
});
