import { scoreFounderAlignmentV2 } from "@/features/scoring/founderCompatibilityScoringV2";

export type Answer = {
  question_id: string;
  dimension: string;
  value: number;
};

export type PersonAnswers = Answer[];

export type TeamScoringInput = {
  personA: PersonAnswers;
  personB: PersonAnswers;
};

export type ConflictRiskLevel = "low" | "medium" | "high" | "insufficient_data";
export type FitCategory = "very_high" | "high" | "mixed" | "low" | "insufficient_data";
export type TensionCategory = "low" | "moderate" | "elevated" | "insufficient_data";
export type PatternCategory =
  | "aligned"
  | "hidden_difference"
  | "moderate_difference"
  | "clear_difference"
  | "insufficient_data";
export type ReportInsight = {
  kind: "strength" | "complementary_dynamic" | "tension";
  dimension: string | null;
  title: string;
  priorityScore: number;
  source: string;
};

export type ExecutiveInsights = {
  topStrength: ReportInsight | null;
  topComplementaryDynamic: ReportInsight | null;
  topTension: ReportInsight | null;
};

export type DimensionResult = {
  dimension: string;
  scoreA: number | null;
  scoreB: number | null;
  jointState?:
    | "BOTH_LOW"
    | "BOTH_MID"
    | "BOTH_HIGH"
    | "LOW_MID"
    | "MID_HIGH"
    | "OPPOSITE"
    | null;
  hasSharedBlindSpotRisk?: boolean;
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
  // Internal markers kept for technical checks. Later report/UI should prefer the
  // structured fields below instead of rendering "red/green flag" labels directly.
  redFlags: string[];
  greenFlags: string[];
  collaborationStrengths: string[];
  complementaryDynamics: string[];
  potentialTensionAreas: string[];
};

export type TeamScoringResult = {
  dimensions: DimensionResult[];
  overallFit: number | null;
  overallTension: number | null;
  alignmentScore?: number | null;
  workingCompatibilityScore?: number | null;
  sharedBlindSpotRisk?: boolean;
  sharedBlindSpotDimensions?: string[];
  // Deprecated compatibility alias. Active V2 report logic should read overallTension.
  conflictRiskIndex: number | null;
  overallRedFlags: string[];
  overallGreenFlags: string[];
  overallCollaborationStrengths: string[];
  overallComplementaryDynamics: string[];
  overallPotentialTensionAreas: string[];
  executiveInsights: ExecutiveInsights;
};

type WeightedValue = {
  value: number | null;
  weight: number;
};

type KnownDimensionRule = {
  weight: number;
  compute: (context: ScoringContext) => DimensionDetails;
};

type ScoringContext = {
  dimension: string;
  scoreA: number;
  scoreB: number;
  distance: number;
  meanDistance: number;
  itemDistance: number;
  oppositionCount: number;
  hiddenDifferenceScore: number;
  hasHiddenDifferences: boolean;
  alignment: number;
};

type GroupedAnswer = {
  question_id: string;
  value: number;
};

type DistanceInterpretation = {
  maxDistance: number;
  label: string;
  complementary?: boolean;
};

const DIMENSION_ORDER = [
  "Unternehmenslogik",
  "Entscheidungslogik",
  "Risikoorientierung",
  "Arbeitsstruktur & Zusammenarbeit",
  "Commitment",
  "Konfliktstil",
] as const;

type KnownDimension = (typeof DIMENSION_ORDER)[number];

type DimensionDetails = Omit<
  DimensionResult,
  | "dimension"
  | "scoreA"
  | "scoreB"
  | "meanDistance"
  | "distance"
  | "itemDistance"
  | "oppositionCount"
  | "hiddenDifferenceScore"
  | "hasHiddenDifferences"
  | "patternCategory"
  | "alignment"
  | "alignmentCategory"
  | "fitCategory"
>;

const MIN_ANSWERS_PER_PERSON_PER_DIMENSION = 2;

