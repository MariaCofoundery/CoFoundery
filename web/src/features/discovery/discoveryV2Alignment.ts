import type { SelfRadarSeries } from "@/features/reporting/selfReportTypes";
import { getSelfDimensionTendency } from "@/features/reporting/selfReportScoring";
import {
  DISCOVERY_ALIGNMENT_DIMENSIONS,
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
