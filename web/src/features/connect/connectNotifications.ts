import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotificationRecipientEmail } from "@/lib/email/notificationRecipient";
import { sendConnectNotificationEmail } from "@/lib/email/sendConnectNotificationEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { getRequestLocale } from "@/i18n/getLocale";

/**
 * Benachrichtigungen fuer Connect.
 *
 * Drei Regeln, die hier zusammenkommen:
 *
 *   Bestenfalls. Ein fehlgeschlagener Versand darf die Handlung nicht
 *   scheitern lassen - wer eine Kontaktanfrage stellt, hat sie gestellt, auch
 *   wenn die Mail nicht rausgeht.
 *
 *   Hoechstens einmal. Der Anspruch wird in der Datenbank genommen, bevor
 *   gesendet wird. Lieber eine Mail zu wenig als zwei.
 *
 *   Nur was bestellt ist. Wer Benachrichtigungen abgeschaltet hat, bekommt
 *   keine - das prueft dieselbe Funktion, die den Anspruch vergibt.
 */

export type ConnectNotificationKind = "contact_request" | "problem_interest" | "message";

async function claim(
  client: SupabaseClient,
  kind: ConnectNotificationKind,
  subjectId: string,
  recipientUserId: string
) {
  const { data, error } = await client.rpc("claim_network_notification", {
    p_kind: kind,
    p_subject_id: subjectId,
    p_recipient_user_id: recipientUserId,
  });
  return !error && data === true;
}

async function notify(
  client: SupabaseClient,
  kind: ConnectNotificationKind,
  subjectId: string,
  recipientUserId: string,
  path: string,
  senderName: string | null
) {
  try {
    if (!(await claim(client, kind, subjectId, recipientUserId))) return;

    const recipientEmail = await getNotificationRecipientEmail(recipientUserId);
    if (!recipientEmail) return;

    await sendConnectNotificationEmail({
      recipientEmail,
      kind,
      senderName,
      url: `${getPublicAppOrigin()}${path}`,
      locale: await getRequestLocale(),
    });
  } catch {
    // Bewusst stumm: Eine Benachrichtigung ist eine Beigabe, kein Teil der
    // Handlung. Sie darf sie nicht mit sich reissen.
  }
}

export async function notifyConnectContactRequest(
  client: SupabaseClient,
  requestId: string,
  recipientUserId: string,
  senderName: string | null
) {
  await notify(client, "contact_request", requestId, recipientUserId, "/connect/contacts", senderName);
}

export async function notifyConnectProblemInterest(
  client: SupabaseClient,
  interestId: string,
  problemId: string,
  recipientUserId: string,
  senderName: string | null
) {
  await notify(
    client,
    "problem_interest",
    interestId,
    recipientUserId,
    `/connect/problems/${problemId}`,
    senderName
  );
}

/**
 * Eine Nachricht ist nur dann eine Mail wert, wenn nicht ohnehin schon
 * ungelesene Post von derselben Person wartet - sonst wuerde ein Hin und Her
 * zu einer Mail je Zeile. Diese Entscheidung faellt die Datenbank.
 */
export async function notifyConnectMessage(
  client: SupabaseClient,
  messageId: string,
  conversationId: string,
  senderName: string | null
) {
  const { data, error } = await client.rpc("network_message_notification_recipient", {
    p_message_id: messageId,
  });
  if (error || !data) return;

  await notify(
    client,
    "message",
    messageId,
    data as string,
    `/connect/messages/${conversationId}`,
    senderName
  );
}
