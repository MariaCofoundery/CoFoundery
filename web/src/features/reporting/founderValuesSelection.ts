import type { SelfValuesProfile, ValuesArchetypeId } from "@/features/reporting/types";

export type FounderValuesThemeId =
  | "integrity_speed"
  | "stakeholder_balance"
  | "resource_fairness"
  | "commercial_focus"
  | "long_term_vs_short_term";

export type FounderValuesSelectionEntry = {
  themeId: FounderValuesThemeId;
  sharedStrength: number;
  difference: number;
  reason: string;
};

export type FounderValuesSelection = {
  meta: {
    available: boolean;
    profileDistance: number;
    pattern: "shared_basis" | "nuanced_difference" | "clear_difference" | "blind_spot_watch";
  };
  gemeinsameBasis: FounderValuesSelectionEntry;
  unterschiedUnterDruck: FounderValuesSelectionEntry & {
    level: "subtle" | "moderate" | "clear";
  };
  leitplanke: FounderValuesSelectionEntry & {
    mode: "guard_shared_blind_spot" | "guard_priority_gap";
  };
};

type ThemeDefinition = {
  id: FounderValuesThemeId;
  weight: Record<ValuesArchetypeId, number>;
};

const VALUE_THEMES: ThemeDefinition[] = [
  {
    id: "integrity_speed",
    weight: {
      impact_idealist: 0.95,
      verantwortungs_stratege: 0.85,
      business_pragmatiker: 0.15,
    },
  },
  {
    id: "stakeholder_balance",
    weight: {
      impact_idealist: 0.75,
      verantwortungs_stratege: 1,
      business_pragmatiker: 0.35,
    },
  },
  {
    id: "resource_fairness",
    weight: {
      impact_idealist: 0.8,
      verantwortungs_stratege: 0.95,
      business_pragmatiker: 0.25,
    },
  },
  {
    id: "commercial_focus",
    weight: {
      impact_idealist: 0.15,
      verantwortungs_stratege: 0.45,
      business_pragmatiker: 1,
    },
  },
  {
    id: "long_term_vs_short_term",
    weight: {
      impact_idealist: 0.7,
      verantwortungs_stratege: 0.85,
      business_pragmatiker: 0.3,
    },
  },
];

function normalizeWeights(profile: SelfValuesProfile) {
  const raw = profile.clusterScores;
  const total = Object.values(raw).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? Math.max(value, 0) : 0),
    0
  );

  if (total <= 0) {
    return {
      impact_idealist: 1 / 3,
      verantwortungs_stratege: 1 / 3,
      business_pragmatiker: 1 / 3,
    } satisfies Record<ValuesArchetypeId, number>;
  }

  return {
    impact_idealist: Math.max(raw.impact_idealist, 0) / total,
    verantwortungs_stratege: Math.max(raw.verantwortungs_stratege, 0) / total,
    business_pragmatiker: Math.max(raw.business_pragmatiker, 0) / total,
  } satisfies Record<ValuesArchetypeId, number>;
}

function scoreTheme(
  weights: Record<ValuesArchetypeId, number>,
  theme: ThemeDefinition
) {
  return (Object.keys(theme.weight) as ValuesArchetypeId[]).reduce(
    (sum, archetypeId) => sum + weights[archetypeId] * theme.weight[archetypeId],
    0
  );
}

function classifyDifferenceLevel(difference: number): "subtle" | "moderate" | "clear" {
  if (difference >= 0.18) return "clear";
  if (difference >= 0.09) return "moderate";
  return "subtle";
}

function classifyPattern(profileDistance: number): FounderValuesSelection["meta"]["pattern"] {
  if (profileDistance <= 0.08) return "blind_spot_watch";
  if (profileDistance >= 0.28) return "clear_difference";
  if (profileDistance >= 0.14) return "nuanced_difference";
  return "shared_basis";
}

