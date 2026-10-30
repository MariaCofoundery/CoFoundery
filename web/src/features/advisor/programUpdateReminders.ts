import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getNetworkNotificationEmailCopy } from "@/features/email/emailMessages";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNetworkNotificationEmail } from "@/lib/email/sendNetworkNotificationEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

/**
 * Der Lauf, der an faellige Programm-Updates erinnert.
 *
 * Dasselbe Muster wie die Check-in-Erinnerung: Wer erinnert wird und ob
 * zusaetzlich die Mail erlaubt ist, entscheidet die Datenbank
 * (`prepare_program_update_reminders`) - sie stempelt, BEVOR gesendet wird.
 *
 *   Hinweis im Postfach der App - immer, die Datenbank legt ihn selbst an.
 *   Mitteilung aufs Geraet       - solange die Art nicht abbestellt ist.
 *   Mail                         - nur mit ausdruecklicher Zustimmung im Konto.
 *
 * WAS IN DER ERINNERUNG STEHT: dass ein Update ansteht. Weder Team noch
 * Organisation - eine Mail landet in Postfaechern, die wir nicht kennen, eine
 * Mitteilung auf einem Sperrbildschirm, den jeder sieht.
 */
type PreparedRow = { recipient_user_id: string; program_id: string; wants_email: boolean };

export type ProgramUpdateReminderResult =
  | { ok: true; prepared: number; pushed: number; mailed: number }
  | { ok: false; reason: "missing_service_role" | "prepare_failed" };

export async function runProgramUpdateReminders(limit = 100): Promise<ProgramUpdateReminderResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, reason: "missing_service_role" };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await client.rpc("prepare_program_update_reminders", { p_limit: limit });
  if (error) return { ok: false, reason: "prepare_failed" };
  const rows = (data ?? []) as PreparedRow[];

  let pushed = 0;
  let mailed = 0;
  for (const row of rows) {
    try {
      const recipient = await getNotificationRecipient(row.recipient_user_id);
      if (!recipient) continue;
      const path = "/programm";
      const copy = getNetworkNotificationEmailCopy(recipient.locale, { kind: "program_update", senderName: null });
      const [push, mail] = await Promise.all([
        deliverPushToUser(row.recipient_user_id, {
          title: copy.headline,
          body: copy.intro,
          url: path,
          tag: `program_update:${row.program_id}`,
        }),
        row.wants_email
          ? sendNetworkNotificationEmail({
              recipientEmail: recipient.email,
              kind: "program_update",
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
