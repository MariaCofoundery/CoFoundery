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

export type RiskOrientationTension = {
  topic: string;
  explanation: string;
};

export type RiskOrientationSection = {
  dimension: "Risikoorientierung";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: RiskOrientationTension[];
  conversationPrompts: string[];
};

type BuildRiskOrientationSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
  builderCopy?: ReportBuilderCopy;
};

function fallbackInterpretation(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.riskOrientation.interpretations.fallback[teamContext];
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext,
  builderCopy: ReportBuilderCopy
) {
  if (
    fitCategory === "very_high" ||
    fitCategory === "high" ||
    fitCategory === "mixed" ||
    fitCategory === "low"
  ) {
    return builderCopy.sections.riskOrientation.interpretations[fitCategory][teamContext];
  }

  return fallbackInterpretation(teamContext, builderCopy);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null,
  builderCopy: ReportBuilderCopy
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as RiskOrientationTension[];
  }

  const cards = builderCopy.sections.riskOrientation.tensionCards;
  const topics = [cards.base];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(...cards.extended);
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push(cards.elevated);
  }

  return topics.filter(
    (entry, index, array) =>
      array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function conversationPrompts(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.riskOrientation.conversationPrompts[teamContext];
}

function everydaySignals(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.riskOrientation.everydaySignals[teamContext];
}

export function buildRiskOrientationSection({
  dimensionResult,
  teamContext,
  builderCopy = getReportBuilderCopy("de"),
}: BuildRiskOrientationSectionInput): RiskOrientationSection {
  const safeDimension = "Risikoorientierung" as const;
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
    interpretation: interpretationFromFitCategory(
      dimensionResult.fitCategory,
      teamContext,
      builderCopy
    ),
    everydaySignals: everydaySignals(teamContext, builderCopy),
    potentialTensions: potentialTensionsFromState(
      dimensionResult.tensionCategory,
      dimensionResult.tensionScore,
      builderCopy
    ),
    conversationPrompts: prompts,
  };
}
