import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicConnectListing,
  PublicConnectProblem, PublicConnectProfile, PublicConnectProfileListing } from "./connectTypes";

function one<T>(value: unknown): T | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row ? row as T : null;
}

export async function getPublicConnectProfile(client: SupabaseClient, slug: string) {
  const { data, error } = await client.rpc("get_public_network_profile", { p_public_slug: slug });
  if (error) throw new Error("public_network_profile_load_failed");
  return one<PublicConnectProfile>(data);
}

export async function getPublicConnectProfileListings(client: SupabaseClient, slug: string) {
  const { data, error } = await client.rpc("list_public_network_profile_listings", { p_profile_slug: slug });
  if (error) throw new Error("public_network_profile_listings_load_failed");
  return (data ?? []) as PublicConnectProfileListing[];
}

export async function getPublicConnectListing(client: SupabaseClient, slug: string) {
  const { data, error } = await client.rpc("get_public_network_listing", { p_public_slug: slug });
  if (error) throw new Error("public_network_listing_load_failed");
  return one<PublicConnectListing>(data);
}

/**
 * Ein oeffentlich gestelltes Problem.
 *
 * Gibt bewusst weniger zurueck als die Seite fuer Mitglieder: keine Ansaetze,
 * keine Zahlen. Die Einwilligung der einstellenden Person deckt ihren eigenen
 * Text ab - nicht die Texte anderer Menschen und nicht, wer sich intern dazu
 * gemeldet hat.
 */
export async function getPublicConnectProblem(client: SupabaseClient, slug: string) {
  const { data, error } = await client.rpc("get_public_network_problem", { p_public_slug: slug });
  if (error) throw new Error("public_network_problem_load_failed");
  return one<PublicConnectProblem>(data);
}
