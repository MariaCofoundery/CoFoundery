import assert from "node:assert/strict";
import test from "node:test";
import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";
import { getReportContent } from "@/features/reporting/content/reportContent";
import {
  findEnglishReportCopyQualityIssues,
  findGermanResidueInEnglishReportCopy,
} from "@/features/reporting/content/reportCopyGuards";
import {
  buildReportNarrativeGoldenSamples,
  REPORT_NARRATIVE_GOLDEN_SAMPLE_DEFINITIONS,
} from "@/features/reporting/content/__tests__/reportNarrativeFixtures";

function collectEnglishVisibleStringsForSample(
  sample: ReturnType<typeof buildReportNarrativeGoldenSamples>[number]
) {
  const content = getReportContent("en");
  const strings = [
    content.matchHeadlines[sample.selection.heroSelection.mode],
    content.matchHeadlines.session,
    content.introSummaries[sample.selection.heroSelection.mode],
    content.introSummaries.session,
  ];

  for (const dimension of sample.compareResult.dimensions) {
    strings.push(content.dimensions[dimension.dimension].canonicalName);
    strings.push(content.dimensions[dimension.dimension].description);
  }

  for (const status of sample.selection.dimensionStatuses) {
    strings.push(content.statusLabels[status.status]);
    strings.push(content.dimensionReadings[status.status]);
  }

  return strings.join("\n");
}

test("report narrative golden samples expose the expected selection modes", () => {
  const samples = buildReportNarrativeGoldenSamples();

  assert.deepEqual(
    samples.map((sample) => sample.id),
    REPORT_NARRATIVE_GOLDEN_SAMPLE_DEFINITIONS.map((definition) => definition.id)
  );

  for (const sample of samples) {
    assert.equal(sample.selection.heroSelection.mode, sample.expectedHeroMode);
    assert.equal(sample.compareResult.dimensions.length, FOUNDER_DIMENSION_ORDER.length);
    assert.equal(sample.selection.dimensionStatuses.length, FOUNDER_DIMENSION_ORDER.length);
    assert.ok(sample.selection.heroSelection.groundDynamic);
  }
});

test("golden samples have locale-aware match headlines, intro summaries, and labels", () => {
  const samples = buildReportNarrativeGoldenSamples();
  const german = getReportContent("de");
  const english = getReportContent("en");

  for (const sample of samples) {
    assert.ok(german.matchHeadlines[sample.selection.heroSelection.mode].length > 10);
    assert.ok(english.matchHeadlines[sample.selection.heroSelection.mode].length > 10);
    assert.ok(german.introSummaries[sample.selection.heroSelection.mode].length > 40);
    assert.ok(english.introSummaries[sample.selection.heroSelection.mode].length > 40);

    for (const status of sample.selection.dimensionStatuses) {
      assert.ok(german.statusLabels[status.status]);
      assert.ok(english.statusLabels[status.status]);
    }
  }

  assert.equal(getReportContent("fr").matchHeadlines.alignment_led, german.matchHeadlines.alignment_led);
  assert.equal(getReportContent("fr").introSummaries.alignment_led, german.introSummaries.alignment_led);
});

test("English golden-sample headline, intro summary, and label copy passes report copy guards", () => {
  for (const sample of buildReportNarrativeGoldenSamples()) {
    const visibleCopy = collectEnglishVisibleStringsForSample(sample);

    assert.deepEqual(findEnglishReportCopyQualityIssues(visibleCopy), []);
    assert.deepEqual(findGermanResidueInEnglishReportCopy(visibleCopy), []);
  }
});

test("golden fixtures do not contain raw assessment answers or stored report payload text", () => {
  const serialized = JSON.stringify(buildReportNarrativeGoldenSamples());

  assert.equal(serialized.includes("question_id"), false);
  assert.equal(serialized.includes("choice_value"), false);
  assert.equal(serialized.includes("baseAnswers"), false);
  assert.equal(serialized.includes("valuesAnswers"), false);
  assert.equal(serialized.includes("founderReport"), false);
  assert.equal(serialized.includes("compareJson"), false);
  assert.equal(serialized.includes("Executive Summary"), false);
});
