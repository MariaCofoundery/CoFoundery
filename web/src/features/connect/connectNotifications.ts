import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendConnectNotificationEmail } from "@/lib/email/sendConnectNotificationEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

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

export type ConnectNotificationKind =
  | "contact_request"
  | "problem_interest"
  | "approach_interest"
  | "message";

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

    const recipient = await getNotificationRecipient(recipientUserId);
    if (!recipient) return;

    await sendConnectNotificationEmail({
      recipientEmail: recipient.email,
      kind,
      senderName,
      url: `${getPublicAppOrigin()}${path}`,
      // Die Sprache der EMPFAENGERIN. Vorher stand hier die der laufenden
      // Anfrage - also die der Person, die gerade geschrieben hat.
      locale: recipient.locale,
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

/**
 * Die Meldung erreicht unterschiedliche Menschen und muss deshalb
 * unterschiedlich heissen: "wuerde an deinem Problem arbeiten" waere falsch
 * bei jemandem, der nicht das Problem geschildert, sondern einen Ansatz
 * geschrieben hat.
 */
export async function notifyConnectProblemInterest(
  client: SupabaseClient,
  interestId: string,
  problemId: string,
  recipientUserId: string,
  senderName: string | null,
  kind: "problem_interest" | "approach_interest" = "problem_interest"
) {
  await notify(
    client,
    kind,
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
