import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DirectionFacet } from "./directionInterviewGuide";

/**
 * Was ein Modell zu den eigenen Antworten vorgeschlagen hat.
 *
 * EIN VORSCHLAG IST KEINE AUSSAGE. Er steht in einer anderen Tabelle, er wird
 * von keinem anderen Produktbereich gelesen, und er verschwindet, sobald ein
 * Mensch entschieden hat. Jeder trägt den wörtlichen Satz, auf den er sich
 * beruft - und die Datenbank hat ihn beim Ablegen gegen die Antwort
 * nachgerechnet (`insert_ai_direction_proposal`).
 */

export type DirectionProposalRow = {
  id: string;
  turnId: string;
  facet: DirectionFacet;
  statement: string;
  quote: string;
};

export type ProposalJobState = "none" | "open" | "done" | "failed";

export async function getPendingDirectionProposals(
  client: SupabaseClient
): Promise<DirectionProposalRow[]> {
  const { data } = await client
    .from("direction_statement_proposals")
    .select("id, turn_id, facet, statement, evidence_quote")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  return (
    (data ?? []) as {
      id: string;
      turn_id: string;
      facet: DirectionFacet;
      statement: string;
      evidence_quote: string;
    }[]
  ).map((row) => ({
    id: row.id,
    turnId: row.turn_id,
    facet: row.facet,
    statement: row.statement,
    quote: row.evidence_quote,
  }));
}

/**
 * Ob für eine Antwort gerade ein Auftrag läuft.
 *
 * Die Person darf ihre eigenen Aufträge sehen (`ai_jobs_select_own`) - deshalb
 * braucht die Seite dafür keine eigene Funktion.
 */
export async function getDirectionJobStates(
  client: SupabaseClient,
  turnIds: string[]
): Promise<Map<string, ProposalJobState>> {
  const states = new Map<string, ProposalJobState>();
  if (turnIds.length === 0) return states;

  const { data } = await client
    .from("ai_jobs")
    .select("source_id, status, created_at")
    .eq("job_type", "direction_statement_proposal")
    .eq("source_table", "capability_interview_turns")
    .in("source_id", turnIds)
    .order("created_at", { ascending: false });

  for (const row of (data ?? []) as { source_id: string; status: string }[]) {
    // Der neueste Auftrag je Antwort gewinnt - die Reihenfolge oben sorgt
    // dafür, dass der erste gesehene der neueste ist.
    if (states.has(row.source_id)) continue;
    states.set(
      row.source_id,
      row.status === "pending" || row.status === "running"
        ? "open"
        : row.status === "failed"
          ? "failed"
          : "done"
    );
  }
  return states;
}

/** Ob überhaupt ein Modell erreichbar ist. */
export async function getAiAvailability(client: SupabaseClient) {
  const { data, error } = await client.rpc("get_ai_availability");
  if (error) return false;
  return data === true;
}
