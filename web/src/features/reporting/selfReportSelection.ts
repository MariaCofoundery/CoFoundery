import { FOUNDER_DIMENSION_ORDER, type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import { getSelfDimensionTendency, getSelfOrientationStrength } from "@/features/reporting/selfReportScoring";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

export type SelfReportTendencyKey = "left" | "center" | "right";
export type SelfReportDimensionFamily =
  | "direction"
  | "decision_under_uncertainty"
  | "collaboration_under_pressure";
export type SelfReportStrengthBand = "clear" | "moderate" | "balanced";
export type SelfReportComplementRoleKind = "counterweight" | "regulator" | "rhythm_partner";

export type SelfReportSignal = {
  dimension: FounderDimensionKey;
  score: number;
  orientationStrength: number;
  tendencyKey: SelfReportTendencyKey;
  tendencyLabel: string;
  family: SelfReportDimensionFamily;
  strengthBand: SelfReportStrengthBand;
  isClear: boolean;
  isModerate: boolean;
  isBalanced: boolean;
  socialImpactWeight: number;
  coordinationRiskWeight: number;
  poleFrictionScore: number;
  openTensionScore: number;
  frictionScore: number;
  duplicationGroup: string;
  frictionReason:
    | "clear_pole"
    | "moderate_pole_dominant"
    | "moderate_coordination_risk"
    | "open_coordination_field";
};

export type SelfReportHeroSignals = {
  primarySignal: SelfReportSignal | null;
  workModeSignal: SelfReportSignal | null;
  tensionCarrier: SelfReportSignal | null;
  balancedProfile: boolean;
};

export type SelfReportComplementRole = {
  role: SelfReportComplementRoleKind;
  signal: SelfReportSignal;
};

export type SelfReportSelection = {
  hero: SelfReportHeroSignals;
  patternDimensions: SelfReportSignal[];
  challengeDimensions: SelfReportSignal[];
  complementRoles: SelfReportComplementRole[];
  conversationHintDimensions: SelfReportSignal[];
  balancedProfile: boolean;
};

export type SelfReportSelectionDebugExpectation = {
  primarySignal: FounderDimensionKey | null;
  workModeSignal: FounderDimensionKey | null;
  tensionCarrier: FounderDimensionKey | null;
  patternDimensions: FounderDimensionKey[];
};

export type SelfReportSelectionDebugCase = {
  name: string;
  scores: SelfAlignmentReport["scoresA"];
  expected: SelfReportSelectionDebugExpectation;
};

export type SelfReportSelectionDebugResult = {
  name: string;
  scores: SelfAlignmentReport["scoresA"];
  expected: SelfReportSelectionDebugExpectation;
  actual: SelfReportSelectionDebugExpectation;
  passed: boolean;
};

export type SelfReportSelectionSensitivityCase = {
  name: string;
  baseScores: SelfAlignmentReport["scoresA"];
  variants: Array<{
    label: string;
    scores: SelfAlignmentReport["scoresA"];
  }>;
};

export type SelfReportSelectionSensitivityResult = {
  name: string;
  base: {
    scores: SelfAlignmentReport["scoresA"];
    selection: SelfReportSelectionDebugExpectation;
  };
  variants: Array<{
    label: string;
    scores: SelfAlignmentReport["scoresA"];
    selection: SelfReportSelectionDebugExpectation;
    changesComparedToBase: {
      primarySignalChanged: boolean;
      workModeSignalChanged: boolean;
      tensionCarrierChanged: boolean;
      patternDimensionsChanged: boolean;
    };
  }>;
};

const FAMILY_ORDER: SelfReportDimensionFamily[] = [
  "direction",
  "decision_under_uncertainty",
  "collaboration_under_pressure",
];

const DIMENSION_FAMILY: Record<FounderDimensionKey, SelfReportDimensionFamily> = {
  Unternehmenslogik: "direction",
  Commitment: "direction",
  Entscheidungslogik: "decision_under_uncertainty",
  Risikoorientierung: "decision_under_uncertainty",
  "Arbeitsstruktur & Zusammenarbeit": "collaboration_under_pressure",
  Konfliktstil: "collaboration_under_pressure",
};

const HERO_PRIORITY: Record<FounderDimensionKey, number> = {
  Unternehmenslogik: 3,
  Entscheidungslogik: 3,
  Commitment: 3,
  "Arbeitsstruktur & Zusammenarbeit": 2,
  Konfliktstil: 2,
  Risikoorientierung: 2,
};

const SOCIAL_IMPACT_WEIGHT: Record<FounderDimensionKey, number> = {
  Unternehmenslogik: 2,
  Entscheidungslogik: 2,
  Risikoorientierung: 2,
  "Arbeitsstruktur & Zusammenarbeit": 3,
  Commitment: 3,
  Konfliktstil: 3,
};

const COORDINATION_RISK_WEIGHT: Record<FounderDimensionKey, number> = {
  Unternehmenslogik: 2,
  Entscheidungslogik: 2,
  Risikoorientierung: 1,
  "Arbeitsstruktur & Zusammenarbeit": 3,
  Commitment: 3,
  Konfliktstil: 3,
};

const STRENGTH_BAND_PRIORITY: Record<SelfReportStrengthBand, number> = {
  clear: 3,
  moderate: 2,
  balanced: 1,
};

const SEMANTIC_DUPLICATION_GROUP: Record<FounderDimensionKey, string> = {
  Unternehmenslogik: "direction_drive",
  Commitment: "direction_drive",
  Entscheidungslogik: "uncertainty_control",
  Risikoorientierung: "uncertainty_control",
  "Arbeitsstruktur & Zusammenarbeit": "pressure_coupling",
  Konfliktstil: "pressure_coupling",
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function getStrengthBand(orientationStrength: number): SelfReportStrengthBand {
  if (orientationStrength >= 10) return "clear";
  if (orientationStrength >= 6) return "moderate";
  return "balanced";
}

function scoreSignalPriority(signal: SelfReportSignal) {
  return (
    STRENGTH_BAND_PRIORITY[signal.strengthBand] * 100 +
    HERO_PRIORITY[signal.dimension] * 10 +
    signal.orientationStrength
  );
}

function compareSignals(left: SelfReportSignal, right: SelfReportSignal) {
  const strengthDiff = right.orientationStrength - left.orientationStrength;
  if (strengthDiff !== 0) return strengthDiff;
  const bandDiff = STRENGTH_BAND_PRIORITY[right.strengthBand] - STRENGTH_BAND_PRIORITY[left.strengthBand];
  if (bandDiff !== 0) return bandDiff;
  const frictionDiff = right.frictionScore - left.frictionScore;
  if (frictionDiff !== 0) return frictionDiff;
  return HERO_PRIORITY[right.dimension] - HERO_PRIORITY[left.dimension];
}

function sortBySignalPriority(signals: SelfReportSignal[]) {
  return [...signals].sort((left, right) => {
    const priorityDiff = scoreSignalPriority(right) - scoreSignalPriority(left);
    if (priorityDiff !== 0) return priorityDiff;
    return compareSignals(left, right);
  });
}

function sortByFriction(signals: SelfReportSignal[]) {
  return [...signals].sort((left, right) => {
    const frictionDiff = right.frictionScore - left.frictionScore;
    if (frictionDiff !== 0) return frictionDiff;
    const openDiff = right.openTensionScore - left.openTensionScore;
    if (openDiff !== 0) return openDiff;
    return right.orientationStrength - left.orientationStrength;
  });
}

function sortByOpenTension(signals: SelfReportSignal[]) {
  return [...signals].sort((left, right) => {
    const openDiff = right.openTensionScore - left.openTensionScore;
    if (openDiff !== 0) return openDiff;
    return left.orientationStrength - right.orientationStrength;
  });
}

function sharesDuplicationGroup(a: SelfReportSignal, b: SelfReportSignal) {
  return a.duplicationGroup === b.duplicationGroup;
}

function collapseDuplicationGroups(signals: SelfReportSignal[]) {
  const grouped = new Map<string, SelfReportSignal>();

  for (const signal of signals) {
    const existing = grouped.get(signal.duplicationGroup);
    if (!existing || compareSignals(existing, signal) > 0) {
      grouped.set(signal.duplicationGroup, signal);
    }
  }

  return [...grouped.values()];
}

function isRedundantAgainstSelected(
  candidate: SelfReportSignal,
  selected: SelfReportSignal[]
) {
  return selected.some(
    (entry) =>
      entry.dimension === candidate.dimension ||
      sharesDuplicationGroup(entry, candidate)
  );
}

function pickFirstNonRedundant(
  candidates: SelfReportSignal[],
  selected: SelfReportSignal[],
  options?: {
    requireDifferentFamilyFrom?: SelfReportSignal | null;
    excludeDimensions?: FounderDimensionKey[];
  }
) {
  const requiredFamily = options?.requireDifferentFamilyFrom?.family ?? null;
  const excludedDimensions = new Set(options?.excludeDimensions ?? []);
  return (
    candidates.find((entry) => {
      if (requiredFamily && entry.family === requiredFamily) return false;
      if (excludedDimensions.has(entry.dimension)) return false;
      return !isRedundantAgainstSelected(entry, selected);
    }) ?? null
  );
}

function deriveFriction(
  orientationStrength: number,
  strengthBand: SelfReportStrengthBand,
  socialImpactWeight: number,
  coordinationRiskWeight: number
) {
  if (strengthBand === "clear") {
    const poleFrictionScore = round(orientationStrength * socialImpactWeight);
    return {
      poleFrictionScore,
      openTensionScore: round(coordinationRiskWeight),
      frictionScore: poleFrictionScore,
      frictionReason: "clear_pole" as const,
    };
  }

  if (strengthBand === "moderate") {
    const poleFrictionScore = round(orientationStrength * socialImpactWeight);
    const openTensionScore = round((10 - orientationStrength) * coordinationRiskWeight);
    if (coordinationRiskWeight >= socialImpactWeight && orientationStrength < 8) {
      return {
        poleFrictionScore,
        openTensionScore,
        frictionScore: openTensionScore,
        frictionReason: "moderate_coordination_risk" as const,
      };
    }

    return {
      poleFrictionScore,
      openTensionScore,
      frictionScore: poleFrictionScore,
      frictionReason: "moderate_pole_dominant" as const,
    };
  }

  const openTensionScore = round(coordinationRiskWeight * 10);
  return {
    poleFrictionScore: round(orientationStrength * socialImpactWeight),
    openTensionScore,
    frictionScore: openTensionScore,
    frictionReason: "open_coordination_field" as const,
  };
}

function getFrictionComputation(signal: SelfReportSignal) {
  if (signal.frictionReason === "clear_pole") {
    return {
      rule: "clear_pole",
      formula: "orientationStrength * socialImpactWeight",
      inputs: {
        orientationStrength: signal.orientationStrength,
        socialImpactWeight: signal.socialImpactWeight,
        coordinationRiskWeight: signal.coordinationRiskWeight,
      },
      result: signal.frictionScore,
    };
  }

  if (signal.frictionReason === "moderate_coordination_risk") {
    return {
      rule: "moderate_coordination_risk",
      formula: "(10 - orientationStrength) * coordinationRiskWeight",
      inputs: {
        orientationStrength: signal.orientationStrength,
        socialImpactWeight: signal.socialImpactWeight,
        coordinationRiskWeight: signal.coordinationRiskWeight,
        coordinationDominates: signal.coordinationRiskWeight >= signal.socialImpactWeight,
        orientationBelowEight: signal.orientationStrength < 8,
      },
      result: signal.frictionScore,
    };
  }

  if (signal.frictionReason === "moderate_pole_dominant") {
    return {
      rule: "moderate_pole_dominant",
      formula: "orientationStrength * socialImpactWeight",
      inputs: {
        orientationStrength: signal.orientationStrength,
        socialImpactWeight: signal.socialImpactWeight,
        coordinationRiskWeight: signal.coordinationRiskWeight,
        coordinationDominates: signal.coordinationRiskWeight >= signal.socialImpactWeight,
        orientationBelowEight: signal.orientationStrength < 8,
      },
      result: signal.frictionScore,
    };
  }

  return {
    rule: "open_coordination_field",
    formula: "coordinationRiskWeight * 10",
    inputs: {
      orientationStrength: signal.orientationStrength,
      socialImpactWeight: signal.socialImpactWeight,
      coordinationRiskWeight: signal.coordinationRiskWeight,
    },
    result: signal.frictionScore,
  };
}

function summarizeSelection(selection: SelfReportSelection): SelfReportSelectionDebugExpectation {
  return {
    primarySignal: selection.hero.primarySignal?.dimension ?? null,
    workModeSignal: selection.hero.workModeSignal?.dimension ?? null,
    tensionCarrier: selection.hero.tensionCarrier?.dimension ?? null,
    patternDimensions: selection.patternDimensions.map((entry) => entry.dimension),
  };
}

export function buildSelfReportSignals(scores: SelfAlignmentReport["scoresA"]) {
  return FOUNDER_DIMENSION_ORDER.map((dimension) => {
    const score = scores[dimension];
    const tendency = getSelfDimensionTendency(dimension, score);
    if (score == null || tendency == null) return null;

    const orientationStrength = getSelfOrientationStrength(score) ?? 0;
    const strengthBand = getStrengthBand(orientationStrength);
    const family = DIMENSION_FAMILY[dimension];
    const socialImpactWeight = SOCIAL_IMPACT_WEIGHT[dimension];
    const coordinationRiskWeight = COORDINATION_RISK_WEIGHT[dimension];
    const friction = deriveFriction(
      orientationStrength,
      strengthBand,
      socialImpactWeight,
      coordinationRiskWeight
    );

    return {
      dimension,
      score,
      orientationStrength,
      tendencyKey: tendency.tendency,
      tendencyLabel: tendency.label,
      family,
      strengthBand,
      isClear: strengthBand === "clear",
      isModerate: strengthBand === "moderate",
      isBalanced: strengthBand === "balanced",
      socialImpactWeight,
      coordinationRiskWeight,
      poleFrictionScore: friction.poleFrictionScore,
      openTensionScore: friction.openTensionScore,
      frictionScore: friction.frictionScore,
      duplicationGroup: SEMANTIC_DUPLICATION_GROUP[dimension],
      frictionReason: friction.frictionReason,
    } satisfies SelfReportSignal;
  }).filter((entry): entry is SelfReportSignal => entry != null);
}

function selectBalancedHeroSignals(signals: SelfReportSignal[]): SelfReportHeroSignals {
  const openPriority = sortByOpenTension(signals);
  const primarySignal = openPriority[0] ?? null;
  const workModeSignal =
    pickFirstNonRedundant(openPriority, primarySignal ? [primarySignal] : [], {
      requireDifferentFamilyFrom: primarySignal,
    }) ?? null;
  const tensionCarrier =
    pickFirstNonRedundant(sortByFriction(signals), [primarySignal, workModeSignal].filter(Boolean) as SelfReportSignal[]) ??
    null;

  return {
    primarySignal,
    workModeSignal,
    tensionCarrier,
    balancedProfile: true,
  };
}

function selectOrientedHeroSignals(signals: SelfReportSignal[]): SelfReportHeroSignals {
  const prioritized = sortBySignalPriority(signals);
  const primarySignal =
    prioritized.find((entry) => entry.isClear) ??
    prioritized.find((entry) => entry.isModerate) ??
    prioritized[0] ??
    null;

  const workModeSignal =
    sortBySignalPriority(
      signals.filter(
        (entry) =>
          entry.dimension !== primarySignal?.dimension &&
          entry.family !== primarySignal?.family
      )
    )[0] ?? null;

  const tensionCarrier =
    pickFirstNonRedundant(
      sortByFriction(signals.filter((entry) => entry.dimension !== primarySignal?.dimension)),
      [primarySignal, workModeSignal].filter(Boolean) as SelfReportSignal[],
      { excludeDimensions: [primarySignal?.dimension, workModeSignal?.dimension].filter(Boolean) as FounderDimensionKey[] }
    ) ??
    pickFirstNonRedundant(
      sortByFriction(signals.filter((entry) => entry.dimension !== primarySignal?.dimension)),
      [primarySignal].filter(Boolean) as SelfReportSignal[],
      { excludeDimensions: [primarySignal?.dimension].filter(Boolean) as FounderDimensionKey[] }
    ) ??
    null;

  return {
    primarySignal,
    workModeSignal,
    tensionCarrier,
    balancedProfile: false,
  };
}

export function selectHeroSignals(signals: SelfReportSignal[]): SelfReportHeroSignals {
  if (signals.length === 0) {
    return {
      primarySignal: null,
      workModeSignal: null,
      tensionCarrier: null,
      balancedProfile: true,
    };
  }

  const balancedProfile = !signals.some((entry) => entry.isClear);
  return balancedProfile ? selectBalancedHeroSignals(signals) : selectOrientedHeroSignals(signals);
}

export function selectPatternDimensions(
  signals: SelfReportSignal[],
  hero: SelfReportHeroSignals
) {
  const dedupedSignals = collapseDuplicationGroups(signals);
  if (hero.balancedProfile) {
    return selectBalancedPatternDimensions(dedupedSignals, hero);
  }

  const selected: SelfReportSignal[] = [];
  const familyCandidates = FAMILY_ORDER.map((family) =>
    sortBySignalPriority(dedupedSignals.filter((entry) => entry.family === family))[0] ?? null
  ).filter((entry): entry is SelfReportSignal => entry != null);

  for (const entry of [hero.primarySignal, hero.workModeSignal, hero.tensionCarrier]) {
    if (!entry) continue;
    if (selected.some((existing) => existing.family === entry.family)) continue;
    if (isRedundantAgainstSelected(entry, selected)) continue;
    selected.push(entry);
  }

  for (const entry of familyCandidates) {
    if (selected.length >= 3) break;
    if (selected.some((existing) => existing.family === entry.family)) continue;
    if (isRedundantAgainstSelected(entry, selected)) continue;
    selected.push(entry);
  }

  return selected.slice(0, 3);
}

export function selectChallengeDimensions(
  signals: SelfReportSignal[],
  hero: SelfReportHeroSignals
) {
  const dedupedSignals = collapseDuplicationGroups(signals);
  if (hero.balancedProfile) {
    return selectBalancedChallengeDimensions(dedupedSignals, hero);
  }

  const selected: SelfReportSignal[] = [];

  if (hero.primarySignal) {
    selected.push(hero.primarySignal);
  }

  const otherFamilyChallenge = pickFirstNonRedundant(
    sortByFriction(
      dedupedSignals.filter(
        (entry) =>
          entry.dimension !== hero.primarySignal?.dimension &&
          entry.family !== hero.primarySignal?.family
      )
    ),
    selected
  );
  if (otherFamilyChallenge) selected.push(otherFamilyChallenge);

  const openChallenge = pickFirstNonRedundant(
    sortByOpenTension(
      dedupedSignals.filter(
        (entry) =>
          entry.dimension !== hero.primarySignal?.dimension &&
          (entry.isBalanced || entry.isModerate)
      )
    ),
    selected
  );
  if (openChallenge) selected.push(openChallenge);

  if (selected.length < 3) {
    const fallback = pickFirstNonRedundant(sortByFriction(dedupedSignals), selected);
    if (fallback) selected.push(fallback);
  }

  return selected.slice(0, 3);
}

export function selectComplementDimensions(
  signals: SelfReportSignal[],
  hero: SelfReportHeroSignals
) {
  const dedupedSignals = collapseDuplicationGroups(signals);
  if (hero.balancedProfile) {
    return selectBalancedComplementDimensions(signals, hero);
  }

  const roles: SelfReportComplementRole[] = [];
  const selectedSignals: SelfReportSignal[] = [];

  if (hero.primarySignal) {
    roles.push({ role: "counterweight", signal: hero.primarySignal });
    selectedSignals.push(hero.primarySignal);
  }

  const regulator =
    (hero.tensionCarrier &&
    !isRedundantAgainstSelected(hero.tensionCarrier, selectedSignals)
      ? hero.tensionCarrier
      : pickFirstNonRedundant(
          sortByFriction(
            dedupedSignals.filter(
              (entry) =>
                entry.dimension !== hero.primarySignal?.dimension &&
                entry.socialImpactWeight >= 3
            )
          ),
          selectedSignals
        )) ?? null;

  if (regulator) {
    roles.push({ role: "regulator", signal: regulator });
    selectedSignals.push(regulator);
  }

  const rhythmPartner =
    (hero.workModeSignal &&
    !isRedundantAgainstSelected(hero.workModeSignal, selectedSignals)
      ? hero.workModeSignal
      : pickFirstNonRedundant(
          sortBySignalPriority(
            dedupedSignals.filter((entry) => entry.family === "collaboration_under_pressure")
          ),
          selectedSignals
        )) ?? null;

  if (rhythmPartner) {
    roles.push({ role: "rhythm_partner", signal: rhythmPartner });
  }

  return roles;
}

function selectBalancedPatternDimensions(
  dedupedSignals: SelfReportSignal[],
  hero: SelfReportHeroSignals
) {
  const selected: SelfReportSignal[] = [];
  const familyCandidates = FAMILY_ORDER.map((family) =>
    sortByOpenTension(dedupedSignals.filter((entry) => entry.family === family))[0] ?? null
  ).filter((entry): entry is SelfReportSignal => entry != null);

  const balancedSwitchers = familyCandidates.slice(0, 2);
  for (const entry of balancedSwitchers) {
    if (!isRedundantAgainstSelected(entry, selected)) {
      selected.push(entry);
    }
  }

  const frictionPoint =
    pickFirstNonRedundant(
      sortByFriction(dedupedSignals),
      selected,
      { excludeDimensions: [hero.primarySignal?.dimension].filter(Boolean) as FounderDimensionKey[] }
    ) ??
    pickFirstNonRedundant(sortBySignalPriority(dedupedSignals), selected);

  if (frictionPoint) selected.push(frictionPoint);

  return selected.slice(0, 3);
}

function selectBalancedChallengeDimensions(
  dedupedSignals: SelfReportSignal[],
  hero: SelfReportHeroSignals
) {
  const selected: SelfReportSignal[] = [];

  if (hero.primarySignal) selected.push(hero.primarySignal);

  const second = pickFirstNonRedundant(
    sortByOpenTension(dedupedSignals),
    selected,
    { excludeDimensions: [hero.primarySignal?.dimension].filter(Boolean) as FounderDimensionKey[] }
  );
  if (second) selected.push(second);

  const third =
    pickFirstNonRedundant(sortByFriction(dedupedSignals), selected) ??
    pickFirstNonRedundant(sortBySignalPriority(dedupedSignals), selected);
  if (third) selected.push(third);

  return selected.slice(0, 3);
}

function selectBalancedComplementDimensions(signals: SelfReportSignal[], hero: SelfReportHeroSignals) {
  const roles: SelfReportComplementRole[] = [];
  const selectedSignals: SelfReportSignal[] = [];

  const isBalancedComplementRedundant = (candidate: SelfReportSignal) =>
    selectedSignals.some((entry) => entry.dimension === candidate.dimension);

  const pickBalancedComplementCandidate = (
    candidates: SelfReportSignal[],
    options?: {
      requireDifferentFamilyFrom?: SelfReportSignal | null;
    }
  ) => {
    const requiredFamily = options?.requireDifferentFamilyFrom?.family ?? null;

    return (
      candidates.find((entry) => {
        if (requiredFamily && entry.family === requiredFamily) return false;
        return !isBalancedComplementRedundant(entry);
      }) ?? null
    );
  };

  if (hero.primarySignal) {
    roles.push({ role: "counterweight", signal: hero.primarySignal });
    selectedSignals.push(hero.primarySignal);
  }

  const regulator =
    pickBalancedComplementCandidate(
      sortByOpenTension(
        signals.filter(
          (entry) =>
            entry.socialImpactWeight >= 3 &&
            entry.dimension !== hero.primarySignal?.dimension
        )
      ),
      { requireDifferentFamilyFrom: hero.primarySignal }
    ) ??
    pickBalancedComplementCandidate(
      sortByOpenTension(
        signals.filter(
          (entry) =>
            entry.socialImpactWeight >= 3 &&
            entry.dimension !== hero.primarySignal?.dimension
        )
      )
    );
  if (regulator) {
    roles.push({ role: "regulator", signal: regulator });
    selectedSignals.push(regulator);
  }

  const rhythmPartner =
    pickBalancedComplementCandidate(
      sortByOpenTension(
        signals.filter(
          (entry) =>
            entry.family === "collaboration_under_pressure" &&
            entry.dimension !== hero.primarySignal?.dimension
        )
      )
    ) ??
    (hero.workModeSignal &&
    !isBalancedComplementRedundant(hero.workModeSignal)
      ? hero.workModeSignal
      : null) ??
    pickBalancedComplementCandidate(
      sortByOpenTension(
        signals.filter(
          (entry) =>
            entry.coordinationRiskWeight >= 2 &&
            entry.dimension !== hero.primarySignal?.dimension
        )
      )
    );
  if (rhythmPartner) {
    roles.push({ role: "rhythm_partner", signal: rhythmPartner });
  }

  return roles;
}

export function buildSelfReportSelection(scores: SelfAlignmentReport["scoresA"]): SelfReportSelection {
  const signals = buildSelfReportSignals(scores);
  const hero = selectHeroSignals(signals);
  const patternDimensions = selectPatternDimensions(signals, hero);
  const challengeDimensions = selectChallengeDimensions(signals, hero);
  const complementRoles = selectComplementDimensions(signals, hero);

  const conversationHintDimensions = [
    hero.primarySignal,
    hero.workModeSignal,
    hero.tensionCarrier,
    ...sortByOpenTension(signals).slice(0, 2),
  ]
    .filter((entry): entry is SelfReportSignal => entry != null)
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.dimension === entry.dimension) === index)
    .slice(0, 4);

  return {
    hero,
    patternDimensions,
    challengeDimensions,
    complementRoles,
    conversationHintDimensions,
    balancedProfile: hero.balancedProfile,
  };
}