const DISTANCE_INTERPRETATIONS: Record<KnownDimension, DistanceInterpretation[]> = {
  Unternehmenslogik: [
    { maxDistance: 15, label: "sehr ähnliche Unternehmenslogik" },
    { maxDistance: 30, label: "klaerungsbeduerftig" },
    { maxDistance: Number.POSITIVE_INFINITY, label: "moegliches Spannungsfeld" },
  ],
  Entscheidungslogik: [
    { maxDistance: 10, label: "aehnlich" },
    { maxDistance: 20, label: "produktive Ergaenzung", complementary: true },
    { maxDistance: 35, label: "unterschiedliche Arbeitsstile" },
    { maxDistance: Number.POSITIVE_INFINITY, label: "potenzielles Reibungsfeld" },
  ],
  Risikoorientierung: [
    { maxDistance: 10, label: "aehnlich" },
    { maxDistance: 25, label: "starke Ergaenzung", complementary: true },
    { maxDistance: 40, label: "unterschiedliche Komfortzonen" },
    { maxDistance: Number.POSITIVE_INFINITY, label: "strategische Spannungen moeglich" },
  ],
  "Arbeitsstruktur & Zusammenarbeit": [
    { maxDistance: 15, label: "aehnliche Abstimmungsnaehe" },
    { maxDistance: 30, label: "unterschiedliche Arbeitskopplung", complementary: true },
    { maxDistance: Number.POSITIVE_INFINITY, label: "Reibung in Abstimmung und Sichtbarkeit moeglich" },
  ],
  Commitment: [
    { maxDistance: 15, label: "aehnliche Priorisierung" },
    { maxDistance: 25, label: "unterschiedliche Einsatzrahmen" },
    { maxDistance: Number.POSITIVE_INFINITY, label: "deutlich unterschiedliche Arbeitsrealitaeten" },
  ],
  Konfliktstil: [
    { maxDistance: 15, label: "aehnliche Konfliktkultur" },
    { maxDistance: 35, label: "unterschiedliche Stile" },
    { maxDistance: Number.POSITIVE_INFINITY, label: "hohes Missverstaendnispotenzial" },
  ],
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDimensionKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DIMENSION_ALIASES: Record<string, KnownDimension> = {
  "unternehmenslogik": "Unternehmenslogik",
  "unternehmens logik": "Unternehmenslogik",
  "vision & unternehmenshorizont": "Unternehmenslogik",
  "vision unternehmenshorizont": "Unternehmenslogik",
  "vision": "Unternehmenslogik",
  "unternehmenshorizont": "Unternehmenslogik",
  "entscheidungslogik": "Entscheidungslogik",
  "entscheidung": "Entscheidungslogik",
  "entscheidungen": "Entscheidungslogik",
  "risikoorientierung": "Risikoorientierung",
  "risiko": "Risikoorientierung",
  "arbeitsstruktur & zusammenarbeit": "Arbeitsstruktur & Zusammenarbeit",
  "arbeitsstruktur zusammenarbeit": "Arbeitsstruktur & Zusammenarbeit",
  "zusammenarbeit": "Arbeitsstruktur & Zusammenarbeit",
  "arbeitsstruktur": "Arbeitsstruktur & Zusammenarbeit",
  "commitment": "Commitment",
  "konfliktstil": "Konfliktstil",
  "konflikt": "Konfliktstil",
};

export function normalizeDimensionName(dimension: string): string {
  const normalized = normalizeDimensionKey(dimension);
  return DIMENSION_ALIASES[normalized] ?? dimension.trim();
}

function parseNumericValue(value: number) {
  return Number.isFinite(value) ? clamp(value, 0, 100) : null;
}

function groupScorableAnswersByDimension(answers: PersonAnswers): Map<string, GroupedAnswer[]> {
  const grouped = new Map<string, GroupedAnswer[]>();

  for (const answer of answers) {
    const numeric = parseNumericValue(answer.value);
    if (numeric == null) continue;

    const dimension = normalizeDimensionName(answer.dimension);
    const existing = grouped.get(dimension);
    const entry = {
      question_id: answer.question_id,
      value: numeric,
    };

    if (existing) {
      existing.push(entry);
      continue;
    }

    grouped.set(dimension, [entry]);
  }

  return grouped;
}

// Groups answers by normalized dimension and keeps only numeric values on the expected 0..100 scale.
export function groupAnswersByDimension(answers: PersonAnswers): Map<string, number[]> {
  const grouped = new Map<string, number[]>();
  const detailed = groupScorableAnswersByDimension(answers);

  for (const [dimension, entries] of detailed.entries()) {
    grouped.set(
      dimension,
      entries.map((entry) => entry.value)
    );
  }

  return grouped;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return round(sum / values.length);
}

export function weightedMean(entries: WeightedValue[]): number | null {
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

function derivePatternCategory({
  meanDistance,
  itemDistance,
  hasHiddenDifferences,
}: {
  meanDistance: number | null;
  itemDistance: number | null;
  hasHiddenDifferences: boolean;
}): PatternCategory {
  if (meanDistance == null || itemDistance == null) return "insufficient_data";
  if (hasHiddenDifferences) return "hidden_difference";
  if (meanDistance > 35 || itemDistance >= 45) return "clear_difference";
  if (meanDistance > 15 || itemDistance >= 25) return "moderate_difference";
  return "aligned";
}

function getDistanceInterpretation(dimension: KnownDimension, distance: number): DistanceInterpretation {
  return (
    DISTANCE_INTERPRETATIONS[dimension].find((entry) => distance <= entry.maxDistance) ??
    DISTANCE_INTERPRETATIONS[dimension][DISTANCE_INTERPRETATIONS[dimension].length - 1]
  );
}

function fitCategoryPriority(category: FitCategory) {
  if (category === "very_high") return 30;
  if (category === "high") return 18;
  if (category === "mixed") return 8;
  if (category === "low") return 0;
  return -100;
}

function tensionCategoryPriority(category: TensionCategory) {
  if (category === "elevated") return 30;
  if (category === "moderate") return 15;
  if (category === "low") return 0;
  return -100;
}

function dimensionWeight(dimension: string | null) {
  if (!dimension) return 0;
  return DIMENSION_RULES[dimension as KnownDimension]?.weight ?? 0;
}

function dimensionPriorityBonus(
  dimension: string | null,
  emphasis: "strength" | "complementary_dynamic" | "tension"
) {
  if (!dimension) return 0;

  if (emphasis === "strength") {
    if (dimension === "Unternehmenslogik") return 12;
    if (dimension === "Commitment") return 11;
    if (dimension === "Arbeitsstruktur & Zusammenarbeit") return 10;
    return 0;
  }

  if (emphasis === "complementary_dynamic") {
    if (dimension === "Risikoorientierung") return 12;
    if (dimension === "Entscheidungslogik") return 10;
    if (dimension === "Arbeitsstruktur & Zusammenarbeit") return 8;
    return 0;
  }

  if (dimension === "Commitment") return 12;
  if (dimension === "Unternehmenslogik") return 10;
  if (dimension === "Konfliktstil") return 10;
  return 0;
}

function makeInsightKey(insight: ReportInsight) {
  return `${insight.kind}|${insight.dimension ?? "none"}|${insight.title}|${insight.source}`;
}

function pickTopInsight(
  candidates: ReportInsight[],
  usedKeys: Set<string>
): ReportInsight | null {
  const ranked = candidates
    .filter((candidate) => !usedKeys.has(makeInsightKey(candidate)))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const selected = ranked[0] ?? null;
  if (selected) {
    usedKeys.add(makeInsightKey(selected));
  }
  return selected;
}

function toInsufficientDimensionResult(dimension: string): DimensionResult {
  return {
    dimension,
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

function sharedQuestionDiffs(valuesA: GroupedAnswer[], valuesB: GroupedAnswer[]) {
  const byQuestionA = new Map(valuesA.map((entry) => [entry.question_id, entry.value]));
  const byQuestionB = new Map(valuesB.map((entry) => [entry.question_id, entry.value]));
  const sharedQuestionIds = [...byQuestionA.keys()].filter((questionId) => byQuestionB.has(questionId));

  return sharedQuestionIds.map((questionId) => Math.abs((byQuestionA.get(questionId) ?? 0) - (byQuestionB.get(questionId) ?? 0)));
}

function computeItemPatternMetrics(valuesA: GroupedAnswer[], valuesB: GroupedAnswer[]) {
  const diffs = sharedQuestionDiffs(valuesA, valuesB);
  const itemDistance = mean(diffs);
  const oppositionCount = diffs.filter((diff) => diff >= 50).length;
  const meanDistance = Math.abs((mean(valuesA.map((entry) => entry.value)) ?? 0) - (mean(valuesB.map((entry) => entry.value)) ?? 0));
  const hiddenDifferenceScore =
    itemDistance == null ? 0 : round(Math.max(0, itemDistance - meanDistance));
  const hasHiddenDifferences =
    itemDistance != null &&
    meanDistance <= 15 &&
    (itemDistance >= 30 || oppositionCount >= 2);

  return {
    itemDistance,
    oppositionCount,
    hiddenDifferenceScore,
    hasHiddenDifferences,
  };
}

function blendTeamFit(baseTeamFit: number, itemDistance: number) {
  const itemAlignment = 100 - itemDistance;
  return round(baseTeamFit * 0.65 + itemAlignment * 0.35);
}

function blendTensionScore(baseTensionScore: number, itemDistance: number) {
  return round(Math.max(baseTensionScore, baseTensionScore * 0.55 + itemDistance * 0.45));
}

function describeHiddenDifference(dimension: KnownDimension) {
  if (dimension === "Unternehmenslogik") {
    return "Aehnliche Gesamtposition, aber unterschiedliche Antwortmuster zeigen, dass ihr unternehmerische Entscheidungen nicht an denselben Maßstäben ausrichtet.";
  }
  if (dimension === "Entscheidungslogik") {
    return "Aehnliche Position, aber unterschiedliche Antwortmuster zeigen, dass ihr Entscheidungen im Detail nicht ueber dieselbe innere Logik verarbeitet.";
  }
  if (dimension === "Risikoorientierung") {
    return "Aehnliche Position, aber unterschiedliche Antwortmuster zeigen, dass ihr Risiken je nach Situation ueber verschiedene innere Logiken bewertet.";
  }
  if (dimension === "Arbeitsstruktur & Zusammenarbeit") {
    return "Aehnliche Position, aber unterschiedliche Antwortmuster zeigen, dass ihr im Alltag unterschiedlich autonom oder eng abgestimmt arbeiten wollt.";
  }
  if (dimension === "Commitment") {
    return "Aehnliche Position, aber unterschiedliche Antwortmuster zeigen, dass ihr Priorisierung, Verfuegbarkeit und Einsatzniveau nicht in denselben Situationen gleich auslegt.";
  }
  return "Aehnliche Position, aber unterschiedliche Antwortmuster zeigen, dass ihr Spannungen und Konflikte ueber unterschiedliche innere Logiken verarbeitet.";
}

function classifyRisk(distance: number, lowMaxInclusive: number, mediumMaxInclusive: number): ConflictRiskLevel {
  if (distance <= lowMaxInclusive) return "low";
  if (distance <= mediumMaxInclusive) return "medium";
  return "high";
}

function buildVisionResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Unternehmenslogik", context.distance);
  const teamFit = context.hasHiddenDifferences
    ? blendTeamFit(context.alignment, context.itemDistance)
    : context.alignment;
  const tensionScore = context.hasHiddenDifferences
    ? blendTensionScore(context.distance, context.itemDistance)
    : context.distance;

  return {
    complementarity: null,
    teamFit,
    conflictRisk: classifyRisk(tensionScore, 15, 30),
    tensionScore,
    tensionCategory: deriveTensionCategory(tensionScore),
    dynamicLabel: context.hasHiddenDifferences
      ? "aehnliche Position, unterschiedliche innere Logik"
      : interpretation.label,
    isComplementaryDynamic: false,
    redFlags: [
      ...(context.distance > 35 ? ["Die Unternehmenslogik liegt deutlich auseinander."] : []),
      ...(context.hasHiddenDifferences ? [describeHiddenDifference("Unternehmenslogik")] : []),
    ],
    greenFlags: [],
    collaborationStrengths:
      context.distance <= 15 && !context.hasHiddenDifferences
        ? ["Die Unternehmenslogik bildet derzeit eine sehr stabile gemeinsame Basis."]
        : [],
    complementaryDynamics: [],
    potentialTensionAreas:
      [
        ...(context.distance > 15
          ? [
              context.distance <= 30
                ? "Die Unternehmenslogik ist derzeit klaerungsbeduerftig."
                : "Die Unternehmenslogik kann ein Spannungsfeld erzeugen.",
            ]
          : []),
        ...(context.hasHiddenDifferences ? [describeHiddenDifference("Unternehmenslogik")] : []),
      ],
  };
}

function buildDecisionResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Entscheidungslogik", context.distance);
  const hasProductiveTension = context.distance >= 10 && context.distance <= 20;
  const bonus = hasProductiveTension ? 8 : 0;
  const baseTeamFit = round(Math.min(100, context.alignment + bonus));
  const teamFit = context.hasHiddenDifferences
    ? blendTeamFit(baseTeamFit, context.itemDistance)
    : baseTeamFit;
  const tensionScore = context.hasHiddenDifferences
    ? blendTensionScore(context.distance, context.itemDistance)
    : context.distance;

  return {
    complementarity: null,
    teamFit,
    conflictRisk: classifyRisk(tensionScore, 20, 35),
    tensionScore,
    tensionCategory: deriveTensionCategory(tensionScore),
    dynamicLabel: context.hasHiddenDifferences
      ? "aehnliche Position, unterschiedliche innere Logik"
      : interpretation.label,
    isComplementaryDynamic: hasProductiveTension && !context.hasHiddenDifferences,
    redFlags: [],
    greenFlags: hasProductiveTension && !context.hasHiddenDifferences
      ? ["Moderate Unterschiede in der Entscheidungslogik koennen produktiv sein."]
      : [],
    collaborationStrengths:
      context.distance <= 10 && !context.hasHiddenDifferences
        ? ["Die Entscheidungslogik ist sehr aehnlich und wirkt leicht anschlussfaehig."]
        : [],
    complementaryDynamics:
      hasProductiveTension && !context.hasHiddenDifferences
        ? ["Die Entscheidungslogik zeigt eine produktive ergaenzende Dynamik."]
        : [],
    potentialTensionAreas:
      [
        ...(context.distance > 20
          ? [
              context.distance <= 35
                ? "Unterschiedliche Entscheidungsstile brauchen bewusste Abstimmung."
                : "Die Entscheidungslogik kann zu spuerbarem Reibungspotenzial fuehren.",
            ]
          : []),
        ...(context.hasHiddenDifferences ? [describeHiddenDifference("Entscheidungslogik")] : []),
      ],
  };
}

function buildRiskResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Risikoorientierung", context.distance);
  let complementarity: number;
  if (context.distance >= 10 && context.distance <= 25) {
    complementarity = 90;
  } else if (context.distance >= 26 && context.distance <= 35) {
    complementarity = 70;
  } else if (context.distance <= 9) {
    complementarity = 55;
  } else {
    complementarity = 30;
  }

  let teamFit: number;
  if (context.distance <= 9) {
    // Near-identical risk profiles should remain the strongest passung signal.
    teamFit = context.alignment;
  } else if (context.distance <= 25) {
    // Moderate differences can be valuable, but should not outrank perfect alignment.
    teamFit = Math.min(92, context.alignment + 6);
  } else if (context.distance <= 35) {
    teamFit = round(0.8 * context.alignment + 0.2 * complementarity);
  } else {
    teamFit = round(0.85 * context.alignment + 0.15 * complementarity);
  }
  const blendedTeamFit = context.hasHiddenDifferences
    ? blendTeamFit(teamFit, context.itemDistance)
    : round(teamFit);
  const tensionScore = context.hasHiddenDifferences
    ? blendTensionScore(context.distance, context.itemDistance)
    : context.distance;

  return {
    complementarity,
    teamFit: blendedTeamFit,
    conflictRisk: classifyRisk(tensionScore, 25, 40),
    tensionScore,
    tensionCategory: deriveTensionCategory(tensionScore),
    dynamicLabel: context.hasHiddenDifferences
      ? "aehnliche Position, unterschiedliche innere Logik"
      : interpretation.label,
    isComplementaryDynamic: context.distance >= 10 && context.distance <= 25 && !context.hasHiddenDifferences,
    redFlags: context.distance > 45 ? ["Sehr grosse Unterschiede in der Risikoorientierung koennen das Team belasten."] : [],
    greenFlags:
      context.distance >= 10 && context.distance <= 25 && !context.hasHiddenDifferences
        ? ["Unterschiede in der Risikoorientierung koennen sich sinnvoll ergaenzen."]
        : [],
    collaborationStrengths:
      context.distance <= 10 && !context.hasHiddenDifferences
        ? ["Die Risikoorientierung ist sehr aehnlich und schafft strategische Klarheit."]
        : [],
    complementaryDynamics:
      context.distance >= 10 && context.distance <= 25 && !context.hasHiddenDifferences
        ? ["Die Risikoorientierung wirkt als starke ergaenzende Dynamik."]
        : [],
    potentialTensionAreas:
      [
        ...(context.distance > 25
          ? [
              context.distance <= 40
                ? "Die Risikoorientierung zeigt unterschiedliche Komfortzonen."
                : "In der Risikoorientierung sind strategische Spannungen moeglich.",
            ]
          : []),
        ...(context.hasHiddenDifferences ? [describeHiddenDifference("Risikoorientierung")] : []),
      ],
  };
}

function buildCollaborationResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Arbeitsstruktur & Zusammenarbeit", context.distance);
  const hasProductiveDifference = context.distance >= 10 && context.distance <= 20;
  const hasComplementaryDynamic = context.distance >= 8 && context.distance <= 18;
  const baseTeamFit = round(Math.min(100, context.alignment + (hasProductiveDifference ? 5 : 0)));
  const teamFit = context.hasHiddenDifferences
    ? blendTeamFit(baseTeamFit, context.itemDistance)
    : baseTeamFit;
  const tensionScore = context.hasHiddenDifferences
    ? blendTensionScore(context.distance, context.itemDistance)
    : context.distance;

  return {
    complementarity: null,
    teamFit,
    conflictRisk: classifyRisk(tensionScore, 20, 35),
    tensionScore,
    tensionCategory: deriveTensionCategory(tensionScore),
    dynamicLabel: context.hasHiddenDifferences
      ? "aehnliche Position, unterschiedliche innere Logik"
      : interpretation.label,
    isComplementaryDynamic: hasComplementaryDynamic && !context.hasHiddenDifferences,
    redFlags:
      [
        ...(context.distance > 40
          ? ["Wie eng ihr im Alltag verbunden arbeiten wollt, unterscheidet sich sehr stark."]
          : []),
        ...(context.hasHiddenDifferences ? [describeHiddenDifference("Arbeitsstruktur & Zusammenarbeit")] : []),
      ],
    greenFlags:
      hasComplementaryDynamic && !context.hasHiddenDifferences
        ? ["Die Unterschiede in Abstimmungsnaehe und Sichtbarkeit wirken gut ausbalanciert."]
        : [],
    collaborationStrengths:
      context.distance <= 15 && !context.hasHiddenDifferences
        ? ["Eure gewuenschte Abstimmungsnaehe wirkt im Alltag aehnlich und leicht koordinierbar."]
        : [],
    complementaryDynamics:
      hasComplementaryDynamic && !context.hasHiddenDifferences
        ? ["Unterschiede in Arbeitskopplung und Sichtbarkeit koennen sich im Alltag ergaenzen."]
        : [],
    potentialTensionAreas:
      [
        ...(context.distance > 15
          ? [
              context.distance <= 30
                ? "Ihr braucht unterschiedlich viel Abstimmung und Sichtbarkeit im Alltag."
                : "Im Arbeitsalltag sind deutliche Reibungen bei Abstimmung und Arbeitskopplung moeglich.",
            ]
          : []),
        ...(context.hasHiddenDifferences ? [describeHiddenDifference("Arbeitsstruktur & Zusammenarbeit")] : []),
      ],
  };
}

function buildCommitmentResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Commitment", context.distance);
  const teamFit = context.hasHiddenDifferences
    ? blendTeamFit(context.alignment, context.itemDistance)
    : context.alignment;
  const tensionScore = context.hasHiddenDifferences
    ? blendTensionScore(context.distance, context.itemDistance)
    : context.distance;

  return {
    complementarity: null,
    teamFit,
    conflictRisk: classifyRisk(tensionScore, 15, 25),
    tensionScore,
    tensionCategory: deriveTensionCategory(tensionScore),
    dynamicLabel: context.hasHiddenDifferences
      ? "aehnliche Position, unterschiedliche innere Logik"
      : interpretation.label,
    isComplementaryDynamic: false,
    redFlags: [
      ...(context.distance > 30 ? ["Priorisierung und erwartetes Einsatzniveau liegen deutlich auseinander."] : []),
      ...(context.hasHiddenDifferences ? [describeHiddenDifference("Commitment")] : []),
    ],
    greenFlags: [],
    collaborationStrengths:
      context.distance <= 15 && !context.hasHiddenDifferences
        ? ["Priorisierung und erwartetes Einsatzniveau wirken aehnlich ausgerichtet."]
        : [],
    complementaryDynamics: [],
    potentialTensionAreas:
      [
        ...(context.distance > 15
          ? [
              context.distance <= 25
                ? "Im Commitment zeigen sich unterschiedliche Einsatzrahmen."
                : "Commitment kann im Alltag zu deutlichen Erwartungsunterschieden fuehren.",
            ]
          : []),
        ...(context.hasHiddenDifferences ? [describeHiddenDifference("Commitment")] : []),
      ],
  };
}

function buildConflictStyleResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Konfliktstil", context.distance);
  const extremeOpposition =
    (context.scoreA > 75 && context.scoreB < 25) || (context.scoreB > 75 && context.scoreA < 25);
  const tensionScore = context.hasHiddenDifferences
    ? blendTensionScore(extremeOpposition ? Math.max(context.distance, 56) : context.distance, context.itemDistance)
    : extremeOpposition
      ? Math.max(context.distance, 56)
      : context.distance;
  const baseRisk = classifyRisk(tensionScore, 20, 35);
  const conflictRisk = extremeOpposition || baseRisk === "high" ? "high" : baseRisk;
  const redFlags = [];

  if (context.distance > 40) {
    redFlags.push("Die Konfliktstile liegen weit auseinander.");
  }
  if (extremeOpposition) {
    redFlags.push("Extreme Gegenpole im Konfliktstil deuten auf hohes Eskalationsrisiko hin.");
  }
  if (context.hasHiddenDifferences) {
    redFlags.push(describeHiddenDifference("Konfliktstil"));
  }

  return {
    complementarity: null,
    teamFit: context.hasHiddenDifferences
      ? blendTeamFit(context.alignment, context.itemDistance)
      : context.alignment,
    conflictRisk,
    tensionScore,
    tensionCategory: deriveTensionCategory(tensionScore),
    dynamicLabel: context.hasHiddenDifferences
      ? "aehnliche Position, unterschiedliche innere Logik"
      : interpretation.label,
    isComplementaryDynamic: false,
    redFlags,
    greenFlags: [],
    collaborationStrengths:
      context.distance <= 15 && !context.hasHiddenDifferences
        ? ["Die Konfliktkultur ist aehnlich und dadurch leichter anschlussfaehig."]
        : [],
    complementaryDynamics: [],
    potentialTensionAreas:
      [
        ...(context.distance > 15 || extremeOpposition
          ? [
              context.distance <= 35 && !extremeOpposition
                ? "Die Konfliktstile unterscheiden sich und brauchen bewusste Uebersetzung."
                : "Im Konfliktstil besteht hohes Missverstaendnis- oder Eskalationspotenzial.",
            ]
          : []),
        ...(context.hasHiddenDifferences ? [describeHiddenDifference("Konfliktstil")] : []),
      ],
  };
}

