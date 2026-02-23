"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getLatestAssessmentAnswers,
  saveAssessmentAnswers,
  type ModuleKey,
} from "@/features/assessments/actions";

type Participant = {
  id: string;
  role: "A";
  user_id?: string | null;
  display_name: string | null;
  completed_at: string | null;
};

type Question = {
  id: string;
  dimension: string;
  type: string | null;
  prompt: string;
  sort_order: number;
};

type Choice = {
  id: string;
  question_id: string;
  label: string;
  value: string;
  sort_order: number;
};

async function getUserOrRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function normalizeDisplayName(value: string | null | undefined) {
  const normalized = value?.trim().slice(0, 64) ?? "";
  return normalized.length > 0 ? normalized : null;
}

async function resolveModuleForQuestion(questionId: string): Promise<ModuleKey> {
  const { supabase } = await getUserOrRedirect();
  const { data } = await supabase
    .from("questions")
    .select("category")
    .eq("id", questionId)
    .maybeSingle();

  return data?.category === "values" ? "values" : "base";
}

export async function getParticipantA(_sessionId: string) {
  const { supabase, user } = await getUserOrRedirect();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    participant: {
      id: user.id,
      role: "A",
      user_id: user.id,
      display_name: normalizeDisplayName(profile?.display_name ?? null),
      completed_at: null,
    } satisfies Participant,
    error: null,
  } as const;
}

export async function saveDisplayName(_sessionId: string, displayName: string | null) {
  const { supabase, user } = await getUserOrRedirect();
  const normalized = normalizeDisplayName(displayName);

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { ok: false, error: "update_failed" } as const;
  }

  return { ok: true } as const;
}

export async function listQuestions() {
  const { supabase } = await getUserOrRedirect();
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, dimension, type, prompt, sort_order")
    .eq("is_active", true)
    .eq("category", "basis")
    .order("sort_order", { ascending: true });

  if (questionsError) {
    return {
      questions: [] as Question[],
      choices: [] as Choice[],
      error: "questions_failed",
    };
  }

  const questionIds = (questions ?? []).map((question) => question.id);
  if (questionIds.length === 0) {
    return {
      questions: [] as Question[],
      choices: [] as Choice[],
      error: null,
    };
  }

  const { data: choices, error: choicesError } = await supabase
    .from("choices")
    .select("id, question_id, label, value, sort_order")
    .in("question_id", questionIds)
    .order("sort_order", { ascending: true });

  if (choicesError) {
    return {
      questions: [] as Question[],
      choices: [] as Choice[],
      error: "choices_failed",
    };
  }

  return {
    questions: (questions ?? []) as Question[],
    choices: (choices ?? []) as Choice[],
    error: null,
  };
}

export async function upsertResponse(
  _sessionId: string,
  questionId: string,
  choiceValue: string
) {
  const moduleKey = await resolveModuleForQuestion(questionId);
  const latest = await getLatestAssessmentAnswers(moduleKey);
  latest[questionId] = choiceValue;
  await saveAssessmentAnswers(moduleKey, latest);
  return { ok: true } as const;
}

export async function saveFreeText(_sessionId: string, _text: string) {
  // TEMP: free text storage was removed with the legacy schema.
  return { ok: true } as const;
}

export async function completeParticipantA(_sessionId: string) {
  return {
    ok: true,
    status: "waiting" as const,
    requiresValues: false,
  };
}

export async function markSessionCompleted(_sessionId: string) {
  return { ok: true } as const;
}