export const SELF_REPORT_SELECTION_DEBUG_CASES: SelfReportSelectionDebugCase[] = [
  {
    name: "stark_ausgepraegtes_profil",
    scores: {
      Unternehmenslogik: 80,
      Entscheidungslogik: 38,
      Risikoorientierung: 72,
      "Arbeitsstruktur & Zusammenarbeit": 74,
      Commitment: 86,
      Konfliktstil: 33,
    },
    expected: {
      primarySignal: "Commitment",
      workModeSignal: "Arbeitsstruktur & Zusammenarbeit",
      tensionCarrier: "Risikoorientierung",
      patternDimensions: [
        "Commitment",
        "Arbeitsstruktur & Zusammenarbeit",
        "Risikoorientierung",
      ],
    },
  },
  {
    name: "komplett_balanciertes_profil",
    scores: {
      Unternehmenslogik: 55,
      Entscheidungslogik: 45,
      Risikoorientierung: 52,
      "Arbeitsstruktur & Zusammenarbeit": 54,
      Commitment: 53,
      Konfliktstil: 49,
    },
    expected: {
      primarySignal: "Arbeitsstruktur & Zusammenarbeit",
      workModeSignal: "Unternehmenslogik",
      tensionCarrier: "Entscheidungslogik",
      patternDimensions: [
        "Unternehmenslogik",
        "Entscheidungslogik",
        "Arbeitsstruktur & Zusammenarbeit",
      ],
    },
  },
  {
    name: "gemischtes_profil",
    scores: {
      Unternehmenslogik: 68,
      Entscheidungslogik: 57,
      Risikoorientierung: 59,
      "Arbeitsstruktur & Zusammenarbeit": 43,
      Commitment: 55,
      Konfliktstil: 62,
    },
    expected: {
      primarySignal: "Unternehmenslogik",
      workModeSignal: "Konfliktstil",
      tensionCarrier: "Risikoorientierung",
      patternDimensions: [
        "Unternehmenslogik",
        "Konfliktstil",
        "Risikoorientierung",
      ],
    },
  },
  {
    name: "dopplungsfall_entscheidung_risiko",
    scores: {
      Unternehmenslogik: 61,
      Entscheidungslogik: 82,
      Risikoorientierung: 78,
      "Arbeitsstruktur & Zusammenarbeit": 56,
      Commitment: 53,
      Konfliktstil: 37,
    },
    expected: {
      primarySignal: "Entscheidungslogik",
      workModeSignal: "Unternehmenslogik",
      tensionCarrier: "Konfliktstil",
      patternDimensions: [
        "Entscheidungslogik",
        "Unternehmenslogik",
        "Konfliktstil",
      ],
    },
  },
  {
    name: "konflikt_und_zusammenarbeitsfall",
    scores: {
      Unternehmenslogik: 64,
      Entscheidungslogik: 57,
      Risikoorientierung: 54,
      "Arbeitsstruktur & Zusammenarbeit": 79,
      Commitment: 52,
      Konfliktstil: 83,
    },
    expected: {
      primarySignal: "Konfliktstil",
      workModeSignal: "Unternehmenslogik",
      tensionCarrier: "Risikoorientierung",
      patternDimensions: [
        "Konfliktstil",
        "Unternehmenslogik",
        "Risikoorientierung",
      ],
    },
  },
];

