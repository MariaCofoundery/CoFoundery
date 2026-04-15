export const MATCH_DIMENSION_IDS = [
  "company_logic",
  "decision_logic",
  "work_structure",
  "commitment",
  "risk_orientation",
  "conflict_style",
] as const;

export type MatchCategory = "aligned" | "complementary" | "tension";
export type RiskLevel = "low" | "medium" | "high";
export type PositionBand = "LOW" | "MID" | "HIGH";
export type JointState =
  | "BOTH_LOW"
  | "BOTH_MID"
  | "BOTH_HIGH"
  | "LOW_MID"
  | "MID_HIGH"
  | "OPPOSITE";
export type ExtremeFlag = "EXTREME_HIGH" | "EXTREME_LOW";

export type DimensionId = (typeof MATCH_DIMENSION_IDS)[number];

export type FounderMatchProfile = Partial<Record<DimensionId, number | null | undefined>>;

export type DimensionMatch = {
  dimensionId: DimensionId;
  scoreA: number;
  scoreB: number;
  distance: number;
  positionA: PositionBand;
  positionB: PositionBand;
  jointState: JointState;
  extremeFlagsA: ExtremeFlag[];
  extremeFlagsB: ExtremeFlag[];
  hasSharedExtremeHigh: boolean;
  hasSharedExtremeLow: boolean;
  hasSharedBlindSpotRisk: boolean;
  baseCompatibility: number;
  weight: number;
  weightedCompatibility: number;
  category: MatchCategory;
  riskLevel: RiskLevel;
  appliedRules?: string[];
};

export type MatchResult = {
  dimensions: DimensionMatch[];
  topAlignments: DimensionId[];
  topTensions: DimensionId[];
  overallScore: number;
  alignmentScore: number;
  workingCompatibilityScore: number;
};

type MatchClassification = {
  category: MatchCategory;
  riskLevel: RiskLevel;
  baseCompatibility: number;
};

type MatchMap = Record<DimensionId, DimensionMatch | undefined>;

const ALIGNMENT_DIMENSIONS: readonly DimensionId[] = [
  "company_logic",
  "decision_logic",
  "risk_orientation",
] as const;

const WORKING_DIMENSIONS: readonly DimensionId[] = [
  "work_structure",
  "commitment",
  "conflict_style",
] as const;

export const MATCH_WEIGHTS: Record<DimensionId, number> = {
  commitment: 1.5,
  work_structure: 1.4,
  conflict_style: 1.3,
  company_logic: 1.2,
  decision_logic: 1.0,
  risk_orientation: 0.9,
};