function toEntry(
  candidate: {
    themeId: FounderValuesThemeId;
    sharedStrength: number;
    difference: number;
  },
  reason: string
): FounderValuesSelectionEntry {
  return {
    themeId: candidate.themeId,
    sharedStrength: round(candidate.sharedStrength),
    difference: round(candidate.difference),
    reason,
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function findThemeCandidate(
  scoredThemes: Array<{
    themeId: FounderValuesThemeId;
    scoreA: number;
    scoreB: number;
    sharedStrength: number;
    difference: number;
    commonFit: number;
    differenceFit: number;
  }>,
  themeId: FounderValuesThemeId
) {
  return scoredThemes.find((entry) => entry.themeId === themeId) ?? null;
}

export function buildFounderValuesSelection(
  valuesProfileA: SelfValuesProfile | null | undefined,
  valuesProfileB: SelfValuesProfile | null | undefined
): FounderValuesSelection | null {
  if (!valuesProfileA || !valuesProfileB) return null;

  const weightsA = normalizeWeights(valuesProfileA);
  const weightsB = normalizeWeights(valuesProfileB);
  const profileDistance =
    (Object.keys(weightsA) as ValuesArchetypeId[]).reduce(
      (sum, archetypeId) => sum + Math.abs(weightsA[archetypeId] - weightsB[archetypeId]),
      0
    ) / 2;

  const scoredThemes = VALUE_THEMES.map((theme) => {
    const scoreA = scoreTheme(weightsA, theme);
    const scoreB = scoreTheme(weightsB, theme);
    const sharedStrength = (scoreA + scoreB) / 2;
    const difference = Math.abs(scoreA - scoreB);

    return {
      themeId: theme.id,
      scoreA,
      scoreB,
      sharedStrength,
      difference,
      commonFit: sharedStrength - difference * 0.65,
      differenceFit: difference * (0.6 + Math.max(scoreA, scoreB)),
    };
  });

  const topGemeinsameBasisCandidate =
    [...scoredThemes].sort(
      (a, b) =>
        b.commonFit - a.commonFit ||
        a.difference - b.difference ||
        b.sharedStrength - a.sharedStrength ||
        a.themeId.localeCompare(b.themeId)
    )[0] ?? scoredThemes[0];
  const commercialBasisCandidate = findThemeCandidate(scoredThemes, "commercial_focus");
  const stakeholderBasisCandidate = findThemeCandidate(scoredThemes, "stakeholder_balance");
  const combinedNonCommercialA = weightsA.impact_idealist + weightsA.verantwortungs_stratege;
  const combinedNonCommercialB = weightsB.impact_idealist + weightsB.verantwortungs_stratege;

  const gemeinsameBasisCandidate =
    commercialBasisCandidate &&
    weightsA.business_pragmatiker >= 0.4 &&
    weightsB.business_pragmatiker >= 0.4 &&
    commercialBasisCandidate.commonFit >= topGemeinsameBasisCandidate.commonFit - 0.08
      ? commercialBasisCandidate
      : stakeholderBasisCandidate &&
          combinedNonCommercialA >= 0.7 &&
          combinedNonCommercialB >= 0.7 &&
          stakeholderBasisCandidate.commonFit >= topGemeinsameBasisCandidate.commonFit - 0.08
        ? stakeholderBasisCandidate
        : topGemeinsameBasisCandidate;

  const sortedDifferenceCandidates =
    [...scoredThemes]
      .filter((entry) => entry.themeId !== gemeinsameBasisCandidate.themeId)
      .sort(
        (a, b) =>
          b.differenceFit - a.differenceFit ||
          b.difference - a.difference ||
          b.sharedStrength - a.sharedStrength ||
          a.themeId.localeCompare(b.themeId)
      );
  const defaultDifferenceCandidate =
    sortedDifferenceCandidates[0] ??
    [...scoredThemes].sort(
      (a, b) =>
        b.differenceFit - a.differenceFit ||
        b.difference - a.difference ||
        b.sharedStrength - a.sharedStrength ||
        a.themeId.localeCompare(b.themeId)
    )[0];
  const businessGap = Math.abs(weightsA.business_pragmatiker - weightsB.business_pragmatiker);
  const impactGap = Math.abs(weightsA.impact_idealist - weightsB.impact_idealist);
  const commercialDifferenceCandidate = findThemeCandidate(sortedDifferenceCandidates, "commercial_focus");
  const integrityDifferenceCandidate = findThemeCandidate(sortedDifferenceCandidates, "integrity_speed");

  const unterschiedCandidate =
    businessGap >= 0.18 && commercialDifferenceCandidate
      ? commercialDifferenceCandidate
      : impactGap >= 0.18 && integrityDifferenceCandidate
        ? integrityDifferenceCandidate
        : defaultDifferenceCandidate;

  const pattern = classifyPattern(profileDistance);
  const leitplankenTheme =
    pattern === "blind_spot_watch" ? gemeinsameBasisCandidate : unterschiedCandidate;

  return {
    meta: {
      available: true,
      profileDistance: round(profileDistance),
      pattern,
    },
    gemeinsameBasis: toEntry(
      gemeinsameBasisCandidate,
      gemeinsameBasisCandidate.difference <= 0.08
        ? "similar_normative_orientation"
        : "shared_weighted_orientation"
    ),
    unterschiedUnterDruck: {
      ...toEntry(
        unterschiedCandidate,
        unterschiedCandidate.difference >= 0.18
          ? "clear_priority_shift_under_pressure"
          : unterschiedCandidate.difference >= 0.09
            ? "moderate_priority_shift_under_pressure"
            : "subtle_priority_shift_under_pressure"
      ),
      level: classifyDifferenceLevel(unterschiedCandidate.difference),
    },
    leitplanke: {
      ...toEntry(
        leitplankenTheme,
        pattern === "blind_spot_watch" ? "guard_shared_blind_spot" : "guard_priority_gap"
      ),
      mode: pattern === "blind_spot_watch" ? "guard_shared_blind_spot" : "guard_priority_gap",
    },
  };
}

function buildExampleValuesProfile(
  clusterScores: SelfValuesProfile["clusterScores"],
  primaryArchetypeId: ValuesArchetypeId,
  secondaryArchetypeId: ValuesArchetypeId | null
): SelfValuesProfile {
  return {
    primaryArchetypeId,
    secondaryArchetypeId,
    primaryLabel: primaryArchetypeId,
    secondaryLabel: secondaryArchetypeId,
    summary: "",
    insights: [],
    watchouts: [],
    answered: 10,
    total: 10,
    clusterScores,
  };
}

export const FOUNDER_VALUES_TEST_CASES = {
  aehnliche_basis: {
    a: buildExampleValuesProfile(
      {
        impact_idealist: 5.1,
        verantwortungs_stratege: 5.8,
        business_pragmatiker: 3,
      },
      "verantwortungs_stratege",
      "impact_idealist"
    ),
    b: buildExampleValuesProfile(
      {
        impact_idealist: 4,
        verantwortungs_stratege: 5,
        business_pragmatiker: 4.3,
      },
      "verantwortungs_stratege",
      "business_pragmatiker"
    ),
  },
  anderer_massstab_unter_druck: {
    a: buildExampleValuesProfile(
      {
        impact_idealist: 2.6,
        verantwortungs_stratege: 4.2,
        business_pragmatiker: 5.9,
      },
      "business_pragmatiker",
      "verantwortungs_stratege"
    ),
    b: buildExampleValuesProfile(
      {
        impact_idealist: 5.9,
        verantwortungs_stratege: 4.8,
        business_pragmatiker: 2.1,
      },
      "impact_idealist",
      "verantwortungs_stratege"
    ),
  },
  aehnlich_mit_blind_spot: {
    a: buildExampleValuesProfile(
      {
        impact_idealist: 2.9,
        verantwortungs_stratege: 3.8,
        business_pragmatiker: 5.6,
      },
      "business_pragmatiker",
      "verantwortungs_stratege"
    ),
    b: buildExampleValuesProfile(
      {
        impact_idealist: 3.1,
        verantwortungs_stratege: 3.9,
        business_pragmatiker: 5.4,
      },
      "business_pragmatiker",
      "verantwortungs_stratege"
    ),
  },
} as const;

export function runFounderValuesSelectionExamples() {
  return {
    aehnliche_basis: buildFounderValuesSelection(
      FOUNDER_VALUES_TEST_CASES.aehnliche_basis.a,
      FOUNDER_VALUES_TEST_CASES.aehnliche_basis.b
    ),
    anderer_massstab_unter_druck: buildFounderValuesSelection(
      FOUNDER_VALUES_TEST_CASES.anderer_massstab_unter_druck.a,
      FOUNDER_VALUES_TEST_CASES.anderer_massstab_unter_druck.b
    ),
    aehnlich_mit_blind_spot: buildFounderValuesSelection(
      FOUNDER_VALUES_TEST_CASES.aehnlich_mit_blind_spot.a,
      FOUNDER_VALUES_TEST_CASES.aehnlich_mit_blind_spot.b
    ),
  };
}
