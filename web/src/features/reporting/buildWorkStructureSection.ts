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

export type WorkStructureTension = {
  topic: string;
  explanation: string;
};

export type WorkStructureSection = {
  dimension: "Arbeitsstruktur & Zusammenarbeit";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: WorkStructureTension[];
  conversationPrompts: string[];
};

type BuildWorkStructureSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
  builderCopy?: ReportBuilderCopy;
};

function fallbackInterpretation(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.workStructure.interpretations.fallback[teamContext];
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
    return builderCopy.sections.workStructure.interpretations[fitCategory][teamContext];
  }

  return fallbackInterpretation(teamContext, builderCopy);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null,
  builderCopy: ReportBuilderCopy
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as WorkStructureTension[];
  }

  const cards = builderCopy.sections.workStructure.tensionCards;
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
  return builderCopy.sections.workStructure.conversationPrompts[teamContext];
}

function everydaySignals(teamContext: TeamContext, builderCopy: ReportBuilderCopy) {
  return builderCopy.sections.workStructure.everydaySignals[teamContext];
}

export function buildWorkStructureSection({
  dimensionResult,
  teamContext,
  builderCopy = getReportBuilderCopy("de"),
}: BuildWorkStructureSectionInput): WorkStructureSection {
  const safeDimension = "Arbeitsstruktur & Zusammenarbeit" as const;
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
