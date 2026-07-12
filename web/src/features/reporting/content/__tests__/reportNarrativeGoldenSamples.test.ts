import assert from "node:assert/strict";
import test from "node:test";
import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";
import {
  getReportContent,
  type ReportContent,
  type ReportDimensionContentKey,
} from "@/features/reporting/content/reportContent";
import {
  findEnglishReportCopyQualityIssues,
  findGermanResidueInEnglishReportCopy,
} from "@/features/reporting/content/reportCopyGuards";
import {
  buildReportNarrativeGoldenSamples,
  REPORT_NARRATIVE_GOLDEN_SAMPLE_DEFINITIONS,
  type ReportNarrativeGoldenSample,
} from "@/features/reporting/content/__tests__/reportNarrativeFixtures";

function formatReportTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) => formatted.replaceAll(`{${key}}`, value),
    template
  );
}

function dimensionName(dimension: ReportDimensionContentKey, content: ReportContent) {
  return content.dimensions[dimension].canonicalName;
}

function collectCentralPatternBodies(
  sample: ReportNarrativeGoldenSample,
  content: ReportContent
) {
  const templates = content.centralPatternBodies;
  const corePattern = sample.selection.heroSelection.mode === "blind_spot_watch"
    ? sample.selection.heroSelection.biggestRisk
      ? formatReportTemplate(templates.corePattern.blindSpotWithDimension, {
          dimension: dimensionName(sample.selection.heroSelection.biggestRisk.dimension, content),
        })
      : templates.corePattern.blindSpotFallback
    : sample.selection.biggestTension
      ? formatReportTemplate(templates.corePattern.tensionWithDimension, {
          dimension: dimensionName(sample.selection.biggestTension.dimension, content),
        })
      : sample.selection.strongestComplement
        ? formatReportTemplate(templates.corePattern.complementWithDimension, {
            dimension: dimensionName(sample.selection.strongestComplement.dimension, content),
          })
        : sample.selection.stableBase
          ? formatReportTemplate(templates.corePattern.stableBaseWithDimension, {
              dimension: dimensionName(sample.selection.stableBase.dimension, content),
            })
          : templates.corePattern.fallback;
  const consequence = sample.selection.agreementFocusDimensions[0]
    ? formatReportTemplate(templates.consequence.agreementFocusWithDimension, {
        dimension: dimensionName(sample.selection.agreementFocusDimensions[0].dimension, content),
      })
    : templates.consequence.fallback;

  return [
    corePattern,
    templates.everydayImpact.fallback,
    consequence,
  ];
}

function collectEnglishVisibleStringsForSample(
  sample: ReportNarrativeGoldenSample
) {
  const content = getReportContent("en");
  const strings = [
    content.matchHeadlines[sample.selection.heroSelection.mode],
    content.matchHeadlines.session,
    content.introSummaries[sample.selection.heroSelection.mode],
    content.introSummaries.session,
    ...collectCentralPatternBodies(sample, content),
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
    assert.equal(collectCentralPatternBodies(sample, german).length, 3);
    assert.equal(collectCentralPatternBodies(sample, english).length, 3);
    assert.ok(collectCentralPatternBodies(sample, german).every((body) => body.length > 30));
    assert.ok(collectCentralPatternBodies(sample, english).every((body) => body.length > 30));

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
