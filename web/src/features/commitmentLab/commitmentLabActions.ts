"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  COMMITMENT_LAB_OBLIGATIONS,
  COMMITMENT_LAB_DISCUSSION_MARKERS,
  COMMITMENT_LAB_SCENARIOS,
} from "@/features/commitmentLab/commitmentLabModel";

function value(formData: FormData, key: string, max = 5000) {
  const raw = formData.get(key);
  const text = typeof raw === "string" ? raw.trim() : "";
  return text.slice(0, max);
}

function hours(formData: FormData, key: string) {
  const raw = value(formData, key, 3);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 168 ? parsed : null;
}

function labHref(teamId: string, relationshipId: string, result?: string) {
  const path = `/teams/${encodeURIComponent(teamId)}/commitment-lab/${encodeURIComponent(relationshipId)}`;
  return result ? `${path}?result=${encodeURIComponent(result)}` : path;
}

function refresh(teamId: string, relationshipId: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(labHref(teamId, relationshipId));
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function saveCommitmentLabFounderEntryAction(
  teamId: string,
  relationshipId: string,
  formData: FormData
) {
  const auth = await authenticatedClient();
  if (!auth) redirect(labHref(teamId, relationshipId, "error"));
  const obligations = formData.getAll("obligations").filter(
    (entry): entry is string => typeof entry === "string" &&
      (COMMITMENT_LAB_OBLIGATIONS as readonly string[]).includes(entry)
  );
  const realityFit = value(formData, "realityFit", 20);
  const discussionMarkers = formData.getAll("discussionMarkers").filter(
    (entry): entry is string => typeof entry === "string" &&
      (COMMITMENT_LAB_DISCUSSION_MARKERS as readonly string[]).includes(entry)
  );
  const scenarioAnswers = Object.fromEntries(COMMITMENT_LAB_SCENARIOS.map((key) => [key, {
    action: value(formData, `scenario.${key}.action`),
    expectation: value(formData, `scenario.${key}.expectation`),
  }]));
  const { error } = await auth.supabase.rpc("save_commitment_lab_founder_entry_v11", {
    p_relationship_id: relationshipId,
    p_current_hours: hours(formData, "currentHours"),
    p_difficult_week_hours: hours(formData, "difficultWeekHours"),
    p_obligation_categories: obligations,
    p_change_note: value(formData, "changeNote"),
    p_reality_fit: ["realistic", "partly", "reconsider"].includes(realityFit) ? realityFit : null,
    p_commitment_meaning: value(formData, "commitmentMeaning"),
    p_priority_reflection: value(formData, "priorityReflection"),
    p_reliability_reflection: value(formData, "reliabilityReflection"),
    p_transparency_reflection: value(formData, "transparencyReflection"),
    p_responsibility_reflection: value(formData, "responsibilityReflection"),
    p_renegotiation_reflection: value(formData, "renegotiationReflection"),
    p_scenario_answers: scenarioAnswers,
    p_difficult_situation: value(formData, "difficultSituation"),
    p_desired_alternative: value(formData, "desiredAlternative"),
    p_discussion_markers: discussionMarkers,
  });
  if (error) redirect(labHref(teamId, relationshipId, "error"));
  refresh(teamId, relationshipId);
  redirect(labHref(teamId, relationshipId, "personal-saved"));
}

export async function saveCommitmentLabSharedReflectionAction(
  teamId: string,
  relationshipId: string,
  formData: FormData
) {
  const auth = await authenticatedClient();
  if (!auth) redirect(labHref(teamId, relationshipId, "error"));
  const { error } = await auth.supabase.rpc("save_commitment_lab_shared_reflection", {
    p_relationship_id: relationshipId,
    p_shared_reflection: value(formData, "sharedReflection", 10000),
  });
  if (error) redirect(labHref(teamId, relationshipId, "error"));
  refresh(teamId, relationshipId);
  redirect(labHref(teamId, relationshipId, "reflection-saved"));
}

export async function createCommitmentLabDiscussionEntryAction(
  teamId: string,
  relationshipId: string,
  formData: FormData
) {
  const auth = await authenticatedClient();
  if (!auth) redirect(labHref(teamId, relationshipId, "error"));
  const body = value(formData, "body");
  const parentEntryId = value(formData, "parentEntryId", 100);
  if (!body) redirect(labHref(teamId, relationshipId, "error"));
  const { error } = await auth.supabase.rpc("create_commitment_lab_discussion_entry", {
    p_relationship_id: relationshipId,
    p_body: body,
    p_parent_entry_id: parentEntryId || null,
  });
  if (error) redirect(labHref(teamId, relationshipId, "error"));
  refresh(teamId, relationshipId);
  redirect(labHref(teamId, relationshipId, "commented"));
}

export async function handoffCommitmentLabToFounderSetupAction(
  teamId: string,
  relationshipId: string,
  formData: FormData
) {
  const setupKey = value(formData, "setupKey", 50);
  if (setupKey !== "time_commitment" && setupKey !== "changing_commitment") {
    redirect(labHref(teamId, relationshipId, "error"));
  }
  const auth = await authenticatedClient();
  if (!auth) redirect(labHref(teamId, relationshipId, "error"));
  const [{ data: relationship }, { data: members }, { data: item }] = await Promise.all([
    auth.supabase.from("relationships").select("user_a_id, user_b_id, founder_team_id").eq("id", relationshipId).maybeSingle(),
    auth.supabase.from("founder_team_members").select("user_id").eq("team_id", teamId),
    auth.supabase.from("founder_team_setup_items").select("working_note").eq("team_id", teamId).eq("item_key", setupKey).maybeSingle(),
  ]);
  const row = relationship as { user_a_id?: string; user_b_id?: string; founder_team_id?: string | null } | null;
  const memberRows = (members ?? []) as Array<{ user_id: string }>;
  const setupHref = `/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(setupKey)}`;
  if (!row || row.founder_team_id !== teamId || (row.user_a_id !== auth.user.id && row.user_b_id !== auth.user.id) || !memberRows.some((member) => member.user_id === auth.user.id)) {
    redirect(labHref(teamId, relationshipId, "error"));
  }
  if (memberRows.length !== 2) redirect(setupHref);
  if (!memberRows.some((member) => member.user_id === row.user_a_id) || !memberRows.some((member) => member.user_id === row.user_b_id)) {
    redirect(labHref(teamId, relationshipId, "error"));
  }
  if ((item as { working_note?: string } | null)?.working_note?.trim()) redirect(setupHref);
  const { data: copied, error } = await auth.supabase.rpc("handoff_commitment_lab_reflection_if_empty", {
    p_relationship_id: relationshipId,
    p_team_id: teamId,
    p_item_key: setupKey,
  });
  if (error || !copied) redirect(setupHref);
  revalidatePath(`/teams/${teamId}/setup`);
  revalidatePath(setupHref);
  redirect(setupHref);
}