export function debugSelfReportSelectionTestCases(): SelfReportSelectionDebugResult[] {
  return SELF_REPORT_SELECTION_DEBUG_CASES.map((testCase) => {
    const actual = summarizeSelection(buildSelfReportSelection(testCase.scores));
    return {
      name: testCase.name,
      scores: testCase.scores,
      expected: testCase.expected,
      actual,
      passed:
        actual.primarySignal === testCase.expected.primarySignal &&
        actual.workModeSignal === testCase.expected.workModeSignal &&
        actual.tensionCarrier === testCase.expected.tensionCarrier &&
        actual.patternDimensions.length === testCase.expected.patternDimensions.length &&
        actual.patternDimensions.every(
          (dimension, index) => dimension === testCase.expected.patternDimensions[index]
      ),
    };
  });
}

export const SELF_REPORT_SELECTION_SENSITIVITY_CASES: SelfReportSelectionSensitivityCase[] = [
  {
    name: "starkes_profil_kleine_verschiebung",
    baseScores: {
      Unternehmenslogik: 80,
      Entscheidungslogik: 38,
      Risikoorientierung: 72,
      "Arbeitsstruktur & Zusammenarbeit": 74,
      Commitment: 86,
      Konfliktstil: 33,
    },
    variants: [
      {
        label: "commitment_minus_3",
        scores: {
          Unternehmenslogik: 80,
          Entscheidungslogik: 38,
          Risikoorientierung: 72,
          "Arbeitsstruktur & Zusammenarbeit": 74,
          Commitment: 83,
          Konfliktstil: 33,
        },
      },
      {
        label: "zusammenarbeit_plus_3",
        scores: {
          Unternehmenslogik: 80,
          Entscheidungslogik: 38,
          Risikoorientierung: 72,
          "Arbeitsstruktur & Zusammenarbeit": 77,
          Commitment: 86,
          Konfliktstil: 33,
        },
      },
    ],
  },
  {
    name: "gemischtes_profil_kleine_verschiebung",
    baseScores: {
      Unternehmenslogik: 68,
      Entscheidungslogik: 57,
      Risikoorientierung: 59,
      "Arbeitsstruktur & Zusammenarbeit": 43,
      Commitment: 55,
      Konfliktstil: 62,
    },
    variants: [
      {
        label: "entscheidung_plus_3",
        scores: {
          Unternehmenslogik: 68,
          Entscheidungslogik: 60,
          Risikoorientierung: 59,
          "Arbeitsstruktur & Zusammenarbeit": 43,
          Commitment: 55,
          Konfliktstil: 62,
        },
      },
      {
        label: "konflikt_minus_3",
        scores: {
          Unternehmenslogik: 68,
          Entscheidungslogik: 57,
          Risikoorientierung: 59,
          "Arbeitsstruktur & Zusammenarbeit": 43,
          Commitment: 55,
          Konfliktstil: 59,
        },
      },
    ],
  },
];

