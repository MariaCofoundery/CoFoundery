import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import {
  DEFAULT_ADVISOR_REPORT_CONFIG,
  type AdvisorClusterBonusRule,
  type AdvisorReportConfig,
} from "@/features/reporting/advisor-report/advisorReportConfig";
import {
  ADVISOR_DIMENSION_COPY,
  type AdvisorDimensionCopy,
} from "@/features/reporting/advisor-report/advisorReportCopy";
import { selectAdvisorDimensionInputs } from "@/features/reporting/advisor-report/advisorReportSelectors";
import type {
  AdvisorClassification,
  AdvisorDimensionAssessment,
  AdvisorDimensionInput,
  AdvisorDimensionKey,
  AdvisorIntervention,
  AdvisorIntensity,
  AdvisorObservationPoint,
  AdvisorReportData,
  AdvisorRiskLevel,
  AdvisorStabilityFactor,
  AdvisorTopTension,
} from "@/features/reporting/advisor-report/advisorReportTypes";

const RISK_ORDER: Record<AdvisorRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function isExtremeScore(value: number | null) {
  return typeof value === "number" && (value >= 75 || value <= 25);
}

function isMidBand(value: number | null) {
  return typeof value === "number" && value >= 35 && value <= 65;
}

function getDistanceValue(input: AdvisorDimensionInput) {
  if (typeof input.founderAScore === "number" && typeof input.founderBScore === "number") {
    return Math.abs(input.founderAScore - input.founderBScore);
  }

  return null;
}

function getIntensity(
  input: AdvisorDimensionInput,
  config: AdvisorReportConfig,
  distanceValue: number | null
): AdvisorIntensity {
  if (typeof distanceValue === "number") {
    if (distanceValue >= config.intensityThresholds.medium) return "high";
    if (distanceValue >= config.intensityThresholds.low) return "medium";
    return "low";
  }

  if (input.jointState === "OPPOSITE") return "high";
  if (input.jointState === "MID_HIGH" || input.jointState === "LOW_MID") return "medium";
  return "low";
}

function getDistanceScore(
  input: AdvisorDimensionInput,
  config: AdvisorReportConfig,
  distanceValue: number | null
) {
  if (typeof distanceValue === "number") {
    if (distanceValue >= config.distanceThresholds.high) return config.distanceScores.high;
    if (distanceValue >= config.distanceThresholds.medium) return config.distanceScores.medium;
    return config.distanceScores.low;
  }

  if (!input.jointState) return config.jointStateFallbackScores.BOTH_MID;
  return config.jointStateFallbackScores[input.jointState];
}

function getAbsolutePositionScore(input: AdvisorDimensionInput, config: AdvisorReportConfig) {
  const scoreA = input.founderAScore ?? null;
  const scoreB = input.founderBScore ?? null;

  if (typeof scoreA === "number" && typeof scoreB === "number") {
    if (isExtremeScore(scoreA) && isExtremeScore(scoreB)) {
      return config.absolutePositionScores.bothExtreme;
    }

    if ((isExtremeScore(scoreA) && isMidBand(scoreB)) || (isExtremeScore(scoreB) && isMidBand(scoreA))) {
      return config.absolutePositionScores.oneExtremeOneMid;
    }

    return config.absolutePositionScores.midBand;
  }

  if (input.jointState === "BOTH_HIGH" || input.jointState === "BOTH_LOW") {
    return config.absolutePositionScores.alignedExtremeFallback;
  }

  return config.absolutePositionScores.midBand;
}

function getRiskLevelScore(riskLevel: AdvisorRiskLevel | null, config: AdvisorReportConfig) {
  return config.riskLevelScores[riskLevel ?? "low"];
}

function isComplementaryChanceCandidate(
  input: AdvisorDimensionInput,
  config: AdvisorReportConfig,
  intensity: AdvisorIntensity
) {
  return (
    config.complementaryDimensions.includes(input.dimensionKey) &&
    (input.jointState === "MID_HIGH" || input.jointState === "LOW_MID" || intensity === "medium")
  );
}

function getClassification(
  input: AdvisorDimensionInput,
  config: AdvisorReportConfig,
  intensity: AdvisorIntensity
): AdvisorClassification {
  if (input.hasSharedBlindSpotRisk) return "risk";
  if (input.riskLevel === "high") return "risk";
  if (input.jointState === "OPPOSITE") return "risk";

  if (input.jointState === "BOTH_MID" && input.riskLevel === "low") {
    return "neutral";
  }

  if (
    isComplementaryChanceCandidate(input, config, intensity) &&
    (input.riskLevel === "low" || input.riskLevel === "medium")
  ) {
    return "chance";
  }

  if (
    (input.jointState === "BOTH_HIGH" || input.jointState === "BOTH_LOW") &&
    !input.hasSharedBlindSpotRisk
  ) {
    return "neutral";
  }

  return input.riskLevel === "medium" ? "risk" : "neutral";
}

