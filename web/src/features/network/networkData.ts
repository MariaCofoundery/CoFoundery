import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NetworkListing, NetworkProfile } from "./networkTypes";

type Client = SupabaseClient;
export async function isNetworkMember(client: Client) {
  const { data, error } = await client.rpc("is_network_member");
  return !error && data === true;
}
export async function getOwnNetworkProfile(client: Client, userId: string) {
  const { data } = await client.from("network_profiles").select("*").eq("user_id", userId).maybeSingle();
  return (data as NetworkProfile | null) ?? null;
}
export async function getNetworkListing(client: Client, id: string) {
  const { data } = await client.from("network_listings").select("*, network_profiles(*)").eq("id", id).maybeSingle();
  return (data as NetworkListing | null) ?? null;
}
export async function getOwnNetworkListings(client: Client, userId: string) {
  const { data } = await client.from("network_listings").select("*").eq("owner_user_id", userId).order("updated_at", { ascending: false });
  return (data ?? []) as NetworkListing[];
}
export async function getActiveNetworkListings(client: Client, filters: Record<string, string | undefined>) {
  let query = client.from("network_listings").select("*, network_profiles(*)").eq("status", "active").gt("expires_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(50);
  if (filters.direction) query = query.eq("direction", filters.direction);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.remote_mode) query = query.eq("remote_mode", filters.remote_mode);
  if (filters.location_region) query = query.ilike("location_region", `%${filters.location_region}%`);
  if (filters.timeframe) query = query.ilike("timeframe", `%${filters.timeframe}%`);
  if (filters.topic) query = query.contains("topics", [filters.topic]);
  if (filters.industry) query = query.contains("industries", [filters.industry]);
  const { data, error } = await query;
  if (error) throw new Error("network_listings_load_failed");
  return (data ?? []) as NetworkListing[];
}
export async function getActiveOwnNetworkCounts(client: Client, userId: string) {
  const { data } = await client.from("network_listings").select("direction").eq("owner_user_id", userId).eq("status", "active").gt("expires_at", new Date().toISOString());
  const rows = (data ?? []) as Array<{ direction: string }>;
  return { seeking: rows.filter((r) => r.direction === "seeking").length, offering: rows.filter((r) => r.direction === "offering").length };
}
