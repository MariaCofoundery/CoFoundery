import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseTradeoffsComparison,
  parseTradeoffsReadiness,
  type TradeoffsComparison,
  type TradeoffsReadiness,
} from "@/features/modules/tradeoffs/teamParse";

/**
 * Die zwei Lesewege zum Teamvergleich - beide ueber die Datenbank.
 *
 * Der Client setzt nichts zusammen: Bereitschaft und Vergleich liefert je eine
 * RPC, die Mitgliedschaft und Freigaben selbst prueft. `null` heisst: nicht
 * lesbar oder kein aktuelles Mitglied - die Seite zeigt dann nichts ueber das Team.
 */
export async function loadTradeoffsReadiness(client: SupabaseClient, teamId: string): Promise<TradeoffsReadiness | null> {
  try {
    const { data, error } = await client.rpc("get_tradeoffs_team_readiness", { p_team_id: teamId });
    return error ? null : parseTradeoffsReadiness(data);
  } catch {
    return null;
  }
}

/** Nur aufrufen, wenn die Bereitschaft `ready` meldet; die Datenbank prueft es trotzdem erneut. */
export async function loadTradeoffsComparison(client: SupabaseClient, teamId: string): Promise<TradeoffsComparison | null> {
  try {
    const { data, error } = await client.rpc("get_tradeoffs_team_comparison", { p_team_id: teamId });
    return error ? null : parseTradeoffsComparison(data);
  } catch {
    return null;
  }
}
