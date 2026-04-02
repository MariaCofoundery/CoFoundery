import {
  compareFounderProfiles,
  type DimensionId as MatchDimensionId,
  type DimensionMatch,
  type MatchCategory,
  type MatchResult,
  type RiskLevel,
} from "@/features/scoring/founderMatching";
import { founderDisplayScoreToPercent } from "@/features/scoring/founderBaseNormalization";
import {
  FOUNDER_DIMENSION_ORDER,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { type ProfileResult, type RadarSeries } from "@/features/reporting/types";

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
  category: MatchCategory | null;
  riskLevel: RiskLevel | null;
  baseCompatibility: number | null;
  weight: number | null;
  weightedCompatibility: number | null;
  appliedRules?: string[];
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
  topAlignments: FounderDimensionKey[];
  topTensions: FounderDimensionKey[];
  rawMatchResult: MatchResult;
};

export type FounderMatchingCase = {
  a: FounderScores;
  b: FounderScores;
};

const GERMAN_TO_MATCH_ID: Record<FounderDimensionKey, MatchDimensionId> = {
  Unternehmenslogik: "company_logic",
  Entscheidungslogik: "decision_logic",
  Risikoorientierung: "risk_orientation",
  "Arbeitsstruktur & Zusammenarbeit": "work_structure",
  Commitment: "commitment",
  Konfliktstil: "conflict_style",
};

