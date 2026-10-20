"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Teamname und Beschreibung setzen oder zurücknehmen - über die RPC `set_founder_team_details`.
 *
 * Der Client schreibt nie direkt in `founder_teams`. Die Rückkehradresse ist
 * auf die Startseite (mit Teamauswahl), die Teamuebersicht und die Teamseite
 * desselben Teams begrenzt, damit das Formular kein offener Weiterleiter wird.
 */
function safeReturn(teamId: string, returnTo: string) {
  const id = encodeURIComponent(teamId);
  if (returnTo === `/dashboard?team=${id}` || returnTo === `/dashboard`) return returnTo;
  if (returnTo === `/teams/${id}`) return returnTo;
  if (returnTo === "/connections") return returnTo;
  return `/teams/${id}`;
}

export async function updateTeamDetailsAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) redirect("/dashboard");

  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(safeReturn(teamId, returnTo))}`);

  await client.rpc("set_founder_team_details", { p_team_id: teamId, p_name: name, p_description: description });
  revalidatePath("/dashboard");
  revalidatePath(`/teams/${teamId}`);
  redirect(safeReturn(teamId, returnTo));
}
