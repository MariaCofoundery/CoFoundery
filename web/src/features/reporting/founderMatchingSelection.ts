import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
  type CompareFoundersResult,
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
  priorityWeight: number;
  categoryPriority: number;
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

function getStatus(
  interactionType: InteractionType | null,
  tensionType: TensionType | null
): MatchingDimensionStatus {
  if (interactionType === "critical_tension" || tensionType === "critical") return "kritisch";
  if (interactionType === "coordination" || tensionType === "coordination") {
    return "abstimmung_nötig";
  }
  if (interactionType === "complement") return "ergänzend";
  return "nah";
}

function getCategoryPriority(status: MatchingDimensionStatus, tensionType: TensionType | null) {
  if (status === "kritisch") return 4;
  if (status === "abstimmung_nötig") return 3;
  if (status === "ergänzend" && tensionType === "productive") return 2;
  if (status === "nah") return 1;
  return 0;
}

function enrichDimensions(compareResult: CompareFoundersResult): EnrichedDimension[] {
  return compareResult.dimensions.map((dimension) => {
    const tension = compareResult.tensionMap.find((entry) => entry.dimension === dimension.dimension);
    const status = getStatus(dimension.interactionType, tension?.tensionType ?? null);

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
      priorityWeight: DIMENSION_PRIORITY[dimension.dimension],
      categoryPriority: getCategoryPriority(status, tension?.tensionType ?? null),
    };
  });
}

function sortByStableBase(a: EnrichedDimension, b: EnrichedDimension) {
  return (
    b.priorityWeight - a.priorityWeight ||
    (a.difference ?? 999) - (b.difference ?? 999) ||
    a.dimension.localeCompare(b.dimension)
  );
}

function sortByComplement(a: EnrichedDimension, b: EnrichedDimension) {
  const complementFit = (dimension: EnrichedDimension) =>
    (dimension.relationType === "moderate_difference" ? 0.35 : 0) + dimension.priorityWeight;

  return (
    complementFit(b) - complementFit(a) ||
    (b.difference ?? 0) - (a.difference ?? 0) ||
    a.dimension.localeCompare(b.dimension)
  );
}

function sortByTension(a: EnrichedDimension, b: EnrichedDimension) {
  return (
    b.categoryPriority - a.categoryPriority ||
    b.priorityWeight - a.priorityWeight ||
    (b.difference ?? 0) - (a.difference ?? 0) ||
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
  return dimensions.filter((dimension) => dimension.status === "nah").sort(sortByStableBase)[0] ?? null;
}

function pickStrongestComplement(dimensions: EnrichedDimension[]) {
  return (
    dimensions
      .filter((dimension) => dimension.status === "ergänzend")
      .sort(sortByComplement)[0] ?? null
  );
}

function pickBiggestTension(dimensions: EnrichedDimension[]) {
  return (
    dimensions
      .filter((dimension) => dimension.status === "kritisch" || dimension.status === "abstimmung_nötig")
      .sort(sortByTension)[0] ?? null
  );
}

function isHighSimilarityBlindSpotRisk(compareResult: CompareFoundersResult, dimensions: EnrichedDimension[]) {
  const similarCount = dimensions.filter((dimension) => dimension.relationType === "similar").length;
  return (
    (compareResult.overallMatchScore ?? 0) >= 85 &&
    compareResult.tensionMap.length === 0 &&
    similarCount >= 5
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
    (compareResult.overallMatchScore ?? 0) >= 60
  );
}

function pickBlindSpotWatch(dimensions: EnrichedDimension[]) {
  return dimensions.filter((dimension) => dimension.status === "nah").sort(sortByStableBase)[0] ?? null;
}

function buildHeroSelection(
  compareResult: CompareFoundersResult,
  dimensions: EnrichedDimension[],
  stableBase: EnrichedDimension | null,
  strongestComplement: EnrichedDimension | null,
  biggestTension: EnrichedDimension | null
): HeroSelection {
  const blindSpotRisk = isHighSimilarityBlindSpotRisk(compareResult, dimensions);

  let mode: HeroSelection["mode"] = "alignment_led";
  let groundDynamic: EnrichedDimension | null = stableBase;

  if (blindSpotRisk) {
    mode = "blind_spot_watch";
    groundDynamic = stableBase ?? pickBlindSpotWatch(dimensions);
  } else if (
    biggestTension &&
    biggestTension.status === "kritisch" &&
    ((compareResult.overallMatchScore ?? 0) < 60 || dimensions.filter((d) => d.status === "kritisch").length >= 2)
  ) {
    mode = "tension_led";
    groundDynamic = biggestTension;
  } else if (strongestComplement && (compareResult.alignmentScore ?? 0) >= 70) {
    mode = "complement_led";
    groundDynamic = strongestComplement;
  } else if (biggestTension && biggestTension.status === "abstimmung_nötig") {
    mode = "coordination_led";
    groundDynamic = stableBase ?? biggestTension;
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
    for (const candidate of dimensions.filter((dimension) => dimension.status === "nah").sort(sortByStableBase)) {
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
      "als stabilste Basis ausgewählt, weil diese Achse hohe Relevanz und geringe Differenz verbindet"
    ),
    strongestComplement: toSelectionEntry(
      strongestComplement,
      "als stärkste tragfähige Ergänzung ausgewählt; nicht bloß größter Unterschied, sondern produktiv klassifizierte Differenz"
    ),
    biggestTension: toSelectionEntry(
      biggestTension,
      isHighSimilarityBlindSpotRisk(compareResult, dimensions) &&
        biggestTension?.status === "nah"
        ? "kein offenes Spannungsfeld; ausgewählt als Blind-Spot-Watch bei sehr hoher Ähnlichkeit"
        : "als größtes Spannungsfeld nach Kritikalität, Relevanz und Differenz ausgewählt"
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
