"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { finalizeInvitationIfReady } from "@/features/reporting/actions";

export type ModuleKey = "base" | "values";
export type QuestionCategory = "basis" | "values";
export type AnswerMap = Record<string, string>; // question_id -> choice_value

type AssessmentRow = {
  id: string;
  module: ModuleKey;
  submitted_at: string | null;
  created_at: string;
};

const MODULE_TO_CATEGORY: Record<ModuleKey, QuestionCategory> = {
  base: "basis",
  values: "values",
};

async function getUserIdOrThrow() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) throw new Error("not_authenticated");
  return { supabase, userId: data.user.id };
}

async function getOwnedAssessmentOrThrow(assessmentId: string) {
  const { supabase, userId } = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("assessments")
    .select("id, module, submitted_at, created_at")
    .eq("id", assessmentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("assessment_not_found");
  }

  return {
    supabase,
    userId,
    assessment: data as AssessmentRow,
  };
}

export async function getLatestSubmittedAssessment(module: ModuleKey): Promise<AssessmentRow | null> {
  const { supabase, userId } = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("assessments")
    .select("id, module, submitted_at, created_at")
    .eq("user_id", userId)
    .eq("module", module)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AssessmentRow;
}

export async function getOrCreateDraftAssessment(module: ModuleKey): Promise<AssessmentRow> {
  const { supabase, userId } = await getUserIdOrThrow();
  const { data: draft } = await supabase
    .from("assessments")
    .select("id, module, submitted_at, created_at")
    .eq("user_id", userId)
    .eq("module", module)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draft) {
    return draft as AssessmentRow;
  }

  const { data: created, error: createError } = await supabase
    .from("assessments")
    .insert({ user_id: userId, module })
    .select("id, module, submitted_at, created_at")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "draft_create_failed");
  }

  return created as AssessmentRow;
}

export async function createDraftAssessment(module: ModuleKey): Promise<AssessmentRow> {
  const { supabase, userId } = await getUserIdOrThrow();
  const { data: created, error: createError } = await supabase
    .from("assessments")
    .insert({ user_id: userId, module })
    .select("id, module, submitted_at, created_at")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "draft_create_failed");
  }

  return created as AssessmentRow;
}

export async function getOwnedDraftAssessment(
  module: ModuleKey,
  assessmentId: string
): Promise<AssessmentRow | null> {
  const normalizedAssessmentId = assessmentId.trim();
  if (!normalizedAssessmentId) {
    return null;
  }

  const { supabase, userId } = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("assessments")
    .select("id, module, submitted_at, created_at")
    .eq("id", normalizedAssessmentId)
    .eq("user_id", userId)
    .eq("module", module)
    .is("submitted_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AssessmentRow;
}

export async function getAssessmentAnswerMap(assessmentId: string): Promise<AnswerMap> {
  const { supabase } = await getOwnedAssessmentOrThrow(assessmentId);

  const { data: rows, error: ansErr } = await supabase
    .from("assessment_answers")
    .select("question_id, choice_value")
    .eq("assessment_id", assessmentId);

  if (ansErr) {
    throw new Error(ansErr.message);
  }

  const map: AnswerMap = {};
  (rows ?? []).forEach((row) => {
    const typed = row as { question_id: string; choice_value: string };
    map[typed.question_id] = typed.choice_value;
  });
  return map;
}

/**
 * Load latest submitted assessment answers for the current user & module.
 * Returns an AnswerMap (question_id -> choice_value). If none exists, returns {}.
 */
export async function getLatestAssessmentAnswers(module: ModuleKey): Promise<AnswerMap> {
  const latest = await getLatestSubmittedAssessment(module);
  if (!latest) return {};
  return getAssessmentAnswerMap(latest.id);
}

export async function upsertAssessmentAnswer(
  assessmentId: string,
  questionId: string,
  choiceValue: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, assessment } = await getOwnedAssessmentOrThrow(assessmentId);
    if (assessment.submitted_at) {
      return { ok: false, error: "already_submitted" };
    }

    const expectedCategory = MODULE_TO_CATEGORY[assessment.module];
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("id, category")
      .eq("id", questionId)
      .maybeSingle();

    if (questionError || !question || question.category !== expectedCategory) {
      return { ok: false, error: "invalid_question" };
    }

    const { error: upsertError } = await supabase.from("assessment_answers").upsert(
      {
        assessment_id: assessmentId,
        question_id: questionId,
        choice_value: choiceValue,
      },
      { onConflict: "assessment_id,question_id" }
    );

    if (upsertError) {
      return { ok: false, error: "save_failed" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "not_allowed" };
  }
}

export async function submitAssessment(
  assessmentId: string
): Promise<{ ok: boolean; submittedAt?: string; error?: string }> {
  try {
    const { supabase, userId, assessment } = await getOwnedAssessmentOrThrow(assessmentId);
    if (assessment.submitted_at) {
      return { ok: true, submittedAt: assessment.submitted_at };
    }

    const submittedAt = new Date().toISOString();
    const { error } = await supabase
      .from("assessments")
      .update({ submitted_at: submittedAt })
      .eq("id", assessmentId)
      .eq("user_id", userId)
      .is("submitted_at", null);

    if (error) {
      return { ok: false, error: "submit_failed" };
    }

    const { data: acceptedInvitations } = await supabase
      .from("invitations")
      .select("id")
      .eq("status", "accepted")
      .or(`inviter_user_id.eq.${userId},invitee_user_id.eq.${userId}`);
    const invitationIds = [...new Set((acceptedInvitations ?? []).map((row) => row.id).filter(Boolean))];
    if (invitationIds.length > 0) {
      const finalizeResults = await Promise.all(
        invitationIds.map((invitationId) => finalizeInvitationIfReady(invitationId))
      );
      finalizeResults.forEach((result, index) => {
        if (!result.ok) {
          console.error("finalizeInvitationIfReady after submit failed", {
            invitationId: invitationIds[index],
            reason: result.reason,
            detail: result.detail ?? null,
          });
        }
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/me/report");
    return { ok: true, submittedAt };
  } catch {
    return { ok: false, error: "not_allowed" };
  }
}

/**
 * Save answers into the latest draft assessment for a module.
 * This keeps submitted assessments immutable.
 */
export async function saveAssessmentAnswers(module: ModuleKey, answers: AnswerMap) {
  const draft = await getOrCreateDraftAssessment(module);
  const entries = Object.entries(answers);

  for (const [questionId, choiceValue] of entries) {
    const result = await upsertAssessmentAnswer(draft.id, questionId, choiceValue);
    if (!result.ok) {
      throw new Error(result.error ?? "save_failed");
    }
  }

  return { ok: true, assessmentId: draft.id };
}