function getStabilityScore(
  input: AdvisorDimensionInput,
  config: AdvisorReportConfig,
  classification: AdvisorClassification
) {
  let score = 0;

  if (input.riskLevel === "low") score += config.stabilityScores.lowRisk;
  if (!input.hasSharedBlindSpotRisk) score += config.stabilityScores.noBlindSpot;
  if (input.jointState === "BOTH_MID") score += config.stabilityScores.bothMid;
  if (
    !input.hasSharedBlindSpotRisk &&
    (input.jointState === "BOTH_HIGH" || input.jointState === "BOTH_LOW")
  ) {
    score += config.stabilityScores.alignedExtremeWithoutBlindSpot;
  }
  if (classification === "chance") {
    score += config.stabilityScores.complementaryDifference;
  }

  return score;
}

function getCopyVariant(input: AdvisorDimensionInput) {
  if (input.hasSharedBlindSpotRisk) return "blindSpot" as const;
  if (input.jointState === "OPPOSITE") return "opposite" as const;
  if (input.jointState === "BOTH_HIGH" || input.jointState === "BOTH_LOW") return "alignedExtreme" as const;
  return "mixed" as const;
}

function getStrengthVariant(classification: AdvisorClassification) {
  return classification === "chance" ? "complementary" : "aligned";
}

function getTippingPointVariant(input: AdvisorDimensionInput) {
  if (input.hasSharedBlindSpotRisk) return "blindSpot" as const;
  return input.riskLevel === "high" ? "highRisk" as const : "mediumRisk" as const;
}

function getObservationVariant(input: AdvisorDimensionInput) {
  if (input.hasSharedBlindSpotRisk) return "blindSpot" as const;
  if (input.jointState === "OPPOSITE") return "opposite" as const;
  if (input.jointState === "BOTH_MID") return "aligned" as const;
  if (input.jointState === "BOTH_HIGH" || input.jointState === "BOTH_LOW") return "aligned" as const;
  return "mixed" as const;
}

function summarizeTension(
  assessment: AdvisorDimensionAssessment,
  copy: AdvisorDimensionCopy
) {
  if (assessment.classification === "chance") {
    return `${copy.title}: produktive Differenz, solange der Unterschied explizit gefuehrt wird.`;
  }

  if (assessment.classification === "risk") {
    return `${copy.title}: erhoehtes Moderationsrisiko, weil derselbe Sachverhalt nicht nach derselben Logik bearbeitet wird.`;
  }

  return `${copy.title}: aktuell eher entlastend, aber nur tragfaehig mit klaren Leitplanken.`;
}

