import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
  type CompareFoundersResult,
  type DimensionMatchResult,
  type FounderScores,
  type InteractionType,
  type RelationType,
  type TensionType,
} from "@/features/reporting/founderMatchingEngine";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";

export type MatchingDimensionStatus = "nah" | "ergänzend" | "abstimmung_nötig" | "kritisch";

export type MatchingSelectionEntry = {
  dimension: FounderDimensionKey;
  status: MatchingDimensionStatus;
  interactionType: InteractionType | null;
  relationType: RelationType | null;
  tensionType: TensionType | null;
  difference: number | null;
  scoreA: number | null;
  scoreB: number | null;
  explanationKey: string | null;
  reason: string;
};

export type HeroSelection = {
  mode:
    | "alignment_led"
    | "complement_led"
    | "tension_led"
    | "coordination_led"
    | "blind_spot_watch";
  groundDynamic: MatchingSelectionEntry | null;
  strongestQuality: MatchingSelectionEntry | null;
  biggestRisk: MatchingSelectionEntry | null;
};

export type FounderMatchingSelection = {
  meta: {
    highSimilarityBlindSpotRisk: boolean;
    balancedButManageable: boolean;
  };
  heroSelection: HeroSelection;
  stableBase: MatchingSelectionEntry | null;
  strongestComplement: MatchingSelectionEntry | null;
  biggestTension: MatchingSelectionEntry | null;
  dailyDynamicsDimensions: MatchingSelectionEntry[];
  agreementFocusDimensions: Array<
    MatchingSelectionEntry & {
      agreementTheme:
        | "einsatz_und_verfuegbarkeit"
        | "abstimmung_und_sichtbarkeit"
        | "umgang_mit_spannung"
        | "entscheidungsprozess"
        | "priorisierung_und_richtung"
        | "gemeinsame_risikoschwelle";
    }
  >;
  dimensionStatuses: Array<{
    dimension: FounderDimensionKey;
    status: MatchingDimensionStatus;
    reason: string;
  }>;
};

type EnrichedDimension = MatchingSelectionEntry & {
  jointState: DimensionMatchResult["jointState"];
  category: DimensionMatchResult["category"];
  riskLevel: DimensionMatchResult["riskLevel"];
  hasSharedBlindSpotRisk: boolean;
  hasSharedExtremeHigh: boolean;
  hasSharedExtremeLow: boolean;
  appliedRules: string[];
  priorityWeight: number;
};

const DIMENSION_PRIORITY: Record<FounderDimensionKey, number> = {
  Commitment: 3.3,
  "Arbeitsstruktur & Zusammenarbeit": 3.2,
  Konfliktstil: 3.1,
  Unternehmenslogik: 2.3,
  Entscheidungslogik: 2.1,
  Risikoorientierung: 1.6,
};

const AGREEMENT_THEME: Record<
  FounderDimensionKey,
  FounderMatchingSelection["agreementFocusDimensions"][number]["agreementTheme"]
> = {
  Commitment: "einsatz_und_verfuegbarkeit",
  "Arbeitsstruktur & Zusammenarbeit": "abstimmung_und_sichtbarkeit",
  Konfliktstil: "umgang_mit_spannung",
  Entscheidungslogik: "entscheidungsprozess",
  Unternehmenslogik: "priorisierung_und_richtung",
  Risikoorientierung: "gemeinsame_risikoschwelle",
};

function getPriorityBoost(
  dimension: Pick<DimensionMatchResult, "dimension" | "riskLevel" | "appliedRules">,
  status: MatchingDimensionStatus
) {
  let boost = 0;

  if (dimension.appliedRules?.includes("RULE_E_COMPANY_LOGIC_STRATEGIC_TENSION")) {
    boost += 1.7;
  }

  if (dimension.appliedRules?.includes("RULE_A_COMMITMENT_HARD_PENALTY")) {
    boost += 1.1;
  }

  if (dimension.appliedRules?.includes("RULE_B_WORK_STRUCTURE_CLASH")) {
    boost += 0.7;
  }

  if (dimension.dimension === "Unternehmenslogik" && status === "kritisch") {
    boost += 0.6;
  }

  if (dimension.dimension === "Commitment" && status === "kritisch") {
    boost += 0.35;
  }

  return boost;
}

