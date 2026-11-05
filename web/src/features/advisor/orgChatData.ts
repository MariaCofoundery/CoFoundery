import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { messageOf, type ChatMessage, type ChatSummary } from "@/features/advisor/orgChatModel";

/** Teamraum-Chat lesen - mit dem normalen Zugang; die Zeilensicherheit entscheidet (20270318120000). */

export async function listMyOrgChats(client: SupabaseClient, orgId: string): Promise<ChatSummary[]> {
  const { data, error } = await client.rpc("list_my_org_chats", { p_org_id: orgId });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    chatId: row.chat_id as string,
    kind: row.kind === "direct" ? "direct" : "team",
    otherUserId: (row.other_user_id as string | null) ?? null,
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    lastBody: (row.last_body as string | null) ?? null,
    lastAuthorUserId: (row.last_author_user_id as string | null) ?? null,
    unread: Number(row.unread ?? 0),
    muted: row.muted === true,
  }));
}

export async function getOrgChat(client: SupabaseClient, chatId: string): Promise<{ id: string; orgId: string; kind: "team" | "direct"; directA: string | null; directB: string | null } | null> {
  const { data, error } = await client.from("advisor_org_chats").select("id, org_id, kind, direct_a, direct_b").eq("id", chatId).maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; org_id: string; kind: string; direct_a: string | null; direct_b: string | null };
  return { id: row.id, orgId: row.org_id, kind: row.kind === "direct" ? "direct" : "team", directA: row.direct_a, directB: row.direct_b };
}

/** Die juengsten Nachrichten, aelteste zuerst. */
export async function listChatMessages(client: SupabaseClient, chatId: string, limit = 150): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from("advisor_org_chat_messages")
    .select("id, chat_id, author_user_id, body, created_at, retracted_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(messageOf).reverse();
}
