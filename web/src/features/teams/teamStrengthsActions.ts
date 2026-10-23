"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Stärken und Antrieb mit dem Team teilen - an oder aus.
 *
 * Läuft ausschließlich über die RPC `set_team_strengths_share`; der Client schreibt nie in
 * `team_profile_shares`. Ein Klick, keine Zwischenfrage: Zurücknehmen wirkt sofort und lässt sich ebenso
 * zurückschalten.
 */
export async function setTeamStrengthsShareAction(teamId: string, enabled: boolean) {
  const base = `/teams/${encodeURIComponent(teamId)}/staerken`;
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(base)}`);
  const { error } = await client.rpc("set_team_strengths_share", { p_team_id: teamId, p_enabled: enabled });
  revalidatePath(base);
  redirect(`${base}?freigabe=${error ? "fehler" : enabled ? "an" : "aus"}`);
}
