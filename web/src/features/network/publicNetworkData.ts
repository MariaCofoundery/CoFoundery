import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicNetworkListing, PublicNetworkProfile, PublicNetworkProfileListing } from "./networkTypes";

function one<T>(value: unknown): T | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row ? row as T : null;
}

export async function getPublicNetworkProfile(client: SupabaseClient, slug: string) {
  const { data, error } = await client.rpc("get_public_network_profile", { p_public_slug: slug });
  if (error) throw new Error("public_network_profile_load_failed");
  return one<PublicNetworkProfile>(data);
}

export async function getPublicNetworkProfileListings(client: SupabaseClient, slug: string) {
  const { data, error } = await client.rpc("list_public_network_profile_listings", { p_profile_slug: slug });
  if (error) throw new Error("public_network_profile_listings_load_failed");
  return (data ?? []) as PublicNetworkProfileListing[];
}

export async function getPublicNetworkListing(client: SupabaseClient, slug: string) {
  const { data, error } = await client.rpc("get_public_network_listing", { p_public_slug: slug });
  if (error) throw new Error("public_network_listing_load_failed");
  return one<PublicNetworkListing>(data);
}

export function publicNetworkPhotoUrl(entity: "profile" | "listing", slug: string, updatedAt: string) {
  return `/api/network/public-photos/${entity}/${encodeURIComponent(slug)}?v=${encodeURIComponent(updatedAt)}`;
}
