import {
  compareFounderProfiles,
  MATCH_WEIGHTS,
  type DimensionId,
  type DimensionMatch,
  type FounderMatchProfile,
  type JointState,
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
  jointState: JointState | null;
  hasSharedBlindSpotRisk: boolean;
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
  alignmentScore: number | null;
  workingCompatibilityScore: number | null;
  sharedBlindSpotRisk: boolean;
  sharedBlindSpotDimensions: string[];
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

const SHARED_POSITION_LABELS: Record<
  DimensionId,
  {
    BOTH_HIGH: string;
    BOTH_LOW: string;
  }
> = {
  company_logic: {
    BOTH_HIGH: "gemeinsamer Zug in dieselbe starke Richtung",
    BOTH_LOW: "gemeinsame Absicherung in dieselbe Richtung",
  },
  decision_logic: {
    BOTH_HIGH: "gemeinsamer hoher Entscheidungszug",
    BOTH_LOW: "gemeinsame hohe Prueftiefe",
  },
  work_structure: {
    BOTH_HIGH: "gemeinsam hoher Eigenraum- und Tempodruck",
    BOTH_LOW: "gemeinsam hoher Sichtbarkeits- und Abstimmungsbedarf",
  },
  commitment: {
    BOTH_HIGH: "gemeinsam sehr hohes Einsatzniveau",
    BOTH_LOW: "gemeinsam begrenzterer Einsatzrahmen",
  },
  risk_orientation: {
    BOTH_HIGH: "gemeinsam hohe Risikobereitschaft",
    BOTH_LOW: "gemeinsam hohe Absicherungslogik",
  },
  conflict_style: {
    BOTH_HIGH: "gemeinsam direkte Klaerung",
    BOTH_LOW: "gemeinsam spaete oder vorsichtige Klaerung",
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

const DIMENSION_SHARED_POSITION_TEXT: Record<
  DimensionId,
  {
    BOTH_HIGH: string;
    BOTH_LOW: string;
  }
> = {
  company_logic: {
    BOTH_HIGH:
      "Ihr schaut beide eher nach vorne, Hebel und Bewegung. Das schafft Zug, braucht aber eine bewusste Gegenkraft gegen opportunistische Richtungswechsel.",
    BOTH_LOW:
      "Ihr schaut beide eher auf Substanz und Absicherung. Das kann tragen, braucht aber Schutz davor, dass Chancen zu spaet geoeffnet werden.",
  },
  decision_logic: {
    BOTH_HIGH:
      "Ihr seid beide eher bereit, mit begrenzterer Klarheit zu entscheiden. Das beschleunigt, kann aber dieselbe Luecke fuer euch beide unsichtbar machen.",
    BOTH_LOW:
      "Ihr wollt beide eher mehr Reife vor einer Entscheidung. Das schafft Sorgfalt, kann aber dieselbe Entscheidung zu lange offen halten.",
  },
  work_structure: {
    BOTH_HIGH:
      "Ihr gebt beide eher viel Eigenraum und Tempo. Das kann effizient sein, braucht aber klare Sichtbarkeit, damit Themen nicht still auseinanderlaufen.",
    BOTH_LOW:
      "Ihr wollt beide eher viel Mitsicht und Rueckkopplung. Das schafft Sicherheit, kann aber Tempo und Eigenverantwortung unnoetig verengen.",
  },
  commitment: {
    BOTH_HIGH:
      "Ihr bringt beide sehr viel Einsatz hinein. Das wirkt stark, braucht aber klare Grenzen gegen stille Ueberlast und gegenseitige Selbstverstaendlichkeitslogik.",
    BOTH_LOW:
      "Ihr bringt beide einen begrenzteren oder realistisch engeren Einsatzrahmen mit. Das kann tragbar sein, braucht aber explizite Erwartungen an Verbindlichkeit und Priorisierung.",
  },
  risk_orientation: {
    BOTH_HIGH:
      "Ihr seid beide eher bereit, Wetten zu gehen. Das oeffnet Chancen, braucht aber klare Schwellen dafuer, wann Absicherung Vorrang bekommt.",
    BOTH_LOW:
      "Ihr seid beide eher vorsichtig. Das schuetzt vor unnoetiger Exposition, kann aber gemeinsam zu spaetes Handeln erzeugen.",
  },
  conflict_style: {
    BOTH_HIGH:
      "Ihr sprecht Spannung beide eher direkt an. Das kann klaerend sein, braucht aber Leitplanken gegen Eskalation aus Zug heraus.",
    BOTH_LOW:
      "Ihr sprecht Spannung beide eher spaeter oder vorsichtiger an. Das haelt Gespraeche ruhig, kann aber Konflikte zu lange unter der Oberflaeche halten.",
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
    jointState: null,
    hasSharedBlindSpotRisk: false,
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
  match: DimensionMatch
): PatternCategory {
  if (match.category === "aligned" && match.riskLevel === "low") return "aligned";
  if (match.riskLevel === "high" || match.distance > 50 || match.jointState === "OPPOSITE") {
    return "clear_difference";
  }
  return "moderate_difference";
}

function mapConflictRisk(riskLevel: RiskLevel): ConflictRiskLevel {
  if (riskLevel === "low") return "low";
  if (riskLevel === "medium") return "medium";
  return "high";
}

function deriveDynamicLabel(match: DimensionMatch) {
  if (match.jointState === "BOTH_HIGH" || match.jointState === "BOTH_LOW") {
    return SHARED_POSITION_LABELS[match.dimensionId][match.jointState];
  }

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
  if (match.category === "aligned" && match.riskLevel === "low") {
    return round(clamp(match.distance, 0, 25));
  }

  if (match.category === "aligned") {
    return round(clamp(34 + match.distance * 0.4, 32, 58));
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
  const sharedPositionText =
    match.jointState === "BOTH_HIGH" || match.jointState === "BOTH_LOW"
      ? DIMENSION_SHARED_POSITION_TEXT[match.dimensionId][match.jointState]
      : null;

  const collaborationStrengths =
    match.category === "aligned" && match.riskLevel === "low"
      ? [DIMENSION_STRENGTH_TEXT[match.dimensionId]]
      : [];
  const complementaryDynamics =
    match.category === "complementary"
      ? [DIMENSION_COMPLEMENTARY_TEXT[match.dimensionId] ?? "Diese Unterschiede koennen produktiv sein, wenn ihr sie bewusst fuehrt."]
      : [];
  const potentialTensionAreas = uniqueStrings(
    [
      sharedPositionText,
      match.category === "tension" ? DIMENSION_TENSION_TEXT[match.dimensionId][tensionLevel] : null,
    ].filter((value): value is string => value != null)
  );

  return {
    dimension: DIMENSION_ID_TO_CANONICAL[match.dimensionId],
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    jointState: match.jointState,
    hasSharedBlindSpotRisk: match.hasSharedBlindSpotRisk,
    meanDistance: match.distance,
    distance: match.distance,
    itemDistance: match.distance,
    oppositionCount:
      match.jointState === "OPPOSITE"
        ? 1
        : 0,
    hiddenDifferenceScore: null,
    hasHiddenDifferences: false,
    patternCategory: derivePatternCategory(match),
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
    redFlags: uniqueStrings(
      [match.riskLevel === "high" ? tensionText : null, sharedPositionText].filter(
        (value): value is string => value != null && match.riskLevel !== "low"
      )
    ),
    greenFlags:
      match.category === "aligned" && match.riskLevel === "low"
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

  const sortDimensionIds = (
    selector: (match: DimensionMatch, result: DimensionResult | null) => number
  ) =>
    [...matchResult.dimensions]
      .map((match) => ({
        match,
        result: byDimensionId.get(match.dimensionId) ?? null,
        priority: selector(match, byDimensionId.get(match.dimensionId) ?? null),
      }))
      .filter((entry) => entry.priority > Number.NEGATIVE_INFINITY)
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          (MATCH_WEIGHTS[b.match.dimensionId] ?? 0) - (MATCH_WEIGHTS[a.match.dimensionId] ?? 0) ||
          a.match.distance - b.match.distance ||
          a.match.dimensionId.localeCompare(b.match.dimensionId)
      )
      .map((entry) => entry.match.dimensionId);

  const topStrengthDimensionId =
    sortDimensionIds((match) =>
      match.category === "aligned" &&
      match.riskLevel === "low" &&
      match.jointState === "BOTH_MID" &&
      !match.hasSharedBlindSpotRisk
        ? 120
        : Number.NEGATIVE_INFINITY
    )[0] ?? null;

  const topComplementaryDimensionId =
    sortDimensionIds((match) =>
      match.category === "complementary" &&
      match.riskLevel !== "high" &&
      !match.hasSharedBlindSpotRisk &&
      (match.jointState === "LOW_MID" || match.jointState === "MID_HIGH")
        ? 110
        : Number.NEGATIVE_INFINITY
    )[0] ?? null;

  const topTensionDimensionId =
    sortDimensionIds((match) => {
      if (match.jointState === "OPPOSITE") return 160;
      if (match.riskLevel === "high" && (match.appliedRules?.length ?? 0) > 0) return 150;
      if (match.riskLevel === "high") return 140;
      if (match.hasSharedBlindSpotRisk) return 130;
      if (match.riskLevel === "medium") return 120;
      return Number.NEGATIVE_INFINITY;
    })[0] ?? null;

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
  const sharedBlindSpotDimensions = matchResult.dimensions
    .filter((dimension) => dimension.hasSharedBlindSpotRisk)
    .sort(
      (a, b) =>
        (MATCH_WEIGHTS[b.dimensionId] ?? 0) - (MATCH_WEIGHTS[a.dimensionId] ?? 0) ||
        a.distance - b.distance
    )
    .map((dimension) => DIMENSION_ID_TO_CANONICAL[dimension.dimensionId]);

  return {
    dimensions,
    overallFit: hasAnyScoredDimension ? matchResult.overallScore : null,
    overallTension,
    alignmentScore: hasAnyScoredDimension ? matchResult.alignmentScore : null,
    workingCompatibilityScore: hasAnyScoredDimension ? matchResult.workingCompatibilityScore : null,
    sharedBlindSpotRisk: sharedBlindSpotDimensions.length > 0,
    sharedBlindSpotDimensions,
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
  const sharedBlindSpotDimensions = matchResult.dimensions
    .filter((dimension) => dimension.hasSharedBlindSpotRisk)
    .sort(
      (a, b) =>
        (MATCH_WEIGHTS[b.dimensionId] ?? 0) - (MATCH_WEIGHTS[a.dimensionId] ?? 0) ||
        a.distance - b.distance
    )
    .map((dimension) => DIMENSION_ID_TO_CANONICAL[dimension.dimensionId]);

  return {
    dimensions,
    overallFit: hasAnyScoredDimension ? matchResult.overallScore : null,
    overallTension,
    alignmentScore: hasAnyScoredDimension ? matchResult.alignmentScore : null,
    workingCompatibilityScore: hasAnyScoredDimension ? matchResult.workingCompatibilityScore : null,
    sharedBlindSpotRisk: sharedBlindSpotDimensions.length > 0,
    sharedBlindSpotDimensions,
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
