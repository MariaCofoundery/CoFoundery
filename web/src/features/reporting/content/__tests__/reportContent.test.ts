import assert from "node:assert/strict";
import test from "node:test";
import { getReportContent } from "@/features/reporting/content/reportContent";
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

test("getReportContent returns German report labels by default", () => {
  const content = getReportContent();

  assert.equal(content.dimensions.Unternehmenslogik.canonicalName, "Unternehmenslogik");
  assert.equal(content.dimensions.Unternehmenslogik.reportLeftPole, "substanz & aufbauorientiert");
  assert.equal(content.dimensions.Konfliktstil.reportRightPole, "direkt");
  assert.equal(content.statusLabels.nah, "Nahe Basis");
});

test("getReportContent returns English report labels for locale en", () => {
  const content = getReportContent("en");

  assert.equal(content.dimensions.Unternehmenslogik.canonicalName, "Company logic");
  assert.equal(content.dimensions.Unternehmenslogik.reportLeftPole, "substance and build-oriented");
  assert.equal(content.dimensions.Konfliktstil.reportRightPole, "direct");
  assert.equal(content.statusLabels.abstimmung_nötig, "Needs alignment");
});

test("getReportContent falls back to German for unsupported locales", () => {
  assert.equal(getReportContent("fr").dimensions.Entscheidungslogik.shortLabel, "Entscheidung");
  assert.equal(getReportContent(null).dimensions.Risikoorientierung.shortLabel, "Risiko");
});

test("English report labels pass the report copy quality guards", () => {
  const visibleEnglishValues = collectStringValues(getReportContent("en")).join("\n");

  assert.deepEqual(findEnglishReportCopyQualityIssues(visibleEnglishValues), []);
  assert.deepEqual(findGermanResidueInEnglishReportCopy(visibleEnglishValues), []);
});

test("German and English report content keep the same label map shape", () => {
  const german = getReportContent("de");
  const english = getReportContent("en");

  assert.deepEqual(Object.keys(english.dimensions), Object.keys(german.dimensions));
  assert.deepEqual(Object.keys(english.statusLabels), Object.keys(german.statusLabels));
  assert.deepEqual(Object.keys(english.sectionLabels), Object.keys(german.sectionLabels));
});
