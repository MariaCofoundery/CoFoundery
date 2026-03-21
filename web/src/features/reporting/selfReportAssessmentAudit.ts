import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { aggregateFounderBaseScoresFromAnswers } from "@/features/reporting/selfReportScoring";
import { buildHumanReadableAuditReport } from "@/features/reporting/selfReportHumanAudit";
import { runSelfReportAudit } from "@/features/reporting/selfReportSelection";
import type { AssessmentAnswerRow, QuestionMetaRow } from "@/features/reporting/base_scoring";

const TARGET_ASSESSMENT_ID = "d933d56f-d16e-4eb2-b732-33ee9c1c0f28";

type SupabaseDebugClient = ReturnType<typeof createSupabaseClient>;
type AssessmentDebugRow = {
  id: string;
  user_id: string;
  submitted_at: string | null;
  module: string | null;
  created_at: string | null;
};

function createPrivilegedClient(): SupabaseDebugClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function buildAssessmentAuditReport(assessmentId = TARGET_ASSESSMENT_ID) {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return {
      ok: false as const,
      reason: "missing_service_role",
      assessmentId,
    };
  }

  const { data: assessmentRow, error: assessmentError } = await privileged
    .from("assessments")
    .select("id, user_id, submitted_at, module, created_at")
    .eq("id", assessmentId)
    .maybeSingle();

  if (assessmentError || !assessmentRow) {
    return {
      ok: false as const,
      reason: "assessment_not_found",
      assessmentId,
      detail: assessmentError?.message ?? null,
    };
  }

  const { data: answerRows, error: answerError } = await privileged
    .from("assessment_answers")
    .select("question_id, choice_value")
    .eq("assessment_id", assessmentId)
    .order("question_id", { ascending: true });

  if (answerError || !answerRows) {
    return {
      ok: false as const,
      reason: "answers_not_found",
      assessmentId,
      detail: answerError?.message ?? null,
    };
  }

  const answers = answerRows as AssessmentAnswerRow[];
  const questionIds = [...new Set(answers.map((entry) => entry.question_id))];

  const { data: questionRows, error: questionError } = await privileged
    .from("questions")
    .select("id, dimension, category, prompt")
    .in("id", questionIds);

  if (questionError || !questionRows) {
    return {
      ok: false as const,
      reason: "questions_not_found",
      assessmentId,
      detail: questionError?.message ?? null,
    };
  }

  const questionById = new Map((questionRows as QuestionMetaRow[]).map((row) => [row.id, row]));
  const aggregate = aggregateFounderBaseScoresFromAnswers(answers, questionById);
  const scores = aggregate.scores;
  const rawAudit = runSelfReportAudit(scores);
  const humanAudit = buildHumanReadableAuditReport(scores);
  const assessment = assessmentRow as AssessmentDebugRow;

  return {
    ok: true as const,
    assessmentId,
    assessmentInfo: {
      assessmentId: assessment.id,
      userId: assessment.user_id,
      submittedAt: assessment.submitted_at,
      module: assessment.module,
      createdAt: assessment.created_at,
      answerCount: answers.length,
    },
    rawData: {
      answerCount: answers.length,
      answers: answers.map((entry) => ({
        questionId: entry.question_id,
        choiceValue: entry.choice_value,
      })),
    },
    scoresByDimension: humanAudit.scoreOverview,
    frictionOverview: humanAudit.frictionOverview,
    selectionSummary: {
      primarySignal: rawAudit.selectionSummary.primarySignal,
      workModeSignal: rawAudit.selectionSummary.workModeSignal,
      tensionCarrier: rawAudit.selectionSummary.tensionCarrier,
      patternDimensions: rawAudit.selectionSummary.patternDimensions,
      challengeDimensions: rawAudit.challenges.finalSelection.map((entry) => entry.dimensionName),
      complementRoles: rawAudit.complement.finalSelection.map((entry) => ({
        role: entry.role,
        dimension: entry.dimensionName,
      })),
    },
    summary: humanAudit.summary,
    renderedReport: humanAudit.renderedText,
    fullHumanAudit: humanAudit,
  };
}

export { TARGET_ASSESSMENT_ID };
