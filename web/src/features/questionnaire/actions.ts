"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { selectParticipantA, selectParticipantB } from "@/features/participants/selection";
import { createReportRunOnCompletion } from "@/features/reporting/actions";

type Participant = {
  id: string;
  role: "A" | "B";
  user_id?: string | null;
  display_name: string | null;
  completed_at: string | null;
};

export async function getParticipantA(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: participant, error } = await supabase
    .from("participants")
    .select("id, role, user_id, display_name, completed_at")
    .eq("session_id", sessionId)
    .eq("role", "A")
    .maybeSingle();

  if (error || !participant) {
    return { participant: null, error: "not_found" } as const;
  }

  if (participant.role !== "A") {
    return { participant: null, error: "not_allowed" } as const;
  }

  const resolvedDisplayName = await resolveDisplayNameForUser(
    supabase,
    participant.id,
    participant.display_name,
    user.id
  );

  return {
    participant: {
      ...(participant as Participant),
      display_name: resolvedDisplayName,
    },
    error: null,
  } as const;
}

export async function saveDisplayName(sessionId: string, displayName: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sanitized = normalizeDisplayName(displayName);

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, role, user_id")
    .eq("session_id", sessionId)
    .eq("role", "A")
    .maybeSingle();

  if (participantError || !participant || participant.role !== "A") {
    return { ok: false, error: "not_allowed" } as const;
  }

  const { error: centralUpdateError } = await supabase
    .from("participants")
    .update({ display_name: sanitized })
    .eq("user_id", user.id);

  if (centralUpdateError) {
    return { ok: false, error: "update_failed" } as const;
  }

  if (participant.user_id !== user.id) {
    const { error: localUpdateError } = await supabase
      .from("participants")
      .update({ display_name: sanitized })
      .eq("id", participant.id);

    if (localUpdateError) {
      return { ok: false, error: "update_failed" } as const;
    }
  }

  return { ok: true } as const;
}

async function resolveDisplayNameForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  participantId: string,
  displayName: string | null,
  userId: string
) {
  const normalizedCurrent = normalizeDisplayName(displayName);
  if (normalizedCurrent) {
    return normalizedCurrent;
  }

  const { data: knownNames, error } = await supabase
    .from("participants")
    .select("display_name, created_at")
    .eq("user_id", userId)
    .not("display_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !knownNames) {
    return null;
  }

  const reusableName =
    knownNames.map((row) => normalizeDisplayName(row.display_name)).find(Boolean) ?? null;

  if (!reusableName) {
    return null;
  }

  const { error: updateError } = await supabase
    .from("participants")
    .update({ display_name: reusableName })
    .eq("id", participantId);

  if (updateError) {
    return null;
  }

  return reusableName;
}

function normalizeDisplayName(value: string | null | undefined) {
  const normalized = value?.trim().slice(0, 64) ?? "";
  if (!normalized) {
    return null;
  }

  const lowered = normalized.toLowerCase();
  if (
    lowered === "person a" ||
    lowered === "person b" ||
    lowered === "neuer" ||
    lowered === "neu" ||
    lowered === "teilnehmer" ||
    lowered === "teilnehmerin"
  ) {
    return null;
  }

  return normalized;
}

export async function listQuestions() {
  const supabase = await createClient();
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, dimension, type, prompt, sort_order")
    .eq("is_active", true)
    .eq("category", "basis")
    .order("sort_order", { ascending: true });

  if (questionsError) {
    return { questions: [], choices: [], error: "questions_failed" } as const;
  }

  const questionIds = (questions ?? []).map((question) => question.id);
  if (questionIds.length === 0) {
    return { questions: [], choices: [], error: null } as const;
  }

  const { data: choices, error: choicesError } = await supabase
    .from("choices")
    .select("id, question_id, label, value, sort_order")
    .in("question_id", questionIds)
    .order("sort_order", { ascending: true });

  if (choicesError) {
    return { questions: [], choices: [], error: "choices_failed" } as const;
  }

  return { questions: questions ?? [], choices: choices ?? [], error: null } as const;
}

export async function upsertResponse(
  sessionId: string,
  questionId: string,
  choiceValue: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("role", "A")
    .maybeSingle();

  if (participantError || !participant) {
    return { ok: false, error: "not_allowed" } as const;
  }

  const { error } = await supabase.from("responses").upsert(
    {
      session_id: sessionId,
      participant_id: participant.id,
      question_id: questionId,
      choice_value: choiceValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id,question_id" }
  );

  if (error) {
    return { ok: false, error: "save_failed" } as const;
  }

  return { ok: true } as const;
}

export async function saveFreeText(sessionId: string, text: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, completed_at")
    .eq("session_id", sessionId)
    .eq("role", "A")
    .maybeSingle();

  if (participantError || !participant) {
    return { ok: false, error: "not_allowed" } as const;
  }

  if (participant.completed_at) {
    return { ok: false, error: "already_completed" } as const;
  }

  const { error } = await supabase.from("free_text").upsert(
    {
      session_id: sessionId,
      participant_id: participant.id,
      text,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id" }
  );

  if (error) {
    return { ok: false, error: "save_failed" } as const;
  }

  return { ok: true } as const;
}

export async function completeParticipantA(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, completed_at")
    .eq("session_id", sessionId)
    .eq("role", "A")
    .maybeSingle();

  if (participantError || !participant) {
    return { ok: false, error: "not_allowed" } as const;
  }

  if (participant.completed_at) {
    await createReportRunOnCompletion(sessionId);
    return { ok: true } as const;
  }

  const completedAt = new Date().toISOString();

  const { error: completeError } = await supabase
    .from("participants")
    .update({ completed_at: completedAt })
    .eq("id", participant.id);

  if (completeError) {
    return { ok: false, error: "complete_failed" } as const;
  }

  const { data: participants } = await supabase
    .from("participants")
    .select("id, role, user_id, invited_email, completed_at, created_at")
    .eq("session_id", sessionId);

  const participantA = selectParticipantA(participants ?? []);
  const participantB = selectParticipantB(participants ?? [], { primary: participantA });
  const allDone = Boolean(participantA?.completed_at && participantB?.completed_at);
  const newStatus = allDone ? "match_ready" : "waiting";

  await supabase.from("sessions").update({ status: newStatus }).eq("id", sessionId);
  if (allDone) {
    await createReportRunOnCompletion(sessionId);
  }

  return { ok: true, status: newStatus } as const;
}

export async function markSessionCompleted(sessionId: string) {
  const supabase = await createClient();
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return { ok: false, error: "invalid_session_id" } as const;
  }

  const { error } = await supabase
    .from("sessions")
    .update({ status: "completed" })
    .eq("id", normalizedSessionId)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message } as const;
  }

  return { ok: true } as const;
}