function resolveAuditZone(score: number) {
  if (score <= 25) return 1;
  if (score <= 40) return 2;
  if (score < 60) return 3;
  if (score < 75) return 4;
  return 5;
}

function toAuditSignalSummary(signal: SelfReportSignal) {
  return {
    dimensionName: signal.dimension,
    rawScore: signal.score,
    orientation: signal.tendencyKey === "center" ? "balanced" : signal.tendencyKey,
    orientationStrength: signal.orientationStrength,
    zone: resolveAuditZone(signal.score),
    family: signal.family,
    strengthBand: signal.strengthBand,
    socialImpactWeight: signal.socialImpactWeight,
    coordinationRiskWeight: signal.coordinationRiskWeight,
    poleFrictionScore: signal.poleFrictionScore,
    openTensionScore: signal.openTensionScore,
    frictionScore: signal.frictionScore,
    frictionReason: signal.frictionReason,
    frictionComputation: getFrictionComputation(signal),
    duplicationGroup: signal.duplicationGroup,
  };
}

function buildCandidateDecision(
  signal: SelfReportSignal,
  status: "selected" | "removed" | "skipped" | "candidate",
  reason?: string
) {
  return {
    ...toAuditSignalSummary(signal),
    status,
    reason: reason ?? null,
  };
}

