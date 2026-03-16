import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { DebugQuestionEntry, SelfValuesProfile, SessionAlignmentReport } from "@/features/reporting/types";

export type SelfRadarSeries = Record<FounderDimensionKey, number | null>;
export type SelfInsightDimensionKey = FounderDimensionKey | "profile";

export type SelfKeyInsight = {
  dimension: SelfInsightDimensionKey;
  title: string;
  text: string;
  priority: number;
};

export type SelfBaseCoverage = {
  answeredNumericByDimension: Record<FounderDimensionKey, number>;
  expectedByDimension: Record<FounderDimensionKey, number>;
  numericAnsweredTotal: number;
  expectedTotal: number;
  baseCoveragePercent: number | null;
};

export type SelfDebugDimensionEntry = {
  dimension: FounderDimensionKey;
  rawScore: number | null;
  normalizedScore: number | null;
  category: string | null;
  questions: DebugQuestionEntry[];
};

export type SelfParticipantDebugReport = {
  participantName: string;
  dimensions: SelfDebugDimensionEntry[];
};

export type SelfAlignmentReport = {
  sessionId: string;
  createdAt: string | null;
  participantAId: string | null;
  participantAName: string;
  scoresA: SelfRadarSeries;
  keyInsights: SelfKeyInsight[];
  conversationGuideQuestions: string[];
  valuesModulePreview: string;
  valuesModuleStatus: SessionAlignmentReport["valuesModuleStatus"];
  valuesAnsweredA: number;
  valuesTotal: number;
  basisAnsweredA: number;
  basisTotal: number;
  valuesIdentityCategoryA: string | null;
  valuesPrimaryArchetypeIdA?: SessionAlignmentReport["valuesPrimaryArchetypeIdA"];
  valuesScoreA?: number | null;
  requestedScope: SessionAlignmentReport["requestedScope"];
  selfAssessmentMeta?: {
    baseAssessmentId: string | null;
    valuesAssessmentId: string | null;
  };
  selfValuesProfile?: SelfValuesProfile | null;
  baseCoverageA?: SelfBaseCoverage;
  debugA: SelfParticipantDebugReport;
};
