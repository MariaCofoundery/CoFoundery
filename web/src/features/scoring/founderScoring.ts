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
  distance: number | null;
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
  alignment: number;
};

type DistanceInterpretation = {
  maxDistance: number;
  label: string;
  complementary?: boolean;
};

const DIMENSION_ORDER = [
  "Vision & Unternehmenshorizont",
  "Entscheidungslogik",
  "Risikoorientierung",
  "Arbeitsstruktur & Zusammenarbeit",
  "Commitment",
  "Konfliktstil",
] as const;

type KnownDimension = (typeof DIMENSION_ORDER)[number];

type DimensionDetails = Omit<
  DimensionResult,
  "dimension" | "scoreA" | "scoreB" | "distance" | "alignment" | "alignmentCategory" | "fitCategory"
>;

const MIN_ANSWERS_PER_PERSON_PER_DIMENSION = 2;

const DISTANCE_INTERPRETATIONS: Record<KnownDimension, DistanceInterpretation[]> = {
  "Vision & Unternehmenshorizont": [
    { maxDistance: 15, label: "sehr stabile Basis" },
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
    { maxDistance: 15, label: "harmonische Arbeitsweise" },
    { maxDistance: 30, label: "unterschiedliche Praeferenzen", complementary: true },
    { maxDistance: Number.POSITIVE_INFINITY, label: "moegliche Reibungen im Alltag" },
  ],
  Commitment: [
    { maxDistance: 15, label: "gleiche Einsatzhaltung" },
    { maxDistance: 25, label: "unterschiedliche Belastungsmodelle" },
    { maxDistance: Number.POSITIVE_INFINITY, label: "kritisches Thema" },
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
  "vision & unternehmenshorizont": "Vision & Unternehmenshorizont",
  "vision unternehmenshorizont": "Vision & Unternehmenshorizont",
  "vision": "Vision & Unternehmenshorizont",
  "unternehmenshorizont": "Vision & Unternehmenshorizont",
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

// Groups answers by normalized dimension and keeps only numeric values on the expected 0..100 scale.
export function groupAnswersByDimension(answers: PersonAnswers): Map<string, number[]> {
  const grouped = new Map<string, number[]>();

  for (const answer of answers) {
    const numeric = parseNumericValue(answer.value);
    if (numeric == null) continue;

    const dimension = normalizeDimensionName(answer.dimension);
    const existing = grouped.get(dimension);
    if (existing) {
      existing.push(numeric);
      continue;
    }
    grouped.set(dimension, [numeric]);
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
    if (dimension === "Vision & Unternehmenshorizont") return 12;
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
  if (dimension === "Vision & Unternehmenshorizont") return 10;
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
    distance: null,
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

function classifyRisk(distance: number, lowMaxInclusive: number, mediumMaxInclusive: number): ConflictRiskLevel {
  if (distance <= lowMaxInclusive) return "low";
  if (distance <= mediumMaxInclusive) return "medium";
  return "high";
}

function buildVisionResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Vision & Unternehmenshorizont", context.distance);

  return {
    complementarity: null,
    teamFit: context.alignment,
    conflictRisk: classifyRisk(context.distance, 15, 30),
    tensionScore: context.distance,
    tensionCategory: deriveTensionCategory(context.distance),
    dynamicLabel: interpretation.label,
    isComplementaryDynamic: false,
    redFlags: context.distance > 35 ? ["Visionen und Unternehmenshorizonte liegen weit auseinander."] : [],
    greenFlags: [],
    collaborationStrengths:
      context.distance <= 15 ? ["Vision und Unternehmenshorizont bilden eine sehr stabile gemeinsame Basis."] : [],
    complementaryDynamics: [],
    potentialTensionAreas:
      context.distance > 15
        ? [
            context.distance <= 30
              ? "Vision und Unternehmenshorizont sind derzeit klaerungsbeduerftig."
              : "Vision und Unternehmenshorizont koennen ein Spannungsfeld erzeugen.",
          ]
        : [],
  };
}

function buildDecisionResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Entscheidungslogik", context.distance);
  const hasProductiveTension = context.distance >= 10 && context.distance <= 20;
  const bonus = hasProductiveTension ? 8 : 0;

  return {
    complementarity: null,
    teamFit: round(Math.min(100, context.alignment + bonus)),
    conflictRisk: classifyRisk(context.distance, 20, 35),
    tensionScore: context.distance,
    tensionCategory: deriveTensionCategory(context.distance),
    dynamicLabel: interpretation.label,
    isComplementaryDynamic: hasProductiveTension,
    redFlags: [],
    greenFlags: hasProductiveTension
      ? ["Moderate Unterschiede in der Entscheidungslogik koennen produktiv sein."]
      : [],
    collaborationStrengths:
      context.distance <= 10 ? ["Die Entscheidungslogik ist sehr aehnlich und wirkt leicht anschlussfaehig."] : [],
    complementaryDynamics:
      hasProductiveTension
        ? ["Die Entscheidungslogik zeigt eine produktive ergaenzende Dynamik."]
        : [],
    potentialTensionAreas:
      context.distance > 20
        ? [
            context.distance <= 35
              ? "Unterschiedliche Entscheidungsstile brauchen bewusste Abstimmung."
              : "Die Entscheidungslogik kann zu spuerbarem Reibungspotenzial fuehren.",
          ]
        : [],
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

  return {
    complementarity,
    teamFit: round(teamFit),
    conflictRisk: classifyRisk(context.distance, 25, 40),
    tensionScore: context.distance,
    tensionCategory: deriveTensionCategory(context.distance),
    dynamicLabel: interpretation.label,
    isComplementaryDynamic: context.distance >= 10 && context.distance <= 25,
    redFlags: context.distance > 45 ? ["Sehr grosse Unterschiede in der Risikoorientierung koennen das Team belasten."] : [],
    greenFlags:
      context.distance >= 10 && context.distance <= 25
        ? ["Unterschiede in der Risikoorientierung koennen sich sinnvoll ergaenzen."]
        : [],
    collaborationStrengths:
      context.distance <= 10 ? ["Die Risikoorientierung ist sehr aehnlich und schafft strategische Klarheit."] : [],
    complementaryDynamics:
      context.distance >= 10 && context.distance <= 25
        ? ["Die Risikoorientierung wirkt als starke ergaenzende Dynamik."]
        : [],
    potentialTensionAreas:
      context.distance > 25
        ? [
            context.distance <= 40
              ? "Die Risikoorientierung zeigt unterschiedliche Komfortzonen."
              : "In der Risikoorientierung sind strategische Spannungen moeglich.",
          ]
        : [],
  };
}

function buildCollaborationResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Arbeitsstruktur & Zusammenarbeit", context.distance);
  const hasProductiveDifference = context.distance >= 10 && context.distance <= 20;
  const hasComplementaryDynamic = context.distance >= 8 && context.distance <= 18;

  return {
    complementarity: null,
    teamFit: round(Math.min(100, context.alignment + (hasProductiveDifference ? 5 : 0))),
    conflictRisk: classifyRisk(context.distance, 20, 35),
    tensionScore: context.distance,
    tensionCategory: deriveTensionCategory(context.distance),
    dynamicLabel: interpretation.label,
    isComplementaryDynamic: hasComplementaryDynamic,
    redFlags:
      context.distance > 40
        ? ["Arbeitsstruktur und Zusammenarbeit unterscheiden sich sehr stark."]
        : [],
    greenFlags:
      hasComplementaryDynamic
        ? ["Die Unterschiede in der Zusammenarbeit wirken ausgewogen und anschlussfaehig."]
        : [],
    collaborationStrengths:
      context.distance <= 15 ? ["Die Arbeitsweise wirkt harmonisch und im Alltag leicht koordinierbar."] : [],
    complementaryDynamics:
      hasComplementaryDynamic
        ? ["Unterschiede in der Arbeitsstruktur koennen eine ergaenzende Zusammenarbeit foerdern."]
        : [],
    potentialTensionAreas:
      context.distance > 15
        ? [
            context.distance <= 30
              ? "In der Zusammenarbeit bestehen unterschiedliche Praeferenzen, die bewusste Abstimmung brauchen."
              : "Im Arbeitsalltag sind Reibungen in Struktur und Zusammenarbeit moeglich.",
          ]
        : [],
  };
}

function buildCommitmentResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Commitment", context.distance);

  return {
    complementarity: null,
    teamFit: context.alignment,
    conflictRisk: classifyRisk(context.distance, 15, 25),
    tensionScore: context.distance,
    tensionCategory: deriveTensionCategory(context.distance),
    dynamicLabel: interpretation.label,
    isComplementaryDynamic: false,
    redFlags: context.distance > 30 ? ["Das Commitment-Niveau wirkt deutlich unterschiedlich."] : [],
    greenFlags: [],
    collaborationStrengths:
      context.distance <= 15 ? ["Das Commitment wirkt auf einem aehnlichen Einsatzniveau verankert."] : [],
    complementaryDynamics: [],
    potentialTensionAreas:
      context.distance > 15
        ? [
            context.distance <= 25
              ? "Im Commitment zeigen sich unterschiedliche Belastungsmodelle."
              : "Commitment ist ein potenziell kritisches Thema fuer die Zusammenarbeit.",
          ]
        : [],
  };
}

function buildConflictStyleResult(context: ScoringContext): DimensionDetails {
  const interpretation = getDistanceInterpretation("Konfliktstil", context.distance);
  const extremeOpposition =
    (context.scoreA > 75 && context.scoreB < 25) || (context.scoreB > 75 && context.scoreA < 25);
  const baseRisk = classifyRisk(context.distance, 20, 35);
  const conflictRisk = extremeOpposition || baseRisk === "high" ? "high" : baseRisk;
  const redFlags = [];
  const tensionScore = extremeOpposition ? Math.max(context.distance, 56) : context.distance;

  if (context.distance > 40) {
    redFlags.push("Die Konfliktstile liegen weit auseinander.");
  }
  if (extremeOpposition) {
    redFlags.push("Extreme Gegenpole im Konfliktstil deuten auf hohes Eskalationsrisiko hin.");
  }

  return {
    complementarity: null,
    teamFit: context.alignment,
    conflictRisk,
    tensionScore,
    tensionCategory: deriveTensionCategory(tensionScore),
    dynamicLabel: interpretation.label,
    isComplementaryDynamic: false,
    redFlags,
    greenFlags: [],
    collaborationStrengths:
      context.distance <= 15 ? ["Die Konfliktkultur ist aehnlich und dadurch leichter anschlussfaehig."] : [],
    complementaryDynamics: [],
    potentialTensionAreas:
      context.distance > 15 || extremeOpposition
        ? [
            context.distance <= 35 && !extremeOpposition
              ? "Die Konfliktstile unterscheiden sich und brauchen bewusste Uebersetzung."
              : "Im Konfliktstil besteht hohes Missverstaendnis- oder Eskalationspotenzial.",
          ]
        : [],
  };
}

const DIMENSION_RULES: Record<KnownDimension, KnownDimensionRule> = {
  "Vision & Unternehmenshorizont": {
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
  personAByDimension: Map<string, number[]>,
  personBByDimension: Map<string, number[]>
): DimensionResult {
  const valuesA = personAByDimension.get(dimension) ?? [];
  const valuesB = personBByDimension.get(dimension) ?? [];

  if (
    valuesA.length < MIN_ANSWERS_PER_PERSON_PER_DIMENSION ||
    valuesB.length < MIN_ANSWERS_PER_PERSON_PER_DIMENSION
  ) {
    return toInsufficientDimensionResult(dimension);
  }

  const scoreA = mean(valuesA);
  const scoreB = mean(valuesB);
  if (scoreA == null || scoreB == null) {
    return toInsufficientDimensionResult(dimension);
  }

  const distance = round(Math.abs(scoreA - scoreB));
  const alignment = round(100 - distance);
  const details = DIMENSION_RULES[dimension].compute({
    dimension,
    scoreA,
    scoreB,
    distance,
    alignment,
  });

  return {
    dimension,
    scoreA,
    scoreB,
    distance,
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
      (result.collaborationStrengths.length > 0 ? 6 : 0),
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
      (result.potentialTensionAreas.length > 0 ? 6 : 0),
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
  const personAByDimension = groupAnswersByDimension(input.personA);
  const personBByDimension = groupAnswersByDimension(input.personB);

  const dimensions = DIMENSION_ORDER.map((dimension) =>
    scoreDimension(dimension, personAByDimension, personBByDimension)
  );
  const executiveInsights = selectExecutiveInsights(dimensions);

  const overallFit = weightedMean(
    dimensions.map((dimensionResult) => ({
      value: dimensionResult.teamFit,
      weight: DIMENSION_RULES[dimensionResult.dimension as KnownDimension].weight,
    }))
  );

  const conflictRiskIndex = weightedMean(
    dimensions.map((dimensionResult) => ({
      // Use the underlying tension score directly so the overall index changes
      // continuously with small differences instead of jumping between 0/50/100 buckets.
      value: dimensionResult.tensionScore,
      weight: DIMENSION_RULES[dimensionResult.dimension as KnownDimension].weight,
    }))
  );

  return {
    dimensions,
    overallFit,
    conflictRiskIndex,
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
    { question_id: "q1", dimension: "Vision & Unternehmenshorizont", value: 100 },
    { question_id: "q2", dimension: "Vision & Unternehmenshorizont", value: 75 },
    { question_id: "q3", dimension: "Commitment", value: 100 },
  ],
  personB: [
    { question_id: "q1", dimension: "Vision & Unternehmenshorizont", value: 75 },
    { question_id: "q2", dimension: "Vision & Unternehmenshorizont", value: 75 },
    { question_id: "q3", dimension: "Commitment", value: 50 },
  ],
});

console.log(result.overallFit);
console.log(result.dimensions[0]);
*/
