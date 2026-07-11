import {
  buildProfileResultFromSession,
  generateCompareReport,
} from "@/features/reporting/generateCompareReport";
import {
  buildFounderAlignmentReport,
  type FounderAlignmentReport,
} from "@/features/reporting/buildFounderAlignmentReport";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  aggregateBaseScoresFromAnswers,
  type AssessmentAnswerRow,
  type QuestionMetaRow,
} from "@/features/reporting/base_scoring";
import {
  computeValuesContinuumScore,
  scoreSelfValuesProfile,
  type ValuesAnswerForScoring,
} from "@/features/reporting/values_scoring";
import { mapLegacyFounderAnswersToV2Answers } from "@/features/scoring/founderCompatibilityAnswerRuntime";
import { scoreFounderAlignmentV2FromAnswersV2 } from "@/features/scoring/founderCompatibilityScoringV2";
import { type TeamScoringResult } from "@/features/scoring/founderScoring";
import {
  type CompareReportJson,
  type KeyInsight,
  type SessionAlignmentReport,
} from "@/features/reporting/types";
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";

export type FounderAlignmentReportModule = "base" | "values";

type SubmittedAssessmentSnapshot = {
  id: string;
  submittedAt: string | null;
  createdAt: string;
};

type ParticipantPayloadInput = {
  userId: string;
  displayName: string;
  baseAssessment: SubmittedAssessmentSnapshot;
  baseAnswers: AssessmentAnswerRow[];
  valuesAssessment?: SubmittedAssessmentSnapshot | null;
  valuesAnswers?: AssessmentAnswerRow[];
};

type BuildFounderAlignmentReportPayloadInput = {
  sessionId: string;
  participantA: ParticipantPayloadInput;
  participantB: ParticipantPayloadInput;
  baseQuestionMetaById: Map<string, QuestionMetaRow>;
  valuesQuestionMetaById?: Map<string, QuestionMetaRow>;
  valuesTotal?: number;
  modules: FounderAlignmentReportModule[];
  teamContext: TeamContext;
  personBInvitedAt: string | null;
  inviteConsentCaptured: boolean;
  source: string;
  generatedAt?: string;
  locale?: AppLocale;
};

export type FounderAlignmentReportPayload = {
  reportType: "founder_alignment_v1";
  locale?: AppLocale;
  report: SessionAlignmentReport;
  compareJson: CompareReportJson;
  founderReport: FounderAlignmentReport;
  founderScoring: TeamScoringResult;
  teamContext: TeamContext;
  modules: FounderAlignmentReportModule[];
  inputAssessmentIds: string[];
  generatedAt: string;
  source: string;
};

export type FounderAlignmentReportPayloadResult = {
  payload: FounderAlignmentReportPayload;
  modules: FounderAlignmentReportModule[];
  inputAssessmentIds: string[];
};

export function getFounderAlignmentReportPayloadLocale(
  payload: { locale?: unknown } | null | undefined
): AppLocale {
  return normalizeLocale(typeof payload?.locale === "string" ? payload.locale : DEFAULT_LOCALE);
}

function toValuesInput(
  answers: AssessmentAnswerRow[],
  questionMetaById: Map<string, QuestionMetaRow>
): ValuesAnswerForScoring[] {
  return answers.map((row) => {
    const meta = questionMetaById.get(row.question_id);
    return {
      questionId: row.question_id,
      choiceValue: row.choice_value,
      prompt: meta?.prompt ?? null,
      dimension: meta?.dimension ?? null,
    };
  });
}

