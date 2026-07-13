import {
  type ExecutiveInsights,
  type ReportInsight,
  type TeamScoringResult,
} from "@/features/scoring/founderScoring";
import {
  type BuilderDimensionContentKey,
  type ExecutiveSummaryStateKey,
  getReportBuilderCopy,
  type ReportBuilderCopy,
} from "@/features/reporting/content/builderCopy/builderCopy";

export type TeamContext = "pre_founder" | "existing_team";

export type ExecutiveSummaryResult = {
  teamContext: TeamContext;
  headline: string;
  summaryIntro: string;
  topMessages: {
    strength: string | null;
    complementaryDynamic: string | null;
    tension: string | null;
  };
  recommendedFocus: string[];
};

type BuildExecutiveSummaryInput = {
  scoringResult: TeamScoringResult;
  teamContext: TeamContext;
  builderCopy?: ReportBuilderCopy;
};

function formatTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) => formatted.replaceAll(`{${key}}`, value),
    template
  );
}

function isBuilderDimension(value: string | null): value is BuilderDimensionContentKey {
  return (
    value === "Unternehmenslogik" ||
    value === "Entscheidungslogik" ||
    value === "Risikoorientierung" ||
    value === "Arbeitsstruktur & Zusammenarbeit" ||
    value === "Commitment" ||
    value === "Konfliktstil"
  );
}

function localizedDimensionLabel(dimension: string | null, builderCopy: ReportBuilderCopy) {
  if (!isBuilderDimension(dimension)) {
    return dimension ?? "";
  }

  return builderCopy.executiveSummary.dimensionLabels[dimension];
}

function dimensionPrefix(dimension: string | null, builderCopy: ReportBuilderCopy) {
  if (!dimension) return builderCopy.executiveSummary.dimensionPrefix.fallback;

  return formatTemplate(builderCopy.executiveSummary.dimensionPrefix.withDimension, {
    dimension: localizedDimensionLabel(dimension, builderCopy),
  });
}

function getDimensionResult(scoringResult: TeamScoringResult, dimension: string | null) {
  if (!dimension) return null;
  return scoringResult.dimensions.find((entry) => entry.dimension === dimension) ?? null;
}

function getStrategicFocusDimension(executiveInsights: ExecutiveInsights) {
  if (
    executiveInsights.topTension?.dimension === "Unternehmenslogik" ||
    executiveInsights.topTension?.dimension === "Entscheidungslogik" ||
    executiveInsights.topTension?.dimension === "Risikoorientierung"
  ) {
    return executiveInsights.topTension.dimension;
  }

  return executiveInsights.topStrength?.dimension === "Unternehmenslogik"
    ? "Unternehmenslogik"
    : "Entscheidungslogik";
}

function getWorkingFocusDimension(executiveInsights: ExecutiveInsights) {
  if (
    executiveInsights.topTension?.dimension === "Arbeitsstruktur & Zusammenarbeit" ||
    executiveInsights.topTension?.dimension === "Commitment" ||
    executiveInsights.topTension?.dimension === "Konfliktstil"
  ) {
    return executiveInsights.topTension.dimension;
  }

  return executiveInsights.topStrength?.dimension === "Arbeitsstruktur & Zusammenarbeit"
    ? "Arbeitsstruktur & Zusammenarbeit"
    : "Commitment";
}

function executiveSummaryState(scoringResult: TeamScoringResult): ExecutiveSummaryStateKey {
  const alignmentScore = scoringResult.alignmentScore;
  const workingCompatibilityScore = scoringResult.workingCompatibilityScore;

  if (alignmentScore == null || workingCompatibilityScore == null) {
    return "insufficientData";
  }

  if (scoringResult.sharedBlindSpotRisk && alignmentScore >= 60 && workingCompatibilityScore >= 60) {
    return "sharedBlindSpot";
  }

  if (alignmentScore >= 72 && workingCompatibilityScore >= 72) {
    return "strongBase";
  }

  if (alignmentScore >= 68 && workingCompatibilityScore < 60) {
    return "strategicCloseOperationalClarify";
  }

  if (alignmentScore < 60 && workingCompatibilityScore >= 68) {
    return "everydayCloseStrategicTension";
  }

  if (alignmentScore < 60 && workingCompatibilityScore < 60) {
    return "highClarification";
  }

  return "partial";
}

