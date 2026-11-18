import "server-only";

import { createClient } from "@supabase/supabase-js";
import { digestLines } from "@/features/notifications/deliveryRhythm";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNotificationDigestEmail } from "@/lib/email/sendNotificationDigestEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

/**
 * Die Morgenuebersicht im taeglichen Lauf (18.11.2026).
 *
 * Laeuft im selben Lauf wie alles andere (`api/cron/connect-suggestions`):
 * Vercel Hobby erlaubt zwei Zeitplaene, beide sind belegt.
 *
 * DIE DATENBANK STEMPELT, BEVOR GESENDET WIRD (`prepare_notification_digests`):
 * Lieber eine Uebersicht zu wenig als zwei. Ein Fehler bei einem Menschen haelt
 * die anderen nicht auf.
 */
export type NotificationDigestResult =
  | { ok: true; prepared: number; sent: number }
  | { ok: false; reason: "missing_service_role" | "prepare_failed" };

export async function runNotificationDigests(limit = 100): Promise<NotificationDigestResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, reason: "missing_service_role" };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.rpc("prepare_notification_digests", { p_limit: limit });
  if (error) return { ok: false, reason: "prepare_failed" };

  const rows = (data ?? []) as { user_id: string; counts: Record<string, unknown> }[];
  let sent = 0;
  for (const row of rows) {
    try {
      const recipient = await getNotificationRecipient(row.user_id);
      if (!recipient) continue;
      const lines = digestLines(recipient.locale, row.counts ?? {});
      if (lines.length === 0) continue;
      const origin = getPublicAppOrigin();
      const result = await sendNotificationDigestEmail({
        recipientEmail: recipient.email,
        lines,
        openUrl: `${origin}/messages`,
        settingsUrl: `${origin}/account#rhythmus`,
        locale: recipient.locale,
      });
      if (result.ok) sent += 1;
    } catch {
      // Eine Uebersicht ist eine Beigabe: Ein Fehler bei einer Person haelt die anderen nicht auf.
    }
  }
  return { ok: true, prepared: rows.length, sent };
}