function getStatus(
  dimension: Pick<
    DimensionMatchResult,
    "category" | "riskLevel" | "interactionType"
  >,
  tensionType: TensionType | null
): MatchingDimensionStatus {
  if (dimension.category === "tension" && dimension.riskLevel === "high") return "kritisch";
  if (dimension.category === "complementary" && dimension.riskLevel === "high") return "kritisch";
  if (dimension.category === "tension" && dimension.riskLevel === "medium") {
    return "abstimmung_nötig";
  }
  if (dimension.category === "complementary" || dimension.interactionType === "complement") {
    return "ergänzend";
  }
  return "nah";
}

function enrichDimensions(compareResult: CompareFoundersResult): EnrichedDimension[] {
  return compareResult.dimensions.map((dimension) => {
    const tension = compareResult.tensionMap.find((entry) => entry.dimension === dimension.dimension);
    const status = getStatus(dimension, tension?.tensionType ?? null);

    return {
      dimension: dimension.dimension,
      status,
      interactionType: dimension.interactionType,
      relationType: dimension.relationType,
      tensionType: tension?.tensionType ?? null,
      difference: dimension.difference,
      scoreA: dimension.scoreA,
      scoreB: dimension.scoreB,
      explanationKey: dimension.explanationKey,
      reason: "",
      jointState: dimension.jointState,
      category: dimension.category,
      riskLevel: dimension.riskLevel,
      hasSharedBlindSpotRisk: dimension.hasSharedBlindSpotRisk,
      hasSharedExtremeHigh: dimension.hasSharedExtremeHigh,
      hasSharedExtremeLow: dimension.hasSharedExtremeLow,
      appliedRules: dimension.appliedRules ?? [],
      priorityWeight: DIMENSION_PRIORITY[dimension.dimension] + getPriorityBoost(dimension, status),
    };
  });
}

function isStableStrength(dimension: EnrichedDimension) {
  return (
    dimension.status === "nah" &&
    !dimension.hasSharedBlindSpotRisk &&
    dimension.category === "aligned" &&
    dimension.riskLevel === "low" &&
    dimension.jointState === "BOTH_MID"
  );
}

function isOpportunity(dimension: EnrichedDimension) {
  return (
    dimension.status === "ergänzend" &&
    !dimension.hasSharedBlindSpotRisk &&
    dimension.category === "complementary" &&
    dimension.riskLevel !== "high" &&
    (dimension.jointState === "LOW_MID" || dimension.jointState === "MID_HIGH")
  );
}

function isRuleEscalatedHighRisk(dimension: EnrichedDimension) {
  return dimension.riskLevel === "high" && dimension.appliedRules.length > 0;
}

function isBlindSpotWatch(dimension: EnrichedDimension) {
  return (
    dimension.hasSharedBlindSpotRisk ||
    dimension.hasSharedExtremeHigh ||
    dimension.hasSharedExtremeLow ||
    dimension.jointState === "BOTH_HIGH" ||
    dimension.jointState === "BOTH_LOW"
  );
}

function isTensionPressure(dimension: EnrichedDimension) {
  if (dimension.jointState === "OPPOSITE") return true;
  if (dimension.status === "kritisch") return true;
  return dimension.status === "abstimmung_nötig" && !isBlindSpotWatch(dimension);
}

function sortByStableBase(a: EnrichedDimension, b: EnrichedDimension) {
  const stableScore = (dimension: EnrichedDimension) =>
    (isStableStrength(dimension) ? 12 : 0) +
    (dimension.jointState === "BOTH_MID" ? 6 : 0) +
    (dimension.riskLevel === "low" ? 4 : 0) +
    dimension.priorityWeight;

  return (
    stableScore(b) - stableScore(a) ||
    (a.difference ?? 999) - (b.difference ?? 999) ||
    a.dimension.localeCompare(b.dimension)
  );
}

function sortByComplement(a: EnrichedDimension, b: EnrichedDimension) {
  const complementFit = (dimension: EnrichedDimension) =>
    (isOpportunity(dimension) ? 10 : 0) +
    (dimension.jointState === "LOW_MID" || dimension.jointState === "MID_HIGH" ? 4 : 0) +
    dimension.priorityWeight;

  return (
    complementFit(b) - complementFit(a) ||
    (a.difference ?? 999) - (b.difference ?? 999) ||
    a.dimension.localeCompare(b.dimension)
  );
}

