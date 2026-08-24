"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function setupHref(teamId: string, result: "requested" | "confirmed" | "revoked" | "error") {
  return `/teams/${encodeURIComponent(teamId)}/setup?advisorAccess=${result}#advisor-setup-access`;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}

function revalidate(teamId: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/setup`);
  revalidatePath("/advisor/report");
}

export async function proposeFounderSetupAdvisorAccessAction(
  teamId: string,
  sourceRelationshipAdvisorId: string
) {
  const supabase = await authenticatedClient();
  if (!supabase || !teamId.trim() || !sourceRelationshipAdvisorId.trim()) {
    redirect(setupHref(teamId, "error"));
  }
  const { error } = await supabase.rpc("propose_founder_team_advisor_setup_grant", {
    p_team_id: teamId,
    p_source_relationship_advisor_id: sourceRelationshipAdvisorId,
  });
  if (error) redirect(setupHref(teamId, "error"));
  revalidate(teamId);
  redirect(setupHref(teamId, "requested"));
}

export async function confirmFounderSetupAdvisorAccessAction(teamId: string, grantId: string) {
  const supabase = await authenticatedClient();
  if (!supabase || !teamId.trim() || !grantId.trim()) redirect(setupHref(teamId, "error"));
  const { error } = await supabase.rpc("confirm_founder_team_advisor_setup_grant", {
    p_grant_id: grantId,
  });
  if (error) redirect(setupHref(teamId, "error"));
  revalidate(teamId);
  redirect(setupHref(teamId, "confirmed"));
}

export async function revokeFounderSetupAdvisorAccessAction(teamId: string, grantId: string) {
  const supabase = await authenticatedClient();
  if (!supabase || !teamId.trim() || !grantId.trim()) redirect(setupHref(teamId, "error"));
  const { error } = await supabase.rpc("revoke_founder_team_advisor_setup_grant", {
    p_grant_id: grantId,
  });
  if (error) redirect(setupHref(teamId, "error"));
  revalidate(teamId);
  redirect(setupHref(teamId, "revoked"));
}