const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isValidScore(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isAlignmentDimension(dimensionId: DimensionId) {
  return ALIGNMENT_DIMENSIONS.includes(dimensionId);
}

function isWorkingDimension(dimensionId: DimensionId) {
  return WORKING_DIMENSIONS.includes(dimensionId);
}

function appendRule(match: DimensionMatch, ruleId: string) {
  const existing = match.appliedRules ?? [];
  if (existing.includes(ruleId)) {
    match.appliedRules = existing;
    return;
  }

  match.appliedRules = [...existing, ruleId];
}

export function escalateRiskLevel(riskLevel: RiskLevel): RiskLevel {
  if (riskLevel === "low") return "medium";
  if (riskLevel === "medium") return "high";
  return "high";
}

export function getPositionBand(score: number): PositionBand {
  if (score <= 33) return "LOW";
  if (score <= 66) return "MID";
  return "HIGH";
}

export function getExtremeFlags(score: number): ExtremeFlag[] {
  const flags: ExtremeFlag[] = [];
  if (score > 85) flags.push("EXTREME_HIGH");
  if (score < 15) flags.push("EXTREME_LOW");
  return flags;
}

export function getJointState(positionA: PositionBand, positionB: PositionBand): JointState {
  if (positionA === "LOW" && positionB === "LOW") return "BOTH_LOW";
  if (positionA === "MID" && positionB === "MID") return "BOTH_MID";
  if (positionA === "HIGH" && positionB === "HIGH") return "BOTH_HIGH";

  const pair = [positionA, positionB].sort().join("_");
  if (pair === "HIGH_LOW") return "OPPOSITE";
  if (pair === "LOW_MID") return "LOW_MID";
  return "MID_HIGH";
}

function buildStateCompatibility(
  dimensionId: DimensionId,
  jointState: JointState,
  distance: number,
  hasSharedExtremeHigh: boolean,
  hasSharedExtremeLow: boolean
): MatchClassification {
  const alignmentDimension = isAlignmentDimension(dimensionId);

  let classification: MatchClassification;

  switch (jointState) {
    case "BOTH_MID":
      classification = {
        category: "aligned",
        riskLevel: "low",
        baseCompatibility: alignmentDimension ? 84 : 86,
      };
      break;

    case "BOTH_HIGH":
      classification = {
        category: "aligned",
        riskLevel: "medium",
        baseCompatibility: alignmentDimension ? 74 : 70,
      };
      break;

    case "BOTH_LOW":
      classification = {
        category: "aligned",
        riskLevel: "medium",
        baseCompatibility: alignmentDimension ? 72 : 68,
      };
      break;

    case "LOW_MID":
    case "MID_HIGH":
      classification = alignmentDimension
        ? {
            category: "complementary",
            riskLevel: "medium",
            baseCompatibility: 66,
          }
        : {
            category: "tension",
            riskLevel: "medium",
            baseCompatibility: 50,
          };
      break;

    case "OPPOSITE":
      classification = {
        category: "tension",
        riskLevel:
          dimensionId === "company_logic" ||
          dimensionId === "commitment" ||
          dimensionId === "work_structure" ||
          dimensionId === "conflict_style"
            ? "high"
            : "medium",
        baseCompatibility:
          dimensionId === "company_logic" || dimensionId === "commitment" ? 18 : 24,
      };
      break;
  }

  const sameStateDistanceAdjustment =
    jointState === "BOTH_LOW" || jointState === "BOTH_MID" || jointState === "BOTH_HIGH"
      ? clamp(8 - distance * 0.22, 1, 8)
      : 0;
  const adjacentDistanceAdjustment =
    jointState === "LOW_MID" || jointState === "MID_HIGH"
      ? clamp(6 - Math.max(0, distance - 12) * 0.18, -3, 6)
      : 0;
  const oppositeDistancePenalty =
    jointState === "OPPOSITE" ? clamp((distance - 34) * 0.28, 0, 18) : 0;
  const sharedExtremePenalty =
    (hasSharedExtremeHigh ? 8 : 0) + (hasSharedExtremeLow ? 8 : 0);

  return {
    ...classification,
    baseCompatibility: round(
      clamp(
        classification.baseCompatibility +
          sameStateDistanceAdjustment +
          adjacentDistanceAdjustment -
          oppositeDistancePenalty -
          sharedExtremePenalty,
        0,
        100
      )
    ),
  };
}

export function classifyBaseMatch(
  dimensionId: DimensionId,
  scoreA: number,
  scoreB: number
): MatchClassification & {
  distance: number;
  positionA: PositionBand;
  positionB: PositionBand;
  jointState: JointState;
  extremeFlagsA: ExtremeFlag[];
  extremeFlagsB: ExtremeFlag[];
  hasSharedExtremeHigh: boolean;
  hasSharedExtremeLow: boolean;
  hasSharedBlindSpotRisk: boolean;
} {
  const distance = round(Math.abs(scoreA - scoreB));
  const positionA = getPositionBand(scoreA);
  const positionB = getPositionBand(scoreB);
  const jointState = getJointState(positionA, positionB);
  const extremeFlagsA = getExtremeFlags(scoreA);
  const extremeFlagsB = getExtremeFlags(scoreB);
  const hasSharedExtremeHigh =
    extremeFlagsA.includes("EXTREME_HIGH") && extremeFlagsB.includes("EXTREME_HIGH");
  const hasSharedExtremeLow =
    extremeFlagsA.includes("EXTREME_LOW") && extremeFlagsB.includes("EXTREME_LOW");
  const hasSharedBlindSpotRisk =
    jointState !== "BOTH_MID" &&
    jointState !== "OPPOSITE" &&
    (jointState === "BOTH_HIGH" ||
      jointState === "BOTH_LOW" ||
      hasSharedExtremeHigh ||
      hasSharedExtremeLow);

  return {
    distance,
    positionA,
    positionB,
    jointState,
    extremeFlagsA,
    extremeFlagsB,
    hasSharedExtremeHigh,
    hasSharedExtremeLow,
    hasSharedBlindSpotRisk,
    ...buildStateCompatibility(
      dimensionId,
      jointState,
      distance,
      hasSharedExtremeHigh,
      hasSharedExtremeLow
    ),
  };
}

function buildDimensionMatch(
  dimensionId: DimensionId,
  profileA: FounderMatchProfile,
  profileB: FounderMatchProfile
): DimensionMatch | null {
  const scoreA = profileA[dimensionId];
  const scoreB = profileB[dimensionId];

  if (!isValidScore(scoreA) || !isValidScore(scoreB)) {
    return null;
  }

  const baseMatch = classifyBaseMatch(dimensionId, scoreA, scoreB);
  const weight = MATCH_WEIGHTS[dimensionId];
  const weightedCompatibility = round(baseMatch.baseCompatibility * weight);

  return {
    dimensionId,
    scoreA: round(scoreA),
    scoreB: round(scoreB),
    distance: baseMatch.distance,
    positionA: baseMatch.positionA,
    positionB: baseMatch.positionB,
    jointState: baseMatch.jointState,
    extremeFlagsA: baseMatch.extremeFlagsA,
    extremeFlagsB: baseMatch.extremeFlagsB,
    hasSharedExtremeHigh: baseMatch.hasSharedExtremeHigh,
    hasSharedExtremeLow: baseMatch.hasSharedExtremeLow,
    hasSharedBlindSpotRisk: baseMatch.hasSharedBlindSpotRisk,
    baseCompatibility: baseMatch.baseCompatibility,
    weight,
    weightedCompatibility,
    category: baseMatch.category,
    riskLevel: baseMatch.riskLevel,
  };
}

function toMatchMap(dimensions: DimensionMatch[]): MatchMap {
  return Object.fromEntries(
    MATCH_DIMENSION_IDS.map((dimensionId) => [
      dimensionId,
      dimensions.find((entry) => entry.dimensionId === dimensionId),
    ])
  ) as MatchMap;
}

export function applyInteractionRules(dimensions: DimensionMatch[]): DimensionMatch[] {
  const next = dimensions.map((entry) => ({
    ...entry,
    appliedRules: entry.appliedRules ? [...entry.appliedRules] : undefined,
  }));

  const byId = toMatchMap(next);

  const commitment = byId.commitment;
  if (
    commitment &&
    ((commitment.scoreA < 30 && commitment.scoreB > 70) ||
      (commitment.scoreB < 30 && commitment.scoreA > 70))
  ) {
    commitment.category = "tension";
    commitment.riskLevel = "high";
    commitment.baseCompatibility = Math.min(commitment.baseCompatibility, 18);
    commitment.weightedCompatibility = round(commitment.baseCompatibility * commitment.weight);
    appendRule(commitment, "RULE_A_COMMITMENT_HARD_PENALTY");
  }

  const workStructure = byId.work_structure;
  if (
    workStructure &&
    ((workStructure.scoreA < 25 && workStructure.scoreB > 75) ||
      (workStructure.scoreB < 25 && workStructure.scoreA > 75))
  ) {
    workStructure.category = "tension";
    workStructure.riskLevel = "high";
    workStructure.baseCompatibility = Math.min(workStructure.baseCompatibility, 20);
    workStructure.weightedCompatibility = round(
      workStructure.baseCompatibility * workStructure.weight
    );
    appendRule(workStructure, "RULE_B_WORK_STRUCTURE_CLASH");
  }

  const companyLogic = byId.company_logic;
  if (companyLogic && companyLogic.distance > 30) {
    if (commitment && commitment.distance <= 10) {
      companyLogic.category = "complementary";
      companyLogic.riskLevel = "medium";
      companyLogic.baseCompatibility = Math.max(companyLogic.baseCompatibility, 48);
      companyLogic.weightedCompatibility = round(
        companyLogic.baseCompatibility * companyLogic.weight
      );
      appendRule(companyLogic, "RULE_E_COMPANY_LOGIC_COMPLEMENTARY_TENSION");
    } else if (commitment && commitment.distance > 20) {
      companyLogic.category = "tension";
      companyLogic.riskLevel = "high";
      companyLogic.baseCompatibility = Math.min(companyLogic.baseCompatibility, 14);
      companyLogic.weightedCompatibility = round(
        companyLogic.baseCompatibility * companyLogic.weight
      );
      appendRule(companyLogic, "RULE_E_COMPANY_LOGIC_STRATEGIC_TENSION");
    } else {
      companyLogic.category = "tension";
      companyLogic.riskLevel = "medium";
      companyLogic.baseCompatibility = Math.min(companyLogic.baseCompatibility, 28);
      companyLogic.weightedCompatibility = round(
        companyLogic.baseCompatibility * companyLogic.weight
      );
      appendRule(companyLogic, "RULE_E_COMPANY_LOGIC_COMMITMENT_DEPENDENCY");
    }
  }

  const decisionLogic = byId.decision_logic;
  const conflictStyle = byId.conflict_style;
  if (
    decisionLogic &&
    conflictStyle &&
    decisionLogic.distance > 28 &&
    conflictStyle.distance > 28
  ) {
    decisionLogic.riskLevel = escalateRiskLevel(decisionLogic.riskLevel);
    conflictStyle.riskLevel = escalateRiskLevel(conflictStyle.riskLevel);
    decisionLogic.baseCompatibility = Math.min(decisionLogic.baseCompatibility, 24);
    conflictStyle.baseCompatibility = Math.min(conflictStyle.baseCompatibility, 28);
    decisionLogic.weightedCompatibility = round(
      decisionLogic.baseCompatibility * decisionLogic.weight
    );
    conflictStyle.weightedCompatibility = round(
      conflictStyle.baseCompatibility * conflictStyle.weight
    );
    appendRule(decisionLogic, "RULE_C_CONFLICT_DECISION_ESCALATION");
    appendRule(conflictStyle, "RULE_C_CONFLICT_DECISION_ESCALATION");
  }

  const riskOrientation = byId.risk_orientation;
  if (
    riskOrientation &&
    commitment &&
    riskOrientation.jointState === "OPPOSITE" &&
    commitment.category === "tension"
  ) {
    riskOrientation.category = "tension";
    riskOrientation.riskLevel = "high";
    riskOrientation.baseCompatibility = Math.min(riskOrientation.baseCompatibility, 18);
    riskOrientation.weightedCompatibility = round(
      riskOrientation.baseCompatibility * riskOrientation.weight
    );
    appendRule(riskOrientation, "RULE_D_RISK_COMMITMENT_ESCALATION");
  }

  return next;
}

export function computeOverallScore(dimensions: DimensionMatch[]) {
  if (dimensions.length === 0) return 0;

  const weightedSum = dimensions.reduce(
    (sum, entry) => sum + entry.baseCompatibility * entry.weight,
    0
  );
  const weightTotal = dimensions.reduce((sum, entry) => sum + entry.weight, 0);

  if (weightTotal === 0) return 0;
  return round(weightedSum / weightTotal);
}

function computeScoreForDimensions(
  dimensions: DimensionMatch[],
  targetDimensions: readonly DimensionId[]
) {
  const relevant = dimensions.filter((entry) => targetDimensions.includes(entry.dimensionId));
  return computeOverallScore(relevant);
}

export function selectTopAlignments(dimensions: DimensionMatch[]): DimensionId[] {
  return [...dimensions]
    .filter((entry) => {
      if (entry.category === "aligned" && entry.riskLevel === "low") return true;
      if (entry.category === "complementary" && entry.riskLevel !== "high") return true;
      return false;
    })
    .sort((a, b) => {
      if (b.weightedCompatibility !== a.weightedCompatibility) {
        return b.weightedCompatibility - a.weightedCompatibility;
      }

      return MATCH_DIMENSION_IDS.indexOf(a.dimensionId) - MATCH_DIMENSION_IDS.indexOf(b.dimensionId);
    })
    .slice(0, 3)
    .map((entry) => entry.dimensionId);
}

export function selectTopTensions(dimensions: DimensionMatch[]): DimensionId[] {
  return [...dimensions]
    .filter(
      (entry) =>
        entry.category === "tension" ||
        (entry.category === "complementary" &&
          (entry.riskLevel === "medium" || entry.riskLevel === "high"))
    )
    .sort((a, b) => {
      const riskDelta = RISK_LEVEL_ORDER[b.riskLevel] - RISK_LEVEL_ORDER[a.riskLevel];
      if (riskDelta !== 0) return riskDelta;

      const weightedDistanceA = round(a.distance * a.weight);
      const weightedDistanceB = round(b.distance * b.weight);
      if (weightedDistanceB !== weightedDistanceA) {
        return weightedDistanceB - weightedDistanceA;
      }

      return MATCH_DIMENSION_IDS.indexOf(a.dimensionId) - MATCH_DIMENSION_IDS.indexOf(b.dimensionId);
    })
    .slice(0, 3)
    .map((entry) => entry.dimensionId);
}

export function compareFounderProfiles(
  profileA: FounderMatchProfile,
  profileB: FounderMatchProfile
): MatchResult {
  const baseDimensions = MATCH_DIMENSION_IDS.map((dimensionId) =>
    buildDimensionMatch(dimensionId, profileA, profileB)
  ).filter((entry): entry is DimensionMatch => entry != null);

  const dimensions = applyInteractionRules(baseDimensions);

  return {
    dimensions,
    topAlignments: selectTopAlignments(dimensions),
    topTensions: selectTopTensions(dimensions),
    overallScore: computeOverallScore(dimensions),
    alignmentScore: computeScoreForDimensions(dimensions, ALIGNMENT_DIMENSIONS),
    workingCompatibilityScore: computeScoreForDimensions(dimensions, WORKING_DIMENSIONS),
  };
}
