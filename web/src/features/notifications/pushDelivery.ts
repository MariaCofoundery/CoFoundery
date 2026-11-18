import "server-only";

import { createClient } from "@supabase/supabase-js";
import { sendWebPush, getVapidKeys } from "@/lib/push/sendWebPush";
import { getDeliveryMode } from "@/features/notifications/deliveryMode";
import { BUNDLE_WINDOW_MINUTES, BUNDLED_PUSH_PATH, bundledPushCopy } from "@/features/notifications/deliveryRhythm";

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
 * (`getNetworkNotificationEmailCopy`). Zwei Quellen fuer dieselbe Aussage waere
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
  /** Zahl am App-Symbol; die Auslieferung setzt sie, die Anrufer nicht. */
  badge?: number;
  /** Still ersetzen: kein Ton, kein erneutes Aufleuchten. */
  quiet?: boolean;
};

/**
 * Wie sich eine Mitteilung zum Rhythmus der Empfaengerin verhaelt (18.11.2026).
 *   bundle    - der Normalfall: erste im Fenster sofort, weitere ersetzen sie still.
 *   immediate - nie buendeln (Chat: eine Meldung je Gespraech, die Marke ersetzt schon).
 *   test      - der Probeknopf: immer sofort, auch bei "ruhig" - er prueft den Weg, nicht den Rhythmus.
 * "Ruhig" schweigt bei bundle und immediate; Feierabend schweigt bei allen.
 */
export type PushRhythm = "bundle" | "immediate" | "test";

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

export async function deliverPushToUser(userId: string, payload: PushPayload, options: { rhythm?: PushRhythm } = {}) {
  // Ohne Schluessel gibt es diesen Kanal nicht. Dann auch nicht die Abfrage.
  if (!getVapidKeys()) return { sent: 0, removed: 0 };

  const client = privilegedClient();
  if (!client) return { sent: 0, removed: 0 };

  // Feierabend (20270317120000): Das Telefon bleibt still, der Hinweis in der App ist schon da.
  // Nachgeholt wird nichts - wer die App oeffnet, sieht, was liegt.
  const { data: quiet } = await client.rpc("is_quiet_now", { p_user_id: userId });
  if (quiet === true) return { sent: 0, removed: 0 };

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

  const rhythm = options.rhythm ?? "bundle";
  let outgoing: PushPayload = payload;
  if (rhythm === "immediate") {
    if ((await getDeliveryMode(userId)) === "quiet") return { sent: 0, removed: 0 };
  } else if (rhythm === "bundle") {
    // Erst hier, nach Feierabend und nach der Frage, ob es ueberhaupt ein Geraet gibt: Eine
    // Mitteilung, die nirgends ankommt, soll kein Fenster belegen.
    const { data: slotData } = await client.rpc("claim_push_slot", { p_user_id: userId, p_window_minutes: BUNDLE_WINDOW_MINUTES });
    const slot = (Array.isArray(slotData) ? slotData[0] : slotData) as
      | { action?: string; bundled_count?: number; badge_count?: number; badge?: boolean; window_epoch?: number }
      | null
      | undefined;
    // Ohne Antwort (Datenbank kurz weg): so senden wie gedacht. Eine Mitteilung zu viel ist besser als keine.
    if (slot?.action === "skip") return { sent: 0, removed: 0 };
    if (slot) {
      const windowTag = slot.window_epoch && slot.window_epoch > 0 ? `bundle:${slot.window_epoch}` : undefined;
      outgoing = { ...payload, ...(windowTag ? { tag: windowTag } : {}) };
      if (slot.action === "join") {
        const { data: core } = await client.from("person_core").select("locale").eq("user_id", userId).maybeSingle();
        const copy = bundledPushCopy(String((core as { locale?: string } | null)?.locale ?? "de"), slot.bundled_count ?? 2);
        outgoing = { ...outgoing, title: copy.title, body: copy.body, url: BUNDLED_PUSH_PATH, quiet: true };
      }
      if (slot.badge && typeof slot.badge_count === "number") outgoing = { ...outgoing, badge: slot.badge_count };
    }
  }

  let sent = 0;
  let removed = 0;

  // Nebenlaeufig: Ein Geraet, dessen Push-Dienst langsam antwortet, soll die
  // Zustellung an die anderen nicht aufhalten.
  const results = await Promise.all(
    rows.map(async (row) => ({
      row,
      result: await sendWebPush(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        outgoing
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