function headlineFromState(scoringResult: TeamScoringResult, builderCopy: ReportBuilderCopy) {
  return builderCopy.executiveSummary.headlines[executiveSummaryState(scoringResult)];
}

function introForContext(
  teamContext: TeamContext,
  scoringResult: TeamScoringResult,
  builderCopy: ReportBuilderCopy
) {
  const executiveInsights = scoringResult.executiveInsights;
  const strengthDimension = executiveInsights.topStrength?.dimension;
  const tensionDimension = executiveInsights.topTension?.dimension ?? null;
  const complementaryDimension = executiveInsights.topComplementaryDynamic?.dimension;
  const tensionResult = getDimensionResult(scoringResult, tensionDimension);
  const copy = builderCopy.executiveSummary.intro;

  const fitText = copy.fit[executiveSummaryState(scoringResult)];

  const strengthSentence = strengthDimension
    ? formatTemplate(copy.strengthWithDimension, {
        dimensionPrefix: dimensionPrefix(strengthDimension, builderCopy),
      })
    : copy.strengthFallback;

  const complementarySentence =
    complementaryDimension && complementaryDimension !== strengthDimension
      ? formatTemplate(copy.complementaryWithDimension, {
          dimensionPrefix: dimensionPrefix(complementaryDimension, builderCopy),
        })
      : null;

  const tensionSentence = scoringResult.sharedBlindSpotRisk
    ? tensionDimension
      ? formatTemplate(copy.sharedBlindSpotWithDimension, {
          dimensionPrefix: dimensionPrefix(tensionDimension, builderCopy),
        })
      : copy.sharedBlindSpotFallback
    : tensionDimension
      ? tensionResult?.jointState === "OPPOSITE" || tensionResult?.conflictRisk === "high"
        ? formatTemplate(copy.tensionOppositeWithDimension, {
            dimensionPrefix: dimensionPrefix(tensionDimension, builderCopy),
          })
        : formatTemplate(copy.tensionCoordinationWithDimension, {
            dimensionPrefix: dimensionPrefix(tensionDimension, builderCopy),
          })
      : copy.tensionFallback;

  if (teamContext === "pre_founder") {
    return [
      fitText,
      strengthSentence,
      complementarySentence,
      tensionSentence,
      copy.closing.preFounder,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    fitText,
    strengthSentence,
    complementarySentence,
    tensionSentence,
    copy.closing.existingTeam,
  ]
    .filter(Boolean)
    .join(" ");
}

function strengthMessage(insight: ReportInsight | null, builderCopy: ReportBuilderCopy) {
  if (!insight) return null;
  return formatTemplate(builderCopy.executiveSummary.topMessages.strength, {
    dimensionPrefix: dimensionPrefix(insight.dimension, builderCopy),
    title: insight.title,
  });
}

function complementaryMessage(insight: ReportInsight | null, builderCopy: ReportBuilderCopy) {
  if (!insight) return null;
  return formatTemplate(builderCopy.executiveSummary.topMessages.complementaryDynamic, {
    dimensionPrefix: dimensionPrefix(insight.dimension, builderCopy),
    title: insight.title,
  });
}

function tensionMessage(insight: ReportInsight | null, builderCopy: ReportBuilderCopy) {
  if (!insight) return null;
  return formatTemplate(builderCopy.executiveSummary.topMessages.tension, {
    dimensionPrefix: dimensionPrefix(insight.dimension, builderCopy),
    title: insight.title,
  });
}

function promptsForDimension(dimension: string | null, builderCopy: ReportBuilderCopy) {
  if (!dimension) return [];
  return builderCopy.executiveSummary.focusPromptsByDimension[
    dimension as keyof typeof builderCopy.executiveSummary.focusPromptsByDimension
  ] ?? [];
}

function collectRecommendedFocus(
  scoringResult: TeamScoringResult,
  teamContext: TeamContext,
  builderCopy: ReportBuilderCopy
) {
  const executiveInsights = scoringResult.executiveInsights;
  const prompts: string[] = [];
  const sharedBlindSpotDimension = (scoringResult.sharedBlindSpotDimensions ?? [])[0] ?? null;
  const topTensionDimension = executiveInsights.topTension?.dimension ?? null;
  const topTensionResult = getDimensionResult(scoringResult, topTensionDimension);

  if (sharedBlindSpotDimension) {
    prompts.push(...promptsForDimension(sharedBlindSpotDimension, builderCopy).slice(0, 2));
  }

  if (
    topTensionDimension &&
    (!topTensionResult?.hasSharedBlindSpotRisk || prompts.length === 0)
  ) {
    prompts.push(...promptsForDimension(topTensionDimension, builderCopy).slice(0, 2));
  }

  if ((scoringResult.alignmentScore ?? 0) < 65) {
    prompts.push(
      ...promptsForDimension(getStrategicFocusDimension(executiveInsights), builderCopy).slice(0, 1)
    );
  }

  if ((scoringResult.workingCompatibilityScore ?? 0) < 65) {
    prompts.push(
      ...promptsForDimension(getWorkingFocusDimension(executiveInsights), builderCopy).slice(0, 1)
    );
  }

  if (executiveInsights.topComplementaryDynamic) {
    const complementaryPrompts = promptsForDimension(
      executiveInsights.topComplementaryDynamic.dimension,
      builderCopy
    );
    if (complementaryPrompts.length > 0) {
      prompts.push(complementaryPrompts[complementaryPrompts.length - 1]);
    } else {
      prompts.push(builderCopy.executiveSummary.dynamicFocus.complementaryFallback);
    }
  }

  if (executiveInsights.topStrength) {
    prompts.push(
      formatTemplate(
        teamContext === "pre_founder"
          ? builderCopy.executiveSummary.dynamicFocus.protectStrengthPreFounder
          : builderCopy.executiveSummary.dynamicFocus.protectStrengthExistingTeam,
        {
          dimensionPrefix: dimensionPrefix(executiveInsights.topStrength.dimension, builderCopy),
        }
      )
    );
  }

  const unique = [...new Set(prompts.filter(Boolean))];
  if (unique.length >= 2) {
    return unique.slice(0, 4);
  }

  return [...new Set([...unique, ...builderCopy.executiveSummary.fallbackFocus])].slice(0, 4);
}

export function buildExecutiveSummary({
  scoringResult,
  teamContext,
  builderCopy = getReportBuilderCopy("de"),
}: BuildExecutiveSummaryInput): ExecutiveSummaryResult {
  const topTensionResult = getDimensionResult(
    scoringResult,
    scoringResult.executiveInsights.topTension?.dimension ?? null
  );
  const topTensionMessage =
    scoringResult.executiveInsights.topTension == null
      ? null
      : topTensionResult?.hasSharedBlindSpotRisk
        ? formatTemplate(builderCopy.executiveSummary.topMessages.sharedBlindSpotTension, {
            dimensionPrefix: dimensionPrefix(
              scoringResult.executiveInsights.topTension.dimension,
              builderCopy
            ),
            title: scoringResult.executiveInsights.topTension.title,
          })
        : tensionMessage(scoringResult.executiveInsights.topTension, builderCopy);

  return {
    teamContext,
    headline: headlineFromState(scoringResult, builderCopy),
    summaryIntro: introForContext(teamContext, scoringResult, builderCopy),
    topMessages: {
      strength: strengthMessage(scoringResult.executiveInsights.topStrength, builderCopy),
      complementaryDynamic: complementaryMessage(
        scoringResult.executiveInsights.topComplementaryDynamic,
        builderCopy
      ),
      tension: topTensionMessage,
    },
    recommendedFocus: collectRecommendedFocus(scoringResult, teamContext, builderCopy),
  };
}
