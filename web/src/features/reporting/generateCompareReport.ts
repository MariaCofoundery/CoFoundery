import {
  DIMENSION_DEFINITIONS_DE,
  VALUES_ARCHETYPES_DE,
  getDiffClass,
} from "@/features/reporting/report_texts.de";
import {
  REPORT_DIMENSIONS,
  type CompareDimensionBlock,
  type CompareLabel,
  type CompareReportJson,
  type CompareResult,
  type DiffClass,
  type ProfileResult,
  type RadarSeries,
  type ReportDimension,
  type SessionAlignmentReport,
  type ZoneBand,
} from "@/features/reporting/types";

const ICEBREAKER_QUESTIONS = [
  "Was war der Moment in deiner bisherigen Laufbahn, in dem du am meisten über dich selbst gelernt hast?",
  "Stell dir vor, wir scheitern in zwei Jahren. Was wäre aus deiner heutigen Sicht der wahrscheinlichste Grund dafür?",
] as const;

export function generateCompareReport(profileA: ProfileResult, profileB: ProfileResult): CompareReportJson {
  const perDimension = REPORT_DIMENSIONS.map((dimension) =>
    buildDimensionBlock(profileA, profileB, dimension)
  );

  const compareResult = buildCompareResult(profileA, profileB, perDimension);
  const topInsights = [...perDimension]
    .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
    .slice(0, 3)
    .map((block) => ({
      dimension: block.dimension,
      title: `${insightDimensionLabel(block.dimension)} - ${block.archetypeA.name}`,
      text: `Deine Superpower ist ${block.archetypeA.superpower} Risikohinweis: ${block.archetypeA.caution}`,
    }));

  const valuesText = buildValuesText(profileA, profileB);
  const valuesAlignmentPercent = computeValuesAlignmentPercent(profileA.valuesScore, profileB.valuesScore);

  const conversationGuide = [
    ...ICEBREAKER_QUESTIONS,
    ...[...perDimension]
      .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
      .slice(0, 4)
      .map((block) => block.reflectionQuestion),
  ];

  return {
    sections: [
      { id: "cover", title: "Cover" },
      { id: "executive_summary", title: "Executive Summary" },
      { id: "key_insights", title: "Key Insights" },
      { id: "deep_dive", title: "Deep Dive" },
      { id: "values_module", title: "Werte-Kern" },
      { id: "conversation_guide", title: "Gesprächsleitfaden" },
    ],
    cover: {
      reportType:
        profileA.valuesScore != null || profileB.valuesScore != null ? "Basis + Werte-Kern" : "Basis",
      matchStatus: compareResult.summaryType === "Die Harmonischen Stabilisatoren" ? "stabil" : "aktiv",
      dimensions: REPORT_DIMENSIONS.map((dimension) => DIMENSION_DEFINITIONS_DE[dimension].name),
    },
    executiveSummary: {
      summaryType: compareResult.summaryType,
      topMatches: compareResult.topMatches.map((dimension) => DIMENSION_DEFINITIONS_DE[dimension].name),
      topTensions: compareResult.topTensions.map((dimension) => DIMENSION_DEFINITIONS_DE[dimension].name),
      bullets: buildExecutiveBullets(compareResult, profileA.displayName, profileB.displayName),
      valuesMatchSentence: valuesText,
    },
    keyInsights: topInsights,
    deepDive: perDimension,
    valuesModule: {
      alignmentPercent: valuesAlignmentPercent,
      identityA: resolveValuesIdentity(profileA.valuesArchetypeId),
      identityB: resolveValuesIdentity(profileB.valuesArchetypeId),
      text: valuesText,
    },
    conversationGuide: unique(conversationGuide).slice(0, 10),
  };
}

function insightDimensionLabel(dimension: ReportDimension) {
  return dimension === "Risiko" ? "Risikoprofil" : dimension;
}

export function buildProfileResultFromSession(
  report: SessionAlignmentReport,
  target: "A" | "B"
): ProfileResult {
  const name = target === "A" ? report.participantAName : report.participantBName ?? "Person B";
  const scores = target === "A" ? report.scoresA : report.scoresB;
  const valuesArchetype = target === "A" ? report.valuesIdentityCategoryA : report.valuesIdentityCategoryB;
  const valuesScore = null;

  const dimensionZones = REPORT_DIMENSIONS.reduce((acc, dimension) => {
    const score = scores[dimension] ?? 3.5;
    acc[dimension] = scoreToZone(score, dimension);
    return acc;
  }, {} as Record<ReportDimension, ZoneBand>);

  const archetypeIdPerDimension = REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = DIMENSION_DEFINITIONS_DE[dimension].archetypesByZone[dimensionZones[dimension]].id;
    return acc;
  }, {} as Record<ReportDimension, string>);

  return {
    profileId: target,
    displayName: name,
    dimensionScores: scores,
    dimensionZones,
    archetypeIdPerDimension,
    valuesScore,
    valuesArchetypeId: valuesArchetype ? normalizeValuesArchetypeId(valuesArchetype) : null,
  };
}

