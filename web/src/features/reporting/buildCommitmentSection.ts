import {
  type DimensionResult,
  type FitCategory,
  type TensionCategory,
} from "@/features/scoring/founderScoring";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  getReportBuilderCopy,
  type ReportBuilderCopy,
} from "@/features/reporting/content/builderCopy/builderCopy";

export type CommitmentTension = {
  topic: string;
  explanation: string;
};

export type CommitmentSection = {
  dimension: "Commitment";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: CommitmentTension[];
  conversationPrompts: string[];
};

type BuildCommitmentSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
  builderCopy?: ReportBuilderCopy;
};

function fallbackInterpretation(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.commitment.interpretations.fallback[teamContext];
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext,
  builderCopy: ReportBuilderCopy
) {
  if (fitCategory === "very_high") return builderCopy.sections.commitment.interpretations.very_high[teamContext];
  if (fitCategory === "high") return builderCopy.sections.commitment.interpretations.high[teamContext];
  if (fitCategory === "mixed") return builderCopy.sections.commitment.interpretations.mixed[teamContext];
  if (fitCategory === "low") return builderCopy.sections.commitment.interpretations.low[teamContext];

  return fallbackInterpretation(teamContext, builderCopy);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null,
  builderCopy: ReportBuilderCopy
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as CommitmentTension[];
  }

  const cards = builderCopy.sections.commitment.tensionCards;
  const topics = [
    cards.startupPriority,
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      cards.dayToDayCommitment,
      cards.handlingPressure
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push(cards.focusAndSideProjects);
  }

  return topics.filter(
    (entry, index, array) => array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function conversationPrompts(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.commitment.conversationPrompts[teamContext];
}

function everydaySignals(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.commitment.everydaySignals[teamContext];
}

export function buildCommitmentSection({
  dimensionResult,
  teamContext,
  builderCopy = getReportBuilderCopy("de"),
}: BuildCommitmentSectionInput): CommitmentSection {
  const safeDimension = "Commitment" as const;
  const prompts = conversationPrompts(teamContext, builderCopy);

  if (
    !dimensionResult ||
    dimensionResult.dimension !== safeDimension ||
    dimensionResult.fitCategory === "insufficient_data"
  ) {
    return {
      dimension: safeDimension,
      interpretation: fallbackInterpretation(teamContext, builderCopy),
      everydaySignals: everydaySignals(teamContext, builderCopy),
      potentialTensions: [],
      conversationPrompts: prompts.slice(0, 3),
    };
  }

  return {
    dimension: safeDimension,
    interpretation: interpretationFromFitCategory(dimensionResult.fitCategory, teamContext, builderCopy),
    everydaySignals: everydaySignals(teamContext, builderCopy),
    potentialTensions: potentialTensionsFromState(
      dimensionResult.tensionCategory,
      dimensionResult.tensionScore,
      builderCopy
    ),
    conversationPrompts: prompts,
  };
}
