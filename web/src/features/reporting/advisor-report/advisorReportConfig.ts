import type {
  AdvisorDimensionKey,
  AdvisorInterventionType,
  AdvisorRiskLevel,
} from "@/features/reporting/advisor-report/advisorReportTypes";

export interface AdvisorClusterBonusRule {
  dimensions: [AdvisorDimensionKey, AdvisorDimensionKey];
  minRiskLevel: AdvisorRiskLevel;
  bonus: number;
}

export interface AdvisorReportConfig {
  distanceThresholds: {
    medium: number;
    high: number;
  };
  intensityThresholds: {
    low: number;
    medium: number;
  };
  distanceScores: {
    low: number;
    medium: number;
    high: number;
  };
  jointStateFallbackScores: {
    OPPOSITE: number;
    MID_HIGH: number;
    LOW_MID: number;
    BOTH_HIGH: number;
    BOTH_LOW: number;
    BOTH_MID: number;
  };
  absolutePositionScores: {
    bothExtreme: number;
    oneExtremeOneMid: number;
    alignedExtremeFallback: number;
    midBand: number;
  };
  riskLevelScores: Record<AdvisorRiskLevel, number>;
  blindSpotScore: number;
  dimensionWeights: Record<AdvisorDimensionKey, number>;
  clusterBonuses: AdvisorClusterBonusRule[];
  stabilityScores: {
    lowRisk: number;
    noBlindSpot: number;
    bothMid: number;
    alignedExtremeWithoutBlindSpot: number;
    complementaryDifference: number;
  };
  complementaryDimensions: AdvisorDimensionKey[];
  limits: {
    topTensions: number;
    stabilityFactors: number;
    observationPoints: number;
  };
  interventionByDimension: Record<AdvisorDimensionKey, AdvisorInterventionType>;
  tieBreakerOrder: AdvisorDimensionKey[];
}

export const DEFAULT_ADVISOR_REPORT_CONFIG: AdvisorReportConfig = {
  distanceThresholds: {
    medium: 20,
    high: 40,
  },
  intensityThresholds: {
    low: 20,
    medium: 40,
  },
  distanceScores: {
    low: 0,
    medium: 2,
    high: 4,
  },
  jointStateFallbackScores: {
    OPPOSITE: 6,
    MID_HIGH: 4,
    LOW_MID: 4,
    BOTH_HIGH: 2,
    BOTH_LOW: 2,
    BOTH_MID: 1,
  },
  absolutePositionScores: {
    bothExtreme: 2,
    oneExtremeOneMid: 1,
    alignedExtremeFallback: 2,
    midBand: 0,
  },
  riskLevelScores: {
    low: 1,
    medium: 3,
    high: 5,
  },
  blindSpotScore: 4,
  dimensionWeights: {
    Entscheidungslogik: 4,
    Unternehmenslogik: 4,
    Risikoorientierung: 3,
    Commitment: 3,
    Konfliktstil: 2,
    "Arbeitsstruktur & Zusammenarbeit": 2,
  },
  clusterBonuses: [
    {
      dimensions: ["Entscheidungslogik", "Unternehmenslogik"],
      minRiskLevel: "medium",
      bonus: 2,
    },
    {
      dimensions: ["Risikoorientierung", "Unternehmenslogik"],
      minRiskLevel: "medium",
      bonus: 2,
    },
    {
      dimensions: ["Commitment", "Arbeitsstruktur & Zusammenarbeit"],
      minRiskLevel: "medium",
      bonus: 2,
    },
    {
      dimensions: ["Konfliktstil", "Arbeitsstruktur & Zusammenarbeit"],
      minRiskLevel: "medium",
      bonus: 1,
    },
  ],
  stabilityScores: {
    lowRisk: 3,
    noBlindSpot: 2,
    bothMid: 2,
    alignedExtremeWithoutBlindSpot: 1,
    complementaryDifference: 2,
  },
  complementaryDimensions: [
    "Entscheidungslogik",
    "Risikoorientierung",
    "Arbeitsstruktur & Zusammenarbeit",
    "Konfliktstil",
  ],
  limits: {
    topTensions: 3,
    stabilityFactors: 3,
    observationPoints: 5,
  },
  interventionByDimension: {
    Unternehmenslogik: "prioritization_system",
    Risikoorientierung: "risk_guardrails",
    Entscheidungslogik: "decision_rules",
    Commitment: "roles_clarity",
    "Arbeitsstruktur & Zusammenarbeit": "collaboration_rules",
    Konfliktstil: "conflict_rules",
  },
  tieBreakerOrder: [
    "Entscheidungslogik",
    "Unternehmenslogik",
    "Risikoorientierung",
    "Commitment",
    "Konfliktstil",
    "Arbeitsstruktur & Zusammenarbeit",
  ],
};
