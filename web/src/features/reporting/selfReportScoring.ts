import {
  FOUNDER_DIMENSION_ORDER,
  getFounderDimensionMeta,
  getFounderDimensionPoleTendency,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import {
  aggregateFounderCompatibilityAnswerMapForEnrichment,
  aggregateFounderCompatibilityAnswerMapForScoring,
  buildFounderCompatibilityAnswerMapV2,
  mapLegacyFounderAnswersToV2Answers,
} from "@/features/scoring/founderCompatibilityAnswerRuntime";
import type { AssessmentAnswerRow, QuestionMetaRow } from "@/features/reporting/base_scoring";
import type {
  SelfAlignmentReport,
  SelfBaseCoverage,
  SelfDebugDimensionEntry,
  SelfKeyInsight,
  SelfParticipantDebugReport,
  SelfRadarSeries,
} from "@/features/reporting/selfReportTypes";
import { type DimensionId } from "@/features/scoring/founderCompatibilityRegistry";

// Legacy boundary: this path still reads the active Supabase questionnaire contract
// (`q..` IDs via question rows). Numeric scoring is now CORE-only; SUPPORT items
// remain available only for enrichment/debug visibility until the intake contract
// becomes registry-native end-to-end.

type FounderBaseScoreAggregate = {
  scores: SelfRadarSeries;
  answeredQuestionCount: number;
  answeredNumericByDimension: Record<FounderDimensionKey, number>;
  expectedByDimension: Record<FounderDimensionKey, number>;
  numericAnsweredTotal: number;
  expectedTotal: number;
  baseCoveragePercent: number | null;
  debugDimensions: SelfDebugDimensionEntry[];
};

export const SELF_MEANINGFUL_ORIENTATION_DISTANCE = 10;

const FOUNDER_DIMENSION_TO_REGISTRY_ID: Record<FounderDimensionKey, DimensionId> = {
  Unternehmenslogik: "company_logic",
  Entscheidungslogik: "decision_logic",
  "Arbeitsstruktur & Zusammenarbeit": "work_structure",
  Commitment: "commitment",
  Risikoorientierung: "risk_orientation",
  Konfliktstil: "conflict_style",
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function emptySelfRadarSeries(): SelfRadarSeries {
  return FOUNDER_DIMENSION_ORDER.reduce((acc, dimension) => {
    acc[dimension] = null;
    return acc;
  }, {} as SelfRadarSeries);
}

export function emptyFounderDimensionCountRecord() {
  return FOUNDER_DIMENSION_ORDER.reduce((acc, dimension) => {
    acc[dimension] = 0;
    return acc;
  }, {} as Record<FounderDimensionKey, number>);
}

export function scoreToFounderPercent(score: number | null) {
  if (score == null || !Number.isFinite(score)) {
    return null;
  }
  return round(Math.max(0, Math.min(100, score)), 2);
}

export function getSelfDimensionTendency(dimension: FounderDimensionKey, score: number | null) {
  return getFounderDimensionPoleTendency(dimension, scoreToFounderPercent(score));
}

export function getSelfOrientationStrength(score: number | null) {
  if (score == null || !Number.isFinite(score)) {
    return null;
  }

  return Math.abs(score - 50);
}

export function isMeaningfullyOrientedScore(score: number | null) {
  const strength = getSelfOrientationStrength(score);
  return strength != null && strength >= SELF_MEANINGFUL_ORIENTATION_DISTANCE;
}

export function aggregateFounderBaseScoresFromAnswers(
  answers: AssessmentAnswerRow[],
  questionById: Map<string, QuestionMetaRow>,
  expectedByDimensionInput?: Record<FounderDimensionKey, number>
): FounderBaseScoreAggregate {
  const v2Answers = mapLegacyFounderAnswersToV2Answers(answers, questionById);
  const answerMap = buildFounderCompatibilityAnswerMapV2(v2Answers);
  const scoringAggregate = aggregateFounderCompatibilityAnswerMapForScoring(answerMap);
  const enrichmentAggregate = aggregateFounderCompatibilityAnswerMapForEnrichment(answerMap);

  const scores = emptySelfRadarSeries();
  const answeredNumericByDimension = emptyFounderDimensionCountRecord();
  const expectedByDimension =
    expectedByDimensionInput ??
    (() => {
      const derived = emptyFounderDimensionCountRecord();
      for (const dimension of FOUNDER_DIMENSION_ORDER) {
        derived[dimension] =
          scoringAggregate.expectedCountByDimension[FOUNDER_DIMENSION_TO_REGISTRY_ID[dimension]] ?? 0;
      }
      return derived;
    })();

  const expectedTotal = FOUNDER_DIMENSION_ORDER.reduce(
    (sum, dimension) => sum + (expectedByDimension[dimension] ?? 0),
    0
  );

  for (const dimension of FOUNDER_DIMENSION_ORDER) {
    const dimensionId = FOUNDER_DIMENSION_TO_REGISTRY_ID[dimension];
    const founderPercent = scoringAggregate.scoresByDimension[dimensionId];
    if (typeof founderPercent !== "number") {
      scores[dimension] = null;
      continue;
    }
    scores[dimension] = founderPercent;
    answeredNumericByDimension[dimension] = scoringAggregate.answeredCountByDimension[dimensionId] ?? 0;
  }

  const numericAnsweredTotal = FOUNDER_DIMENSION_ORDER.reduce(
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
    debugDimensions: FOUNDER_DIMENSION_ORDER.map((dimension) => {
      const dimensionId = FOUNDER_DIMENSION_TO_REGISTRY_ID[dimension];
      const rawScore =
        typeof scoringAggregate.scoresByDimension[dimensionId] === "number"
          ? scoringAggregate.scoresByDimension[dimensionId]
          : null;
      const dimensionItems = enrichmentAggregate.itemsByDimension[dimensionId as DimensionId] ?? [];
      return {
        dimension,
        rawScore,
        normalizedScore: rawScore == null ? null : round(rawScore / 100, 3),
        category: "basis",
        questions: dimensionItems.map((entry) => ({
          questionId: entry.itemId,
          value: entry.value,
          max: 100,
          normalized: round(entry.value / 100, 3),
        })),
      };
    }),
  };
}

function buildClearOrientationInsight(
  dimension: FounderDimensionKey,
  tendency: NonNullable<ReturnType<typeof getSelfDimensionTendency>>
): SelfKeyInsight {
  const meta = getFounderDimensionMeta(dimension);
  const title =
    tendency.tendency === "center"
      ? `${meta?.shortLabel ?? dimension} - ausgewogene Tendenz`
      : `${meta?.shortLabel ?? dimension} - klare Orientierung`;
  const text =
    tendency.tendency === "center"
      ? `In ${meta?.shortLabel.toLowerCase() ?? "diesem Feld"} wirkst du aktuell eher ausgewogen. Das schafft eine tragfaehige Grundlage fuer Zusammenarbeit, braucht aber bewusste Priorisierung, wenn Entscheidungen unter Druck schneller werden.`
      : `In ${meta?.shortLabel.toLowerCase() ?? "diesem Feld"} zeigt dein Profil aktuell eine klare Tendenz zu ${tendency.label}. Das gibt deiner Zusammenarbeit in diesem Bereich eine gut erkennbare Richtung.`;

  return {
    dimension,
    title,
    text,
    priority: 0,
  };
}

function buildClarificationInsight(dimension: FounderDimensionKey): SelfKeyInsight {
  const meta = getFounderDimensionMeta(dimension);
  return {
    dimension,
    title: `${meta?.shortLabel ?? dimension} - bewusst schaerfen`,
    text: `In ${meta?.shortLabel.toLowerCase() ?? "diesem Feld"} ist dein Profil aktuell weniger stark festgelegt. Gerade hier lohnt sich eine bewusste Klaerung, welche Arbeitsweise, Entscheidungen oder Erwartungen du in einer Co-Founder-Konstellation wirklich willst.`,
    priority: 0,
  };
}

function buildBalancedProfileInsight(priority: number): SelfKeyInsight {
  return {
    dimension: "profile",
    title: "Profil - ausgewogene Tendenz",
    text: "Dein Profil zeigt aktuell keine stark dominierende Ausrichtung. Mehrere Founder-Dimensionen liegen nah an der Mitte, was auf eine ausgewogene Arbeitslogik hindeutet statt auf einen einzelnen Schwerpunkt.",
    priority,
  };
}

function buildBalancedProfileFollowUpInsight(priority: number): SelfKeyInsight {
  return {
    dimension: "profile",
    title: "Profil - balancierte Orientierung",
    text: "Gerade in fruehen Founder-Konstellationen kann diese Balance hilfreich sein, weil du nicht vorschnell auf einen Extrempol festgelegt bist. Wichtig ist vor allem, in konkreten Entscheidungen trotzdem frueh zu klaeren, welche Prioritaet fuer dich dann wirklich zaehlt.",
    priority,
  };
}

export function buildSelfFounderKeyInsights(scores: SelfRadarSeries): SelfKeyInsight[] {
  const ranked = FOUNDER_DIMENSION_ORDER.map((dimension) => {
    const score = scores[dimension];
    const tendency = getSelfDimensionTendency(dimension, score);
    if (score == null || tendency == null) return null;

    return {
      dimension,
      score,
      tendency,
      strength: getSelfOrientationStrength(score) ?? 0,
    };
  })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .sort((left, right) => right.strength - left.strength);

  if (ranked.length === 0) {
    return [];
  }

  const strengths = ranked.filter((entry) => entry.strength >= SELF_MEANINGFUL_ORIENTATION_DISTANCE).slice(0, 2);
  const weakest =
    strengths.length > 0
      ? [...ranked]
          .filter((entry) => !strengths.some((strength) => strength.dimension === entry.dimension))
          .sort((left, right) => left.strength - right.strength)[0] ?? null
      : null;

  if (strengths.length === 0) {
    return [buildBalancedProfileInsight(1), buildBalancedProfileFollowUpInsight(2)];
  }

  const insights: SelfKeyInsight[] = strengths.map((entry, index) => ({
    ...buildClearOrientationInsight(entry.dimension, entry.tendency),
    priority: index + 1,
  }));

  if (weakest && !insights.some((insight) => insight.dimension === weakest.dimension)) {
    insights.push({
      ...buildClarificationInsight(weakest.dimension),
      priority: insights.length + 1,
    });
  }

  return insights.slice(0, 3);
}

export function toSelfBaseCoverage(
  aggregate: FounderBaseScoreAggregate
): SelfAlignmentReport["baseCoverageA"] {
  const coverage: SelfBaseCoverage = {
    answeredNumericByDimension: aggregate.answeredNumericByDimension,
    expectedByDimension: aggregate.expectedByDimension,
    numericAnsweredTotal: aggregate.numericAnsweredTotal,
    expectedTotal: aggregate.expectedTotal,
    baseCoveragePercent: aggregate.baseCoveragePercent,
  };

  return coverage;
}

export function toSelfParticipantDebugReport(
  participantName: string,
  dimensions: SelfDebugDimensionEntry[]
): SelfParticipantDebugReport {
  return {
    participantName,
    dimensions,
  };
}
