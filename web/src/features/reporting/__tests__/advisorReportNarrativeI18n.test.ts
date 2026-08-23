import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdvisorDimensionAssessment,
  buildLocalizedAdvisorReportData,
} from "@/features/reporting/advisor-report/advisorReportBuilders";
import { getAdvisorDimensionCopy } from "@/features/reporting/advisor-report/advisorReportCopy";
import { DEFAULT_ADVISOR_REPORT_CONFIG } from "@/features/reporting/advisor-report/advisorReportConfig";
import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
} from "@/features/reporting/founderMatchingEngine";

const FORBIDDEN_NARRATIVE =
  /tragfähig|instabil|gefährlich|hohes Konfliktrisiko|kritisches Risiko|gute Passung|schlechte Passung|starke Ergänzung|Intervention erforderlich|belastbare Basis|high conflict risk|unstable team|strong fit|poor fit|dangerous|intervention required|robust foundation|likely to succeed|likely to fail/iu;

function collectNarrative(report: ReturnType<typeof buildLocalizedAdvisorReportData>) {
  return [
    report.teamSummary.leadStatement,
    ...report.dimensions.flatMap((dimension) => [
      dimension.tensionRisk,
      dimension.strengthPotential,
      dimension.tippingPoint,
      dimension.moderationQuestion,
      ...dimension.observationMarkers,
    ]),
    ...report.topTensions.flatMap((item) => [
      item.title,
      item.summary,
      item.tensionRisk,
      item.strengthPotential,
      item.tippingPoint,
      item.moderationQuestion,
      ...item.observationMarkers,
    ]),
    ...report.stabilityFactors.flatMap((item) => [
      item.title,
      item.rationale,
      item.constraintNote,
    ]),
    ...report.observationPoints.flatMap((item) => [item.marker, item.whyItMatters]),
    ...report.interventions.flatMap((item) => [item.title, item.objective, item.prompt]),
  ].join("\n");
}

test("advisor narrative keeps classifications stable while localizing the same structured input", () => {
  const comparison = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
  );
  const de = buildLocalizedAdvisorReportData(comparison, "de");
  const en = buildLocalizedAdvisorReportData(comparison, "en");

  assert.deepEqual(
    en.dimensions.map(({ dimensionKey, classification, intensity, priorityScore, stabilityScore }) => ({
      dimensionKey,
      classification,
      intensity,
      priorityScore,
      stabilityScore,
    })),
    de.dimensions.map(({ dimensionKey, classification, intensity, priorityScore, stabilityScore }) => ({
      dimensionKey,
      classification,
      intensity,
      priorityScore,
      stabilityScore,
    }))
  );
  assert.deepEqual(
    en.topTensions.map((item) => item.dimensionKey),
    de.topTensions.map((item) => item.dimensionKey)
  );
  assert.notEqual(en.teamSummary.leadStatement, de.teamSummary.leadStatement);
  assert.match(en.teamSummary.leadStatement, /discussion point/i);
  assert.match(de.teamSummary.leadStatement, /Gesprächspunkt/i);
});

test("active DE and EN advisor narratives are observational and contain no raw classification labels", () => {
  for (const caseId of [
    "misaligned_pressure_pair",
    "highly_similar_but_blind_spot_pair",
    "complementary_builders",
    "balanced_but_manageable_pair",
  ] as const) {
    const comparison = compareFounders(
      FOUNDER_MATCHING_TEST_CASES[caseId].a,
      FOUNDER_MATCHING_TEST_CASES[caseId].b
    );

    for (const locale of ["de", "en"] as const) {
      const narrative = collectNarrative(buildLocalizedAdvisorReportData(comparison, locale));
      assert.doesNotMatch(narrative, FORBIDDEN_NARRATIVE);
      assert.doesNotMatch(narrative, /\b(?:risk|chance|neutral)\b/iu);
    }
  }
});

test("English advisor narrative contains no active German system narrative", () => {
  const comparison = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
  );
  const narrative = collectNarrative(buildLocalizedAdvisorReportData(comparison, "en"));

  assert.doesNotMatch(
    narrative,
    /\b(?:Die|Der|Das|Angaben|Gespräch|Founder unterscheiden|Erneut betrachten|Ähnliche Antworten|Klärung)\b/u
  );
  assert.match(narrative, /responses/i);
});

test("missing founder data remains explicitly missing in presentation copy", () => {
  const input = {
    dimensionKey: "Commitment" as const,
    founderAScore: 55,
    founderBScore: null,
    jointState: null,
    riskLevel: null,
    hasSharedBlindSpotRisk: false,
  };
  const de = buildAdvisorDimensionAssessment(
    input,
    DEFAULT_ADVISOR_REPORT_CONFIG,
    getAdvisorDimensionCopy("de")
  );
  const en = buildAdvisorDimensionAssessment(
    input,
    DEFAULT_ADVISOR_REPORT_CONFIG,
    getAdvisorDimensionCopy("en")
  );

  assert.match(de.tensionRisk, /fehlen Angaben/i);
  assert.match(en.tensionRisk, /information is missing/i);
  assert.doesNotMatch(`${de.tensionRisk}\n${en.tensionRisk}`, /neutral|unkritisch|gut|schlecht/iu);
});

test("localized copy generation does not mutate structured scoring input", () => {
  const comparison = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.complementary_builders.a,
    FOUNDER_MATCHING_TEST_CASES.complementary_builders.b
  );
  const before = structuredClone(comparison);

  buildLocalizedAdvisorReportData(comparison, "de");
  buildLocalizedAdvisorReportData(comparison, "en");

  assert.deepEqual(comparison, before);
});
