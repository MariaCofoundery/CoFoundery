"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";

/**
 * Teamraum-Chat schreiben (20270318120000). Wer darf, entscheidet die Datenbank. Gesendet wird aus dem
 * Browser heraus als Funktionsaufruf (kein Neuladen); die Nachricht selbst kommt per Echtzeit zurueck.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function sendOrgChatMessage(chatId: string, body: string): Promise<{ ok: true; id: string } | { ok: false; reason: "invalid" | "member" | "failed" }> {
  if (!UUID.test(chatId)) return { ok: false, reason: "invalid" };
  const text = String(body ?? "").trim().slice(0, 4000);
  if (!text) return { ok: false, reason: "invalid" };
  const client = await createClient();
  const { data, error } = await client.rpc("send_org_chat_message", { p_chat_id: chatId, p_body: text });
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
  const { data: chat } = await client.from("advisor_org_chats").select("kind").eq("id", rows[0].chat_id).maybeSingle();
  const direct = (chat as { kind?: string } | null)?.kind === "direct";
  await Promise.all(
    rows.map(async (row) => {
      const recipient = await getNotificationRecipient(row.recipient_user_id);
      const t = await getTranslations({ locale: recipient?.locale ?? "de", namespace: "advisor.chat.push" });
      return deliverPushToUser(row.recipient_user_id, {
        title: direct && senderName ? t("directTitle", { name: senderName }) : t("teamTitle"),
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
  return data === true;
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