function getTieBreakerIndex(config: AdvisorReportConfig, dimensionKey: AdvisorDimensionKey) {
  const index = config.tieBreakerOrder.indexOf(dimensionKey);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function comparePriority(
  left: AdvisorDimensionAssessment,
  right: AdvisorDimensionAssessment,
  config: AdvisorReportConfig
) {
  return (
    right.clusteredPriorityScore - left.clusteredPriorityScore ||
    RISK_ORDER[(right.riskLevel ?? "low") as AdvisorRiskLevel] -
      RISK_ORDER[(left.riskLevel ?? "low") as AdvisorRiskLevel] ||
    (right.distanceValue ?? -1) - (left.distanceValue ?? -1) ||
    getTieBreakerIndex(config, left.dimensionKey) - getTieBreakerIndex(config, right.dimensionKey)
  );
}

function compareStability(
  left: AdvisorDimensionAssessment,
  right: AdvisorDimensionAssessment,
  config: AdvisorReportConfig
) {
  return (
    right.stabilityScore - left.stabilityScore ||
    left.priorityScore - right.priorityScore ||
    getTieBreakerIndex(config, left.dimensionKey) - getTieBreakerIndex(config, right.dimensionKey)
  );
}

function appliesClusterBonus(
  rule: AdvisorClusterBonusRule,
  assessmentsByDimension: Map<AdvisorDimensionKey, AdvisorDimensionAssessment>
) {
  const first = assessmentsByDimension.get(rule.dimensions[0]);
  const second = assessmentsByDimension.get(rule.dimensions[1]);

  if (!first || !second) return false;
  if (RISK_ORDER[(first.riskLevel ?? "low") as AdvisorRiskLevel] < RISK_ORDER[rule.minRiskLevel]) {
    return false;
  }
  if (RISK_ORDER[(second.riskLevel ?? "low") as AdvisorRiskLevel] < RISK_ORDER[rule.minRiskLevel]) {
    return false;
  }

  return first.classification !== "neutral" && second.classification !== "neutral";
}

function applyClusterBonuses(
  assessments: AdvisorDimensionAssessment[],
  config: AdvisorReportConfig
): AdvisorDimensionAssessment[] {
  const bonusByDimension = new Map<AdvisorDimensionKey, number>();
  const assessmentsByDimension = new Map(assessments.map((assessment) => [assessment.dimensionKey, assessment]));

  for (const rule of config.clusterBonuses) {
    if (!appliesClusterBonus(rule, assessmentsByDimension)) continue;

    for (const dimension of rule.dimensions) {
      bonusByDimension.set(dimension, (bonusByDimension.get(dimension) ?? 0) + rule.bonus);
    }
  }

  return assessments.map((assessment) => ({
    ...assessment,
    clusteredPriorityScore: assessment.priorityScore + (bonusByDimension.get(assessment.dimensionKey) ?? 0),
  }));
}

function buildLeadStatement(
  topTensions: AdvisorTopTension[],
  stabilityFactors: AdvisorStabilityFactor[]
) {
  const lead = topTensions[0];
  const stability = stabilityFactors[0];

  if (!lead && stability) {
    return `Das Team wirkt derzeit vor allem ueber ${stability.title} stabil. Entscheidend bleibt, dass diese Basis nicht still zur Annahme wird.`;
  }

  if (!lead) {
    return "Das Team zeigt aktuell keine stark eskalierende Hauptspannung, braucht aber weiterhin klare Regeln fuer belastbare Zusammenarbeit.";
  }

  if (lead.classification === "chance") {
    return `Die groesste Fuehrungsaufgabe liegt aktuell darin, den Unterschied in ${lead.title} bewusst tragfaehig zu fuehren.`;
  }

  return `Die groesste Moderationsaufgabe liegt aktuell in ${lead.title}, weil hier Spannungs- und Fehlsteuerungsrisiko zusammenlaufen.`;
}

export function buildAdvisorDimensionAssessment(
  input: AdvisorDimensionInput,
  config: AdvisorReportConfig = DEFAULT_ADVISOR_REPORT_CONFIG,
  copyMap: Record<AdvisorDimensionKey, AdvisorDimensionCopy> = ADVISOR_DIMENSION_COPY
): AdvisorDimensionAssessment {
  const copy = copyMap[input.dimensionKey];
  const distanceValue = getDistanceValue(input);
  const intensity = getIntensity(input, config, distanceValue);
  const classification = getClassification(input, config, intensity);

  const priorityScore =
    getDistanceScore(input, config, distanceValue) +
    getAbsolutePositionScore(input, config) +
    getRiskLevelScore(input.riskLevel, config) +
    (input.hasSharedBlindSpotRisk ? config.blindSpotScore : 0) +
    config.dimensionWeights[input.dimensionKey];

  const stabilityScore = getStabilityScore(input, config, classification);
  const tensionRisk = copy.tensionRisk[getCopyVariant(input)];
  const strengthPotential = copy.strengthPotential[getStrengthVariant(classification)];
  const tippingPoint = copy.tippingPoint[getTippingPointVariant(input)];
  const moderationQuestion = copy.moderationQuestion.default;
  const observationMarkers = [...copy.observationMarkers[getObservationVariant(input)]];

  return {
    dimensionKey: input.dimensionKey,
    founderAScore: input.founderAScore ?? null,
    founderBScore: input.founderBScore ?? null,
    jointState: input.jointState,
    riskLevel: input.riskLevel,
    hasSharedBlindSpotRisk: input.hasSharedBlindSpotRisk,
    distanceValue,
    intensity,
    classification,
    priorityScore,
    clusteredPriorityScore: priorityScore,
    stabilityScore,
    tensionRisk,
    strengthPotential,
    tippingPoint,
    moderationQuestion,
    observationMarkers,
    interventionType: copy.interventionType,
  };
}

export function buildAdvisorTopTensions(
  assessments: AdvisorDimensionAssessment[],
  config: AdvisorReportConfig = DEFAULT_ADVISOR_REPORT_CONFIG,
  copyMap: Record<AdvisorDimensionKey, AdvisorDimensionCopy> = ADVISOR_DIMENSION_COPY
): AdvisorTopTension[] {
  const ranked = applyClusterBonuses(assessments, config);
  const primaryCandidates = ranked.filter((assessment) => assessment.classification !== "neutral");
  const selectedBase = (primaryCandidates.length >= config.limits.topTensions
    ? primaryCandidates
    : ranked
  )
    .slice()
    .sort((left, right) => comparePriority(left, right, config))
    .slice(0, config.limits.topTensions);

  return selectedBase.map((assessment) => {
    const copy = copyMap[assessment.dimensionKey];
    const classification = assessment.classification === "neutral" ? "risk" : assessment.classification;

    return {
      dimensionKey: assessment.dimensionKey,
      priorityScore: assessment.clusteredPriorityScore,
      intensity: assessment.intensity,
      classification,
      title: copy.title,
      summary: summarizeTension(assessment, copy),
      tensionRisk: assessment.tensionRisk,
      strengthPotential: assessment.strengthPotential,
      tippingPoint: assessment.tippingPoint,
      moderationQuestion: assessment.moderationQuestion,
      observationMarkers: assessment.observationMarkers,
      interventionType: assessment.interventionType,
    };
  });
}

export function buildAdvisorStabilityFactors(
  assessments: AdvisorDimensionAssessment[],
  config: AdvisorReportConfig = DEFAULT_ADVISOR_REPORT_CONFIG,
  copyMap: Record<AdvisorDimensionKey, AdvisorDimensionCopy> = ADVISOR_DIMENSION_COPY
): AdvisorStabilityFactor[] {
  return assessments
    .filter(
      (assessment) =>
        assessment.stabilityScore > 0 &&
        (assessment.classification === "neutral" || assessment.classification === "chance")
    )
    .slice()
    .sort((left, right) => compareStability(left, right, config))
    .slice(0, config.limits.stabilityFactors)
    .map((assessment) => {
      const copy = copyMap[assessment.dimensionKey];
      return {
        dimensionKey: assessment.dimensionKey,
        stabilityScore: assessment.stabilityScore,
        title: copy.title,
        rationale: copy.stabilityRationale,
        constraintNote: copy.stabilityConstraint,
      };
    });
}

export function buildAdvisorObservationPoints(
  topTensions: AdvisorTopTension[],
  config: AdvisorReportConfig = DEFAULT_ADVISOR_REPORT_CONFIG
): AdvisorObservationPoint[] {
  const seen = new Set<string>();
  const points: AdvisorObservationPoint[] = [];

  for (const tension of topTensions) {
    for (const marker of tension.observationMarkers) {
      const normalized = marker.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      points.push({
        id: `${tension.dimensionKey}-${points.length + 1}`,
        dimensionKey: tension.dimensionKey,
        priorityScore: tension.priorityScore,
        marker,
        whyItMatters: tension.tippingPoint,
      });
    }
  }

  return points
    .slice()
    .sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id))
    .slice(0, config.limits.observationPoints);
}

