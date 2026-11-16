import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getNetworkNotificationEmailCopy } from "@/features/email/emailMessages";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNetworkNotificationEmail } from "@/lib/email/sendNetworkNotificationEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

const PATH = "/connect/contacts";

/**
 * Mail und Push zu Danks, die noch keine Meldung hatten. Laeuft direkt nach dem Danke (damit es ankommt) und im taeglichen Lauf (damit
 * nichts durchrutscht, etwa weil beim Danke gerade kein Mail-Dienst da war). Gestempelt wird in der Datenbank, bevor gesendet wird -
 * hoechstens eine Meldung je Dank. Bestenfalls: ein Fehler hier laesst niemanden sein Danke wiederholen.
 */
export async function runThanksNotifications(limit = 20): Promise<{ ok: true; sent: number } | { ok: false; reason: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, reason: "missing_service_role" };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.rpc("prepare_thanks_notifications", { p_limit: limit });
  if (error) return { ok: false, reason: "prepare_failed" };
  const rows = (data ?? []) as { thanks_id: string; recipient_user_id: string; thanker_first_name: string }[];
  let sent = 0;
  for (const row of rows) {
    try {
      const recipient = await getNotificationRecipient(row.recipient_user_id);
      if (!recipient) continue;
      const senderName = row.thanker_first_name || null;
      const copy = getNetworkNotificationEmailCopy(recipient.locale, { kind: "connect_thanks", senderName });
      await Promise.all([
        sendNetworkNotificationEmail({ recipientEmail: recipient.email, kind: "connect_thanks", senderName, url: `${getPublicAppOrigin()}${PATH}`, locale: recipient.locale }),
        deliverPushToUser(row.recipient_user_id, { title: copy.headline, body: copy.intro, url: PATH, tag: `connect_thanks:${row.thanks_id}` }),
      ]);
      sent += 1;
    } catch {
      // Eine Meldung ist eine Beigabe: Fehler bei einer Person halten die anderen nicht auf.
    }
  }
  return { ok: true, sent };
}
