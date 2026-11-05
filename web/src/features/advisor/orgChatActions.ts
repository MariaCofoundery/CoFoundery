"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, REACTIONS, safeFileName } from "@/features/advisor/orgChatModel";
import { ORG_CHAT_BUCKET, orgChatStorageClient } from "@/features/advisor/orgChatStorage";

/**
 * Teamraum-Chat schreiben (20270318120000). Wer darf, entscheidet die Datenbank. Gesendet wird aus dem
 * Browser heraus als Funktionsaufruf (kein Neuladen); die Nachricht selbst kommt per Echtzeit zurueck.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type ChatUploadedFile = { path: string; name: string; type: string; size: number };

export async function sendOrgChatMessage(chatId: string, body: string, file: ChatUploadedFile | null = null): Promise<{ ok: true; id: string } | { ok: false; reason: "invalid" | "member" | "failed" }> {
  if (!UUID.test(chatId)) return { ok: false, reason: "invalid" };
  const text = String(body ?? "").trim().slice(0, 4000);
  if (!text && !file) return { ok: false, reason: "invalid" };
  if (file && (!ATTACHMENT_TYPES.includes(file.type as (typeof ATTACHMENT_TYPES)[number]) || file.size < 1 || file.size > ATTACHMENT_MAX_BYTES)) return { ok: false, reason: "invalid" };
  const client = await createClient();
  const { data, error } = await client.rpc("send_org_chat_message", {
    p_chat_id: chatId,
    p_body: text,
    p_attachment_path: file?.path ?? null,
    p_attachment_name: file ? file.name.slice(0, 200) : null,
    p_attachment_type: file?.type ?? null,
    p_attachment_size: file?.size ?? null,
  });
  if (error || typeof data !== "string") return { ok: false, reason: /not_member/.test(error?.message ?? "") ? "member" : "failed" };
  await pushChatMessage(client, data).catch(() => undefined);
  return { ok: true, id: data };
}

/**
 * Mitteilung aufs Geraet an die anderen im Chat. Auf dem Sperrbildschirm steht nur, dass eine Nachricht
 * da ist (im Direktchat: von wem) - nie der Text. Gleiche Marke je Chat: Eine neue Nachricht ersetzt die
 * alte Mitteilung, statt sich zu stapeln. Feierabend gilt (deliverPushToUser).
 */
async function pushChatMessage(client: Awaited<ReturnType<typeof createClient>>, messageId: string) {
  const { data } = await client.rpc("org_chat_push_recipients", { p_message_id: messageId });
  const rows = (Array.isArray(data) ? data : []) as { recipient_user_id: string; chat_id: string; org_id: string }[];
  if (rows.length === 0) return;
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data: core } = user ? await client.from("person_core").select("display_name").eq("user_id", user.id).maybeSingle() : { data: null };
  const senderName = String((core as { display_name?: string } | null)?.display_name ?? "").trim() || null;
  const { data: chat } = await client.from("advisor_org_chats").select("kind, name").eq("id", rows[0].chat_id).maybeSingle();
  const direct = (chat as { kind?: string } | null)?.kind === "direct";
  const groupName = (chat as { name?: string | null } | null)?.name ?? null;
  await Promise.all(
    rows.map(async (row) => {
      const recipient = await getNotificationRecipient(row.recipient_user_id);
      const t = await getTranslations({ locale: recipient?.locale ?? "de", namespace: "advisor.chat.push" });
      return deliverPushToUser(row.recipient_user_id, {
        // Gruppenname ja (das Team hat ihn selbst vergeben), Text nie.
        title: direct && senderName ? t("directTitle", { name: senderName }) : groupName ? t("groupTitle", { name: groupName }) : t("teamTitle"),
        body: t("body"),
        url: `/advisor/organisation/chat?${new URLSearchParams({ org: row.org_id, chat: row.chat_id }).toString()}`,
        tag: `org_chat:${row.chat_id}`,
      });
    }),
  );
}

export async function retractOrgChatMessage(messageId: string): Promise<boolean> {
  if (!UUID.test(messageId)) return false;
  const client = await createClient();
  const { data } = await client.rpc("retract_org_chat_message", { p_message_id: messageId });
  if (typeof data !== "string") return false;
  // Mit der Nachricht geht auch die Datei.
  if (data) await orgChatStorageClient()?.storage.from(ORG_CHAT_BUCKET).remove([data]);
  return true;
}

/**
 * Hochladen vorbereiten: Darf die Person hier schreiben, und passt die Datei? Dann gibt es eine
 * kurzlebige Erlaubnis, mit der der Browser direkt in den Speicher laedt (keine Groessenbremse durch
 * den Server). Gesendet wird danach mit sendOrgChatMessage - die Datenbank prueft den Pfad noch einmal.
 */