const DIMENSION_RULES: Record<KnownDimension, KnownDimensionRule> = {
  Unternehmenslogik: {
    weight: 22,
    compute: buildVisionResult,
  },
  Entscheidungslogik: {
    weight: 16,
    compute: buildDecisionResult,
  },
  Risikoorientierung: {
    weight: 14,
    compute: buildRiskResult,
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    weight: 16,
    compute: buildCollaborationResult,
  },
  Commitment: {
    weight: 20,
    compute: buildCommitmentResult,
  },
  Konfliktstil: {
    weight: 12,
    compute: buildConflictStyleResult,
  },
};

function scoreDimension(
  dimension: KnownDimension,
  personAByDimension: Map<string, GroupedAnswer[]>,
  personBByDimension: Map<string, GroupedAnswer[]>
): DimensionResult {
  const valuesA = personAByDimension.get(dimension) ?? [];
  const valuesB = personBByDimension.get(dimension) ?? [];

  if (
    valuesA.length < MIN_ANSWERS_PER_PERSON_PER_DIMENSION ||
    valuesB.length < MIN_ANSWERS_PER_PERSON_PER_DIMENSION
  ) {
    return toInsufficientDimensionResult(dimension);
  }

  const scoreA = mean(valuesA.map((entry) => entry.value));
  const scoreB = mean(valuesB.map((entry) => entry.value));
  if (scoreA == null || scoreB == null) {
    return toInsufficientDimensionResult(dimension);
  }

  const meanDistance = round(Math.abs(scoreA - scoreB));
  const alignment = round(100 - meanDistance);
  const { itemDistance, oppositionCount, hiddenDifferenceScore, hasHiddenDifferences } =
    computeItemPatternMetrics(valuesA, valuesB);
  if (itemDistance == null) {
    return toInsufficientDimensionResult(dimension);
  }
  const details = DIMENSION_RULES[dimension].compute({
    dimension,
    scoreA,
    scoreB,
    distance: meanDistance,
    meanDistance,
    itemDistance,
    oppositionCount,
    hiddenDifferenceScore,
    hasHiddenDifferences,
    alignment,
  });

  return {
    dimension,
    scoreA,
    scoreB,
    meanDistance,
    distance: meanDistance,
    itemDistance,
    oppositionCount,
    hiddenDifferenceScore,
    hasHiddenDifferences,
    patternCategory: derivePatternCategory({
      meanDistance,
      itemDistance,
      hasHiddenDifferences,
    }),
    alignment,
    alignmentCategory: deriveFitCategory(alignment),
    complementarity: details.complementarity == null ? null : round(details.complementarity),
    teamFit: details.teamFit == null ? null : round(details.teamFit),
    fitCategory: deriveFitCategory(details.teamFit ?? alignment),
    conflictRisk: details.conflictRisk,
    tensionScore: details.tensionScore == null ? null : round(details.tensionScore),
    tensionCategory: details.tensionCategory,
    dynamicLabel: details.dynamicLabel,
    isComplementaryDynamic: details.isComplementaryDynamic,
    redFlags: details.redFlags,
    greenFlags: details.greenFlags,
    collaborationStrengths: details.collaborationStrengths,
    complementaryDynamics: details.complementaryDynamics,
    potentialTensionAreas: details.potentialTensionAreas,
  };
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function buildStrengthCandidate(result: DimensionResult): ReportInsight | null {
  const hasStrengthSignal =
    result.collaborationStrengths.length > 0 ||
    result.fitCategory === "very_high" ||
    result.fitCategory === "high";

  if (!hasStrengthSignal || result.teamFit == null) {
    return null;
  }

  const title =
    result.collaborationStrengths[0] ??
    (result.dynamicLabel ? `${result.dimension}: ${result.dynamicLabel}` : `Staerke in ${result.dimension}`);
  const source = result.collaborationStrengths[0] ?? result.dynamicLabel ?? "fit_category";
  const priorityScore = round(
    result.teamFit +
      fitCategoryPriority(result.fitCategory) +
      dimensionPriorityBonus(result.dimension, "strength") +
      dimensionWeight(result.dimension) * 0.2 +
      (result.collaborationStrengths.length > 0 ? 6 : 0) -
      (result.hasHiddenDifferences ? 16 : 0),
    2
  );

  return {
    kind: "strength",
    dimension: result.dimension,
    title,
    priorityScore,
    source,
  };
}

function buildComplementaryCandidate(result: DimensionResult): ReportInsight | null {
  if (!result.isComplementaryDynamic || result.complementaryDynamics.length === 0) {
    return null;
  }

  const title = result.complementaryDynamics[0];
  const source = result.dynamicLabel ?? result.complementaryDynamics[0];
  const priorityScore = round(
    (result.complementarity ?? 0) +
      (result.teamFit ?? 0) * 0.25 +
      dimensionPriorityBonus(result.dimension, "complementary_dynamic") +
      dimensionWeight(result.dimension) * 0.2 +
      (result.fitCategory === "very_high" || result.fitCategory === "high" ? 6 : 0),
    2
  );

  return {
    kind: "complementary_dynamic",
    dimension: result.dimension,
    title,
    priorityScore,
    source,
  };
}

function buildTensionCandidate(result: DimensionResult): ReportInsight | null {
  const hasTensionSignal =
    result.potentialTensionAreas.length > 0 ||
    result.tensionCategory === "moderate" ||
    result.tensionCategory === "elevated";

  if (!hasTensionSignal || result.tensionScore == null) {
    return null;
  }

  const title =
    result.potentialTensionAreas[0] ??
    (result.dynamicLabel ? `${result.dimension}: ${result.dynamicLabel}` : `Spannungsfeld in ${result.dimension}`);
  const source = result.potentialTensionAreas[0] ?? result.dynamicLabel ?? "tension_category";
  const priorityScore = round(
    result.tensionScore +
      tensionCategoryPriority(result.tensionCategory) +
      dimensionPriorityBonus(result.dimension, "tension") +
      dimensionWeight(result.dimension) * 0.2 +
      (result.potentialTensionAreas.length > 0 ? 6 : 0) +
      (result.hasHiddenDifferences ? 14 : 0),
    2
  );

  return {
    kind: "tension",
    dimension: result.dimension,
    title,
    priorityScore,
    source,
  };
}

function selectExecutiveInsights(dimensions: DimensionResult[]): ExecutiveInsights {
  const usedKeys = new Set<string>();
  const strengthCandidates = dimensions.flatMap((result) => {
    const candidate = buildStrengthCandidate(result);
    return candidate ? [candidate] : [];
  });
  const complementaryCandidates = dimensions.flatMap((result) => {
    const candidate = buildComplementaryCandidate(result);
    return candidate ? [candidate] : [];
  });
  const tensionCandidates = dimensions.flatMap((result) => {
    const candidate = buildTensionCandidate(result);
    return candidate ? [candidate] : [];
  });

  return {
    topStrength: pickTopInsight(strengthCandidates, usedKeys),
    topComplementaryDynamic: pickTopInsight(complementaryCandidates, usedKeys),
    topTension: pickTopInsight(tensionCandidates, usedKeys),
  };
}

export function scoreFounderAlignment(input: TeamScoringInput): TeamScoringResult {
  return scoreFounderAlignmentV2(input);
}

export const founderScoring = {
  normalizeDimensionName,
  groupAnswersByDimension,
  mean,
  weightedMean,
  scoreFounderAlignment,
};

/*
Example usage:

const result = scoreFounderAlignment({
  personA: [
    { question_id: "q1", dimension: "Unternehmenslogik", value: 100 },
    { question_id: "q2", dimension: "Unternehmenslogik", value: 75 },
    { question_id: "q3", dimension: "Commitment", value: 100 },
  ],
  personB: [
    { question_id: "q1", dimension: "Unternehmenslogik", value: 75 },
    { question_id: "q2", dimension: "Unternehmenslogik", value: 75 },
    { question_id: "q3", dimension: "Commitment", value: 50 },
  ],
});

console.log(result.overallFit);
console.log(result.dimensions[0]);
*/
