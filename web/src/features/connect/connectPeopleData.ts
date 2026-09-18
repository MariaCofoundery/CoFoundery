import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectProfile } from "./connectTypes";

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
  const [people, listings, problems] = await Promise.all([
    client
      .from("network_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("user_id", currentUserId),
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
    listings: listings.count ?? 0,
    problems: problems.count ?? 0,
  };
}