function buildDimensionBlock(
  profileA: ProfileResult,
  profileB: ProfileResult,
  dimension: ReportDimension
): CompareDimensionBlock {
  const definition = DIMENSION_DEFINITIONS_DE[dimension];
  const scoreA = profileA.dimensionScores[dimension];
  const scoreB = profileB.dimensionScores[dimension];

  const zoneA = scoreToZone(scoreA ?? 3.5, dimension);
  const zoneB = scoreToZone(scoreB ?? 3.5, dimension);
  const archetypeA = definition.archetypesByZone[zoneA];
  const archetypeB = definition.archetypesByZone[zoneB];

  const diff = scoreA != null && scoreB != null ? Number(Math.abs(scoreA - scoreB).toFixed(2)) : null;
  const diffClass = diff == null ? "MEDIUM" : getDiffClass(diff, dimension);
  const label = diffClassToLabel(diffClass);

  const hasStrongPairing =
    (zoneA === "low" && zoneB === "high") || (zoneA === "high" && zoneB === "low");

  return {
    dimension,
    scoreA,
    scoreB,
    zoneA,
    zoneB,
    archetypeA,
    archetypeB,
    diff,
    diffClass,
    label,
    summaryA: `Ausprägung: ${archetypeA.name}. ${archetypeA.descriptionShort} ${startupBehaviorSentence(
      dimension,
      zoneA
    )}`,
    summaryB: `Ausprägung: ${archetypeB.name}. ${archetypeB.descriptionShort} ${startupBehaviorSentence(
      dimension,
      zoneB
    )}`,
    dailyPressure: hasStrongPairing
      ? definition.dailyPressureByZoneOrPair.low_high_pair
      : definition.dailyPressureByZoneOrPair[zoneA],
    reflectionQuestion: definition.reflectionQuestions[diffClass],
  };
}

function startupBehaviorSentence(dimension: ReportDimension, zone: ZoneBand) {
  if (dimension === "Vision") {
    if (zone === "low") {
      return "Im Startup-Alltag zeigt sich das in disziplinierter Kapitalallokation, konsequenter Qualitätspriorisierung und einem klaren Fokus auf langfristig tragfähige Wertschöpfung.";
    }
    if (zone === "high") {
      return "Im Startup-Alltag zeigt sich das in hoher Marktdynamik, schnellen Go-to-Market-Entscheidungen und einer offensiven Expansionslogik.";
    }
    return "Im Startup-Alltag zeigt sich das in einer balancierten Kombination aus validiertem Aufbau und gezielten Skalierungsschritten.";
  }

  if (dimension === "Entscheidung") {
    if (zone === "low") return "Im Alltag werden Entscheidungen stärker vorbereitet, transparent dokumentiert und evidenzbasiert abgesichert.";
    if (zone === "high") return "Im Alltag werden Entscheidungen mit hoher Geschwindigkeit getroffen und in kurzen Lernzyklen nachjustiert.";
    return "Im Alltag wird je nach Entscheidungstyp flexibel zwischen analytischer Tiefe und Umsetzungsdynamik geschaltet.";
  }

  if (dimension === "Risiko") {
    if (zone === "low") return "Im Alltag stehen Runway-Schutz, strukturierte Risikoprüfung und planbare Umsetzungsschritte im Vordergrund.";
    if (zone === "high") return "Im Alltag werden größere Wetten bewusst eingegangen, um strategische Chancenfenster aktiv zu nutzen.";
    return "Im Alltag werden kalkulierte Risiken eingegangen und systematisch durch Back-up-Szenarien abgesichert.";
  }

  if (dimension === "Autonomie") {
    if (zone === "low") return "Im Alltag dominiert ein eng synchronisierter Abstimmungsmodus mit hoher Transparenz und kurzer Rückkopplung.";
    if (zone === "high") return "Im Alltag dominiert eigenverantwortliche Umsetzung mit klaren Zuständigkeiten und asynchroner Zusammenarbeit.";
    return "Im Alltag werden kollaborative Abstimmung und fokussierte Umsetzungsphasen bewusst austariert.";
  }

  if (dimension === "Verbindlichkeit") {
    if (zone === "low") return "Im Alltag werden Deadlines eher adaptiv verstanden und an veränderte Rahmenbedingungen angepasst.";
    if (zone === "high") return "Im Alltag gelten Zusagen als bindende Commitments mit hohem Liefer- und Qualitätsanspruch.";
    return "Im Alltag werden Zusagen verlässlich eingehalten, begleitet von proaktiver Kommunikation bei Zielabweichungen.";
  }

  if (zone === "low") return "Im Alltag werden Spannungen eher moderierend und beziehungsorientiert bearbeitet, um psychologische Sicherheit zu erhalten.";
  if (zone === "high") return "Im Alltag werden Spannungen früh, direkt und mit hoher Klarheit adressiert, um schnelle Klärung zu ermöglichen.";
  return "Im Alltag werden Konflikte strukturiert, sachlich und mit klarem Lösungsfokus moderiert.";
}

