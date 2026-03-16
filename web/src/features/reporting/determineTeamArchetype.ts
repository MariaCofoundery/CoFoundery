import {
  normalizeDimensionName,
  type DimensionResult,
  type TeamScoringResult,
} from "@/features/scoring/founderScoring";
import {
  getFounderDimensionPoleTendency,
  requireFounderDimensionMeta,
} from "@/features/reporting/founderDimensionMeta";

export type TeamArchetypeKey =
  | "strategic_alliance"
  | "complementary_strategists"
  | "builder_partnership"
  | "explorer_dynamic"
  | "structured_architects"
  | "productive_tension"
  | "adaptive_alliance"
  | "clarification_oriented_partnership";

export type TeamArchetypeResult = {
  key: TeamArchetypeKey;
  label: string;
  description: string;
  strengths: string[];
  alignmentTopics: string[];
};

type ArchetypeTemplate = Omit<TeamArchetypeResult, "strengths" | "alignmentTopics"> & {
  defaultStrengths: string[];
  defaultAlignmentTopics: string[];
};

type DimensionSnapshot = {
  dimension: string;
  distance: number | null;
  scoreA: number | null;
  scoreB: number | null;
  teamFit: number | null;
  tensionScore: number | null;
  fitCategory: DimensionResult["fitCategory"] | "insufficient_data";
  tensionCategory: DimensionResult["tensionCategory"] | "insufficient_data";
};

const DIMENSIONS = {
  vision: "Vision & Unternehmenshorizont",
  decision: "Entscheidungslogik",
  risk: "Risikoorientierung",
  work: "Arbeitsstruktur & Zusammenarbeit",
  commitment: "Commitment",
  conflict: "Konfliktstil",
} as const;

