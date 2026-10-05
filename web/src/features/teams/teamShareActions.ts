"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Phase 11.7B - Teamfreigabe und Team verlassen.
 *
 * Beides laeuft ausschliesslich ueber die SECURITY-DEFINER-RPCs
 * `set_team_share` und `leave_founder_team`; der Client schreibt nie direkt
 * in `team_shares` oder `founder_team_members`. Die Rueckkehradresse wird auf
 * Teamseiten desselben Teams begrenzt, damit das Formular kein offener
 * Weiterleiter wird.
 */
function safeReturn(teamId: string, returnTo: string) {
  const base = `/teams/${encodeURIComponent(teamId)}`;
  return returnTo === base || returnTo.startsWith(`${base}/`) || returnTo.startsWith(`${base}?`) || returnTo.startsWith(`${base}#`) ? returnTo : base;
}

function withParam(href: string, key: string, value: string) {
  const [path, hash] = href.split("#");
  const url = `${path}${path.includes("?") ? "&" : "?"}${key}=${value}`;
  return hash ? `${url}#${hash}` : url;
}

export async function setTeamShareAction(teamId: string, enabled: boolean, returnTo: string) {
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}`)}`);
  const { error } = await client.rpc("set_team_share", { p_team_id: teamId, p_enabled: enabled });
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/workstyle`);
  revalidatePath("/me/profile/workstyle");
  redirect(withParam(safeReturn(teamId, returnTo), "teamfreigabe", error ? "fehler" : enabled ? "an" : "aus"));
}

export async function leaveTeamAction(teamId: string) {
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}`)}`);
  const { error } = await client.rpc("leave_founder_team", { p_team_id: teamId });
  if (error) redirect(`/teams/${encodeURIComponent(teamId)}?verlassen=fehler#team-verlassen`);
  revalidatePath("/connections");
  revalidatePath("/dashboard");
  redirect("/connections?team=verlassen");
}
