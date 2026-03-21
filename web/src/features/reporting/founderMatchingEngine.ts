import {
  FOUNDER_DIMENSION_ORDER,
  getFounderDimensionPoleTendency,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";

export type FounderScores = {
  Unternehmenslogik: number | null;
  Entscheidungslogik: number | null;
  Risikoorientierung: number | null;
  "Arbeitsstruktur & Zusammenarbeit": number | null;
  Commitment: number | null;
  Konfliktstil: number | null;
};

export type RelationType = "similar" | "moderate_difference" | "strong_difference";
export type InteractionType = "alignment" | "complement" | "coordination" | "critical_tension";
export type TensionType = "productive" | "coordination" | "critical";

export type DimensionMatchResult = {
  dimension: FounderDimensionKey;
  scoreA: number | null;
  scoreB: number | null;
  difference: number | null;
  relationType: RelationType | null;
  interactionType: InteractionType | null;
  explanationKey: string | null;
};

export type TensionMapEntry = {
  dimension: FounderDimensionKey;
  tensionType: TensionType;
  explanationKey: string;
};

export type CompareFoundersResult = {
  dimensions: DimensionMatchResult[];
  overallMatchScore: number | null;
  alignmentScore: number | null;
  workingCompatibilityScore: number | null;
  tensionMap: TensionMapEntry[];
};

type DimensionAssessment = {
  difference: number | null;
  relationType: RelationType | null;
  interactionType: InteractionType | null;
  explanationKey: string | null;
  tension: { tensionType: TensionType; explanationKey: string } | null;
};

const MATCH_WEIGHT: Record<FounderDimensionKey, number> = {
  Unternehmenslogik: 1,
  Entscheidungslogik: 1,
  Risikoorientierung: 0.7,
  "Arbeitsstruktur & Zusammenarbeit": 1.4,
  Commitment: 1.5,
  Konfliktstil: 1.3,
};

const ALIGNMENT_WEIGHT: Partial<Record<FounderDimensionKey, number>> = {
  Unternehmenslogik: 1.3,
  Commitment: 1.4,
  Entscheidungslogik: 1,
  Risikoorientierung: 0.7,
};

const WORKING_WEIGHT: Partial<Record<FounderDimensionKey, number>> = {
  "Arbeitsstruktur & Zusammenarbeit": 1.5,
  Commitment: 1.3,
  Konfliktstil: 1.3,
  Entscheidungslogik: 0.9,
};

type Orientation = "left" | "right" | "center";

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function getOrientation(dimension: FounderDimensionKey, value: number | null): Orientation | null {
  return getFounderDimensionPoleTendency(dimension, value)?.tendency ?? null;
}

function getRelationType(difference: number | null): RelationType | null {
  if (difference == null) return null;
  if (difference <= 12) return "similar";
  if (difference <= 25) return "moderate_difference";
  return "strong_difference";
}

function areOpposingPoles(a: Orientation | null, b: Orientation | null) {
  return (a === "left" && b === "right") || (a === "right" && b === "left");
}

function buildDimensionAssessment(
  dimension: FounderDimensionKey,
  scoreA: number | null,
  scoreB: number | null
): DimensionAssessment {
  const difference =
    scoreA == null || scoreB == null ? null : round(Math.abs(scoreA - scoreB));
  const relationType = getRelationType(difference);
  const orientationA = getOrientation(dimension, scoreA);
  const orientationB = getOrientation(dimension, scoreB);
  const opposingPoles = areOpposingPoles(orientationA, orientationB);

  if (relationType == null) {
    return {
      difference,
      relationType,
      interactionType: null,
      explanationKey: null,
      tension: null,
    };
  }

  switch (dimension) {
    case "Commitment":
      if (relationType === "strong_difference") {
        return {
          difference,
          relationType,
          interactionType: "critical_tension" as const,
          explanationKey: "commitment_gap_critical",
          tension: { tensionType: "critical" as const, explanationKey: "commitment_gap_critical" },
        };
      }
      if (relationType === "moderate_difference") {
        return {
          difference,
          relationType,
          interactionType: "coordination" as const,
          explanationKey: "commitment_expectation_gap",
          tension: { tensionType: "coordination" as const, explanationKey: "commitment_expectation_gap" },
        };
      }
      return {
        difference,
        relationType,
        interactionType: "alignment" as const,
        explanationKey: "commitment_aligned",
        tension: null,
      };

    case "Arbeitsstruktur & Zusammenarbeit":
      if (relationType === "strong_difference") {
        return {
          difference,
          relationType,
          interactionType: opposingPoles ? "critical_tension" : "coordination",
          explanationKey: opposingPoles ? "work_mode_clash_critical" : "work_mode_gap_coordination",
          tension: {
            tensionType: opposingPoles ? "critical" : "coordination",
            explanationKey: opposingPoles ? "work_mode_clash_critical" : "work_mode_gap_coordination",
          },
        };
      }
      if (relationType === "moderate_difference") {
        return {
          difference,
          relationType,
          interactionType: "coordination" as const,
          explanationKey: "work_mode_needs_explicit_rules",
          tension: {
            tensionType: "coordination" as const,
            explanationKey: "work_mode_needs_explicit_rules",
          },
        };
      }
      return {
        difference,
        relationType,
        interactionType: "alignment" as const,
        explanationKey: "work_mode_aligned",
        tension: null,
      };

    case "Unternehmenslogik":
      if (relationType === "strong_difference") {
        return {
          difference,
          relationType,
          interactionType: "critical_tension" as const,
          explanationKey: "directional_alignment_conflict",
          tension: {
            tensionType: "critical" as const,
            explanationKey: "directional_alignment_conflict",
          },
        };
      }
      if (relationType === "moderate_difference") {
        return {
          difference,
          relationType,
          interactionType: "coordination" as const,
          explanationKey: "directional_tradeoff_coordination",
          tension: {
            tensionType: "coordination" as const,
            explanationKey: "directional_tradeoff_coordination",
          },
        };
      }
      return {
        difference,
        relationType,
        interactionType: "alignment" as const,
        explanationKey: "directional_alignment",
        tension: null,
      };

    case "Entscheidungslogik":
      if (relationType === "strong_difference" || relationType === "moderate_difference") {
        return {
          difference,
          relationType,
          interactionType: "complement" as const,
          explanationKey: relationType === "strong_difference"
            ? "decision_style_strong_complement"
            : "decision_style_moderate_complement",
          tension: {
            tensionType: "productive" as const,
            explanationKey: relationType === "strong_difference"
              ? "decision_style_strong_complement"
              : "decision_style_moderate_complement",
          },
        };
      }
      return {
        difference,
        relationType,
        interactionType: "alignment" as const,
        explanationKey: "decision_style_alignment",
        tension: null,
      };

    case "Risikoorientierung":
      if (relationType === "strong_difference" || relationType === "moderate_difference") {
        return {
          difference,
          relationType,
          interactionType: "complement" as const,
          explanationKey: relationType === "strong_difference"
            ? "risk_productive_tension_strong"
            : "risk_productive_tension_moderate",
          tension: {
            tensionType: "productive" as const,
            explanationKey: relationType === "strong_difference"
              ? "risk_productive_tension_strong"
              : "risk_productive_tension_moderate",
          },
        };
      }
      return {
        difference,
        relationType,
        interactionType: "alignment" as const,
        explanationKey: "risk_alignment",
        tension: null,
      };

    case "Konfliktstil":
      if (relationType === "strong_difference") {
        return {
          difference,
          relationType,
          interactionType: opposingPoles ? "critical_tension" : "coordination",
          explanationKey: opposingPoles ? "conflict_style_escalation_risk" : "conflict_style_coordination_gap",
          tension: {
            tensionType: opposingPoles ? "critical" : "coordination",
            explanationKey: opposingPoles ? "conflict_style_escalation_risk" : "conflict_style_coordination_gap",
          },
        };
      }
      if (relationType === "moderate_difference") {
        return {
          difference,
          relationType,
          interactionType: "coordination" as const,
          explanationKey: "conflict_style_coordination_gap",
          tension: {
            tensionType: "coordination" as const,
            explanationKey: "conflict_style_coordination_gap",
          },
        };
      }
      return {
        difference,
        relationType,
        interactionType: "alignment" as const,
        explanationKey: "conflict_style_alignment",
        tension: null,
      };
  }
}

function toDimensionScore(result: DimensionMatchResult) {
  if (!result.relationType || !result.interactionType) return null;

  // We do not score only by distance. The same gap can be healthy, neutral or risky
  // depending on the underlying founder dynamic of that dimension.
  const table: Record<InteractionType, Record<RelationType, number>> = {
    alignment: {
      similar: 92,
      moderate_difference: 72,
      strong_difference: 48,
    },
    complement: {
      similar: 76,
      moderate_difference: 84,
      strong_difference: 72,
    },
    coordination: {
      similar: 72,
      moderate_difference: 56,
      strong_difference: 34,
    },
    critical_tension: {
      similar: 62,
      moderate_difference: 38,
      strong_difference: 16,
    },
  };

  return table[result.interactionType][result.relationType];
}

function weightedAverage(
  dimensions: DimensionMatchResult[],
  weights: Partial<Record<FounderDimensionKey, number>>
) {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const dimension of dimensions) {
    const weight = weights[dimension.dimension];
    const score = toDimensionScore(dimension);
    if (!weight || score == null) continue;
    weightedSum += score * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return null;
  return round(weightedSum / weightTotal);
}

export function compareFounders(a: FounderScores, b: FounderScores): CompareFoundersResult {
  const dimensions = FOUNDER_DIMENSION_ORDER.map((dimension) => {
    const assessment = buildDimensionAssessment(dimension, a[dimension], b[dimension]);

    return {
      dimension,
      scoreA: a[dimension],
      scoreB: b[dimension],
      difference: assessment.difference,
      relationType: assessment.relationType,
      interactionType: assessment.interactionType,
      explanationKey: assessment.explanationKey,
    } satisfies DimensionMatchResult;
  });

  const tensionMap = FOUNDER_DIMENSION_ORDER.flatMap((dimension) => {
    const assessment = buildDimensionAssessment(dimension, a[dimension], b[dimension]);
    return assessment.tension
      ? [
          {
            dimension,
            tensionType: assessment.tension.tensionType,
            explanationKey: assessment.tension.explanationKey,
          },
        ]
      : [];
  });

  return {
    dimensions,
    overallMatchScore: weightedAverage(dimensions, MATCH_WEIGHT),
    alignmentScore: weightedAverage(dimensions, ALIGNMENT_WEIGHT),
    workingCompatibilityScore: weightedAverage(dimensions, WORKING_WEIGHT),
    tensionMap,
  };
}

export const FOUNDER_MATCHING_ENGINE_EXAMPLES = {
  complementary_builders: compareFounders(
    {
      Unternehmenslogik: 68,
      Entscheidungslogik: 34,
      Risikoorientierung: 64,
      "Arbeitsstruktur & Zusammenarbeit": 72,
      Commitment: 81,
      Konfliktstil: 38,
    },
    {
      Unternehmenslogik: 62,
      Entscheidungslogik: 67,
      Risikoorientierung: 43,
      "Arbeitsstruktur & Zusammenarbeit": 58,
      Commitment: 76,
      Konfliktstil: 61,
    }
  ),
  misaligned_pressure_pair: compareFounders(
    {
      Unternehmenslogik: 82,
      Entscheidungslogik: 36,
      Risikoorientierung: 71,
      "Arbeitsstruktur & Zusammenarbeit": 78,
      Commitment: 88,
      Konfliktstil: 29,
    },
    {
      Unternehmenslogik: 24,
      Entscheidungslogik: 69,
      Risikoorientierung: 41,
      "Arbeitsstruktur & Zusammenarbeit": 22,
      Commitment: 39,
      Konfliktstil: 77,
    }
  ),
};