export function buildFounderAlignmentReportPayload({
  sessionId,
  participantA,
  participantB,
  baseQuestionMetaById,
  valuesQuestionMetaById = new Map<string, QuestionMetaRow>(),
  valuesTotal = 0,
  modules,
  teamContext,
  personBInvitedAt,
  inviteConsentCaptured,
  source,
  generatedAt = new Date().toISOString(),
  locale = DEFAULT_LOCALE,
}: BuildFounderAlignmentReportPayloadInput): FounderAlignmentReportPayloadResult {
  const includeValuesInReport = modules.includes("values");
  const baseScoresA = aggregateBaseScoresFromAnswers(
    participantA.baseAnswers,
    baseQuestionMetaById
  );
  const baseScoresB = aggregateBaseScoresFromAnswers(
    participantB.baseAnswers,
    baseQuestionMetaById
  );
  const founderScoring = scoreFounderAlignmentV2FromAnswersV2({
    personA: mapLegacyFounderAnswersToV2Answers(participantA.baseAnswers, baseQuestionMetaById),
    personB: mapLegacyFounderAnswersToV2Answers(participantB.baseAnswers, baseQuestionMetaById),
  });
  const founderReport = buildFounderAlignmentReport({
    scoringResult: founderScoring,
    teamContext,
    locale,
  });

  const valuesAnswersA = includeValuesInReport ? (participantA.valuesAnswers ?? []) : [];
  const valuesAnswersB = includeValuesInReport ? (participantB.valuesAnswers ?? []) : [];
  const valuesProfileA =
    includeValuesInReport && participantA.valuesAssessment
      ? scoreSelfValuesProfile(toValuesInput(valuesAnswersA, valuesQuestionMetaById), valuesTotal)
      : null;
  const valuesProfileB =
    includeValuesInReport && participantB.valuesAssessment
      ? scoreSelfValuesProfile(toValuesInput(valuesAnswersB, valuesQuestionMetaById), valuesTotal)
      : null;
  const valuesScoreA = computeValuesContinuumScore(valuesProfileA);
  const valuesScoreB = computeValuesContinuumScore(valuesProfileB);
  const requestedScope: SessionAlignmentReport["requestedScope"] = includeValuesInReport
    ? "basis_plus_values"
    : "basis";

  const baseReport: SessionAlignmentReport = {
    sessionId,
    createdAt: generatedAt,
    personBInvitedAt,
    personACompletedAt:
      participantA.baseAssessment.submittedAt ?? participantA.baseAssessment.createdAt,
    personBCompletedAt:
      participantB.baseAssessment.submittedAt ?? participantB.baseAssessment.createdAt,
    participantAId: participantA.userId,
    participantBId: participantB.userId,
    participantAName: participantA.displayName || "Person A",
    participantBName: participantB.displayName || "Person B",
    personBStatus: "match_ready",
    personACompleted: true,
    personBCompleted: true,
    comparisonEnabled: true,
    scoresA: baseScoresA.scores,
    scoresB: baseScoresB.scores,
    keyInsights: [],
    commonTendencies: [],
    frictionPoints: [],
    conversationGuideQuestions: [],
    valuesModulePreview: "",
    valuesModuleStatus: includeValuesInReport ? "completed" : "not_started",
    valuesAnsweredA: valuesAnswersA.length,
    valuesAnsweredB: valuesAnswersB.length,
    valuesTotal: includeValuesInReport ? valuesTotal : 0,
    basisAnsweredA: baseScoresA.answeredQuestionCount,
    basisAnsweredB: baseScoresB.answeredQuestionCount,
    basisTotal: baseScoresA.expectedTotal,
    valuesAlignmentPercent: null,
    valuesIdentityCategoryA: valuesProfileA?.primaryLabel ?? null,
    valuesIdentityCategoryB: valuesProfileB?.primaryLabel ?? null,
    valuesPrimaryArchetypeIdA: valuesProfileA?.primaryArchetypeId ?? null,
    valuesPrimaryArchetypeIdB: valuesProfileB?.primaryArchetypeId ?? null,
    valuesScoreA,
    valuesScoreB,
    requestedScope,
    inviteConsentCaptured,
    baseCoverageA: {
      answeredNumericByDimension: baseScoresA.answeredNumericByDimension,
      expectedByDimension: baseScoresA.expectedByDimension,
      numericAnsweredTotal: baseScoresA.numericAnsweredTotal,
      expectedTotal: baseScoresA.expectedTotal,
      baseCoveragePercent: baseScoresA.baseCoveragePercent,
    },
    baseCoverageB: {
      answeredNumericByDimension: baseScoresB.answeredNumericByDimension,
      expectedByDimension: baseScoresB.expectedByDimension,
      numericAnsweredTotal: baseScoresB.numericAnsweredTotal,
      expectedTotal: baseScoresB.expectedTotal,
      baseCoveragePercent: baseScoresB.baseCoveragePercent,
    },
    debugA: {
      participantName: participantA.displayName || "Person A",
      dimensions: baseScoresA.debugDimensions,
    },
    debugB: {
      participantName: participantB.displayName || "Person B",
      dimensions: baseScoresB.debugDimensions,
    },
  };

  const profileA = buildProfileResultFromSession(baseReport, "A");
  const profileB = buildProfileResultFromSession(baseReport, "B");
  const compareJson = generateCompareReport(profileA, profileB);
  const keyInsights: KeyInsight[] = compareJson.keyInsights.slice(0, 3).map((insight, index) => ({
    dimension: insight.dimension,
    title: insight.title,
    text: insight.text,
    priority: index + 1,
  }));

  const finalReport: SessionAlignmentReport = {
    ...baseReport,
    keyInsights,
    commonTendencies: compareJson.executiveSummary.topMatches,
    frictionPoints: compareJson.executiveSummary.topTensions,
    conversationGuideQuestions: compareJson.conversationGuide,
    valuesModulePreview: compareJson.valuesModule.text,
    valuesAlignmentPercent: compareJson.valuesModule.alignmentPercent,
  };

  const inputAssessmentIds = [
    participantA.baseAssessment.id,
    participantB.baseAssessment.id,
    participantA.valuesAssessment?.id ?? null,
    participantB.valuesAssessment?.id ?? null,
  ].filter((value): value is string => Boolean(value));

  const uniqueInputAssessmentIds = [...new Set(inputAssessmentIds)];
  const uniqueModules = [...new Set(modules)];
  const payload: FounderAlignmentReportPayload = {
    reportType: "founder_alignment_v1",
    locale,
    report: finalReport,
    compareJson,
    founderReport,
    founderScoring,
    teamContext,
    modules: uniqueModules,
    inputAssessmentIds: uniqueInputAssessmentIds,
    generatedAt,
    source,
  };

  return {
    payload,
    modules: uniqueModules,
    inputAssessmentIds: uniqueInputAssessmentIds,
  };
}
