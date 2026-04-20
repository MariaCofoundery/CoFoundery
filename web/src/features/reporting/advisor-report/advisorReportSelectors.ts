import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type {
  AdvisorDimensionInput,
  AdvisorDimensionKey,
  AdvisorJointState,
  AdvisorRiskLevel,
} from "@/features/reporting/advisor-report/advisorReportTypes";

export function selectAdvisorDimensionInputs(
  compareResult: CompareFoundersResult
): AdvisorDimensionInput[] {
  return compareResult.dimensions.map((dimension) => ({
    dimensionKey: dimension.dimension,
    founderAScore: typeof dimension.scoreA === "number" ? dimension.scoreA : null,
    founderBScore: typeof dimension.scoreB === "number" ? dimension.scoreB : null,
    jointState: (dimension.jointState ?? null) as AdvisorJointState | null,
    riskLevel: (dimension.riskLevel ?? null) as AdvisorRiskLevel | null,
    hasSharedBlindSpotRisk: Boolean(dimension.hasSharedBlindSpotRisk),
  }));
}

export function selectAdvisorMeta(compareResult: CompareFoundersResult) {
  return {
    alignmentScore: compareResult.alignmentScore ?? null,
    workingCompatibilityScore: compareResult.workingCompatibilityScore ?? null,
    topAlignments: [...compareResult.topAlignments] as AdvisorDimensionKey[],
    topTensions: [...compareResult.topTensions] as AdvisorDimensionKey[],
  };
}
