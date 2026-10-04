import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseDiscoveryWorkstyleSignals } from "./workstyleSignals";
/** Authenticated, uncached RPC enforces BOTH discovery opt-ins on every delivery. */
export async function getDiscoveryWorkstyleSignals(client: SupabaseClient, candidateId: string) {
  const { data, error } = await client.rpc("get_discovery_workstyle_signals", { p_candidate_user_id: candidateId });
  return error ? [] : parseDiscoveryWorkstyleSignals(data);
}
