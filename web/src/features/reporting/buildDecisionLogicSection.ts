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

export type DecisionLogicTension = {
  topic: string;
  explanation: string;
};

export type DecisionLogicSection = {
  dimension: "Entscheidungslogik";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: DecisionLogicTension[];
  conversationPrompts: string[];
};

type BuildDecisionLogicSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
  builderCopy?: ReportBuilderCopy;
};

function fallbackInterpretation(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.decisionLogic.interpretations.fallback[teamContext];
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
    return builderCopy.sections.decisionLogic.interpretations[fitCategory][teamContext];
  }

  return fallbackInterpretation(teamContext, builderCopy);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null,
  builderCopy: ReportBuilderCopy
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as DecisionLogicTension[];
  }

  const cards = builderCopy.sections.decisionLogic.tensionCards;
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
  return builderCopy.sections.decisionLogic.conversationPrompts[teamContext];
}

function everydaySignals(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.decisionLogic.everydaySignals[teamContext];
}

export function buildDecisionLogicSection({
  dimensionResult,
  teamContext,
  builderCopy = getReportBuilderCopy("de"),
}: BuildDecisionLogicSectionInput): DecisionLogicSection {
  const safeDimension = "Entscheidungslogik" as const;
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
