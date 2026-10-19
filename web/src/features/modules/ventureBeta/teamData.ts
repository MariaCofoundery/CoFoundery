import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID } from "@/features/instruments/instruments";
import {
  parseTradeoffsComparison,
  parseTradeoffsReadiness,
  type TradeoffsComparison,
  type TradeoffsReadiness,
} from "@/features/modules/tradeoffs/teamParse";

/**
 * Die zwei Lesewege zum Beta-Teamreport - beide ueber die allgemeinen Datenbank-Funktionen
 * (`get_assessment_team_readiness`, `get_assessment_team_comparison`) mit der Instrument-ID.
 *
 * Der Client setzt nichts zusammen: Die Datenbank prueft Mitgliedschaft, aktive Shares und die
 * Allowlist der team-sichtbaren Bloecke. Die Form der Antwort ist dieselbe wie bei
 * „Werte & Zielkonflikte" (`parseTradeoffs*`) - gleicher Vertrag, anderes Instrument.
 * `null`: nicht lesbar oder kein aktuelles Mitglied.
 */
export async function loadBetaReadiness(client: SupabaseClient, teamId: string): Promise<TradeoffsReadiness | null> {
  try {
    const { data, error } = await client.rpc("get_assessment_team_readiness", {
      p_team_id: teamId,
      p_instrument_id: VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID,
    });
    return error ? null : parseTradeoffsReadiness(data);
  } catch {
    return null;
  }
}

/** Nur aufrufen, wenn die Bereitschaft `ready` meldet; die Datenbank prueft es trotzdem erneut. */
export async function loadBetaComparison(client: SupabaseClient, teamId: string): Promise<TradeoffsComparison | null> {
  try {
    const { data, error } = await client.rpc("get_assessment_team_comparison", {
      p_team_id: teamId,
      p_instrument_id: VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID,
    });
    return error ? null : parseTradeoffsComparison(data);
  } catch {
    return null;
  }
}
