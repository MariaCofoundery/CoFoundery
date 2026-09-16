import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isConnectProblemPerspective,
  type ConnectProblem,
  type ConnectProblemApproach,
  type ConnectProblemConfirmation,
  type ConnectProblemConfirmationCounts,
  type ConnectProblemInterest,
} from "./connectTypes";

type Client = SupabaseClient;

/**
 * Das Problembrett.
 *
 * Alles hier verlaesst sich auf die Zugriffsregeln der Datenbank statt sie
 * nachzubauen: Entwuerfe sind fuer andere unsichtbar, die Namen der
 * Interessierten sieht nur die einstellende Person, und die Zahl steht in der
 * Zeile selbst. Eine zweite Pruefung hier waere eine zweite Wahrheit.
 */

export async function getActiveConnectProblems(
  client: Client,
  filters: Record<string, string | undefined>
) {
  let query = client
    .from("network_problems")
    .select("*")
    .eq("status", "active")
    // Nach Aktualitaet, nie nach Interesse: Eine Sortierung nach Zuspruch
    // waere eine Rangliste, und genau die soll das Brett nicht sein.
    .order("published_at", { ascending: false })
    .limit(50);

  if (filters.intent) query = query.eq("author_intent", filters.intent);
  if (filters.geographic_scope) query = query.eq("geographic_scope", filters.geographic_scope);

  const term = (filters.q ?? "").trim();
  if (term) {
    const escaped = term.replace(/[\\%_]/g, (match) => `\\${match}`);
    query = query.ilike("search_text", `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error("network_problems_load_failed");
  return (data ?? []) as ConnectProblem[];
}

export async function getConnectProblem(client: Client, id: string) {
  const { data } = await client
    .from("network_problems")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as ConnectProblem | null) ?? null;
}

export async function getOwnConnectProblems(client: Client, userId: string) {
  const { data } = await client
    .from("network_problems")
    .select("*")
    .eq("author_user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ConnectProblem[];
}

/**
 * Die Interessierten an einem Problem.
 *
 * Gibt fuer Unbeteiligte eine leere Liste zurueck - nicht, weil hier gefiltert
 * wuerde, sondern weil die Datenbank ihnen nichts zeigt. Die Zahl steht
 * trotzdem an der Zeile; das ist der beabsichtigte Unterschied.
 */
export async function getConnectProblemInterests(client: Client, problemId: string) {
  const { data } = await client
    .from("network_problem_interests")
    .select("*")
    // Nur die Meldungen zum Problem selbst. Rueckmeldungen zu einem Ansatz
    // gehoeren der Person, die ihn geschrieben hat - nicht dieser Liste.
    .is("approach_id", null)
    .eq("problem_id", problemId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ConnectProblemInterest[];
}

/**
 * Die Rueckmeldungen zu einem Ansatz.
 *
 * Gibt fuer alle ausser der verfassenden Person eine leere Liste zurueck -
 * wieder nicht, weil hier gefiltert wuerde, sondern weil die Datenbank ihnen
 * nichts zeigt.
 */
export async function getConnectProblemApproachInterests(client: Client, approachId: string) {
  const { data } = await client
    .from("network_problem_interests")
    .select("*")
    .eq("approach_id", approachId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ConnectProblemInterest[];
}

/** Die eigenen Rueckmeldungen zu Ansaetzen dieses Problems. */
export async function getOwnConnectApproachInterests(
  client: Client,
  problemId: string,
  userId: string
) {
  const { data } = await client
    .from("network_problem_interests")
    .select("*")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .not("approach_id", "is", null);
  return (data ?? []) as ConnectProblemInterest[];
}

/** Das eigene Interesse an einem Problem, wenn es eines gibt. */
export async function getOwnConnectProblemInterest(
  client: Client,
  problemId: string,
  userId: string
) {
  const { data } = await client
    .from("network_problem_interests")
    .select("*")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ConnectProblemInterest | null) ?? null;
}

// Hier stand ein Vorabblick, zu welchen Interessen es schon ein Gespraech gibt.
// Er ging nicht: network_conversations entzieht authenticated jeden direkten
// Zugriff, alles laeuft ueber Funktionen. Er wird auch nicht gebraucht -
// annehmen ist wiederholbar und gibt dasselbe Gespraech zurueck, der Knopf
// fuehrt also beim zweiten Mal einfach dorthin.

/**
 * Wie viele das Problem wiedererkennen - aufgeteilt danach, woher.
 *
 * Laeuft ueber eine security-definer-Funktion, weil die Tabelle niemandem
 * fremde Zeilen zeigt, auch der einstellenden Person nicht. Die Zahlen sind
 * oeffentlich, die Namen sind es nie.
 */
export async function getConnectProblemConfirmations(
  client: Client,
  problemId: string
): Promise<ConnectProblemConfirmationCounts> {
  const counts: ConnectProblemConfirmationCounts = { affected: 0, professional: 0, observed: 0 };

  const { data, error } = await client.rpc("get_network_problem_confirmations", {
    p_problem_id: problemId,
  });
  if (error || !data) return counts;

  for (const row of data as { perspective: string; confirmations: number }[]) {
    if (isConnectProblemPerspective(row.perspective)) {
      counts[row.perspective] = Number(row.confirmations) || 0;
    }
  }
  return counts;
}

/** Die eigene Bestaetigung, wenn es eine gibt. */
export async function getOwnConnectProblemConfirmation(
  client: Client,
  problemId: string,
  userId: string
) {
  const { data } = await client
    .from("network_problem_confirmations")
    .select("*")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ConnectProblemConfirmation | null) ?? null;
}

/**
 * Die Ansaetze zu einem Problem.
 *
 * Nach Alter sortiert, nicht nach irgendeiner Bewertung: Mehrere Ansaetze
 * stehen nebeneinander, damit man sieht, dass sie auseinandergehen - nicht,
 * damit einer gewinnt.
 */
export async function getConnectProblemApproaches(client: Client, problemId: string) {
  const { data } = await client
    .from("network_problem_approaches")
    .select("*")
    .eq("problem_id", problemId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ConnectProblemApproach[];
}