const ARCHETYPE_TEMPLATES: Record<TeamArchetypeKey, ArchetypeTemplate> = {
  strategic_alliance: {
    key: "strategic_alliance",
    label: "Strategic Alliance",
    description:
      "Dieses Team wirkt in den strategisch praegenden Fragen eng aufeinander abgestimmt. Richtung, Risiko und Entscheidungslogik greifen so ineinander, dass Zusammenarbeit mit vergleichsweise wenig Grundsatzabstimmung moeglich wird.",
    defaultStrengths: [
      "Eine aehnliche strategische Grundlogik erleichtert Tempo und gemeinsame Prioritaeten.",
      "Entscheidungen koennen auf einer stabilen gemeinsamen Ausgangsbasis aufgebaut werden.",
    ],
    defaultAlignmentTopics: [
      "Wie haltet ihr eure gemeinsame Richtung auch unter Veraenderungsdruck stabil?",
      "Welche Entscheidungen sollten trotz hoher Passung bewusst gemeinsam reflektiert werden?",
    ],
  },
  complementary_strategists: {
    key: "complementary_strategists",
    label: "Complementary Strategists",
    description:
      "Dieses Team verbindet eine aehnliche Richtung mit produktiven Unterschieden in Risiko und Entscheidung. Genau darin kann eine starke strategische Ergaenzung liegen, wenn die Unterschiede bewusst genutzt werden.",
    defaultStrengths: [
      "Unterschiedliche Perspektiven koennen zu robusteren strategischen Entscheidungen fuehren.",
      "Gemeinsame Richtung und ergaenzende Logiken schaffen Potenzial fuer gute Arbeitsteilung.",
    ],
    defaultAlignmentTopics: [
      "Welche Unterschiede sollen bewusst als Ergaenzung genutzt werden und welche brauchen klare Leitplanken?",
      "Wie verhindert ihr, dass produktive Unterschiede im Alltag als Bremswirkung erlebt werden?",
    ],
  },
  builder_partnership: {
    key: "builder_partnership",
    label: "Builder Partnership",
    description:
      "Dieses Team wirkt besonders stark in der operativen Zusammenarbeit. Commitment, Struktur und alltaegliche Verlaesslichkeit bilden eine tragfaehige Grundlage, auf der Umsetzung gut organisiert werden kann.",
    defaultStrengths: [
      "Hohe Verlaesslichkeit erleichtert gemeinsame Umsetzung und Rollenklarheit.",
      "Operative Zusammenarbeit kann mit vergleichsweise wenig Reibungsverlust laufen.",
    ],
    defaultAlignmentTopics: [
      "Wie schuetzt ihr eure operative Staerke, wenn Tempo oder Belastung steigen?",
      "Wo braucht ihr trotz guter Zusammenarbeit bewusst Freiraum und Nachschaerfung?",
    ],
  },
  explorer_dynamic: {
    key: "explorer_dynamic",
    label: "Explorer Dynamic",
    description:
      "Dieses Team wirkt in seiner Grundtendenz chancenorientiert, beweglich und experimentierfreudig. Das kann besonders dann stark sein, wenn Schnelligkeit und Lernorientierung bewusst mit Priorisierung verbunden werden.",
    defaultStrengths: [
      "Mut zu Experimenten kann fruehe Lernkurven und Marktnaehe beguenstigen.",
      "Hohe Beweglichkeit erleichtert Anpassung in unsicheren Phasen.",
    ],
    defaultAlignmentTopics: [
      "Welche Risiken wollt ihr bewusst eingehen und wo setzt ihr klare Grenzen?",
      "Wie bleibt Geschwindigkeit produktiv, ohne dass Absicherung zu spaet kommt?",
    ],
  },
  structured_architects: {
    key: "structured_architects",
    label: "Structured Architects",
    description:
      "Dieses Team wirkt in seiner Grundlogik eher strukturiert, kontrolliert und klar organisiert. Das kann besonders tragfaehig sein, wenn Verantwortung, Analyse und Umsetzungslogik gut aufeinander abgestimmt bleiben.",
    defaultStrengths: [
      "Klare Struktur kann die Qualitaet von Entscheidungen und Zusammenarbeit stabil halten.",
      "Kontrollierte Risikoeinschaetzung erleichtert Verlaesslichkeit in anspruchsvollen Phasen.",
    ],
    defaultAlignmentTopics: [
      "Wo darf eure Struktur bewusst schneller oder experimenteller werden?",
      "Wie verhindert ihr, dass gute Absicherung in zu viel Vorsicht umschlaegt?",
    ],
  },
  productive_tension: {
    key: "productive_tension",
    label: "Productive Tension",
    description:
      "Dieses Team verbindet eine gemeinsame Richtung mit deutlichen Unterschieden in Risiko und Entscheidung. Gerade darin kann Staerke liegen, solange die Unterschiede aktiv moderiert und nicht dem Zufall ueberlassen werden.",
    defaultStrengths: [
      "Unterschiedliche Logiken koennen blinde Flecken auf beiden Seiten reduzieren.",
      "Spannung kann zu besseren Entscheidungen fuehren, wenn sie bewusst strukturiert wird.",
    ],
    defaultAlignmentTopics: [
      "Welche Regeln braucht ihr, damit Unterschiede produktiv statt zermuerbend wirken?",
      "Wie trefft ihr Entscheidungen, wenn Tempo und Absicherung sichtbar auseinanderlaufen?",
    ],
  },
  adaptive_alliance: {
    key: "adaptive_alliance",
    label: "Adaptive Alliance",
    description:
      "Dieses Team zeigt insgesamt eine solide Grundlage mit einigen moderaten Unterschieden. Die Dynamik wirkt anpassungsfaehig, solange ihr eure Arbeitslogik regelmaessig gemeinsam einordnet.",
    defaultStrengths: [
      "Moderate Unterschiede koennen Lernfaehigkeit und Entwicklung beguenstigen.",
      "Es gibt genug gemeinsame Basis, um Anpassungen konstruktiv umzusetzen.",
    ],
    defaultAlignmentTopics: [
      "Welche Unterschiede sind fuer euch hilfreich und welche brauchen mehr Klarheit?",
      "Wie sorgt ihr dafuer, dass Abstimmung nicht erst unter Druck entsteht?",
    ],
  },
  clarification_oriented_partnership: {
    key: "clarification_oriented_partnership",
    label: "Clarification-Oriented Partnership",
    description:
      "Dieses Team profitiert vor allem von bewusster Klaerung zentraler Erwartungen. Die Zusammenarbeit muss nicht schwach sein, aber einige Grundfragen brauchen sichtbar mehr gemeinsame Einordnung, damit spaetere Reibung nicht aus stillen Annahmen entsteht.",
    defaultStrengths: [
      "Die Daten machen sichtbar, welche Themen frueh und konkret besprochen werden sollten.",
      "Bewusste Klaerung kann hier schnell viel Stabilitaet in die Zusammenarbeit bringen.",
    ],
    defaultAlignmentTopics: [
      "Wo unterscheiden sich Richtung, Risiko oder Zusammenarbeit derzeit am deutlichsten?",
      "Welche Grundsatzfragen solltet ihr frueh in gemeinsame Vereinbarungen uebersetzen?",
    ],
  },
};