function sortByTension(a: EnrichedDimension, b: EnrichedDimension) {
  const tensionRank = (dimension: EnrichedDimension) => {
    if (dimension.jointState === "OPPOSITE") return 5;
    if (isRuleEscalatedHighRisk(dimension)) return 4;
    if (dimension.status === "kritisch") return 3;
    if (dimension.status === "abstimmung_nötig") return 2;
    return 1;
  };

  return (
    tensionRank(b) - tensionRank(a) ||
    b.priorityWeight - a.priorityWeight ||
    (b.difference ?? 0) - (a.difference ?? 0) ||
    a.dimension.localeCompare(b.dimension)
  );
}

function sortByBlindSpotWatch(a: EnrichedDimension, b: EnrichedDimension) {
  const blindSpotRank = (dimension: EnrichedDimension) =>
    (dimension.jointState === "BOTH_HIGH" || dimension.jointState === "BOTH_LOW" ? 8 : 0) +
    (dimension.hasSharedExtremeHigh || dimension.hasSharedExtremeLow ? 4 : 0) +
    dimension.priorityWeight;

  return (
    blindSpotRank(b) - blindSpotRank(a) ||
    (a.difference ?? 999) - (b.difference ?? 999) ||
    a.dimension.localeCompare(b.dimension)
  );
}

function toSelectionEntry(
  dimension: EnrichedDimension | null | undefined,
  reason: string
): MatchingSelectionEntry | null {
  if (!dimension) return null;
  return {
    dimension: dimension.dimension,
    status: dimension.status,
    interactionType: dimension.interactionType,
    relationType: dimension.relationType,
    tensionType: dimension.tensionType,
    difference: dimension.difference,
    scoreA: dimension.scoreA,
    scoreB: dimension.scoreB,
    explanationKey: dimension.explanationKey,
    reason,
  };
}

function pickStableBase(dimensions: EnrichedDimension[]) {
  return dimensions.filter(isStableStrength).sort(sortByStableBase)[0] ?? null;
}

function pickStrongestComplement(dimensions: EnrichedDimension[]) {
  return dimensions.filter(isOpportunity).sort(sortByComplement)[0] ?? null;
}

function pickBiggestTension(dimensions: EnrichedDimension[]) {
  return dimensions.filter(isTensionPressure).sort(sortByTension)[0] ?? null;
}

function isHighSimilarityBlindSpotRisk(compareResult: CompareFoundersResult, dimensions: EnrichedDimension[]) {
  const blindSpotDimensions = dimensions.filter(isBlindSpotWatch);
  const stableCount = dimensions.filter(isStableStrength).length;
  const hasCriticalOpenTension = dimensions.some((dimension) => dimension.status === "kritisch");
  return (
    !hasCriticalOpenTension &&
    blindSpotDimensions.length >= 2 &&
    (compareResult.alignmentScore ?? 0) >= 60 &&
    (compareResult.workingCompatibilityScore ?? 0) >= 60 &&
    stableCount + blindSpotDimensions.length >= 4
  );
}

function isBalancedButManageable(compareResult: CompareFoundersResult, dimensions: EnrichedDimension[]) {
  const criticalCount = dimensions.filter((dimension) => dimension.status === "kritisch").length;
  const activeCount = dimensions.filter(
    (dimension) => dimension.status === "abstimmung_nötig" || dimension.status === "ergänzend"
  ).length;

  return (
    !isHighSimilarityBlindSpotRisk(compareResult, dimensions) &&
    criticalCount === 0 &&
    activeCount >= 2 &&
    (compareResult.alignmentScore ?? 0) >= 60 &&
    (compareResult.workingCompatibilityScore ?? 0) >= 60
  );
}

function pickBlindSpotWatch(dimensions: EnrichedDimension[]) {
  return dimensions.filter(isBlindSpotWatch).sort(sortByBlindSpotWatch)[0] ?? null;
}