function explainRedundancy(candidate: SelfReportSignal, selected: SelfReportSignal[]) {
  const sameDimension = selected.find((entry) => entry.dimension === candidate.dimension);
  if (sameDimension) {
    return `already_selected:${sameDimension.dimension}`;
  }

  const sameGroup = selected.find((entry) => sharesDuplicationGroup(entry, candidate));
  if (sameGroup) {
    return `same_duplication_group_as:${sameGroup.dimension}`;
  }

  return "redundant_with_selected";
}

function explainPickFirstNonRedundant(
  candidates: SelfReportSignal[],
  selected: SelfReportSignal[],
  options?: {
    requireDifferentFamilyFrom?: SelfReportSignal | null;
    excludeDimensions?: FounderDimensionKey[];
  }
) {
  const requiredFamily = options?.requireDifferentFamilyFrom?.family ?? null;
  const excludedDimensions = new Set(options?.excludeDimensions ?? []);
  const decisions: Array<ReturnType<typeof buildCandidateDecision>> = [];
  let picked: SelfReportSignal | null = null;

  for (const candidate of candidates) {
    if (requiredFamily && candidate.family === requiredFamily) {
      decisions.push(
        buildCandidateDecision(candidate, "removed", `same_family_as_required_reference:${requiredFamily}`)
      );
      continue;
    }

    if (excludedDimensions.has(candidate.dimension)) {
      decisions.push(buildCandidateDecision(candidate, "removed", "explicitly_excluded_dimension"));
      continue;
    }

    if (isRedundantAgainstSelected(candidate, selected)) {
      decisions.push(buildCandidateDecision(candidate, "removed", explainRedundancy(candidate, selected)));
      continue;
    }

    picked = candidate;
    decisions.push(buildCandidateDecision(candidate, "selected", "first_non_redundant_candidate"));
    break;
  }

  return {
    picked,
    decisions,
  };
}

