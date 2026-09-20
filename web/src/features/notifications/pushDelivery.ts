import "server-only";

import { createClient } from "@supabase/supabase-js";
import { sendWebPush, getVapidKeys } from "@/lib/push/sendWebPush";

/**
 * Eine Mitteilung an alle Geraete eines Menschen.
 *
 * WARUM PRIVILEGIERT GELESEN WIRD:
 *   Eine Benachrichtigung entsteht durch die Handlung eines ANDEREN Menschen -
 *   wer schreibt, loest sie aus. Die Zustelladressen der Empfaengerin sind fuer
 *   ihn ueber die Zeilensicherheit nicht erreichbar, und das ist richtig so.
 *   Dieselbe Lage wie bei der Mailadresse in `notificationRecipient.ts`, und
 *   derselbe Weg.
 *
 * WAS IM INHALT STEHEN DARF:
 *   Dasselbe wie in der Mail, und aus demselben Grund. Der Inhalt ist zwar bis
 *   zum Geraet verschluesselt - der Push-Dienst von Apple oder Google kann ihn
 *   nicht lesen -, aber er erscheint auf einem SPERRBILDSCHIRM. Der ist sichtbar
 *   fuer jeden, der das Telefon in der Hand haelt. Was jemand geschrieben hat,
 *   steht deshalb nicht in der Mitteilung, sondern in CoFoundery.
 *
 * Die Texte kommen aus derselben Quelle wie die der Mail
 * (`getConnectNotificationEmailCopy`). Zwei Quellen fuer dieselbe Aussage waere
 * die naechste Stelle, an der zwei Kanaele auseinanderlaufen.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Wohin ein Antippen fuehrt - ein Pfad, keine vollstaendige Adresse. */
  url: string;
  /**
   * Gleiche Marke ersetzt eine noch nicht gelesene Mitteilung statt eine
   * zweite daneben zu legen. Ein Gespraech soll nicht als Stapel erscheinen.
   */
  tag?: string;
};

/** Nach so vielen Fehlversuchen in Folge gilt eine Adresse als verloren. */
const MAX_FAILURES = 8;

function privilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function deliverPushToUser(userId: string, payload: PushPayload) {
  // Ohne Schluessel gibt es diesen Kanal nicht. Dann auch nicht die Abfrage.
  if (!getVapidKeys()) return { sent: 0, removed: 0 };

  const client = privilegedClient();
  if (!client) return { sent: 0, removed: 0 };

  const { data, error } = await client
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failure_count")
    .eq("user_id", userId);
  if (error || !data || data.length === 0) return { sent: 0, removed: 0 };

  const rows = data as {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    failure_count: number;
  }[];

  let sent = 0;
  let removed = 0;

  // Nebenlaeufig: Ein Geraet, dessen Push-Dienst langsam antwortet, soll die
  // Zustellung an die anderen nicht aufhalten.
  const results = await Promise.all(
    rows.map(async (row) => ({
      row,
      result: await sendWebPush(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        payload
      ),
    }))
  );

  for (const { row, result } of results) {
    if (result.ok) {
      sent += 1;
      await client
        .from("push_subscriptions")
        .update({ last_seen_at: new Date().toISOString(), failure_count: 0 })
        .eq("id", row.id);
      continue;
    }

    // Eine abgemeldete Adresse wird geloescht, nicht markiert: Sie wird nie
    // wieder gueltig, und eine Liste toter Adressen ist eine Liste, in der
    // jemand irgendwann nachsieht, wo jemand sein Konto benutzt hat.
    if (result.gone || row.failure_count + 1 >= MAX_FAILURES) {
      await client.from("push_subscriptions").delete().eq("id", row.id);
      removed += 1;
      continue;
    }

    await client
      .from("push_subscriptions")
      .update({ failure_count: row.failure_count + 1 })
      .eq("id", row.id);
  }

  return { sent, removed };
}
