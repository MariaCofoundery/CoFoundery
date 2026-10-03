import "server-only";
import { connectOffset } from "@/features/connect/connectBrowsePage";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectListing, ConnectProfile } from "./connectTypes";

type Client = SupabaseClient;

export type ConnectPeopleFilters = {
  page?: string;
  q?: string;
  role?: string;
  expertise?: string;
  industry?: string;
  region?: string;
  remote_mode?: string;
  open_to?: string;
};

export type ConnectPerson = ConnectProfile & { ventureCount: number };



/**
 * Menschen im Netzwerk.
 *
 * Die Zeilensicherheit erlaubt Mitgliedern laengst, jedes aktive Profil zu
 * lesen - es fehlte nur die Flaeche. Hier wird deshalb nichts nachgebaut,
 * sondern nur eingegrenzt.
 *
 * Sortiert nach Aktualitaet, nie nach irgendeiner Passung: Sobald Menschen
 * sortiert werden, ist es eine Rangliste. Dieselbe Linie wie am Problembrett.
 */
export async function getConnectPeople(
  client: Client,
  _currentUserId: string,
  filters: ConnectPeopleFilters
) {
  const { data, error } = await client.rpc("search_connect_people", {
    p_q: (filters.q ?? "").trim(), p_role: filters.role ?? "", p_expertise: (filters.expertise ?? "").trim(),
    p_industry: (filters.industry ?? "").trim(), p_region: (filters.region ?? "").trim(), p_remote: filters.remote_mode ?? "",
    p_open_to: filters.open_to ?? "", p_offset: connectOffset(filters.page),
  });
  if (error) throw new Error("network_people_load_failed");
  const profiles = (data ?? []) as ConnectProfile[];

  const ventureCounts = await countVenturesByOwner(
    client,
    profiles.map((profile) => profile.user_id)
  );

  return profiles.map((profile) => ({
    ...profile,
    ventureCount: ventureCounts.get(profile.user_id) ?? 0,
  })) as ConnectPerson[];
}

async function countVenturesByOwner(client: Client, ownerIds: string[]) {
  const counts = new Map<string, number>();
  if (ownerIds.length === 0) return counts;

  const { data } = await client
    .from("connect_discovery_ventures")
    .select("owner_user_id")
    .eq("status", "active")
    .in("owner_user_id", ownerIds);

  for (const row of (data ?? []) as { owner_user_id: string }[]) {
    counts.set(row.owner_user_id, (counts.get(row.owner_user_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Die Zahlen an den Reitern.
 *
 * Ohne sie sieht man nicht, was ueberhaupt drin ist - und klickt einen Reiter
 * an, hinter dem nichts steht.
 */
export async function getConnectTabCounts(client: Client, currentUserId: string) {
  const [people, ventures, listings, problems] = await Promise.all([
    client
      .from("network_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("user_id", currentUserId),
    client
      .from("connect_discovery_ventures")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    client
      .from("connect_discovery_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString()),
    client
      .from("connect_discovery_problems")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  return {
    people: people.count ?? 0,
    ventures: ventures.count ?? 0,
    listings: listings.count ?? 0,
    problems: problems.count ?? 0,
  };
}

/**
 * Ein Mensch im Netzwerk - alles, was auf seiner Seite steht.
 *
 * GEBAUT AM 21.09.2026, weil es fuer Mitglieder keine Profilseite gab. Die
 * einzige war die OEFFENTLICHE unter /connect/p/<slug>, und die existiert nur,
 * wenn jemand seine Sichtbarkeit ausdruecklich auf oeffentlich gestellt hat.
 * Wer auf "nur im Netzwerk" stand, war im Produkt nirgends als Profil zu
 * sehen - nur als Karte in einer Liste, mit einem grauen Hinweis anstelle
 * eines Links.
 *
 * Auch hier wird nichts nachgebaut: Die Zeilensicherheit erlaubt Mitgliedern
 * laengst, jedes aktive Profil, jedes aktive Unternehmen und jede aktive
 * Anzeige zu lesen. Es fehlte die Flaeche.
 *
 * `null` heisst: gibt es nicht, ist nicht aktiv, oder man darf nicht. Die drei
 * Faelle werden nicht unterschieden - sonst waere die Seite eine Auskunft
 * darueber, wer hier Mitglied ist.
 */
export async function getConnectPerson(client: Client, userId: string) {
  const { data } = await client
    .from("network_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return (data as ConnectProfile | null) ?? null;
}

/** Die veroeffentlichten Anzeigen eines Menschen, frisch zuerst. */
export async function getActiveConnectListingsByOwner(client: Client, ownerUserId: string) {
  const { data } = await client
    .from("connect_discovery_listings")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  return (data ?? []) as ConnectListing[];
}

/** Das Ungelöste eines Menschen. */
export async function getActiveConnectProblemsByAuthor(client: Client, authorUserId: string) {
  const { data } = await client
    .from("connect_discovery_problems")
    .select("id, title, description, author_intent, topics, industries, created_at")
    .eq("author_user_id", authorUserId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return (data ?? []) as {
    id: string;
    title: string;
    description: string;
    author_intent: string;
    topics: string[];
    industries: string[];
    created_at: string;
  }[];
}
