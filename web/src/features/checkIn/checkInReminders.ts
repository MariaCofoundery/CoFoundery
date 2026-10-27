import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getNetworkNotificationEmailCopy } from "@/features/email/emailMessages";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNetworkNotificationEmail } from "@/lib/email/sendNetworkNotificationEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

/**
 * Der Lauf, der an faellige Team-Check-ins erinnert.
 *
 * Dasselbe Muster wie `runSuggestionNotifications`: Wer erinnert wird und ob
 * zusaetzlich die Mail erlaubt ist, entscheidet die Datenbank
 * (`prepare_team_check_in_reminders`) - sie stempelt auch, BEVOR gesendet wird.
 * Hoechstens eine Erinnerung je Person, Team und Faelligkeit.
 *
 *   Mitteilung aufs Geraet - an, solange die Art nicht abbestellt ist.
 *   Mail - nur mit ausdruecklicher Zustimmung im Konto.
 *
 * WAS IN DER ERINNERUNG STEHT: dass ein Check-in faellig ist. Kein Teamname,
 * keine Vereinbarung - eine Mail landet in Postfaechern, die wir nicht kennen,
 * eine Mitteilung auf einem Sperrbildschirm, den jeder sieht.
 */

type PreparedRow = {
  recipient_user_id: string;
  team_id: string;
  wants_email: boolean;
};

export type CheckInReminderResult =
  | { ok: true; prepared: number; pushed: number; mailed: number }
  | { ok: false; reason: "missing_service_role" | "prepare_failed" };

function privilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function runCheckInReminders(limit = 50): Promise<CheckInReminderResult> {
  const client = privilegedClient();
  if (!client) return { ok: false, reason: "missing_service_role" };

  const { data, error } = await client.rpc("prepare_team_check_in_reminders", { p_limit: limit });
  if (error) return { ok: false, reason: "prepare_failed" };
  const rows = (data ?? []) as PreparedRow[];

  // Nacheinander, wie beim Vorschlagslauf: nicht mehrere Postfaecher und
  // Push-Dienste in derselben Sekunde ansprechen.
  let pushed = 0;
  let mailed = 0;
  for (const row of rows) {
    try {
      const recipient = await getNotificationRecipient(row.recipient_user_id);
      if (!recipient) continue;
      const path = `/teams/${row.team_id}/check-in`;
      const copy = getNetworkNotificationEmailCopy(recipient.locale, { kind: "team_check_in", senderName: null });
      const [push, mail] = await Promise.all([
        deliverPushToUser(row.recipient_user_id, {
          title: copy.headline,
          body: copy.intro,
          url: path,
          tag: `team_check_in:${row.team_id}`,
        }),
        row.wants_email
          ? sendNetworkNotificationEmail({
              recipientEmail: recipient.email,
              kind: "team_check_in",
              senderName: null,
              url: `${getPublicAppOrigin()}${path}`,
              locale: recipient.locale,
            })
          : Promise.resolve(null),
      ]);
      pushed += push.sent;
      mailed += mail?.ok ? 1 : 0;
    } catch {
      // Ein Fehlschlag bei einem Menschen beendet den Lauf nicht; der Stempel
      // steht schon, die Erinnerung entfaellt - die gewollte Richtung.
    }
  }

  return { ok: true, prepared: rows.length, pushed, mailed };
}
