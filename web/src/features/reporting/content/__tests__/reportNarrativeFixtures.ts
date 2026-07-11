import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
  type CompareFoundersResult,
  type FounderScores,
} from "@/features/reporting/founderMatchingEngine";
import {
  buildFounderMatchingSelection,
  type FounderMatchingSelection,
  type HeroSelection,
} from "@/features/reporting/founderMatchingSelection";

export type ReportNarrativeGoldenSampleId =
  | "complement_led"
  | "tension_led"
  | "alignment_led"
  | "blind_spot_watch";

type ReportNarrativeGoldenSampleDefinition = {
  id: ReportNarrativeGoldenSampleId;
  description: string;
  expectedHeroMode: HeroSelection["mode"];
  scoresA: FounderScores;
  scoresB: FounderScores;
};

export type ReportNarrativeGoldenSample = ReportNarrativeGoldenSampleDefinition & {
  compareResult: CompareFoundersResult;
  selection: FounderMatchingSelection;
};

export const REPORT_NARRATIVE_GOLDEN_SAMPLE_DEFINITIONS: ReportNarrativeGoldenSampleDefinition[] = [
  {
    id: "complement_led",
    description: "Founders bring useful complementarity with limited critical pressure.",
    expectedHeroMode: "complement_led",
    scoresA: FOUNDER_MATCHING_TEST_CASES.complementary_builders.a,
    scoresB: FOUNDER_MATCHING_TEST_CASES.complementary_builders.b,
  },
  {
    id: "tension_led",
    description: "Several alignment fields need early clarification without diagnostic language.",
    expectedHeroMode: "tension_led",
    scoresA: FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
    scoresB: FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b,
  },
  {
    id: "alignment_led",
    description: "A close working basis with no forced false complexity.",
    expectedHeroMode: "alignment_led",
    scoresA: FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.a,
    scoresB: FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.b,
  },
  {
    id: "blind_spot_watch",
    description: "High similarity can be useful while still needing a visible counter-perspective.",
    expectedHeroMode: "blind_spot_watch",
    scoresA: FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
    scoresB: FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b,
  },
];

export function buildReportNarrativeGoldenSamples(): ReportNarrativeGoldenSample[] {
  return REPORT_NARRATIVE_GOLDEN_SAMPLE_DEFINITIONS.map((definition) => {
    const compareResult = compareFounders(definition.scoresA, definition.scoresB);
    return {
      ...definition,
      compareResult,
      selection: buildFounderMatchingSelection(compareResult),
    };
  });
}
