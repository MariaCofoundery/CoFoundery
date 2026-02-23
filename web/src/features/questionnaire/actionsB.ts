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
  role: "B" | "partner";
  user_id: string | null;
  invited_email: string | null;
  display_name: string | null;
  completed_at: string | null;
  created_at: string | null;
  requested_scope?: string | null;
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

export async function getParticipantB(_sessionId: string) {
  const { supabase, user } = await getUserOrRedirect();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    participant: {
      id: user.id,
      role: "partner",
      user_id: user.id,
      invited_email: user.email?.toLowerCase() ?? null,
      display_name: normalizeDisplayName(profile?.display_name ?? null),
      completed_at: null,
      created_at: null,
      requested_scope: "basis",
    } satisfies Participant,
    error: null,
  } as const;
}

export async function saveDisplayNameB(_sessionId: string, displayName: string | null) {
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

export async function upsertResponseB(
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

export async function saveFreeTextB(_sessionId: string, _text: string) {
  // TEMP: free text storage was removed with the legacy schema.
  return { ok: true } as const;
}

export async function completeParticipantB(_sessionId: string) {
  return {
    ok: true,
    status: "waiting" as const,
  };
}
