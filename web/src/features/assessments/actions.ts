"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { finalizeInvitationIfReady } from "@/features/reporting/actions";
import {
  CURRENT_INSTRUMENT_ID,
  type InstrumentId,
} from "@/features/instruments/instruments";
import {
  getFounderCompatibilityBasePersistedChoiceValue,
  getFounderCompatibilityBasePersistenceQuestionId,
  isActiveFounderCompatibilityBaseItemId,
  isValidFounderCompatibilityBaseChoiceValue,
} from "@/features/questionnaire/founderCompatibilityBaseQuestionnaire";

export type ModuleKey = "base" | "values";
export type QuestionCategory = "basis" | "values";
export type AnswerMap = Record<string, string>; // question_id -> choice_value

/**
 * ---------------------------------------------------------------------------
 * ZU WELCHER FASSUNG GEHOERT DAS? (Schritt 0b, 27.09.2026)
 * ---------------------------------------------------------------------------
 *
 * Seit Migration 20261053120000 traegt jede Zeile eine Instrumentkennung.
 * Diese Datei ist der eigene Fragebogenweg einer Person - und dort gilt
 * durchgaengig die AKTUELLE Fassung:
 *
 *   Wer anfaengt, faengt mit dem an, was gerade vorgelegt wird.
 *   Ein Entwurf gehoert zu der Fassung, mit der er begonnen wurde.
 *
 * `instrument` ist trotzdem ein Parameter und keine feste Groesse: Ab
 * Schritt 8 kann eine Person bei ihrer alten Fassung bleiben, und dann
 * entscheidet der Aufrufer, welche gemeint ist. Heute ist die Vorgabe
 * richtig, weil es nur eine gibt.
 *
 * DIE SPALTENVORGABE IST EIN NETZ FUER DIE RUECKFUELLUNG, KEINE REGEL FUER
 * NEUE ZEILEN. Beim Einfuegen steht die Kennung deshalb ausdruecklich da -
 * sonst bekaeme eine neue Antwort spaeter still `v1`, obwohl gerade `v2`
 * vorgelegt wird.
 */
type AssessmentRow = {
  id: string;
  module: ModuleKey;
  submitted_at: string | null;
  created_at: string;
  instrument_id: string;
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
    .select("id, module, submitted_at, created_at, instrument_id")
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

export async function getLatestSubmittedAssessment(
  module: ModuleKey,
  instrument: InstrumentId = CURRENT_INSTRUMENT_ID
): Promise<AssessmentRow | null> {
  const { supabase, userId } = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("assessments")
    .select("id, module, submitted_at, created_at, instrument_id")
    .eq("user_id", userId)
    .eq("module", module)
    // OHNE DIESE ZEILE WAERE "der neueste" nach einem Wechsel immer der
    // neuen Fassung - auch bei jemandem, der ausdruecklich bei der alten
    // bleiben wollte.
    .eq("instrument_id", instrument)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AssessmentRow;
}

export async function getOrCreateDraftAssessment(
  module: ModuleKey,
  instrument: InstrumentId = CURRENT_INSTRUMENT_ID
): Promise<AssessmentRow> {
  const { supabase, userId } = await getUserIdOrThrow();
  const { data: draft } = await supabase
    .from("assessments")
    .select("id, module, submitted_at, created_at, instrument_id")
    .eq("user_id", userId)
    .eq("module", module)
    // Ein halb ausgefuellter Fragebogen der alten Fassung darf niemandem
    // vorgelegt werden, der gerade die neue ausfuellt.
    .eq("instrument_id", instrument)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draft) {
    return draft as AssessmentRow;
  }

  const { data: created, error: createError } = await supabase
    .from("assessments")
    .insert({ user_id: userId, module, instrument_id: instrument })
    .select("id, module, submitted_at, created_at, instrument_id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "draft_create_failed");
  }

  return created as AssessmentRow;
}

export async function createDraftAssessment(
  module: ModuleKey,
  instrument: InstrumentId = CURRENT_INSTRUMENT_ID
): Promise<AssessmentRow> {
  const { supabase, userId } = await getUserIdOrThrow();
  const { data: created, error: createError } = await supabase
    .from("assessments")
    .insert({ user_id: userId, module, instrument_id: instrument })
    .select("id, module, submitted_at, created_at, instrument_id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "draft_create_failed");
  }

  return created as AssessmentRow;
}

export async function getOwnedDraftAssessment(
  module: ModuleKey,
  assessmentId: string,
  instrument: InstrumentId = CURRENT_INSTRUMENT_ID
): Promise<AssessmentRow | null> {
  const normalizedAssessmentId = assessmentId.trim();
  if (!normalizedAssessmentId) {
    return null;
  }

  const { supabase, userId } = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from("assessments")
    .select("id, module, submitted_at, created_at, instrument_id")
    .eq("id", normalizedAssessmentId)
    .eq("user_id", userId)
    .eq("module", module)
    .eq("instrument_id", instrument)
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

    if (assessment.module === "base" && isActiveFounderCompatibilityBaseItemId(questionId)) {
      if (!isValidFounderCompatibilityBaseChoiceValue(questionId, choiceValue)) {
        return { ok: false, error: "invalid_choice" };
      }

      const persistedQuestionId = getFounderCompatibilityBasePersistenceQuestionId(questionId);
      const persistedChoiceValue = getFounderCompatibilityBasePersistedChoiceValue(
        questionId,
        choiceValue
      );
      if (!persistedQuestionId || !persistedChoiceValue) {
        return { ok: false, error: "invalid_question" };
      }

      const { error: upsertError } = await supabase.from("assessment_answers").upsert(
        {
          assessment_id: assessmentId,
          question_id: persistedQuestionId,
          choice_value: persistedChoiceValue,
        },
        { onConflict: "assessment_id,question_id" }
      );

      if (upsertError) {
        return { ok: false, error: "save_failed" };
      }

      return { ok: true };
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

      for (const invitationId of invitationIds) {
        revalidatePath(`/invite/${invitationId}`);
        revalidatePath(`/invite/${invitationId}/done`);
        revalidatePath(`/invite/${invitationId}/basis-complete`);
        revalidatePath(`/report/${invitationId}`);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/me/report");
    revalidatePath("/me/base/complete");
    revalidatePath("/me/values/complete");
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
