import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Der Zustand des Lesens - fuer die Anzeige, nicht fuer eine Entscheidung. */
export type ListingAiJobState = "none" | "open" | "done" | "failed";

/**
 * Ob fuer diesen Eintrag ein KI-Auftrag laeuft oder gelaufen ist.
 *
 * Ueber die normale Zeilensicherheit (`ai_jobs_select_own`): Jede Person sieht
 * nur ihre eigenen Auftraege.
 */
export async function getListingAiJobState(
  client: SupabaseClient,
  listingId: string
): Promise<ListingAiJobState> {
  const { data } = await client
    .from("ai_jobs")
    .select("status")
    .eq("job_type", "connect_resource_extraction")
    .eq("source_table", "network_listings")
    .eq("source_id", listingId)
    .order("created_at", { ascending: false })
    .limit(1);

  const status = ((data ?? []) as { status: string }[])[0]?.status;
  if (!status) return "none";
  if (status === "pending" || status === "running") return "open";
  return status === "completed" ? "done" : "failed";
}
