import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdvisorDimensionAssessment,
  buildAdvisorObservationPoints,
  buildAdvisorReportData,
  buildAdvisorStabilityFactors,
  buildAdvisorTopTensions,
} from "@/features/reporting/advisor-report/advisorReportBuilders";
import { DEFAULT_ADVISOR_REPORT_CONFIG } from "@/features/reporting/advisor-report/advisorReportConfig";
import type { AdvisorTopTension } from "@/features/reporting/advisor-report/advisorReportTypes";
import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
  type CompareFoundersResult,
  type FounderScores,
} from "@/features/reporting/founderMatchingEngine";

function buildAssessment(input: Parameters<typeof buildAdvisorDimensionAssessment>[0]) {
  return buildAdvisorDimensionAssessment(input, DEFAULT_ADVISOR_REPORT_CONFIG);
}

function buildCompare(a: FounderScores, b: FounderScores): CompareFoundersResult {
  return compareFounders(a, b);
}

test("OPPOSITE plus high risk is classified as high-intensity risk", () => {
  const assessment = buildAssessment({
    dimensionKey: "Entscheidungslogik",
    founderAScore: 82,
    founderBScore: 31,
    jointState: "OPPOSITE",
    riskLevel: "high",
    hasSharedBlindSpotRisk: false,
  });

  assert.equal(assessment.intensity, "high");
  assert.equal(assessment.classification, "risk");
  assert.equal(assessment.interventionType, "decision_rules");
  assert.equal(assessment.priorityScore > 0, true);
});

test("BOTH_LOW plus blind spot is treated as risk even with low founder distance", () => {
  const assessment = buildAssessment({
    dimensionKey: "Risikoorientierung",
    founderAScore: 18,
    founderBScore: 22,
    jointState: "BOTH_LOW",
    riskLevel: "high",
    hasSharedBlindSpotRisk: true,
  });

  assert.equal(assessment.intensity, "low");
  assert.equal(assessment.classification, "risk");
  assert.match(assessment.tensionRisk, /gemeinsamer|gemeinsame/i);
});

test("MID_HIGH plus low risk can be read as chance in complementary dimensions", () => {
  const assessment = buildAssessment({
    dimensionKey: "Konfliktstil",
    founderAScore: 74,
    founderBScore: 46,
    jointState: "MID_HIGH",
    riskLevel: "low",
    hasSharedBlindSpotRisk: false,
  });

  assert.equal(assessment.intensity, "medium");
  assert.equal(assessment.classification, "chance");
  assert.equal(assessment.interventionType, "conflict_rules");
});

test("stable aligned low-risk constellation becomes a stability factor", () => {
  const assessment = buildAssessment({
    dimensionKey: "Unternehmenslogik",
    founderAScore: 54,
    founderBScore: 58,
    jointState: "BOTH_MID",
    riskLevel: "low",
    hasSharedBlindSpotRisk: false,
  });

  const factors = buildAdvisorStabilityFactors([assessment]);

  assert.equal(assessment.classification, "neutral");
  assert.equal(factors.length, 1);
  assert.equal(factors[0]?.dimensionKey, "Unternehmenslogik");
});

test("top-tension selection uses configured tie-breaker order for equal scores", () => {
  const assessments = [
    buildAssessment({
      dimensionKey: "Commitment",
      founderAScore: 82,
      founderBScore: 28,
      jointState: "OPPOSITE",
      riskLevel: "high",
      hasSharedBlindSpotRisk: false,
    }),
    buildAssessment({
      dimensionKey: "Entscheidungslogik",
      founderAScore: 82,
      founderBScore: 28,
      jointState: "OPPOSITE",
      riskLevel: "high",
      hasSharedBlindSpotRisk: false,
    }),
    buildAssessment({
      dimensionKey: "Unternehmenslogik",
      founderAScore: 82,
      founderBScore: 28,
      jointState: "OPPOSITE",
      riskLevel: "high",
      hasSharedBlindSpotRisk: false,
    }),
  ];

  const top = buildAdvisorTopTensions(assessments);

  assert.deepEqual(
    top.map((entry) => entry.dimensionKey),
    ["Entscheidungslogik", "Unternehmenslogik", "Commitment"]
  );
});

test("observation points are deduplicated across top tensions", () => {
  const topTensions: AdvisorTopTension[] = [
    {
      dimensionKey: "Entscheidungslogik",
      priorityScore: 20,
      intensity: "high",
      classification: "risk",
      title: "Entscheidungsreife",
      summary: "",
      tensionRisk: "",
      strengthPotential: "",
      tippingPoint: "Wiederholte Schleifen werden teuer.",
      moderationQuestion: "",
      observationMarkers: [
        "Dieselbe Frage taucht nach vermeintlichem Abschluss erneut auf.",
        "Entscheidungen werden mehrfach gefuehrt, weil Reife unterschiedlich gelesen wird.",
      ],
      interventionType: "decision_rules",
    },
    {
      dimensionKey: "Unternehmenslogik",
      priorityScore: 18,
      intensity: "high",
      classification: "risk",
      title: "Strategische Richtung",
      summary: "",
      tensionRisk: "",
      strengthPotential: "",
      tippingPoint: "Priorisierungen werden unscharf.",
      moderationQuestion: "",
      observationMarkers: [
        "Dieselbe Frage taucht nach vermeintlichem Abschluss erneut auf.",
        "Strategische Diskussionen drehen sich um Richtung, obwohl formal ueber Tempo gesprochen wird.",
      ],
      interventionType: "prioritization_system",
    },
  ];

  const points = buildAdvisorObservationPoints(topTensions);

  assert.equal(
    points.filter(
      (entry) => entry.marker === "Dieselbe Frage taucht nach vermeintlichem Abschluss erneut auf."
    ).length,
    1
  );
});

test("buildAdvisorReportData returns stable top tensions and stability factors for realistic cases", () => {
  const tensionHeavy = buildAdvisorReportData(
    buildCompare(
      FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
      FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
    )
  );
  const stable = buildAdvisorReportData(
    buildCompare(
      FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.a,
      FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.b
    )
  );

  assert.equal(tensionHeavy.topTensions.length, 3);
  assert.deepEqual(
    tensionHeavy.topTensions.map((entry) => entry.dimensionKey),
    ["Unternehmenslogik", "Arbeitsstruktur & Zusammenarbeit", "Entscheidungslogik"]
  );
  assert.equal(stable.stabilityFactors.length >= 2, true);
  assert.equal(stable.teamSummary.topPatternKeys.length, 3);
});

test("highly similar blind-spot pairs surface blind-spot-led advisor output", () => {
  const report = buildAdvisorReportData(
    buildCompare(
      FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
      FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
    )
  );

  assert.equal(report.topTensions[0]?.dimensionKey, "Unternehmenslogik");
  assert.equal(report.topTensions.some((entry) => entry.dimensionKey === "Risikoorientierung"), true);
  assert.equal(report.observationPoints.length <= DEFAULT_ADVISOR_REPORT_CONFIG.limits.observationPoints, true);
});