function getDimensionResult(scoringResult: TeamScoringResult, dimensionName: string) {
  const target = normalizeDimensionName(dimensionName);
  return scoringResult.dimensions.find(
    (dimensionResult) => normalizeDimensionName(dimensionResult.dimension) === target
  );
}

function toSnapshot(result: DimensionResult | undefined, dimension: string): DimensionSnapshot {
  return {
    dimension,
    distance: result?.distance ?? null,
    scoreA: result?.scoreA ?? null,
    scoreB: result?.scoreB ?? null,
    teamFit: result?.teamFit ?? null,
    tensionScore: result?.tensionScore ?? null,
    fitCategory: result?.fitCategory ?? "insufficient_data",
    tensionCategory: result?.tensionCategory ?? "insufficient_data",
  };
}

function meanOfScores(snapshot: DimensionSnapshot) {
  if (snapshot.scoreA == null || snapshot.scoreB == null) return null;
  return (snapshot.scoreA + snapshot.scoreB) / 2;
}

function hasPoleTendency(
  dimension: string,
  value: number | null,
  target: "left" | "center" | "right"
) {
  const tendency = getFounderDimensionPoleTendency(dimension, value);
  return tendency?.tendency === target;
}

function isVerySimilar(snapshot: DimensionSnapshot) {
  return snapshot.distance != null && snapshot.distance <= 15;
}

function isModeratelyDifferent(snapshot: DimensionSnapshot) {
  return snapshot.distance != null && snapshot.distance >= 16 && snapshot.distance <= 30;
}

function isClearlyDifferent(snapshot: DimensionSnapshot) {
  return snapshot.distance != null && snapshot.distance >= 31 && snapshot.distance <= 50;
}

function isStronglyDifferent(snapshot: DimensionSnapshot) {
  return snapshot.distance != null && snapshot.distance > 50;
}

function isSimilarOrModerate(snapshot: DimensionSnapshot) {
  return snapshot.distance != null && snapshot.distance <= 30;
}

function isHighFit(snapshot: DimensionSnapshot) {
  return snapshot.fitCategory === "very_high" || snapshot.fitCategory === "high";
}

function isModerateOrElevatedTension(snapshot: DimensionSnapshot) {
  return snapshot.tensionCategory === "moderate" || snapshot.tensionCategory === "elevated";
}

function isElevatedTension(snapshot: DimensionSnapshot) {
  return snapshot.tensionCategory === "elevated";
}

function mergeUnique(items: Array<string | null | undefined>, limit = 4) {
  return [...new Set(items.filter((item): item is string => Boolean(item && item.trim())).map((item) => item.trim()))].slice(
    0,
    limit
  );
}

function deriveStrengths(scoringResult: TeamScoringResult, fallback: string[]) {
  return mergeUnique(
    [...scoringResult.overallCollaborationStrengths, ...scoringResult.overallComplementaryDynamics, ...fallback],
    4
  );
}

function deriveAlignmentTopics(scoringResult: TeamScoringResult, fallback: string[]) {
  return mergeUnique(
    [...scoringResult.overallPotentialTensionAreas, ...scoringResult.overallRedFlags, ...fallback],
    4
  );
}

function buildArchetypeResult(
  key: TeamArchetypeKey,
  scoringResult: TeamScoringResult
): TeamArchetypeResult {
  const template = ARCHETYPE_TEMPLATES[key];
  return {
    key,
    label: template.label,
    description: template.description,
    strengths: deriveStrengths(scoringResult, template.defaultStrengths),
    alignmentTopics: deriveAlignmentTopics(scoringResult, template.defaultAlignmentTopics),
  };
}

