import {
  REPORT_DIMENSIONS,
  type RadarSeries,
  type ReportDimension,
  type SessionAlignmentReport,
} from "@/features/reporting/types";

export type AssessmentAnswerRow = {
  question_id: string;
  choice_value: string;
};

export type QuestionMetaRow = {
  id: string;
  dimension: string | null;
  category: string | null;
  prompt: string | null;
};

export type BaseScoreAggregate = {
  scores: RadarSeries;
  answeredQuestionCount: number;
  answeredNumericByDimension: Record<ReportDimension, number>;
  expectedByDimension: Record<ReportDimension, number>;
  numericAnsweredTotal: number;
  expectedTotal: number;
  baseCoveragePercent: number | null;
  debugDimensions: SessionAlignmentReport["debugA"]["dimensions"];
};

function emptySeries(): RadarSeries {
  return REPORT_DIMENSIONS.reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as RadarSeries);
}

function normalizeDimensionLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapGermanDimensionToReportKey(dim: string): ReportDimension | null {
  const normalized = normalizeDimensionLabel(dim);
  if (!normalized) return null;

  if (normalized.includes("vision") && normalized.includes("richtung")) {
    return "Vision";
  }

  if (normalized.includes("entscheidungsstil") || normalized.includes("entscheidung")) {
    return "Entscheidung";
  }

  if (
    (normalized.includes("unsicherheit") && normalized.includes("risiko")) ||
    normalized.includes("umgang mit unsicherheit")
  ) {
    return "Risiko";
  }

  if (normalized.includes("zusammenarbeit") && normalized.includes("nahe")) {
    return "Autonomie";
  }

  if (normalized.includes("verantwortung") && normalized.includes("verbindlichkeit")) {
    return "Verbindlichkeit";
  }

  if (normalized.includes("konfliktverhalten") || normalized.includes("konflikt")) {
    return "Konflikt";
  }

  return null;
}

function emptyDimensionCountRecord() {
  return REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = 0;
    return acc;
  }, {} as Record<ReportDimension, number>);
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normalizeBaseAnswerToReportScale(rawValue: string): number | null {
  const parsedValue = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsedValue)) return null;

  if (parsedValue >= 1 && parsedValue <= 4) {
    // Canonical basis normalization: DB likert (1..4) -> report scale (1..6)
    return round(1 + ((parsedValue - 1) / 3) * 5, 3);
  }

  return Math.max(1, Math.min(6, parsedValue));
}

export function assertValuesTotalCategoryContract(
  valuesTotal: number,
  valuesCategoryCount: number,
  context: string
) {
  if (valuesTotal === valuesCategoryCount) {
    return;
  }
  throw new Error(
    `values_total_contract_mismatch (${context}): active_count=${valuesTotal}, category_count=${valuesCategoryCount}`
  );
}

export function aggregateBaseScoresFromAnswers(
  answers: AssessmentAnswerRow[],
  questionById: Map<string, QuestionMetaRow>,
  expectedByDimensionInput?: Record<ReportDimension, number>
): BaseScoreAggregate {
  const scoreBuckets = new Map<
    ReportDimension,
    { sum: number; count: number; questions: Array<{ questionId: string; value: number }> }
  >(
    REPORT_DIMENSIONS.map((dimension) => [
      dimension,
      { sum: 0, count: 0, questions: [] as Array<{ questionId: string; value: number }> },
    ])
  );

  const answeredBaseQuestionIds = new Set<string>();
  const answeredNumericByDimension = emptyDimensionCountRecord();

  for (const answer of answers) {
    const questionMeta = questionById.get(answer.question_id);
    const mappedDimension = questionMeta?.dimension
      ? mapGermanDimensionToReportKey(questionMeta.dimension)
      : null;
    if (!questionMeta || questionMeta.category !== "basis" || !mappedDimension) {
      continue;
    }

    answeredBaseQuestionIds.add(answer.question_id);
    const normalizedValue = normalizeBaseAnswerToReportScale(answer.choice_value);
    if (normalizedValue == null) {
      continue;
    }

    const bucket = scoreBuckets.get(mappedDimension);
    if (!bucket) continue;
    bucket.sum += normalizedValue;
    bucket.count += 1;
    answeredNumericByDimension[mappedDimension] += 1;
    bucket.questions.push({ questionId: answer.question_id, value: normalizedValue });
  }

  const scores = emptySeries();
  const expectedByDimension =
    expectedByDimensionInput ??
    (() => {
      const derived = emptyDimensionCountRecord();
      for (const meta of questionById.values()) {
        if (meta.category !== "basis") continue;
        const mapped = meta.dimension ? mapGermanDimensionToReportKey(meta.dimension) : null;
        if (!mapped) continue;
        derived[mapped] += 1;
      }
      return derived;
    })();
  const expectedTotal = REPORT_DIMENSIONS.reduce(
    (sum, dimension) => sum + (expectedByDimension[dimension] ?? 0),
    0
  );
  const numericAnsweredTotal = REPORT_DIMENSIONS.reduce(
    (sum, dimension) => sum + (answeredNumericByDimension[dimension] ?? 0),
    0
  );
  const baseCoveragePercent = expectedTotal > 0 ? round((numericAnsweredTotal / expectedTotal) * 100, 2) : null;

  for (const dimension of REPORT_DIMENSIONS) {
    const bucket = scoreBuckets.get(dimension);
    if (!bucket || bucket.count === 0) {
      scores[dimension] = null;
      continue;
    }
    scores[dimension] = round(bucket.sum / bucket.count);
  }

  return {
    scores,
    answeredQuestionCount: answeredBaseQuestionIds.size,
    answeredNumericByDimension,
    expectedByDimension,
    numericAnsweredTotal,
    expectedTotal,
    baseCoveragePercent,
    debugDimensions: REPORT_DIMENSIONS.map((dimension) => {
      const bucket = scoreBuckets.get(dimension);
      const rawScore = bucket && bucket.count > 0 ? round(bucket.sum / bucket.count) : null;
      return {
        dimension,
        rawScore,
        normalizedScore: rawScore == null ? null : round(rawScore / 6, 3),
        category: "basis",
        questions: (bucket?.questions ?? []).map((entry) => ({
          questionId: entry.questionId,
          value: entry.value,
          max: 6,
          normalized: round(entry.value / 6, 3),
        })),
      };
    }),
  };
}
