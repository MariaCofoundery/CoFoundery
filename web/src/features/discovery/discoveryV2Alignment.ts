import type { SelfRadarSeries } from "@/features/reporting/selfReportTypes";
import { getSelfDimensionTendency } from "@/features/reporting/selfReportScoring";
import {
  DISCOVERY_ALIGNMENT_DIMENSIONS,
  DISCOVERY_ALIGNMENT_IMPORTANCE,
  DISCOVERY_ALIGNMENT_RELATION_PREFERENCES,
  type DiscoveryAlignmentPreferences,
  type DiscoveryAlignmentSignal,
  type DiscoveryAlignmentDimension,
} from "@/features/discovery/discoveryTypes";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";

export const DISCOVERY_ALIGNMENT_DIMENSION_TO_FOUNDER_DIMENSION: Record<
  DiscoveryAlignmentDimension,
  FounderDimensionKey
> = {
  company_logic: "Unternehmenslogik",
  decision_logic: "Entscheidungslogik",
  work_structure: "Arbeitsstruktur & Zusammenarbeit",
  commitment: "Commitment",
  risk_orientation: "Risikoorientierung",
  conflict_style: "Konfliktstil",
};

const DISCOVERY_ALIGNMENT_DIMENSION_SET = new Set<string>(DISCOVERY_ALIGNMENT_DIMENSIONS);

export function normalizeDiscoveryAlignmentDimensions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (entry): entry is DiscoveryAlignmentDimension =>
          typeof entry === "string" && DISCOVERY_ALIGNMENT_DIMENSION_SET.has(entry)
      )
    )
  ).slice(0, 3);
}

export function normalizeDiscoveryAlignmentPreferences(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const normalized: DiscoveryAlignmentPreferences = {};
  for (const dimension of DISCOVERY_ALIGNMENT_DIMENSIONS) {
    const entry = source[dimension];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const preference = entry as Record<string, unknown>;
    const importance = preference.importance;
    if (
      typeof importance !== "string" ||
      !DISCOVERY_ALIGNMENT_IMPORTANCE.includes(
        importance as (typeof DISCOVERY_ALIGNMENT_IMPORTANCE)[number]
      ) ||
      importance === "not_prioritized"
    ) {
      continue;
    }
    const rawRelation = preference.relationPreference ?? preference.relation_preference;
    const relationPreference =
      typeof rawRelation === "string" &&
      DISCOVERY_ALIGNMENT_RELATION_PREFERENCES.includes(
        rawRelation as (typeof DISCOVERY_ALIGNMENT_RELATION_PREFERENCES)[number]
      )
        ? (rawRelation as (typeof DISCOVERY_ALIGNMENT_RELATION_PREFERENCES)[number])
        : "no_direction_preference";
    normalized[dimension] = {
      importance: importance as "important" | "very_important",
      relationPreference,
    };
    if (Object.keys(normalized).length === 3) break;
  }
  return normalized;
}

export function getPrioritizedDiscoveryAlignmentDimensions(
  preferences: DiscoveryAlignmentPreferences
) {
  return DISCOVERY_ALIGNMENT_DIMENSIONS.filter((dimension) => preferences[dimension] != null);
}

export function selectPrioritizedAlignmentSignals({
  prioritizedDimensions,
  ownerScores,
  candidateScores,
}: {
  prioritizedDimensions: DiscoveryAlignmentDimension[];
  ownerScores: SelfRadarSeries | null;
  candidateScores: SelfRadarSeries | null;
}): DiscoveryAlignmentSignal[] {
  return prioritizedDimensions.map((dimension) => {
    const founderDimension = DISCOVERY_ALIGNMENT_DIMENSION_TO_FOUNDER_DIMENSION[dimension];
    const ownerTendency = ownerScores
      ? getSelfDimensionTendency(founderDimension, ownerScores[founderDimension])
      : null;
    const candidateTendency = candidateScores
      ? getSelfDimensionTendency(founderDimension, candidateScores[founderDimension])
      : null;
    return {
      dimension,
      signal:
        ownerTendency == null || candidateTendency == null
          ? "insufficient_data"
          : ownerTendency.tendency === candidateTendency.tendency
            ? "similar_tendency"
            : "different_tendency",
    };
  });
}

export function selectSimilarPrioritizedAlignmentDimensions({
  prioritizedDimensions,
  ownerScores,
  candidateScores,
}: {
  prioritizedDimensions: DiscoveryAlignmentDimension[];
  ownerScores: SelfRadarSeries | null;
  candidateScores: SelfRadarSeries | null;
}) {
  if (!ownerScores || !candidateScores) {
    return [];
  }

  return prioritizedDimensions.filter((dimension) => {
    const founderDimension = DISCOVERY_ALIGNMENT_DIMENSION_TO_FOUNDER_DIMENSION[dimension];
    const ownerTendency = getSelfDimensionTendency(founderDimension, ownerScores[founderDimension]);
    const candidateTendency = getSelfDimensionTendency(
      founderDimension,
      candidateScores[founderDimension]
    );

    return (
      ownerTendency != null &&
      candidateTendency != null &&
      ownerTendency.tendency === candidateTendency.tendency
    );
  });
}
