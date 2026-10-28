"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isFinancingItemKey, isFinancingStatus } from "@/features/financing/financingModel";

/**
 * Setzt den Status eines Punktes. Die Regel (aktuelles Mitglied, gueltiger Punkt und Status)
 * steht in `set_team_financing_item`; hier wird nur weitergereicht.
 */
export async function setFinancingStatusAction(teamId: string, itemKey: string, status: string): Promise<{ ok: boolean }> {
  if (!isFinancingItemKey(itemKey) || !isFinancingStatus(status)) return { ok: false };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await client.rpc("set_team_financing_item", { p_team_id: teamId, p_item_key: itemKey, p_status: status });
  if (error) return { ok: false };
  revalidatePath(`/teams/${teamId}/finanzierung`);
  return { ok: true };
}
