"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Teamname setzen oder zurücknehmen - über die RPC `rename_founder_team`.
 *
 * Der Client schreibt nie direkt in `founder_teams`. Die Rückkehradresse ist
 * auf die Startseite (mit Teamauswahl) und die Teamseite desselben Teams
 * begrenzt, damit das Formular kein offener Weiterleiter wird.
 */
function safeReturn(teamId: string, returnTo: string) {
  const id = encodeURIComponent(teamId);
  if (returnTo === `/dashboard?team=${id}` || returnTo === `/dashboard`) return returnTo;
  if (returnTo === `/teams/${id}`) return returnTo;
  return `/teams/${id}`;
}

export async function renameTeamAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) redirect("/dashboard");

  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(safeReturn(teamId, returnTo))}`);

  await client.rpc("rename_founder_team", { p_team_id: teamId, p_name: name });
  revalidatePath("/dashboard");
  revalidatePath(`/teams/${teamId}`);
  redirect(safeReturn(teamId, returnTo));
}
