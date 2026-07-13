import assert from "node:assert/strict";
import test from "node:test";
import { buildExecutiveSummary } from "@/features/reporting/buildExecutiveSummary";
import { getReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";
import {
  findEnglishReportCopyQualityIssues,
  findGermanResidueInEnglishReportCopy,
} from "@/features/reporting/content/reportCopyGuards";
import type { TeamScoringResult } from "@/features/scoring/founderScoring";

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

test("getReportBuilderCopy returns German builder copy by default", () => {
  const copy = getReportBuilderCopy();

  assert.deepEqual(copy.executiveSummary.fallbackFocus, [
    "Welche Erwartungen habt ihr an gemeinsame Verantwortung und Entscheidungswege?",
    "Wo braucht ihr frueh Klarheit, damit Zusammenarbeit unter Druck stabil bleibt?",
  ]);
  assert.equal(
    copy.executiveSummary.focusPromptsByDimension.Commitment[0],
    "Welche Erwartungen habt ihr an Priorisierung, Verfuegbarkeit und Einsatzniveau im Alltag?"
  );
});

const fallbackOnlyScoringResult = {
  alignmentScore: 74,
  workingCompatibilityScore: 76,
  sharedBlindSpotRisk: false,
  sharedBlindSpotDimensions: [],
  executiveInsights: {
    topStrength: null,
    topComplementaryDynamic: null,
    topTension: null,
  },
  dimensions: [],
} as unknown as TeamScoringResult;

test("getReportBuilderCopy exposes English executive-summary focus fallbacks", () => {
  const german = getReportBuilderCopy("de");
  const english = getReportBuilderCopy("en");

  assert.deepEqual(english.executiveSummary.fallbackFocus, [
    "What expectations do you want to set for shared responsibility and decision paths?",
    "Where do you need early clarity so collaboration stays workable under pressure?",
  ]);
  assert.equal(
    english.executiveSummary.focusPromptsByDimension.Commitment[0],
    "What expectations do you have for prioritization, availability, and level of effort day to day?"
  );
  assert.notDeepEqual(english.executiveSummary, german.executiveSummary);
  assert.notEqual(english.enPilotExamples.fallbackSummary, german.enPilotExamples.fallbackSummary);
});

test("getReportBuilderCopy falls back to German for unsupported locales", () => {
  assert.deepEqual(getReportBuilderCopy("fr").executiveSummary, getReportBuilderCopy("de").executiveSummary);
});

test("English report builder pilot copy passes copy guards", () => {
  const englishCopy = getReportBuilderCopy("en");
  const visibleEnglishCopy = [
    ...collectStringValues(englishCopy.executiveSummary),
    ...collectStringValues(englishCopy.enPilotExamples),
  ].join("\n");

  assert.deepEqual(findEnglishReportCopyQualityIssues(visibleEnglishCopy), []);
  assert.deepEqual(findGermanResidueInEnglishReportCopy(visibleEnglishCopy), []);
});

test("buildExecutiveSummary uses localized recommended-focus fallbacks", () => {
  const germanCopy = getReportBuilderCopy("de");
  const englishCopy = getReportBuilderCopy("en");

  const germanSummary = buildExecutiveSummary({
    scoringResult: fallbackOnlyScoringResult,
    teamContext: "pre_founder",
    builderCopy: germanCopy,
  });
  const englishSummary = buildExecutiveSummary({
    scoringResult: fallbackOnlyScoringResult,
    teamContext: "pre_founder",
    builderCopy: englishCopy,
  });

  assert.deepEqual(germanSummary.recommendedFocus, germanCopy.executiveSummary.fallbackFocus);
  assert.deepEqual(englishSummary.recommendedFocus, englishCopy.executiveSummary.fallbackFocus);
  assert.notDeepEqual(englishSummary.recommendedFocus, germanSummary.recommendedFocus);
});
