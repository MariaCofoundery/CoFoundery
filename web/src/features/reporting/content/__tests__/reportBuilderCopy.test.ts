import assert from "node:assert/strict";
import test from "node:test";
import { getReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";
import {
  findEnglishReportCopyQualityIssues,
  findGermanResidueInEnglishReportCopy,
} from "@/features/reporting/content/reportCopyGuards";

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

test("getReportBuilderCopy exposes an English locale without changing productive builder narratives yet", () => {
  const german = getReportBuilderCopy("de");
  const english = getReportBuilderCopy("en");

  assert.deepEqual(english.executiveSummary, german.executiveSummary);
  assert.notEqual(english.enPilotExamples.fallbackSummary, german.enPilotExamples.fallbackSummary);
});

test("getReportBuilderCopy falls back to German for unsupported locales", () => {
  assert.deepEqual(getReportBuilderCopy("fr").executiveSummary, getReportBuilderCopy("de").executiveSummary);
});

test("English report builder pilot copy passes copy guards", () => {
  const visibleEnglishCopy = collectStringValues(getReportBuilderCopy("en").enPilotExamples).join("\n");

  assert.deepEqual(findEnglishReportCopyQualityIssues(visibleEnglishCopy), []);
  assert.deepEqual(findGermanResidueInEnglishReportCopy(visibleEnglishCopy), []);
});
