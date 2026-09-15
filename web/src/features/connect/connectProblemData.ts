import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectProblem, ConnectProblemInterest } from "./connectTypes";

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
    .eq("problem_id", problemId)
    .order("created_at", { ascending: false });
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
