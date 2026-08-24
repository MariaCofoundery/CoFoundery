"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function itemHref(
  teamId: string,
  itemKey: string,
  result?: "saved" | "proposed" | "confirmed" | "withdrawn" | "commented" | "error"
) {
  const path = `/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(itemKey)}`;
  return result ? `${path}?result=${result}` : path;
}

function revalidateSetup(teamId: string, itemKey: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/setup`);
  revalidatePath(`/teams/${teamId}/setup/${itemKey}`);
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

export async function saveFounderSetupWorkingStateAction(
  teamId: string,
  itemKey: string,
  formData: FormData
) {
  const supabase = await authenticatedClient();
  if (!supabase || !isFounderSetupItemKey(itemKey)) redirect(itemHref(teamId, itemKey, "error"));
  const status = formString(formData, "workStatus");
  const note = formString(formData, "workingNote");
  if (!(["open", "discussing"] as string[]).includes(status) || note.length > 10000) {
    redirect(itemHref(teamId, itemKey, "error"));
  }
  const { error } = await supabase.rpc("save_founder_team_setup_working_state", {
    p_team_id: teamId,
    p_item_key: itemKey,
    p_work_status: status,
    p_working_note: note,
  });
  if (error) redirect(itemHref(teamId, itemKey, "error"));
  revalidateSetup(teamId, itemKey);
  redirect(itemHref(teamId, itemKey, "saved"));
}

export async function proposeFounderSetupRevisionAction(
  teamId: string,
  itemKey: string,
  formData: FormData
) {
  const supabase = await authenticatedClient();
  if (!supabase || !isFounderSetupItemKey(itemKey)) redirect(itemHref(teamId, itemKey, "error"));
  const resolution = formString(formData, "resolutionStatus");
  const note = formString(formData, "proposalNote");
  const reference = formString(formData, "documentationReference");
  if (
    !(["clarified", "documented", "not_relevant"] as string[]).includes(resolution) ||
    note.length > 10000 ||
    reference.length > 2000
  ) redirect(itemHref(teamId, itemKey, "error"));
  const { error } = await supabase.rpc("propose_founder_team_setup_revision", {
    p_team_id: teamId,
    p_item_key: itemKey,
    p_resolution_status: resolution,
    p_note: note,
    p_documentation_reference: reference || null,
  });
  if (error) redirect(itemHref(teamId, itemKey, "error"));
  revalidateSetup(teamId, itemKey);
  redirect(itemHref(teamId, itemKey, "proposed"));
}

async function changeConfirmation(
  operation: "confirm" | "withdraw",
  teamId: string,
  itemKey: string,
  revisionId: string
) {
  const supabase = await authenticatedClient();
  if (!supabase || !isFounderSetupItemKey(itemKey) || !revisionId) {
    redirect(itemHref(teamId, itemKey, "error"));
  }
  const rpc = operation === "confirm"
    ? "confirm_founder_team_setup_revision"
    : "withdraw_founder_team_setup_confirmation";
  const { error } = await supabase.rpc(rpc, { p_revision_id: revisionId });
  if (error) redirect(itemHref(teamId, itemKey, "error"));
  revalidateSetup(teamId, itemKey);
  redirect(itemHref(teamId, itemKey, operation === "confirm" ? "confirmed" : "withdrawn"));
}

export async function confirmFounderSetupRevisionAction(teamId: string, itemKey: string, formData: FormData) {
  return changeConfirmation("confirm", teamId, itemKey, formString(formData, "revisionId"));
}

export async function withdrawFounderSetupConfirmationAction(teamId: string, itemKey: string, formData: FormData) {
  return changeConfirmation("withdraw", teamId, itemKey, formString(formData, "revisionId"));
}

export async function createFounderSetupDiscussionEntryAction(
  teamId: string,
  itemKey: string,
  formData: FormData
) {
  const supabase = await authenticatedClient();
  if (!supabase || !isFounderSetupItemKey(itemKey)) redirect(itemHref(teamId, itemKey, "error"));
  const body = formString(formData, "body");
  const parentEntryId = formString(formData, "parentEntryId");
  if (!body || body.length > 5000) redirect(itemHref(teamId, itemKey, "error"));
  const { error } = await supabase.rpc("create_founder_team_setup_discussion_entry", {
    p_team_id: teamId,
    p_item_key: itemKey,
    p_body: body,
    p_parent_entry_id: parentEntryId || null,
  });
  if (error) redirect(itemHref(teamId, itemKey, "error"));
  revalidateSetup(teamId, itemKey);
  redirect(itemHref(teamId, itemKey, "commented"));
}