const MATCH_ID_TO_GERMAN: Record<MatchDimensionId, FounderDimensionKey> = {
  company_logic: "Unternehmenslogik",
  decision_logic: "Entscheidungslogik",
  risk_orientation: "Risikoorientierung",
  work_structure: "Arbeitsstruktur & Zusammenarbeit",
  commitment: "Commitment",
  conflict_style: "Konfliktstil",
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function toMatchProfile(scores: FounderScores) {
  return {
    company_logic: scores.Unternehmenslogik,
    decision_logic: scores.Entscheidungslogik,
    work_structure: scores["Arbeitsstruktur & Zusammenarbeit"],
    commitment: scores.Commitment,
    risk_orientation: scores.Risikoorientierung,
    conflict_style: scores.Konfliktstil,
  };
}

export function radarSeriesToFounderScores(scores: RadarSeries): FounderScores {
  return {
    Unternehmenslogik: founderDisplayScoreToPercent(scores.Vision),
    Entscheidungslogik: founderDisplayScoreToPercent(scores.Entscheidung),
    Risikoorientierung: founderDisplayScoreToPercent(scores.Risiko),
    "Arbeitsstruktur & Zusammenarbeit": founderDisplayScoreToPercent(scores.Autonomie),
    Commitment: founderDisplayScoreToPercent(scores.Verbindlichkeit),
    Konfliktstil: founderDisplayScoreToPercent(scores.Konflikt),
  };
}

function toGermanDimensionId(dimensionId: MatchDimensionId): FounderDimensionKey {
  return MATCH_ID_TO_GERMAN[dimensionId];
}

function toRelationType(match: DimensionMatch): RelationType {
  if (match.category === "aligned") return "similar";
  if (match.category === "complementary") return "moderate_difference";
  if (match.riskLevel === "high" || match.distance > 30) return "strong_difference";
  return "moderate_difference";
}

function toInteractionType(match: DimensionMatch): InteractionType {
  if (match.category === "aligned") return "alignment";
  if (match.category === "complementary") return "complement";
  if (match.riskLevel === "high") return "critical_tension";
  return "coordination";
}

function toTensionType(match: DimensionMatch): TensionType | null {
  if (match.category === "complementary") return "productive";
  if (match.category === "tension" && match.riskLevel === "high") return "critical";
  if (match.category === "tension" && match.riskLevel === "medium") return "coordination";
  return null;
}

function resolveExplanationKey(match: DimensionMatch): string {
  switch (match.dimensionId) {
    case "commitment":
      if (match.category === "aligned") return "commitment_aligned";
      if (match.riskLevel === "high") return "commitment_gap_critical";
      return "commitment_expectation_gap";

    case "work_structure":
      if (match.category === "aligned") return "work_mode_aligned";
      if (match.riskLevel === "high") return "work_mode_clash_critical";
      return "work_mode_needs_explicit_rules";

    case "company_logic":
      if (match.category === "aligned") return "directional_alignment";
      if (match.riskLevel === "high") return "directional_alignment_conflict";
      return "directional_tradeoff_coordination";

    case "decision_logic":
      if (match.category === "aligned") return "decision_style_alignment";
      if (match.category === "complementary") {
        return match.distance > 30
          ? "decision_style_strong_complement"
          : "decision_style_moderate_complement";
      }
      return "decision_style_process_tension";

    case "risk_orientation":
      if (match.category === "aligned") return "risk_alignment";
      if (match.category === "complementary") {
        return match.distance > 28
          ? "risk_productive_tension_strong"
          : "risk_productive_tension_moderate";
      }
      return "risk_threshold_tension";

    case "conflict_style":
      if (match.category === "aligned") return "conflict_style_alignment";
      if (match.riskLevel === "high") return "conflict_style_escalation_risk";
      return "conflict_style_coordination_gap";
  }
}

function adaptDimensionMatch(match: DimensionMatch): DimensionMatchResult {
  return {
    dimension: toGermanDimensionId(match.dimensionId),
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    difference: match.distance,
    relationType: toRelationType(match),
    interactionType: toInteractionType(match),
    explanationKey: resolveExplanationKey(match),
    category: match.category,
    riskLevel: match.riskLevel,
    baseCompatibility: match.baseCompatibility,
    weight: match.weight,
    weightedCompatibility: match.weightedCompatibility,
    appliedRules: match.appliedRules,
  };
}

function buildTensionMap(dimensions: DimensionMatchResult[]): TensionMapEntry[] {
  return dimensions.flatMap((dimension) => {
    if (dimension.category !== "tension" || !dimension.riskLevel || !dimension.explanationKey) {
      return [];
    }

    return [
      {
        dimension: dimension.dimension,
        tensionType: dimension.riskLevel === "high" ? "critical" : "coordination",
        explanationKey: dimension.explanationKey,
      },
    ];
  });
}

function orderDimensions(dimensions: DimensionMatchResult[]) {
  return [...dimensions].sort(
    (a, b) => FOUNDER_DIMENSION_ORDER.indexOf(a.dimension) - FOUNDER_DIMENSION_ORDER.indexOf(b.dimension)
  );
}

export function compareFounders(a: FounderScores, b: FounderScores): CompareFoundersResult {
  const rawMatchResult = compareFounderProfiles(toMatchProfile(a), toMatchProfile(b));
  const dimensions = orderDimensions(rawMatchResult.dimensions.map(adaptDimensionMatch));
  const topAlignments = rawMatchResult.topAlignments.map(toGermanDimensionId);
  const topTensions = rawMatchResult.topTensions.map(toGermanDimensionId);
  const overallScore = round(rawMatchResult.overallScore);

  return {
    dimensions,
    overallMatchScore: overallScore,
    alignmentScore: overallScore,
    workingCompatibilityScore: overallScore,
    tensionMap: buildTensionMap(dimensions),
    topAlignments,
    topTensions,
    rawMatchResult,
  };
}

export function compareProfileResults(
  profileA: Pick<ProfileResult, "dimensionScores">,
  profileB: Pick<ProfileResult, "dimensionScores">
): CompareFoundersResult {
  return compareFounders(
    radarSeriesToFounderScores(profileA.dimensionScores),
    radarSeriesToFounderScores(profileB.dimensionScores)
  );
}

export const FOUNDER_MATCHING_TEST_CASES: Record<
  | "complementary_builders"
  | "misaligned_pressure_pair"
  | "balanced_but_manageable_pair"
  | "highly_similar_but_blind_spot_pair",
  FounderMatchingCase
> = {
  complementary_builders: {
    a: {
      Unternehmenslogik: 68,
      Entscheidungslogik: 34,
      Risikoorientierung: 64,
      "Arbeitsstruktur & Zusammenarbeit": 72,
      Commitment: 81,
      Konfliktstil: 38,
    },
    b: {
      Unternehmenslogik: 62,
      Entscheidungslogik: 67,
      Risikoorientierung: 43,
      "Arbeitsstruktur & Zusammenarbeit": 58,
      Commitment: 76,
      Konfliktstil: 61,
    },
  },
  misaligned_pressure_pair: {
    a: {
      Unternehmenslogik: 82,
      Entscheidungslogik: 36,
      Risikoorientierung: 71,
      "Arbeitsstruktur & Zusammenarbeit": 78,
      Commitment: 88,
      Konfliktstil: 29,
    },
    b: {
      Unternehmenslogik: 24,
      Entscheidungslogik: 69,
      Risikoorientierung: 41,
      "Arbeitsstruktur & Zusammenarbeit": 22,
      Commitment: 39,
      Konfliktstil: 77,
    },
  },
  balanced_but_manageable_pair: {
    a: {
      Unternehmenslogik: 54,
      Entscheidungslogik: 48,
      Risikoorientierung: 56,
      "Arbeitsstruktur & Zusammenarbeit": 45,
      Commitment: 58,
      Konfliktstil: 41,
    },
    b: {
      Unternehmenslogik: 63,
      Entscheidungslogik: 60,
      Risikoorientierung: 43,
      "Arbeitsstruktur & Zusammenarbeit": 63,
      Commitment: 65,
      Konfliktstil: 60,
    },
  },
  highly_similar_but_blind_spot_pair: {
    a: {
      Unternehmenslogik: 76,
      Entscheidungslogik: 68,
      Risikoorientierung: 74,
      "Arbeitsstruktur & Zusammenarbeit": 71,
      Commitment: 84,
      Konfliktstil: 72,
    },
    b: {
      Unternehmenslogik: 81,
      Entscheidungslogik: 63,
      Risikoorientierung: 69,
      "Arbeitsstruktur & Zusammenarbeit": 76,
      Commitment: 79,
      Konfliktstil: 67,
    },
  },
};

export const FOUNDER_MATCHING_ENGINE_EXAMPLES = {
  complementary_builders: compareFounders(
    FOUNDER_MATCHING_TEST_CASES.complementary_builders.a,
    FOUNDER_MATCHING_TEST_CASES.complementary_builders.b
  ),
  misaligned_pressure_pair: compareFounders(
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
  ),
  balanced_but_manageable_pair: compareFounders(
    FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.a,
    FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.b
  ),
  highly_similar_but_blind_spot_pair: compareFounders(
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
  ),
};
