import {
  REPORT_DIMENSIONS,
  type RadarSeries,
  type ReportDimension,
  type SessionAlignmentReport,
} from "@/features/reporting/types";
import { founderPercentToDisplayScore } from "@/features/scoring/founderBaseNormalization";
import {
  aggregateFounderCompatibilityAnswerMapForEnrichment,
  aggregateFounderCompatibilityAnswerMapForScoring,
  buildFounderCompatibilityAnswerMapV2,
  mapLegacyFounderAnswersToV2Answers,
} from "@/features/scoring/founderCompatibilityAnswerRuntime";
import { type DimensionId } from "@/features/scoring/founderCompatibilityRegistry";

// Legacy boundary: this aggregate still depends on the current Supabase question rows
// and old base-question IDs. Numeric dimension scoring is now CORE-only; SUPPORT
// items are retained only for enrichment/debug visibility until the questionnaire
// intake itself is registry-native.

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

function mapRegistryDimensionToReportKey(dimensionId: DimensionId): ReportDimension {
  if (dimensionId === "company_logic") return "Vision";
  if (dimensionId === "decision_logic") return "Entscheidung";
  if (dimensionId === "risk_orientation") return "Risiko";
  if (dimensionId === "work_structure") return "Autonomie";
  if (dimensionId === "commitment") return "Verbindlichkeit";
  return "Konflikt";
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
  const v2Answers = mapLegacyFounderAnswersToV2Answers(answers, questionById);
  const answerMap = buildFounderCompatibilityAnswerMapV2(v2Answers);
  const scoringAggregate = aggregateFounderCompatibilityAnswerMapForScoring(answerMap);
  const enrichmentAggregate = aggregateFounderCompatibilityAnswerMapForEnrichment(answerMap);

  const scores = emptySeries();
  const answeredNumericByDimension = emptyDimensionCountRecord();
  const expectedByDimension =
    expectedByDimensionInput ??
    (() => {
      const derived = emptyDimensionCountRecord();
      for (const [dimensionId, count] of Object.entries(scoringAggregate.expectedCountByDimension)) {
        derived[mapRegistryDimensionToReportKey(dimensionId as DimensionId)] += count;
      }
      return derived;
    })();
  const expectedTotal = REPORT_DIMENSIONS.reduce(
    (sum, dimension) => sum + (expectedByDimension[dimension] ?? 0),
    0
  );

  for (const dimension of REPORT_DIMENSIONS) {
    const matchingEntry = Object.entries(scoringAggregate.scoresByDimension).find(
      ([dimensionId]) => mapRegistryDimensionToReportKey(dimensionId as DimensionId) === dimension
    );
    const founderPercent =
      matchingEntry && typeof matchingEntry[1] === "number" ? matchingEntry[1] : null;

    if (founderPercent == null) {
      scores[dimension] = null;
      continue;
    }
    scores[dimension] = founderPercentToDisplayScore(founderPercent);
  }

  for (const [dimensionId, answeredCount] of Object.entries(scoringAggregate.answeredCountByDimension)) {
    const reportDimension = mapRegistryDimensionToReportKey(dimensionId as DimensionId);
    answeredNumericByDimension[reportDimension] += answeredCount;
  }

  const numericAnsweredTotal = REPORT_DIMENSIONS.reduce(
    (sum, dimension) => sum + (answeredNumericByDimension[dimension] ?? 0),
    0
  );
  const baseCoveragePercent =
    expectedTotal > 0 ? round((numericAnsweredTotal / expectedTotal) * 100, 2) : null;

  return {
    scores,
    answeredQuestionCount: scoringAggregate.answeredTotal,
    answeredNumericByDimension,
    expectedByDimension,
    numericAnsweredTotal,
    expectedTotal,
    baseCoveragePercent,
    debugDimensions: REPORT_DIMENSIONS.map((dimension) => {
      const matchingEntry = Object.entries(scoringAggregate.scoresByDimension).find(
        ([dimensionId]) => mapRegistryDimensionToReportKey(dimensionId as DimensionId) === dimension
      );
      const founderPercent =
        matchingEntry && typeof matchingEntry[1] === "number" ? matchingEntry[1] : null;
      const rawScore =
        founderPercent == null ? null : founderPercentToDisplayScore(founderPercent);
      const dimensionItems = Object.entries(enrichmentAggregate.itemsByDimension)
        .filter(([dimensionId]) => mapRegistryDimensionToReportKey(dimensionId as DimensionId) === dimension)
        .flatMap(([, items]) => items);
      return {
        dimension,
        rawScore,
        normalizedScore: rawScore == null ? null : round(rawScore / 6, 3),
        category: "basis",
        questions: dimensionItems.map((entry) => ({
          questionId: entry.itemId,
          value: founderPercentToDisplayScore(entry.value) ?? 0,
          max: 6,
          normalized: round((founderPercentToDisplayScore(entry.value) ?? 0) / 6, 3),
        })),
      };
    }),
  };
}
