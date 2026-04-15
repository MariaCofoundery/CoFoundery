import {
  normalizeDimensionName,
  type DimensionResult,
  type TeamScoringResult,
} from "@/features/scoring/founderScoring";
import {
  buildExecutiveSummary,
  type ExecutiveSummaryResult,
  type TeamContext,
} from "@/features/reporting/buildExecutiveSummary";
import {
  buildVisionSection,
  type VisionSection,
} from "@/features/reporting/buildVisionSection";
import {
  buildDecisionLogicSection,
  type DecisionLogicSection,
} from "@/features/reporting/buildDecisionLogicSection";
import {
  buildRiskOrientationSection,
  type RiskOrientationSection,
} from "@/features/reporting/buildRiskOrientationSection";
import {
  buildWorkStructureSection,
  type WorkStructureSection,
} from "@/features/reporting/buildWorkStructureSection";
import {
  buildCommitmentSection,
  type CommitmentSection,
} from "@/features/reporting/buildCommitmentSection";
import {
  buildConflictStyleSection,
  type ConflictStyleSection,
} from "@/features/reporting/buildConflictStyleSection";

export type FounderAlignmentReport = {
  teamContext: TeamContext;
  overallFit: number | null;
  overallTension: number | null;
  // Legacy compatibility report for workbook/fallback data paths.
  // The primary founder-facing matching report now renders through FounderMatchingView.
  // Deprecated compatibility alias. Active report rendering should prefer overallTension.
  conflictRiskIndex: number | null;
  executiveSummary: ExecutiveSummaryResult;
  sections: {
    vision: VisionSection;
    decisionLogic: DecisionLogicSection;
    riskOrientation: RiskOrientationSection;
    workStructure: WorkStructureSection;
    commitment: CommitmentSection;
    conflictStyle: ConflictStyleSection;
  };
};

type BuildFounderAlignmentReportInput = {
  scoringResult: TeamScoringResult;
  teamContext: TeamContext;
};

const DIMENSION_KEYS = {
  vision: "Unternehmenslogik",
  decisionLogic: "Entscheidungslogik",
  riskOrientation: "Risikoorientierung",
  workStructure: "Arbeitsstruktur & Zusammenarbeit",
  commitment: "Commitment",
  conflictStyle: "Konfliktstil",
} as const;

function getDimensionResult(
  dimensions: DimensionResult[],
  dimensionName: string
): DimensionResult | undefined {
  const target = normalizeDimensionName(dimensionName);
  return dimensions.find(
    (dimensionResult) => normalizeDimensionName(dimensionResult.dimension) === target
  );
}

export function buildFounderAlignmentReport({
  scoringResult,
  teamContext,
}: BuildFounderAlignmentReportInput): FounderAlignmentReport {
  return {
    teamContext,
    overallFit: scoringResult.overallFit,
    overallTension: scoringResult.overallTension,
    conflictRiskIndex: scoringResult.conflictRiskIndex,
    executiveSummary: buildExecutiveSummary({
      scoringResult,
      teamContext,
    }),
    sections: {
      vision: buildVisionSection({
        dimensionResult: getDimensionResult(scoringResult.dimensions, DIMENSION_KEYS.vision),
        teamContext,
      }),
      decisionLogic: buildDecisionLogicSection({
        dimensionResult: getDimensionResult(
          scoringResult.dimensions,
          DIMENSION_KEYS.decisionLogic
        ),
        teamContext,
      }),
      riskOrientation: buildRiskOrientationSection({
        dimensionResult: getDimensionResult(
          scoringResult.dimensions,
          DIMENSION_KEYS.riskOrientation
        ),
        teamContext,
      }),
      workStructure: buildWorkStructureSection({
        dimensionResult: getDimensionResult(
          scoringResult.dimensions,
          DIMENSION_KEYS.workStructure
        ),
        teamContext,
      }),
      commitment: buildCommitmentSection({
        dimensionResult: getDimensionResult(
          scoringResult.dimensions,
          DIMENSION_KEYS.commitment
        ),
        teamContext,
      }),
      conflictStyle: buildConflictStyleSection({
        dimensionResult: getDimensionResult(
          scoringResult.dimensions,
          DIMENSION_KEYS.conflictStyle
        ),
        teamContext,
      }),
    },
  };
}

/*
Example usage:

const report = buildFounderAlignmentReport({
  scoringResult,
  teamContext: "pre_founder",
});
*/
