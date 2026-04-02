"use server";

import { createClient } from "@/lib/supabase/server";
import { assertFounderBaseQuestionVersionContract } from "@/features/scoring/founderBaseQuestionMeta";
import { type TeamScoringResult } from "@/features/scoring/founderScoring";
import {
  buildFounderCompatibilityAnswerMapV2,
  mapLegacyFounderAnswersToV2Answers,
  type FounderCompatibilityAnswerV2,
} from "@/features/scoring/founderCompatibilityAnswerRuntime";
import { scoreFounderAlignmentV2FromAnswersV2 } from "@/features/scoring/founderCompatibilityScoringV2";
import { getActiveRegistryItems } from "@/features/scoring/founderCompatibilityRegistry";

type InvitationRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  status: string;
};

type WorkbookAdvisorRow = {
  invitation_id: string;
};

type AssessmentRow = {
  id: string;
  user_id: string;
  submitted_at: string | null;
  created_at: string;
};

type AssessmentAnswerRow = {
  question_id: string;
  choice_value: string;
};

type QuestionRow = {
  id: string;
};

type DebugStatus = "missing_invitation" | "forbidden" | "in_progress" | "ready";
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type FounderScoringDebugResult = {
  status: DebugStatus;
  invitationId: string | null;
  baseQuestionCount: number;
  reason: string | null;
  participants: {
    personA: {
      userId: string | null;
      assessmentId: string | null;
      submittedAt: string | null;
      answeredActiveBaseQuestions: number;
    };
    personB: {
      userId: string | null;
      assessmentId: string | null;
      submittedAt: string | null;
      answeredActiveBaseQuestions: number;
    };
  };
  transformedAnswers: {
    personA: FounderCompatibilityAnswerV2[];
    personB: FounderCompatibilityAnswerV2[];
  };
  scoring: TeamScoringResult | null;
};

async function getLatestSubmittedBaseAssessment(
  supabase: SupabaseServerClient,
  userId: string
): Promise<AssessmentRow | null> {
  const { data, error } = await supabase
    .from("assessments")
    .select("id, user_id, submitted_at, created_at")
    .eq("user_id", userId)
    .eq("module", "base")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as AssessmentRow;
}

async function getActiveBaseQuestionMap(supabase: SupabaseServerClient): Promise<Map<string, QuestionRow>> {
  const { data, error } = await supabase
    .from("questions")
    .select("id")
    .eq("category", "basis")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return new Map<string, QuestionRow>();
  }

  assertFounderBaseQuestionVersionContract(
    (data as QuestionRow[]).map((row) => row.id),
    "founder_scoring_debug_active_basis_questions"
  );

  return new Map((data as QuestionRow[]).map((row) => [row.id, row]));
}

async function getAssessmentAnswers(
  supabase: SupabaseServerClient,
  assessmentId: string
): Promise<AssessmentAnswerRow[]> {
  const { data, error } = await supabase
    .from("assessment_answers")
    .select("question_id, choice_value")
    .eq("assessment_id", assessmentId);

  if (error || !data) return [];
  return data as AssessmentAnswerRow[];
}

function transformAnswers(
  rows: AssessmentAnswerRow[],
  activeBaseQuestionMap: Map<string, QuestionRow>
): FounderCompatibilityAnswerV2[] {
  const questionById = new Map(
    [...activeBaseQuestionMap.values()].map((question) => [
      question.id,
      { id: question.id, category: "basis" },
    ])
  );

  return mapLegacyFounderAnswersToV2Answers(rows, questionById);
}

