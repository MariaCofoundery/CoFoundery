import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectListing, ConnectProfile } from "./connectTypes";

type Client = SupabaseClient;

export type ConnectPeopleFilters = {
  q?: string;
  role?: string;
  expertise?: string;
  industry?: string;
  region?: string;
  remote_mode?: string;
  open_to?: string;
};

export type ConnectPerson = ConnectProfile & { ventureCount: number };

function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

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
  currentUserId: string,
  filters: ConnectPeopleFilters
) {
  let query = client
    .from("network_profiles")
    .select("*")
    .eq("status", "active")
    .neq("user_id", currentUserId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(60);

  if (filters.role) query = query.contains("network_roles", [filters.role]);
  if (filters.remote_mode) query = query.eq("remote_mode", filters.remote_mode);
  if (filters.open_to) query = query.contains("open_to_formats", [filters.open_to]);

  const region = (filters.region ?? "").trim();
  if (region) query = query.ilike("location_region", `%${escapeLike(region)}%`);

  const expertise = (filters.expertise ?? "").trim();
  if (expertise) query = query.contains("expertise", [expertise]);

  const industry = (filters.industry ?? "").trim();
  if (industry) query = query.contains("industries", [industry]);

  const { data, error } = await query;
  if (error) return [];
  let profiles = (data ?? []) as ConnectProfile[];

  // Der Suchbegriff greift auch auf die Unternehmen zu - "wir machen X fuer
  // Y" ist genau das, wonach jemand sucht. Deshalb zwei Abfragen statt einer:
  // Postgrest kann ueber eine Fremdtabelle nicht filtern, ohne sie
  // einzubetten, und einbetten wuerde die Eintraege ungefragt mitliefern.
  const term = (filters.q ?? "").trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    const { data: ventureOwners } = await client
      .from("network_ventures")
      .select("owner_user_id")
      .eq("status", "active")
      .ilike("search_text", pattern);
    const matchedByVenture = new Set(
      ((ventureOwners ?? []) as { owner_user_id: string }[]).map((row) => row.owner_user_id)
    );

    const needle = term.toLocaleLowerCase("de-DE");
    profiles = profiles.filter((profile) => {
      if (matchedByVenture.has(profile.user_id)) return true;
      const haystack = [
        profile.display_name,
        profile.headline,
        profile.bio,
        profile.network_reach ?? "",
        profile.contact_note ?? "",
        ...profile.expertise,
        ...profile.industries,
        profile.location_region ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("de-DE");
      return haystack.includes(needle);
    });
  }

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
    .from("network_ventures")
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
      .from("network_ventures")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    client
      .from("network_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString()),
    client
      .from("network_problems")
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
    .from("network_listings")
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
    .from("network_problems")
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