function buildHeroSelection(
  compareResult: CompareFoundersResult,
  dimensions: EnrichedDimension[],
  stableBase: EnrichedDimension | null,
  strongestComplement: EnrichedDimension | null,
  biggestTension: EnrichedDimension | null
): HeroSelection {
  const blindSpotRisk = isHighSimilarityBlindSpotRisk(compareResult, dimensions);
  const alignmentScore = compareResult.alignmentScore ?? 0;
  const workingCompatibilityScore = compareResult.workingCompatibilityScore ?? 0;
  const criticalCount = dimensions.filter((dimension) => dimension.status === "kritisch").length;

  let mode: HeroSelection["mode"] = "alignment_led";
  let groundDynamic: EnrichedDimension | null = stableBase;
  const existentialCriticalTension =
    biggestTension &&
    biggestTension.status === "kritisch" &&
    (biggestTension.dimension === "Unternehmenslogik" ||
      biggestTension.dimension === "Commitment");

  if (blindSpotRisk) {
    mode = "blind_spot_watch";
    groundDynamic = pickBlindSpotWatch(dimensions) ?? stableBase;
  } else if (existentialCriticalTension) {
    mode = "tension_led";
    groundDynamic = biggestTension;
  } else if (
    biggestTension &&
    biggestTension.status === "kritisch" &&
    (biggestTension.jointState === "OPPOSITE" ||
      alignmentScore < 58 ||
      workingCompatibilityScore < 58 ||
      criticalCount >= 2)
  ) {
    mode = "tension_led";
    groundDynamic = biggestTension;
  } else if (
    strongestComplement &&
    criticalCount === 0 &&
    alignmentScore >= 66 &&
    workingCompatibilityScore >= 62
  ) {
    mode = "complement_led";
    groundDynamic = strongestComplement;
  } else if (
    biggestTension &&
    (biggestTension.status === "abstimmung_nötig" || biggestTension.status === "kritisch") &&
    (Math.abs(alignmentScore - workingCompatibilityScore) >= 12 ||
      alignmentScore < 72 ||
      workingCompatibilityScore < 72)
  ) {
    mode = "coordination_led";
    groundDynamic = biggestTension ?? stableBase;
  }

  const strongestQuality =
    stableBase && stableBase.dimension !== groundDynamic?.dimension
      ? stableBase
      : strongestComplement && strongestComplement.dimension !== groundDynamic?.dimension
        ? strongestComplement
        : stableBase ?? strongestComplement;

  const biggestRisk =
    biggestTension && biggestTension.dimension !== strongestQuality?.dimension
      ? biggestTension
      : blindSpotRisk
        ? pickBlindSpotWatch(dimensions.filter((dimension) => dimension.dimension !== groundDynamic?.dimension))
        : biggestTension;

  return {
    mode,
    groundDynamic: toSelectionEntry(
      groundDynamic,
      blindSpotRisk
        ? "Grunddynamik über hohe Ähnlichkeit; Fokus liegt eher auf möglichem Blind-Spot-Risiko als auf offenem Spannungsfeld."
        : existentialCriticalTension
          ? "Grunddynamik wird von einem kritischen Richtungs- oder Commitment-Feld geprägt, das das Duo früher bestimmt als bloße Prozessfragen."
        : mode === "tension_led"
          ? "Grunddynamik wird von einem kritischen Spannungsfeld geprägt, das das Duo früh strukturiert."
          : mode === "complement_led"
            ? "Grunddynamik wird von einer tragfähigen Ergänzung geprägt, nicht bloß von Ähnlichkeit."
            : mode === "coordination_led"
              ? "Grunddynamik ist grundsätzlich tragfähig, braucht aber sichtbare Koordinationsregeln."
              : "Grunddynamik stützt sich vor allem auf eine stabile gemeinsame Basis."
    ),
    strongestQuality: toSelectionEntry(
      strongestQuality,
      strongestQuality?.status === "nah"
        ? "als stabilste Basis mit hoher Relevanz für Richtung oder Alltag ausgewählt"
        : "als stärkste produktive Ergänzung ausgewählt"
    ),
    biggestRisk: toSelectionEntry(
      biggestRisk,
      blindSpotRisk && !biggestTension
        ? "kein offenes Spannungsfeld; ausgewählt als möglicher Blind-Spot-Bereich bei sehr hoher Ähnlichkeit"
        : "als größtes Spannungs- oder Koordinationsfeld ausgewählt"
    ),
  };
}

