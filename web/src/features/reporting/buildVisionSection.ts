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

export type VisionSection = {
  dimension: "Unternehmenslogik";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: VisionTension[];
  conversationPrompts: string[];
};

export type VisionTension = {
  topic: string;
  explanation: string;
};

type BuildVisionSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
  builderCopy?: ReportBuilderCopy;
};

function fallbackInterpretation(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.vision.interpretations.fallback[teamContext];
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
    return builderCopy.sections.vision.interpretations[fitCategory][teamContext];
  }

  return fallbackInterpretation(teamContext, builderCopy);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null,
  builderCopy: ReportBuilderCopy
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as VisionTension[];
  }

  const cards = builderCopy.sections.vision.tensionCards;
  const topics = [cards.base];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(...cards.extended);
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push(cards.elevated);
  }

  return topics.filter(
    (entry, index, array) => array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function conversationPrompts(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.vision.conversationPrompts[teamContext];
}

function everydaySignals(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.vision.everydaySignals[teamContext];
}

export function buildVisionSection({
  dimensionResult,
  teamContext,
  builderCopy = getReportBuilderCopy("de"),
}: BuildVisionSectionInput): VisionSection {
  const safeDimension = "Unternehmenslogik" as const;
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