export async function prepareOrgChatUpload(
  chatId: string,
  name: string,
  type: string,
  size: number,
): Promise<{ ok: true; path: string; token: string } | { ok: false; reason: "invalid" | "type" | "size" | "member" | "failed" }> {
  if (!UUID.test(chatId)) return { ok: false, reason: "invalid" };
  if (!ATTACHMENT_TYPES.includes(type as (typeof ATTACHMENT_TYPES)[number])) return { ok: false, reason: "type" };
  if (!Number.isInteger(size) || size < 1 || size > ATTACHMENT_MAX_BYTES) return { ok: false, reason: "size" };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, reason: "invalid" };
  const [{ data: allowed }, { data: chat }] = await Promise.all([
    client.rpc("can_write_org_chat", { p_chat_id: chatId }),
    client.from("advisor_org_chats").select("org_id").eq("id", chatId).maybeSingle(),
  ]);
  const orgId = (chat as { org_id?: string } | null)?.org_id;
  if (allowed !== true || !orgId) return { ok: false, reason: "member" };
  const storage = orgChatStorageClient();
  if (!storage) return { ok: false, reason: "failed" };
  const path = `${user.id}/${orgId}/${chatId}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(name)}`;
  const { data, error } = await storage.storage.from(ORG_CHAT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, reason: "failed" };
  return { ok: true, path, token: data.token };
}

export async function toggleOrgChatReaction(messageId: string, emoji: string): Promise<boolean> {
  if (!UUID.test(messageId) || !REACTIONS.includes(emoji as (typeof REACTIONS)[number])) return false;
  const client = await createClient();
  const { error } = await client.rpc("toggle_org_chat_reaction", { p_message_id: messageId, p_emoji: emoji });
  return !error;
}

/** Eine eigene Gruppe anlegen - und hinein. */
export async function createOrgChatGroupAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  if (!UUID.test(orgId)) redirect("/advisor/organisation");
  const members = formData.getAll("member").map(String).filter((id) => UUID.test(id));
  const client = await createClient();
  const { data, error } = await client.rpc("create_org_chat_group", { p_org_id: orgId, p_name: String(formData.get("name") ?? "").slice(0, 80), p_member_ids: members });
  if (error || typeof data !== "string") redirect(`/advisor/organisation?${new URLSearchParams({ org: orgId, tab: "chat", chatError: "1" }).toString()}`);
  redirect(`/advisor/organisation/chat?${new URLSearchParams({ org: orgId, chat: data as string }).toString()}`);
}

export async function updateOrgChatGroupAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const chatId = String(formData.get("chatId") ?? "");
  if (!UUID.test(orgId) || !UUID.test(chatId)) redirect("/advisor/organisation");
  const members = formData.getAll("member").map(String).filter((id) => UUID.test(id));
  const client = await createClient();
  const { error } = await client.rpc("update_org_chat_group", { p_chat_id: chatId, p_name: String(formData.get("name") ?? "").slice(0, 80), p_member_ids: members });
  revalidatePath("/advisor/organisation/chat");
  redirect(`/advisor/organisation/chat?${new URLSearchParams({ org: orgId, chat: chatId, ...(error ? { groupError: "1" } : { groupSaved: "1" }) }).toString()}`);
}

export async function leaveOrgChatGroupAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const chatId = String(formData.get("chatId") ?? "");
  if (!UUID.test(orgId) || !UUID.test(chatId)) redirect("/advisor/organisation");
  const client = await createClient();
  await client.rpc("leave_org_chat_group", { p_chat_id: chatId });
  revalidatePath("/advisor/organisation");
  redirect(`/advisor/organisation?${new URLSearchParams({ org: orgId, tab: "chat" }).toString()}`);
}

export async function markOrgChatRead(chatId: string): Promise<void> {
  if (!UUID.test(chatId)) return;
  const client = await createClient();
  await client.rpc("mark_org_chat_read", { p_chat_id: chatId });
}

/** Teamchat oder Direktchat oeffnen - beim ersten Mal anlegen - und hinein. */
export async function openOrgChatAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const withUser = String(formData.get("withUserId") ?? "");
  if (!UUID.test(orgId)) redirect("/advisor/organisation");
  const client = await createClient();
  const { data, error } = await client.rpc("open_org_chat", { p_org_id: orgId, p_with_user_id: UUID.test(withUser) ? withUser : null });
  if (error || typeof data !== "string") redirect(`/advisor/organisation?${new URLSearchParams({ org: orgId, tab: "chat", chatError: "1" }).toString()}`);
  redirect(`/advisor/organisation/chat?${new URLSearchParams({ org: orgId, chat: data as string }).toString()}`);
}

export async function setOrgChatMutedAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const chatId = String(formData.get("chatId") ?? "");
  if (!UUID.test(orgId) || !UUID.test(chatId)) redirect("/advisor/organisation");
  const client = await createClient();
  await client.rpc("set_org_chat_muted", { p_chat_id: chatId, p_muted: formData.get("muted") === "yes" });
  revalidatePath("/advisor/organisation/chat");
  redirect(`/advisor/organisation/chat?${new URLSearchParams({ org: orgId, chat: chatId }).toString()}`);
}
