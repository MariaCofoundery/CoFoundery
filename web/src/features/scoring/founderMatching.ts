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

export type DimensionId = (typeof MATCH_DIMENSION_IDS)[number];

export type FounderMatchProfile = Partial<Record<DimensionId, number | null | undefined>>;

export type DimensionMatch = {
  dimensionId: DimensionId;
  scoreA: number;
  scoreB: number;
  distance: number;
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
};

type MatchClassification = {
  category: MatchCategory;
  riskLevel: RiskLevel;
};

type MatchMap = Record<DimensionId, DimensionMatch | undefined>;

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

function isValidScore(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
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

export function classifyBaseMatch(
  dimensionId: DimensionId,
  distance: number
): MatchClassification {
  switch (dimensionId) {
    case "company_logic":
      if (distance <= 15) return { category: "aligned", riskLevel: "low" };
      if (distance <= 30) return { category: "complementary", riskLevel: "medium" };
      return { category: "tension", riskLevel: "medium" };

    case "decision_logic":
      if (distance <= 18) return { category: "aligned", riskLevel: "low" };
      if (distance <= 38) return { category: "complementary", riskLevel: "medium" };
      return { category: "tension", riskLevel: "medium" };

    case "work_structure":
      if (distance <= 12) return { category: "aligned", riskLevel: "low" };
      if (distance <= 24) return { category: "tension", riskLevel: "medium" };
      return { category: "tension", riskLevel: "high" };

    case "commitment":
      if (distance <= 10) return { category: "aligned", riskLevel: "low" };
      if (distance <= 20) return { category: "tension", riskLevel: "medium" };
      return { category: "tension", riskLevel: "high" };

    case "risk_orientation":
      if (distance <= 18) return { category: "aligned", riskLevel: "low" };
      if (distance <= 35) return { category: "complementary", riskLevel: "medium" };
      if (distance <= 50) return { category: "tension", riskLevel: "medium" };
      return { category: "tension", riskLevel: "high" };

    case "conflict_style":
      if (distance <= 15) return { category: "aligned", riskLevel: "low" };
      if (distance <= 28) return { category: "tension", riskLevel: "medium" };
      return { category: "tension", riskLevel: "high" };
  }
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

  const distance = round(Math.abs(scoreA - scoreB));
  const baseCompatibility = round(100 - distance);
  const weight = MATCH_WEIGHTS[dimensionId];
  const weightedCompatibility = round(baseCompatibility * weight);
  const { category, riskLevel } = classifyBaseMatch(dimensionId, distance);

  return {
    dimensionId,
    scoreA: round(scoreA),
    scoreB: round(scoreB),
    distance,
    baseCompatibility,
    weight,
    weightedCompatibility,
    category,
    riskLevel,
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
    appendRule(workStructure, "RULE_B_WORK_STRUCTURE_CLASH");
  }

  const companyLogic = byId.company_logic;
  if (companyLogic && companyLogic.distance > 30) {
    if (commitment && commitment.distance <= 10) {
      companyLogic.category = "complementary";
      companyLogic.riskLevel = "medium";
      appendRule(companyLogic, "RULE_E_COMPANY_LOGIC_COMPLEMENTARY_TENSION");
    } else if (commitment && commitment.distance > 20) {
      companyLogic.category = "tension";
      companyLogic.riskLevel = "high";
      appendRule(companyLogic, "RULE_E_COMPANY_LOGIC_STRATEGIC_TENSION");
    } else {
      companyLogic.category = "tension";
      companyLogic.riskLevel = "medium";
      appendRule(companyLogic, "RULE_E_COMPANY_LOGIC_COMMITMENT_DEPENDENCY");
    }
  }

  const decisionLogic = byId.decision_logic;
  const conflictStyle = byId.conflict_style;
  if (
    decisionLogic &&
    conflictStyle &&
    decisionLogic.distance > 38 &&
    conflictStyle.distance > 28
  ) {
    decisionLogic.riskLevel = escalateRiskLevel(decisionLogic.riskLevel);
    conflictStyle.riskLevel = escalateRiskLevel(conflictStyle.riskLevel);
    appendRule(decisionLogic, "RULE_C_CONFLICT_DECISION_ESCALATION");
    appendRule(conflictStyle, "RULE_C_CONFLICT_DECISION_ESCALATION");
  }

  const riskOrientation = byId.risk_orientation;
  if (
    riskOrientation &&
    commitment &&
    riskOrientation.distance > 50 &&
    commitment.distance > 30
  ) {
    riskOrientation.category = "tension";
    riskOrientation.riskLevel = "high";
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

export function selectTopAlignments(dimensions: DimensionMatch[]): DimensionId[] {
  return [...dimensions]
    .filter(
      (entry) =>
        (entry.category === "aligned" || entry.category === "complementary") &&
        (entry.riskLevel === "low" || entry.riskLevel === "medium")
    )
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
    .filter((entry) => entry.riskLevel === "medium" || entry.riskLevel === "high")
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
  };
}
