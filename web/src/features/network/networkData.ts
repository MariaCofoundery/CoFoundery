import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NetworkBlockedMember, NetworkBlockState, NetworkContactRequest, NetworkConversation, NetworkListing, NetworkMessage, NetworkProfile } from "./networkTypes";
import { NETWORK_CATEGORIES, NETWORK_DIRECTIONS, NETWORK_GEOGRAPHIC_SCOPES, NETWORK_REMOTE_MODES, isOneOf } from "./networkTypes";

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
  if (isOneOf(NETWORK_DIRECTIONS, filters.direction)) query = query.eq("direction", filters.direction);
  if (isOneOf(NETWORK_CATEGORIES, filters.category)) query = query.eq("category", filters.category);
  if (isOneOf(NETWORK_REMOTE_MODES, filters.remote_mode)) query = query.eq("remote_mode", filters.remote_mode);
  if (isOneOf(NETWORK_GEOGRAPHIC_SCOPES, filters.geographic_scope)) query = query.eq("geographic_scope", filters.geographic_scope);
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

export async function getOwnContactRequestForListing(client: Client, userId: string, listingId: string) {
  const { data, error } = await client.from("network_contact_requests").select("*").eq("sender_user_id", userId).eq("listing_id", listingId).maybeSingle();
  if (error) throw new Error("network_contact_load_failed");
  return (data as NetworkContactRequest | null) ?? null;
}

export async function getNetworkContactRequests(client: Client, userId: string) {
  const { data, error } = await client.from("network_contact_requests").select("*").or(`sender_user_id.eq.${userId},recipient_user_id.eq.${userId}`).order("created_at", { ascending: false });
  if (error) throw new Error("network_contacts_load_failed");
  return (data ?? []) as NetworkContactRequest[];
}

export async function getIncomingPendingNetworkContactCount(client: Client, userId: string) {
  const { count, error } = await client.from("network_contact_requests").select("id", { count: "exact", head: true }).eq("recipient_user_id", userId).eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

export async function getNetworkConversations(client: Client) {
  const { data, error } = await client.rpc("list_network_conversations");
  if (error) throw new Error("network_conversations_load_failed");
  return (data ?? []) as NetworkConversation[];
}

export async function getNetworkConversation(client: Client, conversationId: string) {
  const conversations = await getNetworkConversations(client);
  return conversations.find((conversation) => conversation.conversation_id === conversationId) ?? null;
}

export async function getNetworkMessages(client: Client, conversationId: string) {
  const { data, error } = await client.rpc("list_network_messages", { p_conversation_id: conversationId });
  if (error) throw new Error("network_messages_load_failed");
  return (data ?? []) as NetworkMessage[];
}

export async function getUnreadNetworkMessageCount(client: Client) {
  const { data, error } = await client.rpc("get_unread_network_message_count");
  if (error) return 0;
  return typeof data === "number" ? data : Number(data ?? 0);
}

export async function getNetworkProfilesByUserIds(client: Client, userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map<string, NetworkProfile>();
  const { data, error } = await client.from("network_profiles").select("*").in("user_id", ids).eq("status", "active");
  if (error) return new Map<string, NetworkProfile>();
  return new Map(((data ?? []) as NetworkProfile[]).map((profile) => [profile.user_id, profile]));
}

export async function getNetworkBlockState(client: Client, otherUserId: string) {
  const { data, error } = await client.rpc("get_network_block_state", { p_other_user_id: otherUserId });
  if (error) return { interaction_blocked: true, blocked_by_current_user: false } satisfies NetworkBlockState;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    interaction_blocked: row?.interaction_blocked === true,
    blocked_by_current_user: row?.blocked_by_current_user === true,
  } satisfies NetworkBlockState;
}

export async function getOwnNetworkBlocks(client: Client) {
  const { data, error } = await client.rpc("list_network_blocks");
  if (error) return [];
  return (data ?? []) as NetworkBlockedMember[];
}
