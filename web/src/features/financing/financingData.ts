import type { SupabaseClient } from "@supabase/supabase-js";
import { isFinancingItemKey, isFinancingStatus, type FinancingStatus } from "@/features/financing/financingModel";

export type FinancingEntry = { status: FinancingStatus; updatedByUserId: string | null; updatedAt: string };

/**
 * Status der Punkte eines Teams. Lesen darf nur, wer aktuell im Team ist (Zeilensicherheit).
 * Fehlt die Tabelle noch oder schlaegt die Abfrage fehl, ist alles "offen" - die Seite bleibt benutzbar.
 */
export async function getFinancingStatuses(teamId: string, client: SupabaseClient): Promise<Map<string, FinancingEntry>> {
  const { data, error } = await client
    .from("team_financing_items")
    .select("item_key, status, updated_by_user_id, updated_at")
    .eq("team_id", teamId);
  const map = new Map<string, FinancingEntry>();
  if (error) return map;
  for (const row of data ?? []) {
    if (!isFinancingItemKey(row.item_key) || !isFinancingStatus(row.status)) continue;
    map.set(String(row.item_key), {
      status: row.status,
      updatedByUserId: typeof row.updated_by_user_id === "string" ? row.updated_by_user_id : null,
      updatedAt: String(row.updated_at),
    });
  }
  return map;
}
