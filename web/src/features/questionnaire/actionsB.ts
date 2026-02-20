"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildResponseCountByParticipant,
  selectParticipantA,
  selectParticipantB,
} from "@/features/participants/selection";
import { createReportRunOnCompletion } from "@/features/reporting/actions";

type Participant = {
  id: string;
  role: "A" | "B" | "partner";
  user_id: string | null;
  invited_email: string | null;
  display_name: string | null;
  completed_at: string | null;
  created_at: string | null;
  requested_scope?: string | null;
};

async function resolveParticipantBMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string
) {
  const { data: rows, error } = await supabase
    .from("participants")
    .select("id, role, user_id, invited_email, display_name, completed_at, created_at, requested_scope")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .in("role", ["B", "partner"])
    .order("created_at", { ascending: false });

  if (error || !rows || rows.length === 0) {
    return { participant: null, error: "not_found" as const };
  }

  if (rows.length === 1) {
    return { participant: rows[0] as Participant, error: null };
  }

  const participantIds = rows.map((row) => row.id);
  const { data: responseRows } = await supabase
    .from("responses")
    .select("participant_id")
    .eq("session_id", sessionId)
    .in("participant_id", participantIds);

  const responseCountByParticipant = buildResponseCountByParticipant(responseRows ?? []);
  const selected = selectParticipantB(rows as Participant[], { responseCountByParticipant });

  return { participant: (selected ?? rows[0]) as Participant, error: null };
}

export async function getParticipantB(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { participant, error } = await resolveParticipantBMembership(
    supabase,
    sessionId,
    user.id
  );

  if (error || !participant) {
    return { participant: null, error: "not_found" } as const;
  }

  if (participant.role !== "B" && participant.role !== "partner") {
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

export async function saveDisplayNameB(sessionId: string, displayName: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sanitized = normalizeDisplayName(displayName);

  const { participant, error: participantError } = await resolveParticipantBMembership(
    supabase,
    sessionId,
    user.id
  );

  if (
    participantError ||
    !participant ||
    (participant.role !== "B" && participant.role !== "partner")
  ) {
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

export async function upsertResponseB(
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

  const { participant, error: participantError } = await resolveParticipantBMembership(
    supabase,
    sessionId,
    user.id
  );

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

export async function saveFreeTextB(sessionId: string, text: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { participant, error: participantError } = await resolveParticipantBMembership(
    supabase,
    sessionId,
    user.id
  );

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

export async function completeParticipantB(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { participant, error: participantError } = await resolveParticipantBMembership(
    supabase,
    sessionId,
    user.id
  );

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

  const requestedScope =
    (participant as { requested_scope?: string | null } | null)?.requested_scope === "basis_plus_values"
      ? "basis_plus_values"
      : "basis";
  const requiresValues = requestedScope === "basis_plus_values";

  return { ok: true, status: newStatus, requiresValues } as const;
}
