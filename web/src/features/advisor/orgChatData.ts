import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { messageOf, type ChatMessage, type ChatReaction, type ChatSummary } from "@/features/advisor/orgChatModel";

export const MESSAGE_COLUMNS = "id, chat_id, author_user_id, body, created_at, retracted_at, attachment_path, attachment_name, attachment_type, attachment_size";

/** Teamraum-Chat lesen - mit dem normalen Zugang; die Zeilensicherheit entscheidet (20270318120000). */

export async function listMyOrgChats(client: SupabaseClient, orgId: string): Promise<ChatSummary[]> {
  const { data, error } = await client.rpc("list_my_org_chats", { p_org_id: orgId });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    chatId: row.chat_id as string,
    kind: row.kind === "direct" ? "direct" : row.kind === "group" ? "group" : "team",
    name: (row.name as string | null) ?? null,
    memberCount: row.member_count === null || row.member_count === undefined ? null : Number(row.member_count),
    createdByUserId: (row.created_by_user_id as string | null) ?? null,
    otherUserId: (row.other_user_id as string | null) ?? null,
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    lastBody: (row.last_body as string | null) ?? null,
    lastAuthorUserId: (row.last_author_user_id as string | null) ?? null,
    unread: Number(row.unread ?? 0),
    muted: row.muted === true,
  }));
}

export type OrgChat = { id: string; orgId: string; kind: "team" | "direct" | "group"; name: string | null; createdByUserId: string | null; directA: string | null; directB: string | null };

export async function getOrgChat(client: SupabaseClient, chatId: string): Promise<OrgChat | null> {
  const { data, error } = await client.from("advisor_org_chats").select("id, org_id, kind, name, created_by_user_id, direct_a, direct_b").eq("id", chatId).maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; org_id: string; kind: string; name: string | null; created_by_user_id: string | null; direct_a: string | null; direct_b: string | null };
  return {
    id: row.id,
    orgId: row.org_id,
    kind: row.kind === "direct" ? "direct" : row.kind === "group" ? "group" : "team",
    name: row.name,
    createdByUserId: row.created_by_user_id,
    directA: row.direct_a,
    directB: row.direct_b,
  };
}

export async function listChatMembers(client: SupabaseClient, chatId: string): Promise<string[]> {
  const { data } = await client.from("advisor_org_chat_members").select("user_id").eq("chat_id", chatId);
  return ((data ?? []) as { user_id: string }[]).map((row) => row.user_id);
}

export async function listChatReactions(client: SupabaseClient, chatId: string): Promise<ChatReaction[]> {
  const { data } = await client.from("advisor_org_chat_reactions").select("message_id, user_id, emoji").eq("chat_id", chatId).limit(2000);
  return ((data ?? []) as { message_id: string; user_id: string; emoji: string }[]).map((row) => ({ messageId: row.message_id, userId: row.user_id, emoji: row.emoji }));
}

export type ChatSearchHit = { messageId: string; chatId: string; authorUserId: string; body: string; createdAt: string; attachmentName: string | null };
export async function searchOrgChats(client: SupabaseClient, orgId: string, query: string): Promise<ChatSearchHit[]> {
  if (query.trim().length < 2) return [];
  const { data } = await client.rpc("search_org_chat_messages", { p_org_id: orgId, p_query: query.slice(0, 100) });
  return ((data ?? []) as { message_id: string; chat_id: string; author_user_id: string; body: string; created_at: string; attachment_name: string | null }[]).map((row) => ({
    messageId: row.message_id,
    chatId: row.chat_id,
    authorUserId: row.author_user_id,
    body: row.body,
    createdAt: row.created_at,
    attachmentName: row.attachment_name,
  }));
}

/** Die juengsten Nachrichten, aelteste zuerst. */
export async function listChatMessages(client: SupabaseClient, chatId: string, limit = 150): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from("advisor_org_chat_messages")
    .select(MESSAGE_COLUMNS)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(messageOf).reverse();
}
