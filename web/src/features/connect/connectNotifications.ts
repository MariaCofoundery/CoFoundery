import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyNetwork } from "@/features/notifications/networkNotification";

/**
 * Benachrichtigungen fuer Connect.
 *
 * Die Mechanik - Anspruch, Sprache der Empfaengerin, Mail und Mitteilung auf
 * das Geraet - steht seit dem 20.09.2026 in
 * `features/notifications/networkNotification.ts`, weil Find dieselbe braucht.
 * Hier bleibt, was Connect-eigen ist: welcher Vorgang wohin fuehrt und wie er
 * heisst.
 */

export type ConnectNotificationKind =
  | "contact_request"
  | "problem_interest"
  | "approach_interest"
  | "message";

export async function notifyConnectContactRequest(
  client: SupabaseClient,
  requestId: string,
  recipientUserId: string,
  senderName: string | null
) {
  await notifyNetwork(client, {
    kind: "contact_request",
    subjectId: requestId,
    recipientUserId,
    path: "/connect/contacts",
    senderName,
  });
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
  await notifyNetwork(client, {
    kind,
    subjectId: interestId,
    recipientUserId,
    path: `/connect/problems/${problemId}`,
    senderName,
  });
}

/**
 * Eine Nachricht ist nur dann eine Benachrichtigung wert, wenn nicht ohnehin
 * schon ungelesene Post von derselben Person wartet - sonst wuerde ein Hin und
 * Her zu einer Meldung je Zeile. Diese Entscheidung faellt die Datenbank.
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

  await notifyNetwork(client, {
    kind: "message",
    subjectId: messageId,
    recipientUserId: data as string,
    path: `/connect/messages/${conversationId}`,
    senderName,
  });
}