function buildHeroAudit(signals: SelfReportSignal[], hero: SelfReportHeroSignals) {
  if (hero.balancedProfile) {
    const openPriority = sortByOpenTension(signals);
    const primarySignal = openPriority[0] ?? null;
    const workModeTrace = explainPickFirstNonRedundant(
      openPriority,
      primarySignal ? [primarySignal] : [],
      { requireDifferentFamilyFrom: primarySignal }
    );
    const tensionTrace = explainPickFirstNonRedundant(
      sortByFriction(signals),
      [primarySignal, workModeTrace.picked].filter(Boolean) as SelfReportSignal[]
    );

    return {
      path: "balanced",
      functionsUsed: [
        "selectHeroSignals",
        "selectBalancedHeroSignals",
        "sortByOpenTension",
        "sortByFriction",
      ],
      primaryCandidates: openPriority.map((signal, index) =>
        buildCandidateDecision(
          signal,
          primarySignal?.dimension === signal.dimension ? "selected" : "candidate",
          primarySignal?.dimension === signal.dimension
            ? "highest_open_tension_in_balanced_profile"
            : `open_tension_rank:${index + 1}`
        )
      ),
      primarySignal: primarySignal
        ? {
            ...toAuditSignalSummary(primarySignal),
            reason: "highest_open_tension_in_balanced_profile",
          }
        : null,
      workModeCandidates: workModeTrace.decisions,
      workModeSignal: workModeTrace.picked
        ? {
            ...toAuditSignalSummary(workModeTrace.picked),
            reason: "first_non_redundant_open_tension_candidate_from_other_family",
          }
        : null,
      tensionCarrierCandidates: tensionTrace.decisions,
      tensionCarrier: tensionTrace.picked
        ? {
            ...toAuditSignalSummary(tensionTrace.picked),
            reason: "highest_non_redundant_friction_candidate_in_balanced_path",
          }
        : null,
    };
  }

  const prioritized = sortBySignalPriority(signals);
  const primarySignal =
    prioritized.find((entry) => entry.isClear) ??
    prioritized.find((entry) => entry.isModerate) ??
    prioritized[0] ??
    null;
  const workModeCandidates = sortBySignalPriority(
    signals.filter(
      (entry) =>
        entry.dimension !== primarySignal?.dimension &&
        entry.family !== primarySignal?.family
    )
  );
  const workModeSignal = workModeCandidates[0] ?? null;
  const firstTensionPass = explainPickFirstNonRedundant(
    sortByFriction(signals.filter((entry) => entry.dimension !== primarySignal?.dimension)),
    [primarySignal, workModeSignal].filter(Boolean) as SelfReportSignal[],
    {
      excludeDimensions: [primarySignal?.dimension, workModeSignal?.dimension].filter(Boolean) as FounderDimensionKey[],
    }
  );
  const secondTensionPass =
    firstTensionPass.picked
      ? null
      : explainPickFirstNonRedundant(
          sortByFriction(signals.filter((entry) => entry.dimension !== primarySignal?.dimension)),
          [primarySignal].filter(Boolean) as SelfReportSignal[],
          { excludeDimensions: [primarySignal?.dimension].filter(Boolean) as FounderDimensionKey[] }
        );
  const tensionCarrier = firstTensionPass.picked ?? secondTensionPass?.picked ?? null;

  return {
    path: "oriented",
    functionsUsed: [
      "selectHeroSignals",
      "selectOrientedHeroSignals",
      "sortBySignalPriority",
      "sortByFriction",
    ],
    primaryCandidates: prioritized.map((signal, index) =>
      buildCandidateDecision(
        signal,
        primarySignal?.dimension === signal.dimension ? "selected" : "candidate",
        primarySignal?.dimension === signal.dimension
          ? signal.isClear
            ? "highest_clear_dimension_by_signal_priority"
            : signal.isModerate
              ? "highest_moderate_dimension_by_signal_priority"
              : "fallback_highest_signal_priority"
          : `signal_priority_rank:${index + 1}`
      )
    ),
    primarySignal: primarySignal
      ? {
          ...toAuditSignalSummary(primarySignal),
          reason: primarySignal.isClear
            ? "highest_clear_dimension_by_signal_priority"
            : primarySignal.isModerate
              ? "highest_moderate_dimension_by_signal_priority"
              : "fallback_highest_signal_priority",
        }
      : null,
    workModeCandidates: workModeCandidates.map((signal, index) =>
      buildCandidateDecision(
        signal,
        workModeSignal?.dimension === signal.dimension ? "selected" : "candidate",
        workModeSignal?.dimension === signal.dimension
          ? "strongest_signal_from_other_family"
          : `other_family_signal_priority_rank:${index + 1}`
      )
    ),
    workModeSignal: workModeSignal
      ? {
          ...toAuditSignalSummary(workModeSignal),
          reason: "strongest_signal_from_other_family",
        }
      : null,
    tensionCarrierCandidates: [
      {
        pass: "exclude_primary_and_work_mode",
        decisions: firstTensionPass.decisions,
      },
      ...(secondTensionPass
        ? [
            {
              pass: "fallback_exclude_only_primary",
              decisions: secondTensionPass.decisions,
            },
          ]
        : []),
    ],
    tensionCarrier: tensionCarrier
      ? {
          ...toAuditSignalSummary(tensionCarrier),
          reason: `highest_non_redundant_friction_candidate:${tensionCarrier.frictionReason}`,
        }
      : null,
  };
}

function buildPatternAudit(signals: SelfReportSignal[], hero: SelfReportHeroSignals, finalSelection: SelfReportSignal[]) {
  const dedupedSignals = collapseDuplicationGroups(signals);

  if (hero.balancedProfile) {
    const familyCandidates = FAMILY_ORDER.map((family) =>
      sortByOpenTension(dedupedSignals.filter((entry) => entry.family === family))[0] ?? null
    ).filter((entry): entry is SelfReportSignal => entry != null);
    const selected: SelfReportSignal[] = [];
    const decisions: Array<ReturnType<typeof buildCandidateDecision>> = [];

    for (const entry of familyCandidates.slice(0, 2)) {
      if (isRedundantAgainstSelected(entry, selected)) {
        decisions.push(buildCandidateDecision(entry, "removed", explainRedundancy(entry, selected)));
        continue;
      }
      selected.push(entry);
      decisions.push(buildCandidateDecision(entry, "selected", "balanced_switcher_candidate"));
    }

    const frictionTrace =
      explainPickFirstNonRedundant(
        sortByFriction(dedupedSignals),
        selected,
        { excludeDimensions: [hero.primarySignal?.dimension].filter(Boolean) as FounderDimensionKey[] }
      );
    const fallbackTrace =
      frictionTrace.picked
        ? null
        : explainPickFirstNonRedundant(sortBySignalPriority(dedupedSignals), selected);

    return {
      path: "balanced",
      functionsUsed: [
        "selectBalancedPatternDimensions",
        "collapseDuplicationGroups",
        "sortByOpenTension",
        "sortByFriction",
      ],
      allCandidatesBeforeFilter: dedupedSignals.map((signal) => buildCandidateDecision(signal, "candidate")),
      familyCandidates: familyCandidates.map((signal) => buildCandidateDecision(signal, "candidate")),
      decisions: [
        ...decisions,
        ...frictionTrace.decisions,
        ...(fallbackTrace?.decisions ?? []),
      ],
      finalSelection: finalSelection.map((signal) => ({
        ...toAuditSignalSummary(signal),
        reason: selected.some((entry) => entry.dimension === signal.dimension)
          ? "balanced_switcher_or_friction_point"
          : "selected_in_balanced_pattern_path",
      })),
    };
  }

  const selected: SelfReportSignal[] = [];
  const decisions: Array<ReturnType<typeof buildCandidateDecision>> = [];
  const familyCandidates = FAMILY_ORDER.map((family) =>
    sortBySignalPriority(dedupedSignals.filter((entry) => entry.family === family))[0] ?? null
  ).filter((entry): entry is SelfReportSignal => entry != null);

  for (const entry of [hero.primarySignal, hero.workModeSignal, hero.tensionCarrier]) {
    if (!entry) continue;
    if (selected.some((existing) => existing.family === entry.family)) {
      decisions.push(buildCandidateDecision(entry, "removed", `same_family_as_selected:${entry.family}`));
      continue;
    }
    if (isRedundantAgainstSelected(entry, selected)) {
      decisions.push(buildCandidateDecision(entry, "removed", explainRedundancy(entry, selected)));
      continue;
    }
    selected.push(entry);
    decisions.push(buildCandidateDecision(entry, "selected", "hero_seed_for_patterns"));
  }

  for (const entry of familyCandidates) {
    if (selected.length >= 3) {
      decisions.push(buildCandidateDecision(entry, "removed", "pattern_slots_already_filled"));
      continue;
    }
    if (selected.some((existing) => existing.family === entry.family)) {
      decisions.push(buildCandidateDecision(entry, "removed", `same_family_as_selected:${entry.family}`));
      continue;
    }
    if (isRedundantAgainstSelected(entry, selected)) {
      decisions.push(buildCandidateDecision(entry, "removed", explainRedundancy(entry, selected)));
      continue;
    }
    selected.push(entry);
    decisions.push(buildCandidateDecision(entry, "selected", "best_remaining_family_candidate"));
  }

  return {
    path: "oriented",
    functionsUsed: [
      "selectPatternDimensions",
      "collapseDuplicationGroups",
      "sortBySignalPriority",
    ],
    allCandidatesBeforeFilter: dedupedSignals.map((signal) => buildCandidateDecision(signal, "candidate")),
    familyCandidates: familyCandidates.map((signal) => buildCandidateDecision(signal, "candidate")),
    decisions,
    finalSelection: finalSelection.map((signal) => ({
      ...toAuditSignalSummary(signal),
      reason: "selected_for_pattern_section",
    })),
  };
}