function buildCompareResult(
  profileA: ProfileResult,
  profileB: ProfileResult,
  perDimension: CompareDimensionBlock[]
): CompareResult {
  const orderedByMatch = [...perDimension].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99));
  const orderedByTension = [...perDimension].sort((a, b) => (b.diff ?? -1) - (a.diff ?? -1));
  const largeCount = perDimension.filter((block) => block.diffClass === "LARGE").length;
  const allSmall = perDimension.every((block) => block.diffClass === "SMALL");

  return {
    pairId: `${profileA.profileId}_${profileB.profileId}`,
    perDimension,
    topMatches: orderedByMatch.slice(0, 3).map((block) => block.dimension),
    topTensions: orderedByTension.slice(0, 3).map((block) => block.dimension),
    summaryType: allSmall
      ? "Die Harmonischen Stabilisatoren"
      : largeCount >= 3
      ? "Das High-Friction Power-Duo"
      : "Die balancierten Strategen",
  };
}

function buildExecutiveBullets(compareResult: CompareResult, nameA: string, nameB: string) {
  const bullets: string[] = [];
  for (const dimension of compareResult.topMatches) {
    bullets.push(
      `${nameA} und ${nameB} sind in ${DIMENSION_DEFINITIONS_DE[dimension].name} eng abgestimmt.`
    );
  }
  for (const dimension of compareResult.topTensions.slice(0, 2)) {
    const block = compareResult.perDimension.find((item) => item.dimension === dimension);
    if (!block) continue;
    bullets.push(
      `In ${DIMENSION_DEFINITIONS_DE[dimension].name} ist ein Fokus-Thema sichtbar: ${block.archetypeA.name} trifft auf ${block.archetypeB.name}.`
    );
  }
  return unique(bullets).slice(0, 6);
}

function scoreToZone(score: number, dimension: ReportDimension): ZoneBand {
  const thresholds = DIMENSION_DEFINITIONS_DE[dimension].thresholds;
  if (score <= thresholds.lowMax) return "low";
  if (score >= thresholds.highMin) return "high";
  return "mid";
}

function diffClassToLabel(diffClass: DiffClass): CompareLabel {
  if (diffClass === "SMALL") return "MATCH";
  if (diffClass === "LARGE") return "FOKUS_THEMA";
  return "KOMPLEMENTAER";
}

function buildValuesText(profileA: ProfileResult, profileB: ProfileResult) {
  const nameA = profileA.displayName;
  const nameB = profileB.displayName;
  const identityA = resolveValuesIdentity(profileA.valuesArchetypeId) ?? "Werte-Profil offen";
  const identityB = resolveValuesIdentity(profileB.valuesArchetypeId) ?? "Werte-Profil offen";
  const alignment = computeValuesAlignmentPercent(profileA.valuesScore, profileB.valuesScore);
  if (alignment == null) {
    return `${nameA} (${identityA}) trifft auf ${nameB} (${identityB}). Für das Werte-Matching fehlen noch vollständige Daten.`;
  }
  const synergy =
    alignment >= 85
      ? "eine starke Werte-Symbiose"
      : alignment >= 65
      ? "eine belastbare Werte-Schnittmenge"
      : "ein relevantes Werte-Spannungsfeld";
  return `${nameA} (${identityA}) trifft auf ${nameB} (${identityB}). Euer Werte-Match liegt bei ${alignment}% und zeigt ${synergy}.`;
}

function resolveValuesIdentity(valuesArchetypeId: string | null) {
  if (!valuesArchetypeId) return null;
  if (valuesArchetypeId in VALUES_ARCHETYPES_DE) {
    return VALUES_ARCHETYPES_DE[valuesArchetypeId as keyof typeof VALUES_ARCHETYPES_DE].name;
  }
  return valuesArchetypeId;
}

function normalizeValuesArchetypeId(label: string) {
  const value = label.trim().toLowerCase();
  if (value.includes("impact")) return "impact_idealist";
  if (value.includes("verantwortung")) return "verantwortungs_stratege";
  if (value.includes("business")) return "business_pragmatiker";
  return label;
}

function computeValuesAlignmentPercent(scoreA: number | null, scoreB: number | null) {
  if (scoreA == null || scoreB == null) return null;
  const delta = Math.abs(scoreA - scoreB);
  const normalized = Math.max(0, 1 - delta / 5);
  return Math.round(normalized * 100);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function createMockProfileResult(
  profileId: string,
  displayName: string,
  dimensionScores: RadarSeries,
  valuesScore: number | null = null,
  valuesArchetypeId: string | null = null
): ProfileResult {
  const dimensionZones = REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = scoreToZone(dimensionScores[dimension] ?? 3.5, dimension);
    return acc;
  }, {} as Record<ReportDimension, ZoneBand>);

  const archetypeIdPerDimension = REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = DIMENSION_DEFINITIONS_DE[dimension].archetypesByZone[dimensionZones[dimension]].id;
    return acc;
  }, {} as Record<ReportDimension, string>);

  return {
    profileId,
    displayName,
    dimensionScores,
    dimensionZones,
    archetypeIdPerDimension,
    valuesScore,
    valuesArchetypeId,
  };
}