export function buildAdvisorInterventions(
  topTensions: AdvisorTopTension[],
  copyMap: Record<AdvisorDimensionKey, AdvisorDimensionCopy> = ADVISOR_DIMENSION_COPY
): AdvisorIntervention[] {
  return topTensions.map((tension) => {
    const copy = copyMap[tension.dimensionKey];
    return {
      dimensionKey: tension.dimensionKey,
      interventionType: tension.interventionType,
      priorityScore: tension.priorityScore,
      title: copy.interventionTitle,
      objective: copy.interventionObjective,
      prompt: copy.interventionPrompt,
    };
  });
}

export function buildAdvisorReportData(
  compareResult: CompareFoundersResult,
  config: AdvisorReportConfig = DEFAULT_ADVISOR_REPORT_CONFIG,
  copyMap: Record<AdvisorDimensionKey, AdvisorDimensionCopy> = ADVISOR_DIMENSION_COPY
): AdvisorReportData {
  const dimensionInputs = selectAdvisorDimensionInputs(compareResult);
  const dimensions = applyClusterBonuses(
    dimensionInputs.map((input) => buildAdvisorDimensionAssessment(input, config, copyMap)),
    config
  );
  const topTensions = buildAdvisorTopTensions(dimensions, config, copyMap);
  const stabilityFactors = buildAdvisorStabilityFactors(dimensions, config, copyMap);
  const observationPoints = buildAdvisorObservationPoints(topTensions, config);
  const interventions = buildAdvisorInterventions(topTensions, copyMap);

  return {
    teamSummary: {
      leadStatement: buildLeadStatement(topTensions, stabilityFactors),
      topPatternKeys: topTensions.map((entry) => entry.dimensionKey),
    },
    dimensions,
    topTensions,
    stabilityFactors,
    observationPoints,
    interventions,
  };
}
