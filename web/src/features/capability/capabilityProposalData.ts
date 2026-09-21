import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Was die KI zu einer Antwort vorgeschlagen hat - und ob sie noch liest.
 *
 * DIE VORSCHLAEGE SIND KEINE BEFUNDE. Jeder traegt den woertlichen Satz, auf
 * den er sich beruft, und die Datenbank hat ihn beim Ablegen gegen die Antwort
 * geprueft (`insert_ai_capability_proposal`). Gilt ein Vorschlag damit? Nein -
 * er gilt, wenn ein Mensch ihn annimmt, und die Stufe setzt ausschliesslich
 * der Mensch.
 */

export type AreaProposal = {
  id: string;
  areaId: string;
  quote: string;
};

/** Der Zustand des Lesens - fuer die Anzeige, nicht fuer eine Entscheidung. */
export type ProposalJobState = "none" | "open" | "done" | "failed";

export async function getProposalsForTurn(
  client: SupabaseClient,
  turnId: string
): Promise<AreaProposal[]> {
  const { data } = await client
    .from("capability_area_proposals")
    .select("id, area_id, evidence_quote")
    .eq("turn_id", turnId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return ((data ?? []) as { id: string; area_id: string; evidence_quote: string }[]).map(
    (row) => ({ id: row.id, areaId: row.area_id, quote: row.evidence_quote })
  );
}

/**
 * Ob fuer diese Antwort ein Auftrag laeuft.
 *
 * Die Person darf ihre eigenen Auftraege sehen (`ai_jobs_select_own`) - das
 * ist der Grund, warum die Seite das ohne eigene Funktion beantworten kann.
 */
export async function getProposalJobState(
  client: SupabaseClient,
  turnId: string
): Promise<ProposalJobState> {
  const { data } = await client
    .from("ai_jobs")
    .select("status")
    .eq("job_type", "capability_area_proposal")
    .eq("source_table", "capability_interview_turns")
    .eq("source_id", turnId)
    .order("created_at", { ascending: false })
    .limit(1);

  const status = ((data ?? []) as { status: string }[])[0]?.status;
  if (!status) return "none";
  // Die Zustaende heissen `pending`, `running`, `completed`, `failed`.
  if (status === "pending" || status === "running") return "open";
  if (status === "failed") return "failed";
  return "done";
}

/** Ob ueberhaupt ein Modell erreichbar ist. Null heisst "unbekannt". */
export async function getAiAvailability(client: SupabaseClient) {
  const { data, error } = await client.rpc("get_ai_availability");
  if (error) return false;
  return data === true;
}