function buildChallengeAudit(signals: SelfReportSignal[], hero: SelfReportHeroSignals, finalSelection: SelfReportSignal[]) {
  const dedupedSignals = collapseDuplicationGroups(signals);
  const selected: SelfReportSignal[] = [];
  const decisions: Array<ReturnType<typeof buildCandidateDecision>> = [];

  if (hero.primarySignal) {
    selected.push(hero.primarySignal);
    decisions.push(buildCandidateDecision(hero.primarySignal, "selected", "seeded_from_primary_signal"));
  }

  if (hero.balancedProfile) {
    const secondTrace = explainPickFirstNonRedundant(
      sortByOpenTension(dedupedSignals),
      selected,
      { excludeDimensions: [hero.primarySignal?.dimension].filter(Boolean) as FounderDimensionKey[] }
    );
    if (secondTrace.picked) selected.push(secondTrace.picked);

    const thirdTrace =
      explainPickFirstNonRedundant(sortByFriction(dedupedSignals), selected);
    const thirdFallback =
      thirdTrace.picked ? null : explainPickFirstNonRedundant(sortBySignalPriority(dedupedSignals), selected);

    return {
      path: "balanced",
      functionsUsed: [
        "selectBalancedChallengeDimensions",
        "collapseDuplicationGroups",
        "sortByOpenTension",
        "sortByFriction",
        "sortBySignalPriority",
      ],
      candidates: {
        primary: hero.primarySignal ? buildCandidateDecision(hero.primarySignal, "selected", "seeded_from_primary_signal") : null,
        secondPass: secondTrace.decisions,
        thirdPass: thirdTrace.decisions,
        fallbackPass: thirdFallback?.decisions ?? [],
      },
      decisions: [...decisions, ...secondTrace.decisions, ...thirdTrace.decisions, ...(thirdFallback?.decisions ?? [])],
      finalSelection: finalSelection.map((signal) => ({
        ...toAuditSignalSummary(signal),
        reason: "selected_for_challenge_section",
      })),
    };
  }

  const otherFamilyTrace = explainPickFirstNonRedundant(
    sortByFriction(
      dedupedSignals.filter(
        (entry) =>
          entry.dimension !== hero.primarySignal?.dimension &&
          entry.family !== hero.primarySignal?.family
      )
    ),
    selected
  );
  if (otherFamilyTrace.picked) selected.push(otherFamilyTrace.picked);

  const openTrace = explainPickFirstNonRedundant(
    sortByOpenTension(
      dedupedSignals.filter(
        (entry) =>
          entry.dimension !== hero.primarySignal?.dimension &&
          (entry.isBalanced || entry.isModerate)
      )
    ),
    selected
  );
  if (openTrace.picked) selected.push(openTrace.picked);

  const fallbackTrace =
    selected.length < 3 ? explainPickFirstNonRedundant(sortByFriction(dedupedSignals), selected) : null;

  return {
    path: "oriented",
    functionsUsed: [
      "selectChallengeDimensions",
      "collapseDuplicationGroups",
      "sortByFriction",
      "sortByOpenTension",
    ],
    candidates: {
      primary: hero.primarySignal ? buildCandidateDecision(hero.primarySignal, "selected", "seeded_from_primary_signal") : null,
      otherFamilyFriction: otherFamilyTrace.decisions,
      openField: openTrace.decisions,
      fallbackFriction: fallbackTrace?.decisions ?? [],
    },
    decisions: [...decisions, ...otherFamilyTrace.decisions, ...openTrace.decisions, ...(fallbackTrace?.decisions ?? [])],
    finalSelection: finalSelection.map((signal) => ({
      ...toAuditSignalSummary(signal),
      reason: "selected_for_challenge_section",
    })),
  };
}