export function determineTeamArchetype(
  scoringResult: TeamScoringResult
): TeamArchetypeResult {
  // Archetypes should not infer "high/low = good/bad". Where direction matters, the
  // explicit left/right poles from founderDimensionMeta define what the score leans toward.
  const riskMeta = requireFounderDimensionMeta(DIMENSIONS.risk);
  const decisionMeta = requireFounderDimensionMeta(DIMENSIONS.decision);

  const vision = toSnapshot(
    getDimensionResult(scoringResult, DIMENSIONS.vision),
    DIMENSIONS.vision
  );
  const decision = toSnapshot(
    getDimensionResult(scoringResult, DIMENSIONS.decision),
    DIMENSIONS.decision
  );
  const risk = toSnapshot(getDimensionResult(scoringResult, DIMENSIONS.risk), DIMENSIONS.risk);
  const work = toSnapshot(getDimensionResult(scoringResult, DIMENSIONS.work), DIMENSIONS.work);
  const commitment = toSnapshot(
    getDimensionResult(scoringResult, DIMENSIONS.commitment),
    DIMENSIONS.commitment
  );
  const conflict = toSnapshot(
    getDimensionResult(scoringResult, DIMENSIONS.conflict),
    DIMENSIONS.conflict
  );

  const riskMean = meanOfScores(risk);
  const decisionMean = meanOfScores(decision);
  const elevatedTensionCount = [vision, decision, risk, work, commitment, conflict].filter(
    isElevatedTension
  ).length;
  const broadTensionCount = [vision, decision, risk, work, commitment, conflict].filter(
    isModerateOrElevatedTension
  ).length;

  if (
    scoringResult.overallFit == null ||
    scoringResult.conflictRiskIndex == null ||
    isClearlyDifferent(vision) ||
    isStronglyDifferent(vision) ||
    elevatedTensionCount >= 2 ||
    broadTensionCount >= 4
  ) {
    return buildArchetypeResult("clarification_oriented_partnership", scoringResult);
  }

  if (
    isVerySimilar(vision) &&
    isVerySimilar(risk) &&
    isVerySimilar(decision) &&
    scoringResult.overallFit >= 80 &&
    scoringResult.conflictRiskIndex <= 35
  ) {
    return buildArchetypeResult("strategic_alliance", scoringResult);
  }

  if (
    isSimilarOrModerate(vision) &&
    (isClearlyDifferent(risk) || isStronglyDifferent(risk)) &&
    (isClearlyDifferent(decision) || isStronglyDifferent(decision)) &&
    scoringResult.overallFit >= 50
  ) {
    return buildArchetypeResult("productive_tension", scoringResult);
  }

  if (
    commitment.teamFit != null &&
    commitment.teamFit >= 80 &&
    isHighFit(commitment) &&
    isHighFit(work) &&
    isVerySimilar(work)
  ) {
    return buildArchetypeResult("builder_partnership", scoringResult);
  }

  if (
    isSimilarOrModerate(vision) &&
    isModeratelyDifferent(risk) &&
    (isVerySimilar(decision) || isModeratelyDifferent(decision)) &&
    scoringResult.overallFit >= 65
  ) {
    return buildArchetypeResult("complementary_strategists", scoringResult);
  }

  if (
    riskMean != null &&
    decisionMean != null &&
    hasPoleTendency(riskMeta.canonicalName, riskMean, "right") &&
    hasPoleTendency(decisionMeta.canonicalName, decisionMean, "right") &&
    scoringResult.conflictRiskIndex <= 55
  ) {
    return buildArchetypeResult("explorer_dynamic", scoringResult);
  }

  if (
    riskMean != null &&
    decisionMean != null &&
    hasPoleTendency(riskMeta.canonicalName, riskMean, "left") &&
    hasPoleTendency(decisionMeta.canonicalName, decisionMean, "left") &&
    isSimilarOrModerate(work) &&
    scoringResult.overallFit >= 60
  ) {
    return buildArchetypeResult("structured_architects", scoringResult);
  }

  if (
    scoringResult.overallFit >= 55 &&
    scoringResult.conflictRiskIndex <= 60 &&
    elevatedTensionCount === 0
  ) {
    return buildArchetypeResult("adaptive_alliance", scoringResult);
  }

  return buildArchetypeResult("clarification_oriented_partnership", scoringResult);
}