function buildDailyDynamicsDimensions(
  compareResult: CompareFoundersResult,
  dimensions: EnrichedDimension[],
  stableBase: EnrichedDimension | null,
  strongestComplement: EnrichedDimension | null
) {
  const active = dimensions
    .filter(
      (dimension) =>
        dimension.status === "kritisch" ||
        dimension.status === "abstimmung_nötig" ||
        (dimension.status === "ergänzend" && dimension.tensionType === "productive")
    )
    .sort(sortByTension);

  const selected: EnrichedDimension[] = [];
  for (const candidate of active) {
    if (selected.some((entry) => entry.dimension === candidate.dimension)) continue;
    selected.push(candidate);
    if (selected.length === 3) break;
  }

  if (selected.length < 2 && stableBase && !selected.some((entry) => entry.dimension === stableBase.dimension)) {
    selected.push(stableBase);
  }

  if (
    selected.length < 2 &&
    strongestComplement &&
    !selected.some((entry) => entry.dimension === strongestComplement.dimension)
  ) {
    selected.push(strongestComplement);
  }

  if (selected.length < 2 && isHighSimilarityBlindSpotRisk(compareResult, dimensions)) {
    for (const candidate of dimensions.filter(isBlindSpotWatch).sort(sortByBlindSpotWatch)) {
      if (selected.some((entry) => entry.dimension === candidate.dimension)) continue;
      selected.push(candidate);
      if (selected.length === 2) break;
    }
  }

  return selected.slice(0, 3).map((dimension) =>
    toSelectionEntry(
      dimension,
      dimension.status === "kritisch"
        ? "für die Alltagsdynamik priorisiert, weil hier das größte Konfliktpotenzial im Duo liegt"
        : isBlindSpotWatch(dimension)
          ? "für die Alltagsdynamik priorisiert, weil hier ähnliche Grundtendenzen leicht in einen stillen gemeinsamen Blind Spot kippen können"
        : dimension.status === "abstimmung_nötig"
          ? "für die Alltagsdynamik priorisiert, weil diese Koordinationsfrage regelmäßig in der Zusammenarbeit auftauchen dürfte"
          : dimension.status === "ergänzend"
            ? "für die Alltagsdynamik priorisiert, weil hier eine produktive, aber regelbedürftige Ergänzung entsteht"
            : "für die Alltagsdynamik als stabiler oder potenziell blinder Standardmodus des Duos ergänzt"
    )!
  );
}

function buildAgreementFocusDimensions(
  compareResult: CompareFoundersResult,
  dimensions: EnrichedDimension[]
) {
  const agreementCandidates = dimensions
    .filter(
      (dimension) =>
        dimension.status === "kritisch" ||
        dimension.status === "abstimmung_nötig" ||
        (dimension.status === "ergänzend" &&
          (dimension.dimension === "Entscheidungslogik" || dimension.dimension === "Risikoorientierung"))
    )
    .sort(sortByTension);

  const selected: EnrichedDimension[] = [];
  for (const candidate of agreementCandidates) {
    if (selected.some((entry) => entry.dimension === candidate.dimension)) continue;
    selected.push(candidate);
    if (selected.length === 5) break;
  }

  if (selected.length < 3 && isHighSimilarityBlindSpotRisk(compareResult, dimensions)) {
    const preventiveFallbackOrder: FounderDimensionKey[] = [
      "Unternehmenslogik",
      "Risikoorientierung",
      "Konfliktstil",
      "Entscheidungslogik",
      "Arbeitsstruktur & Zusammenarbeit",
    ];

    for (const dimensionName of preventiveFallbackOrder) {
      const candidate = dimensions.find((dimension) => dimension.dimension === dimensionName);
      if (!candidate || selected.some((entry) => entry.dimension === candidate.dimension)) continue;
      selected.push(candidate);
      if (selected.length === 3) break;
    }
  }

  return selected.slice(0, 5).map((dimension) => ({
    ...toSelectionEntry(
      dimension,
      dimension.status === "kritisch"
        ? "immer priorisiert, weil dieses Feld ohne klare Vereinbarung schnell kippt"
        : isBlindSpotWatch(dimension)
          ? "als präventives Vereinbarungsfeld gewählt, damit gemeinsame Extreme oder stille Annahmen nicht unbemerkt mitlaufen"
        : dimension.status === "abstimmung_nötig"
          ? "priorisiert, weil hier wiederkehrende Koordination nötig ist"
          : isHighSimilarityBlindSpotRisk(compareResult, dimensions)
            ? "als präventives Vereinbarungsfeld gewählt, damit hohe Ähnlichkeit nicht in einen Blind Spot kippt"
            : "als Ergänzungsfeld gewählt, weil die produktive Differenz nur mit expliziten Regeln tragfähig bleibt"
    )!,
    agreementTheme: AGREEMENT_THEME[dimension.dimension],
  }));
}