function buildComplementAudit(signals: SelfReportSignal[], hero: SelfReportHeroSignals, finalRoles: SelfReportComplementRole[]) {
  const dedupedSignals = collapseDuplicationGroups(signals);
  const selectedSignals: SelfReportSignal[] = [];
  const decisions: Array<ReturnType<typeof buildCandidateDecision>> = [];

  if (hero.primarySignal) {
    selectedSignals.push(hero.primarySignal);
    decisions.push(buildCandidateDecision(hero.primarySignal, "selected", "counterweight_from_primary_signal"));
  }

  if (hero.balancedProfile) {
    const explainBalancedPick = (
      candidates: SelfReportSignal[],
      options?: {
        requireDifferentFamilyFrom?: SelfReportSignal | null;
      }
    ) => {
      const requiredFamily = options?.requireDifferentFamilyFrom?.family ?? null;
      const trace: Array<ReturnType<typeof buildCandidateDecision>> = [];
      let picked: SelfReportSignal | null = null;

      for (const candidate of candidates) {
        if (requiredFamily && candidate.family === requiredFamily) {
          trace.push(
            buildCandidateDecision(
              candidate,
              "removed",
              `same_family_as_required_reference:${requiredFamily}`
            )
          );
          continue;
        }

        const exactDuplicate = selectedSignals.find((entry) => entry.dimension === candidate.dimension);
        if (exactDuplicate) {
          trace.push(
            buildCandidateDecision(
              candidate,
              "removed",
              `same_dimension_as_selected:${exactDuplicate.dimension}`
            )
          );
          continue;
        }

        picked = candidate;
        trace.push(buildCandidateDecision(candidate, "selected", "first_functionally_distinct_balanced_candidate"));
        break;
      }

      return {
        picked,
        decisions: trace,
      };
    };

    const regulatorPreferred = explainBalancedPick(
      sortByOpenTension(
        signals.filter(
          (entry) =>
            entry.socialImpactWeight >= 3 &&
            entry.dimension !== hero.primarySignal?.dimension
        )
      ),
      { requireDifferentFamilyFrom: hero.primarySignal }
    );
    const regulatorTrace =
      regulatorPreferred.picked
        ? regulatorPreferred
        : explainBalancedPick(
            sortByOpenTension(
              signals.filter(
                (entry) =>
                  entry.socialImpactWeight >= 3 &&
                  entry.dimension !== hero.primarySignal?.dimension
              )
            )
          );
    if (regulatorTrace.picked) {
      selectedSignals.push(regulatorTrace.picked);
    }

    const preferredRhythmTrace = explainBalancedPick(
      sortByOpenTension(
        signals.filter(
          (entry) =>
            entry.family === "collaboration_under_pressure" &&
            entry.dimension !== hero.primarySignal?.dimension
        )
      )
    );

    const rhythmTrace =
      preferredRhythmTrace.picked
        ? preferredRhythmTrace
        : hero.workModeSignal && !selectedSignals.some((entry) => entry.dimension === hero.workModeSignal?.dimension)
          ? {
              picked: hero.workModeSignal,
              decisions: [
                buildCandidateDecision(
                  hero.workModeSignal,
                  "selected",
                  "preferred_work_mode_signal_as_balanced_rhythm_partner"
                ),
              ],
            }
          : explainBalancedPick(
              sortByOpenTension(
                signals.filter(
                  (entry) =>
                    entry.coordinationRiskWeight >= 2 &&
                    entry.dimension !== hero.primarySignal?.dimension
                )
              )
            );

    return {
      path: "balanced",
      functionsUsed: [
        "selectBalancedComplementDimensions",
        "sortByOpenTension",
      ],
      decisions: [...decisions, ...regulatorTrace.decisions, ...rhythmTrace.decisions],
      counterweight: hero.primarySignal
        ? {
            ...toAuditSignalSummary(hero.primarySignal),
            reason: "counterweight_from_primary_signal",
          }
        : null,
      regulator: regulatorTrace.picked
        ? {
            ...toAuditSignalSummary(regulatorTrace.picked),
            reason: "first_functionally_distinct_balanced_regulator_candidate",
          }
        : null,
      rhythmPartner: rhythmTrace.picked
        ? {
            ...toAuditSignalSummary(rhythmTrace.picked),
            reason:
              rhythmTrace.picked.dimension === hero.workModeSignal?.dimension
                ? "preferred_work_mode_signal_as_balanced_rhythm_partner"
                : "first_functionally_distinct_balanced_rhythm_candidate",
          }
        : null,
      finalSelection: finalRoles.map((role) => ({
        role: role.role,
        ...toAuditSignalSummary(role.signal),
      })),
    };
  }

  const preferredRegulator =
    hero.tensionCarrier && !isRedundantAgainstSelected(hero.tensionCarrier, selectedSignals)
      ? hero.tensionCarrier
      : null;
  const regulatorTrace =
    preferredRegulator
      ? {
          picked: preferredRegulator,
          decisions: [
            buildCandidateDecision(preferredRegulator, "selected", "preferred_tension_carrier_as_regulator"),
          ],
        }
      : explainPickFirstNonRedundant(
          sortByFriction(
            dedupedSignals.filter(
              (entry) =>
                entry.dimension !== hero.primarySignal?.dimension &&
                entry.socialImpactWeight >= 3
            )
          ),
          selectedSignals
        );
  if (regulatorTrace.picked) {
    selectedSignals.push(regulatorTrace.picked);
  }

  const preferredRhythm =
    hero.workModeSignal && !isRedundantAgainstSelected(hero.workModeSignal, selectedSignals)
      ? hero.workModeSignal
      : null;
  const rhythmTrace =
    preferredRhythm
      ? {
          picked: preferredRhythm,
          decisions: [
            buildCandidateDecision(preferredRhythm, "selected", "preferred_work_mode_signal_as_rhythm_partner"),
          ],
        }
      : explainPickFirstNonRedundant(
          sortBySignalPriority(
            dedupedSignals.filter((entry) => entry.family === "collaboration_under_pressure")
          ),
          selectedSignals
        );

  return {
    path: "oriented",
    functionsUsed: [
      "selectComplementDimensions",
      "collapseDuplicationGroups",
      "sortByFriction",
      "sortBySignalPriority",
    ],
    decisions: [...decisions, ...regulatorTrace.decisions, ...rhythmTrace.decisions],
    counterweight: hero.primarySignal
      ? {
          ...toAuditSignalSummary(hero.primarySignal),
          reason: "counterweight_from_primary_signal",
        }
      : null,
    regulator: regulatorTrace.picked
      ? {
          ...toAuditSignalSummary(regulatorTrace.picked),
          reason: preferredRegulator
            ? "preferred_tension_carrier_as_regulator"
            : "first_non_redundant_high_social_impact_friction_candidate",
        }
      : null,
    rhythmPartner: rhythmTrace.picked
      ? {
          ...toAuditSignalSummary(rhythmTrace.picked),
          reason: preferredRhythm
            ? "preferred_work_mode_signal_as_rhythm_partner"
            : "first_non_redundant_collaboration_candidate_by_signal_priority",
        }
      : null,
    finalSelection: finalRoles.map((role) => ({
      role: role.role,
      ...toAuditSignalSummary(role.signal),
    })),
  };
}

export function runSelfReportAudit(inputScores: SelfAlignmentReport["scoresA"]) {
  const signals = buildSelfReportSignals(inputScores);
  const selection = buildSelfReportSelection(inputScores);

  return {
    inputShape: "SelfAlignmentReport['scoresA'] / Record<FounderDimensionKey, number | null>",
    inputScores,
    balancedProfile: selection.balancedProfile,
    balancedProfilePath: selection.balancedProfile
      ? {
          usedAlternativePath: true,
          functionsUsed: [
            "selectBalancedHeroSignals",
            "selectBalancedPatternDimensions",
            "selectBalancedChallengeDimensions",
            "selectBalancedComplementDimensions",
          ],
        }
      : {
          usedAlternativePath: false,
          functionsUsed: [
            "selectOrientedHeroSignals",
            "selectPatternDimensions",
            "selectChallengeDimensions",
            "selectComplementDimensions",
          ],
        },
    dimensions: signals.map((signal) => toAuditSignalSummary(signal)),
    selectionSummary: summarizeSelection(selection),
    hero: buildHeroAudit(signals, selection.hero),
    patterns: buildPatternAudit(signals, selection.hero, selection.patternDimensions),
    challenges: buildChallengeAudit(signals, selection.hero, selection.challengeDimensions),
    complement: buildComplementAudit(signals, selection.hero, selection.complementRoles),
    conversationHints: selection.conversationHintDimensions.map((signal) => toAuditSignalSummary(signal)),
  };
}

export function runSelfReportAuditTestCases() {
  return SELF_REPORT_SELECTION_DEBUG_CASES.map((testCase) => ({
    name: testCase.name,
    input: testCase.scores,
    audit: runSelfReportAudit(testCase.scores),
  }));
}

export function runSelfReportSensitivityChecks(): SelfReportSelectionSensitivityResult[] {
  return SELF_REPORT_SELECTION_SENSITIVITY_CASES.map((testCase) => {
    const baseSelection = summarizeSelection(buildSelfReportSelection(testCase.baseScores));

    return {
      name: testCase.name,
      base: {
        scores: testCase.baseScores,
        selection: baseSelection,
      },
      variants: testCase.variants.map((variant) => {
        const variantSelection = summarizeSelection(buildSelfReportSelection(variant.scores));
        return {
          label: variant.label,
          scores: variant.scores,
          selection: variantSelection,
          changesComparedToBase: {
            primarySignalChanged: variantSelection.primarySignal !== baseSelection.primarySignal,
            workModeSignalChanged: variantSelection.workModeSignal !== baseSelection.workModeSignal,
            tensionCarrierChanged: variantSelection.tensionCarrier !== baseSelection.tensionCarrier,
            patternDimensionsChanged:
              variantSelection.patternDimensions.length !== baseSelection.patternDimensions.length ||
              variantSelection.patternDimensions.some(
                (dimension, index) => dimension !== baseSelection.patternDimensions[index]
              ),
          },
        };
      }),
    };
  });
}