export async function getFounderScoringDebug(
  invitationId: string | null | undefined
): Promise<FounderScoringDebugResult> {
  const normalizedInvitationId = invitationId?.trim() ?? "";
  const emptyResult: FounderScoringDebugResult = {
    status: "missing_invitation",
    invitationId: normalizedInvitationId || null,
    baseQuestionCount: 0,
    reason: "missing_invitation_id",
    participants: {
      personA: {
        userId: null,
        assessmentId: null,
        submittedAt: null,
        answeredActiveBaseQuestions: 0,
      },
      personB: {
        userId: null,
        assessmentId: null,
        submittedAt: null,
        answeredActiveBaseQuestions: 0,
      },
    },
    transformedAnswers: {
      personA: [],
      personB: [],
    },
    scoring: null,
  };

  if (!normalizedInvitationId) {
    return emptyResult;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ...emptyResult,
      invitationId: normalizedInvitationId,
      status: "forbidden",
      reason: "not_authenticated",
    };
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("invitations")
    .select("id, inviter_user_id, invitee_user_id, status")
    .eq("id", normalizedInvitationId)
    .maybeSingle();

  if (invitationError || !invitation) {
    return {
      ...emptyResult,
      invitationId: normalizedInvitationId,
      reason: "invitation_not_found",
    };
  }

  const typedInvitation = invitation as InvitationRow;
  const isParticipant =
    typedInvitation.inviter_user_id === user.id || typedInvitation.invitee_user_id === user.id;
  if (!isParticipant) {
    const { data: advisorAccess } = await supabase
      .from("founder_alignment_workbook_advisors")
      .select("invitation_id")
      .eq("invitation_id", normalizedInvitationId)
      .eq("advisor_user_id", user.id)
      .maybeSingle();

    if (!(advisorAccess as WorkbookAdvisorRow | null)?.invitation_id) {
      return {
        ...emptyResult,
        invitationId: normalizedInvitationId,
        status: "forbidden",
        reason: "not_a_participant",
      };
    }
  }

  if (!isParticipant && typedInvitation.status !== "accepted") {
    return {
      ...emptyResult,
      invitationId: normalizedInvitationId,
      status: "in_progress",
      reason: `invitation_status_${typedInvitation.status}`,
    };
  }

  if (typedInvitation.status !== "accepted") {
    return {
      ...emptyResult,
      invitationId: normalizedInvitationId,
      status: "in_progress",
      reason: `invitation_status_${typedInvitation.status}`,
      participants: {
        personA: {
          ...emptyResult.participants.personA,
          userId: typedInvitation.inviter_user_id,
        },
        personB: {
          ...emptyResult.participants.personB,
          userId: typedInvitation.invitee_user_id,
        },
      },
    };
  }

  if (!typedInvitation.invitee_user_id) {
    return {
      ...emptyResult,
      invitationId: normalizedInvitationId,
      status: "in_progress",
      reason: "missing_invitee",
      participants: {
        ...emptyResult.participants,
        personA: {
          ...emptyResult.participants.personA,
          userId: typedInvitation.inviter_user_id,
        },
      },
    };
  }

  const [activeBaseQuestionMap, personAAssessment, personBAssessment] = await Promise.all([
    getActiveBaseQuestionMap(supabase),
    getLatestSubmittedBaseAssessment(supabase, typedInvitation.inviter_user_id),
    getLatestSubmittedBaseAssessment(supabase, typedInvitation.invitee_user_id),
  ]);

  const baseQuestionCount = getActiveRegistryItems().length;
  const baseResult: FounderScoringDebugResult = {
    ...emptyResult,
    status: "in_progress",
    invitationId: normalizedInvitationId,
    baseQuestionCount,
    reason: null,
    participants: {
      personA: {
        userId: typedInvitation.inviter_user_id,
        assessmentId: personAAssessment?.id ?? null,
        submittedAt: personAAssessment?.submitted_at ?? null,
        answeredActiveBaseQuestions: 0,
      },
      personB: {
        userId: typedInvitation.invitee_user_id,
        assessmentId: personBAssessment?.id ?? null,
        submittedAt: personBAssessment?.submitted_at ?? null,
        answeredActiveBaseQuestions: 0,
      },
    },
    transformedAnswers: {
      personA: [],
      personB: [],
    },
    scoring: null,
  };

  if (!personAAssessment || !personBAssessment) {
    return {
      ...baseResult,
      reason: "base_assessment_in_progress",
    };
  }

  const [personARows, personBRows] = await Promise.all([
    getAssessmentAnswers(supabase, personAAssessment.id),
    getAssessmentAnswers(supabase, personBAssessment.id),
  ]);

  const personAAnswers = transformAnswers(personARows, activeBaseQuestionMap);
  const personBAnswers = transformAnswers(personBRows, activeBaseQuestionMap);
  const personAAnswerMap = buildFounderCompatibilityAnswerMapV2(personAAnswers);
  const personBAnswerMap = buildFounderCompatibilityAnswerMapV2(personBAnswers);

  const resultWithAnswers: FounderScoringDebugResult = {
    ...baseResult,
    transformedAnswers: {
      personA: personAAnswers,
      personB: personBAnswers,
    },
    participants: {
      personA: {
        ...baseResult.participants.personA,
        answeredActiveBaseQuestions: Object.keys(personAAnswerMap).length,
      },
      personB: {
        ...baseResult.participants.personB,
        answeredActiveBaseQuestions: Object.keys(personBAnswerMap).length,
      },
    },
  };

  const assessmentsAreComplete =
    baseQuestionCount > 0 &&
    Object.keys(personAAnswerMap).length >= baseQuestionCount &&
    Object.keys(personBAnswerMap).length >= baseQuestionCount;

  if (!assessmentsAreComplete) {
    return {
      ...resultWithAnswers,
      status: "in_progress",
      reason: "submitted_but_not_fully_answered",
    };
  }

  const scoring = scoreFounderAlignmentV2FromAnswersV2({
    personA: personAAnswers,
    personB: personBAnswers,
  });

  console.log("founder-scoring-debug", {
    invitationId: normalizedInvitationId,
    baseQuestionCount,
    personAAnswered: Object.keys(personAAnswerMap).length,
    personBAnswered: Object.keys(personBAnswerMap).length,
    overallFit: scoring.overallFit,
    overallTension: scoring.overallTension,
    overallRedFlags: scoring.overallRedFlags,
    overallGreenFlags: scoring.overallGreenFlags,
  });

  return {
    ...resultWithAnswers,
    status: "ready",
    reason: null,
    scoring,
  };
}