function buildDimensionStatuses(dimensions: EnrichedDimension[]) {
  return dimensions.map((dimension) => ({
    dimension: dimension.dimension,
    status: dimension.status,
    reason:
      dimension.status === "kritisch"
        ? "kritisch, weil diese Differenz im Modell ein grundlegendes Spannungsfeld markiert"
        : isBlindSpotWatch(dimension)
          ? "beobachten, weil hier gemeinsame Extreme oder still geteilte Annahmen in einen Blind Spot kippen koennen"
        : dimension.status === "abstimmung_nötig"
          ? "Abstimmung nötig, weil diese Differenz ohne explizite Regeln im Alltag Reibung erzeugt"
        : dimension.status === "ergänzend"
            ? "ergänzend, weil die Unterschiede produktiv sein können"
            : "nah, weil das Duo hier auf ähnlicher Grundlage unterwegs ist",
  }));
}

export function buildFounderMatchingSelection(
  compareResult: CompareFoundersResult
): FounderMatchingSelection {
  const dimensions = enrichDimensions(compareResult);
  const stableBase = pickStableBase(dimensions);
  const strongestComplement = pickStrongestComplement(dimensions);
  const biggestTension =
    pickBiggestTension(dimensions) ??
    (isHighSimilarityBlindSpotRisk(compareResult, dimensions) ? pickBlindSpotWatch(dimensions) : null);

  return {
    meta: {
      highSimilarityBlindSpotRisk: isHighSimilarityBlindSpotRisk(compareResult, dimensions),
      balancedButManageable: isBalancedButManageable(compareResult, dimensions),
    },
    heroSelection: buildHeroSelection(
      compareResult,
      dimensions,
      stableBase,
      strongestComplement,
      biggestTension
    ),
    stableBase: toSelectionEntry(
      stableBase,
      "als stabilste Basis ausgewählt, weil hier gemeinsame Mitte und geringe Reibung auf hoher Relevanz zusammenkommen"
    ),
    strongestComplement: toSelectionEntry(
      strongestComplement,
      "als stärkste tragfähige Ergänzung ausgewählt; nicht bloß wegen Distanz, sondern weil die angrenzenden Lagen produktiv nutzbar sind"
    ),
    biggestTension: toSelectionEntry(
      biggestTension,
      isHighSimilarityBlindSpotRisk(compareResult, dimensions) &&
        biggestTension?.status === "nah"
        ? "kein offenes Spannungsfeld; ausgewählt als Blind-Spot-Watch bei sehr hoher Ähnlichkeit"
        : "als größtes Spannungsfeld nach Joint State, Risikologik und Relevanz ausgewählt; Distanz dient nur noch als Tiebreaker"
    ),
    dailyDynamicsDimensions: buildDailyDynamicsDimensions(
      compareResult,
      dimensions,
      stableBase,
      strongestComplement
    ),
    agreementFocusDimensions: buildAgreementFocusDimensions(compareResult, dimensions),
    dimensionStatuses: buildDimensionStatuses(dimensions),
  };
}

export function buildFounderMatchingSelectionFromScores(a: FounderScores, b: FounderScores) {
  return buildFounderMatchingSelection(compareFounders(a, b));
}

export function runFounderMatchingSelectionExamples() {
  return {
    complementary_builders: buildFounderMatchingSelection(
      compareFounders(
        FOUNDER_MATCHING_TEST_CASES.complementary_builders.a,
        FOUNDER_MATCHING_TEST_CASES.complementary_builders.b
      )
    ),
    misaligned_pressure_pair: buildFounderMatchingSelection(
      compareFounders(
        FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
        FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
      )
    ),
    balanced_but_manageable_pair: buildFounderMatchingSelection(
      compareFounders(
        FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.a,
        FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.b
      )
    ),
    highly_similar_but_blind_spot_pair: buildFounderMatchingSelection(
      compareFounders(
        FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
        FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
      )
    ),
  };
}
