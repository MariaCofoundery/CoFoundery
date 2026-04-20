import {
  buildAdvisorReportData,
} from "@/features/reporting/advisor-report/advisorReportBuilders";
import type { AdvisorReportData } from "@/features/reporting/advisor-report/advisorReportTypes";
import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
  type CompareFoundersResult,
} from "@/features/reporting/founderMatchingEngine";

export type AdvisorReportPreviewCaseId =
  | "misaligned_pressure_pair"
  | "highly_similar_but_blind_spot_pair"
  | "complementary_builders"
  | "balanced_but_manageable_pair";

export type AdvisorReportPreviewCase = {
  id: AdvisorReportPreviewCaseId;
  title: string;
  shortLabel: string;
  summary: string;
  participantAName: string;
  participantBName: string;
  compareResult: CompareFoundersResult;
  report: AdvisorReportData;
};

type CaseMeta = Omit<
  AdvisorReportPreviewCase,
  "id" | "compareResult" | "report"
>;

const CASE_ORDER: AdvisorReportPreviewCaseId[] = [
  "misaligned_pressure_pair",
  "highly_similar_but_blind_spot_pair",
  "complementary_builders",
  "balanced_but_manageable_pair",
];

const CASE_META: Record<AdvisorReportPreviewCaseId, CaseMeta> = {
  misaligned_pressure_pair: {
    title: "High-Tension-Case",
    shortLabel: "Spannung",
    summary:
      "Deutlich gegensaetzliche Muster unter Druck. Geeignet, um Priorisierung, Top-Risiken und Interventionslogik zu pruefen.",
    participantAName: "Lea Hoffmann",
    participantBName: "Tim Becker",
  },
  highly_similar_but_blind_spot_pair: {
    title: "Blind-Spot-/Similarity-Case",
    shortLabel: "Blind Spot",
    summary:
      "Hohe Naehe mit gemeinsamer Schieflage. Geeignet, um Blind-Spot-Logik und Advisor-Tonalitaet ohne offenen Gegensatz zu pruefen.",
    participantAName: "Clara Neumann",
    participantBName: "Felix Hartmann",
  },
  complementary_builders: {
    title: "Komplementaerer Unterschied",
    shortLabel: "Komplement",
    summary:
      "Produktive Unterschiede mit punktuellem Klaerungsbedarf. Geeignet, um Chance-Logik und tragfaehige Unterschiede zu pruefen.",
    participantAName: "Mara Keller",
    participantBName: "Jonas Brandt",
  },
  balanced_but_manageable_pair: {
    title: "Eher stabiles Team",
    shortLabel: "Stabil",
    summary:
      "Relativ ausgewogene Konstellation mit wenigen schaerferen Reibungspunkten. Geeignet, um Stabilitaetslogik und niedrige Prioritaeten zu pruefen.",
    participantAName: "Nora Weiss",
    participantBName: "David Kern",
  },
};

export function resolveAdvisorReportPreviewCase(
  value: string | undefined
): AdvisorReportPreviewCaseId {
  if (value === "misaligned_pressure_pair") return value;
  if (value === "highly_similar_but_blind_spot_pair") return value;
  if (value === "balanced_but_manageable_pair") return value;
  return "complementary_builders";
}

export function getAdvisorReportPreviewCaseOptions() {
  return CASE_ORDER.map((caseId) => ({
    id: caseId,
    title: CASE_META[caseId].title,
    shortLabel: CASE_META[caseId].shortLabel,
  }));
}

export function getAdvisorReportPreviewCase(
  caseId: AdvisorReportPreviewCaseId
): AdvisorReportPreviewCase {
  const scores = FOUNDER_MATCHING_TEST_CASES[caseId];
  const compareResult = compareFounders(scores.a, scores.b);
  const report = buildAdvisorReportData(compareResult);
  const meta = CASE_META[caseId];

  return {
    id: caseId,
    ...meta,
    compareResult,
    report,
  };
}
