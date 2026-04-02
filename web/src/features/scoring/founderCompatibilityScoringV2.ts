import {
  compareFounderProfiles,
  MATCH_WEIGHTS,
  type DimensionId,
  type DimensionMatch,
  type FounderMatchProfile,
  type MatchResult,
  type MatchCategory,
  type RiskLevel,
} from "@/features/scoring/founderMatching";
import {
  getCoreRegistryItems,
  getOrderedRegistryDimensions,
} from "@/features/scoring/founderCompatibilityRegistry";
import {
  type FounderCompatibilityAnswerMapV2,
  type FounderCompatibilityAnswerV2,
  buildFounderCompatibilityAnswerMapV2,
} from "@/features/scoring/founderCompatibilityAnswerRuntime";
import {
  getFounderDimensionMeta,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";

export type FounderCompatibilityLegacyAnswer = {
  question_id: string;
  dimension: string;
  value: number;
};

export type FounderCompatibilityLegacyScoringInput = {
  personA: FounderCompatibilityLegacyAnswer[];
  personB: FounderCompatibilityLegacyAnswer[];
};

type ConflictRiskLevel = "low" | "medium" | "high" | "insufficient_data";
type FitCategory = "very_high" | "high" | "mixed" | "low" | "insufficient_data";
type TensionCategory = "low" | "moderate" | "elevated" | "insufficient_data";
type PatternCategory =
  | "aligned"
  | "hidden_difference"
  | "moderate_difference"
  | "clear_difference"
  | "insufficient_data";

type ReportInsight = {
  kind: "strength" | "complementary_dynamic" | "tension";
  dimension: string | null;
  title: string;
  priorityScore: number;
  source: string;
};

type ExecutiveInsights = {
  topStrength: ReportInsight | null;
  topComplementaryDynamic: ReportInsight | null;
  topTension: ReportInsight | null;
};

type DimensionResult = {
  dimension: string;
  scoreA: number | null;
  scoreB: number | null;
  meanDistance: number | null;
  distance: number | null;
  itemDistance: number | null;
  oppositionCount: number;
  hiddenDifferenceScore: number | null;
  hasHiddenDifferences: boolean;
  patternCategory: PatternCategory;
  alignment: number | null;
  alignmentCategory: FitCategory;
  complementarity: number | null;
  teamFit: number | null;
  fitCategory: FitCategory;
  conflictRisk: ConflictRiskLevel;
  tensionScore: number | null;
  tensionCategory: TensionCategory;
  dynamicLabel: string | null;
  isComplementaryDynamic: boolean;
  redFlags: string[];
  greenFlags: string[];
  collaborationStrengths: string[];
  complementaryDynamics: string[];
  potentialTensionAreas: string[];
};

type TeamScoringResultV2 = {
  dimensions: DimensionResult[];
  overallFit: number | null;
  overallTension: number | null;
  conflictRiskIndex: number | null;
  overallRedFlags: string[];
  overallGreenFlags: string[];
  overallCollaborationStrengths: string[];
  overallComplementaryDynamics: string[];
  overallPotentialTensionAreas: string[];
  executiveInsights: ExecutiveInsights;
};

const ORDERED_DIMENSION_IDS = getOrderedRegistryDimensions().map(
  (dimension) => dimension.dimensionId
) as DimensionId[];

const CANONICAL_TO_DIMENSION_ID: Record<FounderDimensionKey, DimensionId> = {
  Unternehmenslogik: "company_logic",
  Entscheidungslogik: "decision_logic",
  "Arbeitsstruktur & Zusammenarbeit": "work_structure",
  Commitment: "commitment",
  Risikoorientierung: "risk_orientation",
  Konfliktstil: "conflict_style",
};

const DIMENSION_ID_TO_CANONICAL: Record<DimensionId, FounderDimensionKey> = {
  company_logic: "Unternehmenslogik",
  decision_logic: "Entscheidungslogik",
  work_structure: "Arbeitsstruktur & Zusammenarbeit",
  commitment: "Commitment",
  risk_orientation: "Risikoorientierung",
  conflict_style: "Konfliktstil",
};

const CORE_ITEM_TO_DIMENSION_ID = new Map(
  getCoreRegistryItems().map((item) => [item.itemId, item.dimensionId] as const)
);

const ALIGNED_LABELS: Record<DimensionId, string> = {
  company_logic: "stabil ausgerichtet",
  decision_logic: "gut anschlussfaehig",
  work_structure: "im Alltag gut synchronisierbar",
  commitment: "aehnliche Einsatzrealitaet",
  risk_orientation: "aehnliche Risikologik",
  conflict_style: "aehnliche Konfliktkultur",
};

const COMPLEMENTARY_LABELS: Partial<Record<DimensionId, string>> = {
  company_logic: "produktive strategische Spannung",
  decision_logic: "produktive Entscheidungsdifferenz",
  risk_orientation: "produktive Risikodifferenz",
};

const TENSION_LABELS: Record<DimensionId, { medium: string; high: string }> = {
  company_logic: {
    medium: "klaerungsbeduerftige strategische Unterschiede",
    high: "strategische Spannung",
  },
  decision_logic: {
    medium: "unterschiedliche Entscheidungslogiken",
    high: "deutlich unterschiedliches Verstaendnis von Entscheidungsreife",
  },
  work_structure: {
    medium: "spuerbare Unterschiede in Abstimmung und Sichtbarkeit",
    high: "operative Koordinationsspannung",
  },
  commitment: {
    medium: "unterschiedliche Einsatzrahmen",
    high: "deutlich unterschiedliche Arbeitsrealitaeten",
  },
  risk_orientation: {
    medium: "unterschiedliche Risikogrenzen",
    high: "deutlich unterschiedliche Risikologiken",
  },
  conflict_style: {
    medium: "unterschiedliche Klaerungsstile",
    high: "hohes Missverstaendnispotenzial im Konfliktstil",
  },
};

const DIMENSION_STRENGTH_TEXT: Record<DimensionId, string> = {
  company_logic:
    "Eure Unternehmenslogik liegt nah genug beieinander, dass strategische Prioritaeten auf einer aehnlichen Grundannahme aufbauen koennen.",
  decision_logic:
    "Ihr lest Entscheidungsreife aehnlich, was Tempo, Prueftiefe und Verantwortungsverteilung leichter anschlussfaehig macht.",
  work_structure:
    "Ihr braucht aehnlich viel Mitsicht und Abstimmung, was den Arbeitsalltag leichter koordinierbar macht.",
  commitment:
    "Eure Erwartungen an Priorisierung, Verfuegbarkeit und Einsatzniveau liegen auf einer aehnlichen Arbeitsrealitaet.",
  risk_orientation:
    "Ihr bewertet Unsicherheit aehnlich, was gemeinsame Leitplanken bei Chancen und Risiken erleichtert.",
  conflict_style:
    "Ihr sprecht Unterschiede in einem aehnlichen Rhythmus und mit aehnlicher Direktheit an.",
};

const DIMENSION_COMPLEMENTARY_TEXT: Partial<Record<DimensionId, string>> = {
  company_logic:
    "Unterschiede in der Unternehmenslogik koennen produktiv bleiben, wenn euer Commitment im Alltag stabil genug auf derselben Basis steht.",
  decision_logic:
    "Unterschiede in der Entscheidungslogik koennen produktiv sein, wenn klar ist, wann ihr weiter prueft und wann eine Richtung als tragfaehig gilt.",
  risk_orientation:
    "Unterschiede in der Risikoorientierung koennen sich gut ergaenzen, wenn eine Person oeffnet und die andere klare Leitplanken setzt.",
};

const DIMENSION_TENSION_TEXT: Record<DimensionId, { medium: string; high: string }> = {
  company_logic: {
    medium:
      "Dieselbe unternehmerische Option wird nicht automatisch an denselben Massstaeben gelesen.",
    high:
      "Marktchance, Hebel und tragfaehiger Aufbau werden so unterschiedlich gewichtet, dass Richtungsfragen schnell zu Grundsatzfragen werden.",
  },
  decision_logic: {
    medium:
      "Eine Person sieht einen naechsten Schritt, waehrend die andere noch Klaerungsbedarf in derselben Entscheidung sieht.",
    high:
      "Entscheidungen koennen mehrfach auf den Tisch kommen, weil fuer eine Person noch geprueft wird, waehrend die andere innerlich schon entschieden hat.",
  },
  work_structure: {
    medium:
      "Eine Person erwartet fruehere Mitsicht, waehrend die andere lieber eigenstaendig bis zu einem belastbaren Stand arbeitet.",
    high:
      "Im Alltag kollidieren Erwartungen an Sichtbarkeit, Zwischenstaende und Abstimmungsdichte direkt miteinander.",
  },
  commitment: {
    medium:
      "Priorisierung und Verfuegbarkeit werden nicht automatisch im gleichen Rahmen erwartet.",
    high:
      "Eine Person richtet ihr Leben deutlich staerker um das Startup aus als die andere, was schnell als Ungleichgewicht erlebt wird.",
  },
  risk_orientation: {
    medium:
      "Dieselbe Unsicherheit wird von euch nicht mit derselben Komfortzone gelesen.",
    high:
      "Ein Schritt, der fuer eine Person als vertretbare Wette gilt, wirkt fuer die andere wie unnoetige Exposition.",
  },
  conflict_style: {
    medium:
      "Der gleiche Widerspruch wird unterschiedlich frueh und unterschiedlich direkt angesprochen.",
    high:
      "Missverstaendnisse entstehen nicht nur am Thema, sondern an der Art, wie Unterschiede angesprochen oder liegen gelassen werden.",
  },
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function mean(values: number[]) {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function weightedMean(entries: Array<{ value: number | null; weight: number }>) {
  const valid = entries.filter(
    (entry) => entry.value != null && Number.isFinite(entry.weight) && entry.weight > 0
  ) as Array<{ value: number; weight: number }>;

  if (valid.length === 0) return null;

  const totals = valid.reduce(
    (acc, entry) => {
      acc.weightedSum += entry.value * entry.weight;
      acc.weight += entry.weight;
      return acc;
    },
    { weightedSum: 0, weight: 0 }
  );

  if (totals.weight <= 0) return null;
  return round(totals.weightedSum / totals.weight);
}

function parseScore(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return round(clamp(value, 0, 100));
}

function deriveFitCategory(value: number | null): FitCategory {
  if (value == null) return "insufficient_data";
  if (value >= 85) return "very_high";
  if (value >= 70) return "high";
  if (value >= 50) return "mixed";
  return "low";
}

function deriveTensionCategory(value: number | null): TensionCategory {
  if (value == null) return "insufficient_data";
  if (value <= 25) return "low";
  if (value <= 55) return "moderate";
  return "elevated";
}

function buildFounderProfile(
  entries: Array<{ dimensionId: DimensionId; value: number }>
): FounderMatchProfile {
  const buckets = new Map<DimensionId, number[]>();

  for (const entry of entries) {
    const existing = buckets.get(entry.dimensionId);
    if (existing) {
      existing.push(entry.value);
      continue;
    }

    buckets.set(entry.dimensionId, [entry.value]);
  }

  return ORDERED_DIMENSION_IDS.reduce((profile, dimensionId) => {
    const values = buckets.get(dimensionId) ?? [];
    profile[dimensionId] = mean(values);
    return profile;
  }, {} as FounderMatchProfile);
}

export function buildFounderMatchProfileFromRegistryAnswers(
  answers: Array<{
    itemId: FounderCompatibilityAnswerV2["itemId"];
    value: number | null | undefined;
  }>
): FounderMatchProfile {
  const entries = answers.flatMap((answer) => {
    const dimensionId = CORE_ITEM_TO_DIMENSION_ID.get(answer.itemId);
    const value = parseScore(answer.value);

    if (!dimensionId || value == null) {
      return [];
    }

    return [{ dimensionId, value }];
  });

  return buildFounderProfile(entries);
}

export function buildFounderMatchProfileFromAnswerMapV2(
  answerMap: FounderCompatibilityAnswerMapV2
) {
  return buildFounderMatchProfileFromRegistryAnswers(
    Object.entries(answerMap).flatMap(([itemId, value]) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return [];
      }

      return [
        {
          itemId: itemId as FounderCompatibilityAnswerV2["itemId"],
          value,
        },
      ];
    })
  );
}

export function buildFounderMatchProfileFromLegacyAnswers(
  answers: FounderCompatibilityLegacyAnswer[]
): FounderMatchProfile {
  const entries = answers.flatMap((answer) => {
    const meta = getFounderDimensionMeta(answer.dimension);
    const value = parseScore(answer.value);
    if (!meta || value == null) {
      return [];
    }

    return [{ dimensionId: CANONICAL_TO_DIMENSION_ID[meta.canonicalName], value }];
  });

  return buildFounderProfile(entries);
}

function toInsufficientDimensionResult(dimensionId: DimensionId): DimensionResult {
  return {
    dimension: DIMENSION_ID_TO_CANONICAL[dimensionId],
    scoreA: null,
    scoreB: null,
    meanDistance: null,
    distance: null,
    itemDistance: null,
    oppositionCount: 0,
    hiddenDifferenceScore: null,
    hasHiddenDifferences: false,
    patternCategory: "insufficient_data",
    alignment: null,
    alignmentCategory: "insufficient_data",
    complementarity: null,
    teamFit: null,
    fitCategory: "insufficient_data",
    conflictRisk: "insufficient_data",
    tensionScore: null,
    tensionCategory: "insufficient_data",
    dynamicLabel: null,
    isComplementaryDynamic: false,
    redFlags: [],
    greenFlags: [],
    collaborationStrengths: [],
    complementaryDynamics: [],
    potentialTensionAreas: [],
  };
}

function derivePatternCategory(
  category: MatchCategory,
  distance: number,
  riskLevel: RiskLevel
): PatternCategory {
  if (category === "aligned") return "aligned";
  if (riskLevel === "high" || distance > 50) return "clear_difference";
  return "moderate_difference";
}

function mapConflictRisk(riskLevel: RiskLevel): ConflictRiskLevel {
  if (riskLevel === "low") return "low";
  if (riskLevel === "medium") return "medium";
  return "high";
}

function deriveDynamicLabel(match: DimensionMatch) {
  if (match.category === "aligned") {
    return ALIGNED_LABELS[match.dimensionId];
  }

  if (match.category === "complementary") {
    return COMPLEMENTARY_LABELS[match.dimensionId] ?? "produktive Ergaenzung";
  }

  const tensionLevel = match.riskLevel === "high" ? "high" : "medium";
  return TENSION_LABELS[match.dimensionId][tensionLevel];
}

function deriveTensionScore(match: DimensionMatch) {
  if (match.category === "aligned") {
    return round(clamp(match.distance, 0, 25));
  }

  if (match.category === "complementary") {
    return round(clamp(match.distance * 0.7, 10, 45));
  }

  if (match.riskLevel === "high") {
    return round(clamp(Math.max(match.distance, 56), 56, 100));
  }

  return round(clamp(Math.max(match.distance, 26), 26, 55));
}

function buildDimensionResult(match: DimensionMatch): DimensionResult {
  const tensionScore = deriveTensionScore(match);
  const fitCategory = deriveFitCategory(match.baseCompatibility);
  const tensionLevel = match.riskLevel === "high" ? "high" : "medium";
  const tensionText = TENSION_LABELS[match.dimensionId][tensionLevel];

  const collaborationStrengths =
    match.category === "aligned" ? [DIMENSION_STRENGTH_TEXT[match.dimensionId]] : [];
  const complementaryDynamics =
    match.category === "complementary"
      ? [DIMENSION_COMPLEMENTARY_TEXT[match.dimensionId] ?? "Diese Unterschiede koennen produktiv sein, wenn ihr sie bewusst fuehrt."]
      : [];
  const potentialTensionAreas =
    match.category === "tension" ? [DIMENSION_TENSION_TEXT[match.dimensionId][tensionLevel]] : [];

  return {
    dimension: DIMENSION_ID_TO_CANONICAL[match.dimensionId],
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    meanDistance: match.distance,
    distance: match.distance,
    itemDistance: match.distance,
    oppositionCount:
      (match.scoreA <= 25 && match.scoreB >= 75) || (match.scoreB <= 25 && match.scoreA >= 75)
        ? 1
        : 0,
    hiddenDifferenceScore: 0,
    hasHiddenDifferences: false,
    patternCategory: derivePatternCategory(match.category, match.distance, match.riskLevel),
    alignment: match.baseCompatibility,
    alignmentCategory: fitCategory,
    complementarity: match.category === "complementary" ? match.baseCompatibility : null,
    teamFit: match.baseCompatibility,
    fitCategory,
    conflictRisk: mapConflictRisk(match.riskLevel),
    tensionScore,
    tensionCategory: deriveTensionCategory(tensionScore),
    dynamicLabel: deriveDynamicLabel(match),
    isComplementaryDynamic: match.category === "complementary",
    redFlags: match.riskLevel === "high" ? [tensionText] : [],
    greenFlags:
      match.category === "aligned"
        ? [DIMENSION_STRENGTH_TEXT[match.dimensionId]]
        : match.category === "complementary"
          ? [DIMENSION_COMPLEMENTARY_TEXT[match.dimensionId] ?? "Diese Unterschiede koennen produktiv sein."]
          : [],
    collaborationStrengths,
    complementaryDynamics,
    potentialTensionAreas,
  };
}

function dimensionResultFromMatchMap(
  dimensionId: DimensionId,
  matchMap: Map<DimensionId, DimensionMatch>
): DimensionResult {
  const match = matchMap.get(dimensionId);
  if (!match) {
    return toInsufficientDimensionResult(dimensionId);
  }

  return buildDimensionResult(match);
}

function toInsight(
  result: DimensionResult,
  kind: ReportInsight["kind"],
  priorityScore: number
): ReportInsight {
  const title =
    (kind === "strength"
      ? result.collaborationStrengths[0]
      : kind === "complementary_dynamic"
        ? result.complementaryDynamics[0]
        : result.potentialTensionAreas[0]) ??
    result.dynamicLabel ??
    result.dimension;

  return {
    kind,
    dimension: result.dimension,
    title,
    priorityScore: round(priorityScore),
    source: kind,
  };
}

function buildExecutiveInsights(
  dimensions: DimensionResult[],
  matchResult: MatchResult
): ExecutiveInsights {
  const byDimensionId = new Map(
    ORDERED_DIMENSION_IDS.map((dimensionId) => [
      dimensionId,
      dimensions.find(
        (entry) => entry.dimension === DIMENSION_ID_TO_CANONICAL[dimensionId]
      ) ?? null,
    ])
  );

  const topStrengthDimensionId =
    matchResult.topAlignments.find((dimensionId) => {
      const result = byDimensionId.get(dimensionId);
      return result?.fitCategory === "very_high" || result?.fitCategory === "high";
    }) ?? matchResult.topAlignments[0] ?? null;
  const topComplementaryDimensionId =
    matchResult.topAlignments.find((dimensionId) => {
      const result = byDimensionId.get(dimensionId);
      return result?.isComplementaryDynamic === true;
    }) ?? null;
  const topTensionDimensionId = matchResult.topTensions[0] ?? null;

  return {
    topStrength: topStrengthDimensionId
      ? toInsight(
          byDimensionId.get(topStrengthDimensionId) ?? toInsufficientDimensionResult(topStrengthDimensionId),
          "strength",
          90
        )
      : null,
    topComplementaryDynamic: topComplementaryDimensionId
      ? toInsight(
          byDimensionId.get(topComplementaryDimensionId) ??
            toInsufficientDimensionResult(topComplementaryDimensionId),
          "complementary_dynamic",
          80
        )
      : null,
    topTension: topTensionDimensionId
      ? toInsight(
          byDimensionId.get(topTensionDimensionId) ?? toInsufficientDimensionResult(topTensionDimensionId),
          "tension",
          100
        )
      : null,
  };
}

function computeOverallTension(dimensions: DimensionResult[]) {
  return weightedMean(
    dimensions.map((dimension) => ({
      value: dimension.tensionScore,
      weight:
        MATCH_WEIGHTS[
          CANONICAL_TO_DIMENSION_ID[dimension.dimension as FounderDimensionKey]
        ] ?? 0,
    }))
  );
}

export function scoreFounderAlignmentV2(
  input: FounderCompatibilityLegacyScoringInput
): TeamScoringResultV2 {
  const profileA = buildFounderMatchProfileFromLegacyAnswers(input.personA);
  const profileB = buildFounderMatchProfileFromLegacyAnswers(input.personB);
  const matchResult = compareFounderProfiles(profileA, profileB);
  const matchMap = new Map(
    matchResult.dimensions.map((dimension) => [dimension.dimensionId, dimension] as const)
  );
  const dimensions = ORDERED_DIMENSION_IDS.map((dimensionId) =>
    dimensionResultFromMatchMap(dimensionId, matchMap)
  );
  const hasAnyScoredDimension = matchResult.dimensions.length > 0;
  const overallTension = hasAnyScoredDimension ? computeOverallTension(dimensions) : null;
  const executiveInsights = buildExecutiveInsights(dimensions, matchResult);

  return {
    dimensions,
    overallFit: hasAnyScoredDimension ? matchResult.overallScore : null,
    overallTension,
    // Legacy alias kept as a temporary compatibility field for downstream consumers
    // that still expect the old property name. The V2 source of truth is overallTension.
    conflictRiskIndex: overallTension,
    overallRedFlags: uniqueStrings(dimensions.flatMap((dimension) => dimension.redFlags)),
    overallGreenFlags: uniqueStrings(dimensions.flatMap((dimension) => dimension.greenFlags)),
    overallCollaborationStrengths: uniqueStrings(
      dimensions.flatMap((dimension) => dimension.collaborationStrengths)
    ),
    overallComplementaryDynamics: uniqueStrings(
      dimensions.flatMap((dimension) => dimension.complementaryDynamics)
    ),
    overallPotentialTensionAreas: uniqueStrings(
      dimensions.flatMap((dimension) => dimension.potentialTensionAreas)
    ),
    executiveInsights,
  };
}

export function scoreFounderAlignmentV2FromAnswerMap(input: {
  personA: FounderCompatibilityAnswerMapV2;
  personB: FounderCompatibilityAnswerMapV2;
}) {
  const profileA = buildFounderMatchProfileFromAnswerMapV2(input.personA);
  const profileB = buildFounderMatchProfileFromAnswerMapV2(input.personB);
  const matchResult = compareFounderProfiles(profileA, profileB);
  const matchMap = new Map(
    matchResult.dimensions.map((dimension) => [dimension.dimensionId, dimension] as const)
  );
  const dimensions = ORDERED_DIMENSION_IDS.map((dimensionId) =>
    dimensionResultFromMatchMap(dimensionId, matchMap)
  );
  const hasAnyScoredDimension = matchResult.dimensions.length > 0;
  const overallTension = hasAnyScoredDimension ? computeOverallTension(dimensions) : null;
  const executiveInsights = buildExecutiveInsights(dimensions, matchResult);

  return {
    dimensions,
    overallFit: hasAnyScoredDimension ? matchResult.overallScore : null,
    overallTension,
    conflictRiskIndex: overallTension,
    overallRedFlags: uniqueStrings(dimensions.flatMap((dimension) => dimension.redFlags)),
    overallGreenFlags: uniqueStrings(dimensions.flatMap((dimension) => dimension.greenFlags)),
    overallCollaborationStrengths: uniqueStrings(
      dimensions.flatMap((dimension) => dimension.collaborationStrengths)
    ),
    overallComplementaryDynamics: uniqueStrings(
      dimensions.flatMap((dimension) => dimension.complementaryDynamics)
    ),
    overallPotentialTensionAreas: uniqueStrings(
      dimensions.flatMap((dimension) => dimension.potentialTensionAreas)
    ),
    executiveInsights,
  };
}

export function scoreFounderAlignmentV2FromAnswersV2(input: {
  personA: FounderCompatibilityAnswerV2[];
  personB: FounderCompatibilityAnswerV2[];
}) {
  return scoreFounderAlignmentV2FromAnswerMap({
    personA: buildFounderCompatibilityAnswerMapV2(input.personA),
    personB: buildFounderCompatibilityAnswerMapV2(input.personB),
  });
}

export function scoreFounderAlignmentV2FromRegistryAnswers(input: {
  personA: Array<Pick<FounderCompatibilityAnswerV2, "itemId" | "value">>;
  personB: Array<Pick<FounderCompatibilityAnswerV2, "itemId" | "value">>;
}) {
  const profileA = buildFounderMatchProfileFromRegistryAnswers(input.personA);
  const profileB = buildFounderMatchProfileFromRegistryAnswers(input.personB);
  return compareFounderProfiles(profileA, profileB);
}
