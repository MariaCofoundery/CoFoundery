import assert from "node:assert/strict";
import test from "node:test";
import { buildCommitmentSection } from "@/features/reporting/buildCommitmentSection";
import { buildConflictStyleSection } from "@/features/reporting/buildConflictStyleSection";
import { buildDecisionLogicSection } from "@/features/reporting/buildDecisionLogicSection";
import { buildRiskOrientationSection } from "@/features/reporting/buildRiskOrientationSection";
import { buildVisionSection } from "@/features/reporting/buildVisionSection";
import { buildWorkStructureSection } from "@/features/reporting/buildWorkStructureSection";
import { getReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";
import {
  findEnglishReportCopyQualityIssues,
  findGermanResidueInEnglishReportCopy,
} from "@/features/reporting/content/reportCopyGuards";
import type { DimensionResult } from "@/features/scoring/founderScoring";

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStringValues);
  }

  return [];
}

function dimensionResult(dimension: DimensionResult["dimension"]): DimensionResult {
  return {
    dimension,
    scoreA: 35,
    scoreB: 77,
    jointState: "OPPOSITE",
    meanDistance: 42,
    distance: 42,
    itemDistance: 42,
    oppositionCount: 2,
    hiddenDifferenceScore: 0,
    hasHiddenDifferences: false,
    patternCategory: "clear_difference",
    alignment: 54,
    alignmentCategory: "mixed",
    complementarity: 46,
    teamFit: 54,
    fitCategory: "mixed",
    conflictRisk: "medium",
    tensionScore: 42,
    tensionCategory: "elevated",
    dynamicLabel: null,
    isComplementaryDynamic: false,
    redFlags: [],
    greenFlags: [],
    collaborationStrengths: [],
    complementaryDynamics: [],
    potentialTensionAreas: [],
  };
}

const builders = [
  {
    key: "vision",
    dimension: "Unternehmenslogik" as const,
    build: (builderCopy = getReportBuilderCopy("de")) =>
      buildVisionSection({
        dimensionResult: dimensionResult("Unternehmenslogik"),
        teamContext: "pre_founder",
        builderCopy,
      }),
    germanMarker: "unternehmerische Entscheidungen",
    englishMarker: "entrepreneurial decisions",
    englishFirstTopic: "Growth pace",
  },
  {
    key: "decisionLogic",
    dimension: "Entscheidungslogik" as const,
    build: (builderCopy = getReportBuilderCopy("de")) =>
      buildDecisionLogicSection({
        dimensionResult: dimensionResult("Entscheidungslogik"),
        teamContext: "pre_founder",
        builderCopy,
      }),
    germanMarker: "Entscheidungslogik",
    englishMarker: "decision logic",
    englishFirstTopic: "Decision pace",
  },
  {
    key: "riskOrientation",
    dimension: "Risikoorientierung" as const,
    build: (builderCopy = getReportBuilderCopy("de")) =>
      buildRiskOrientationSection({
        dimensionResult: dimensionResult("Risikoorientierung"),
        teamContext: "pre_founder",
        builderCopy,
      }),
    germanMarker: "Risikoorientierung",
    englishMarker: "risk orientation",
    englishFirstTopic: "Experiment pace",
  },
  {
    key: "workStructure",
    dimension: "Arbeitsstruktur & Zusammenarbeit" as const,
    build: (builderCopy = getReportBuilderCopy("de")) =>
      buildWorkStructureSection({
        dimensionResult: dimensionResult("Arbeitsstruktur & Zusammenarbeit"),
        teamContext: "pre_founder",
        builderCopy,
      }),
    germanMarker: "zusammenarbeiten",
    englishMarker: "work together",
    englishFirstTopic: "Coordination needs",
  },
  {
    key: "commitment",
    dimension: "Commitment" as const,
    build: (builderCopy = getReportBuilderCopy("de")) =>
      buildCommitmentSection({
        dimensionResult: dimensionResult("Commitment"),
        teamContext: "pre_founder",
        builderCopy,
      }),
    germanMarker: "Beim Commitment",
    englishMarker: "Commitment shows visible differences",
    englishFirstTopic: "Startup priority",
  },
  {
    key: "conflictStyle",
    dimension: "Konfliktstil" as const,
    build: (builderCopy = getReportBuilderCopy("de")) =>
      buildConflictStyleSection({
        dimensionResult: dimensionResult("Konfliktstil"),
        teamContext: "pre_founder",
        builderCopy,
      }),
    germanMarker: "Konfliktstil",
    englishMarker: "conflict style",
    englishFirstTopic: "Feedback timing",
  },
];

test("founder report section builders keep dimensions and German default copy stable", () => {
  for (const builder of builders) {
    const section = builder.build(getReportBuilderCopy("de"));

    assert.equal(section.dimension, builder.dimension, builder.key);
    assert.match(section.interpretation, new RegExp(builder.germanMarker), builder.key);
    assert.ok(section.potentialTensions.length >= 4, builder.key);
  }
});

test("founder report section builders return guarded English fachcopy", () => {
  for (const builder of builders) {
    const section = builder.build(getReportBuilderCopy("en"));

    assert.equal(section.dimension, builder.dimension, builder.key);
    assert.match(section.interpretation, new RegExp(builder.englishMarker, "i"), builder.key);
    assert.equal(section.potentialTensions[0]?.topic, builder.englishFirstTopic, builder.key);

    const visibleEnglishCopy = collectStringValues(section).join("\n");
    assert.deepEqual(findEnglishReportCopyQualityIssues(visibleEnglishCopy), [], builder.key);
    assert.deepEqual(findGermanResidueInEnglishReportCopy(visibleEnglishCopy), [], builder.key);
  }
});
