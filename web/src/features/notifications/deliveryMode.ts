import "server-only";

import { createClient } from "@supabase/supabase-js";
import { DEFAULT_DELIVERY_MODE, isDeliveryMode, type DeliveryMode } from "@/features/notifications/deliveryRhythm";

/**
 * Der Rhythmus eines anderen Menschen, gelesen mit dem Dienstschluessel.
 *
 * WARUM PRIVILEGIERT: Eine Benachrichtigung entsteht durch die Handlung eines
 * ANDEREN. Dessen Zeilensicherheit reicht nicht an die Einstellung der
 * Empfaengerin - und soll es auch nicht. Dieselbe Lage wie bei den Zustelladressen
 * (pushDelivery.ts). Gelesen wird nur das Wort, sonst nichts.
 *
 * Fehlt die Zeile oder die Abfrage scheitert: Standard (gebuendelt). Ein Fehler
 * hier darf keine Benachrichtigung verschlucken - der Standard sendet.
 */
export async function getDeliveryMode(userId: string): Promise<DeliveryMode> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return DEFAULT_DELIVERY_MODE;
  try {
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await client.from("notification_delivery_prefs").select("mode").eq("user_id", userId).maybeSingle();
    const mode = (data as { mode?: unknown } | null)?.mode;
    return isDeliveryMode(mode) ? mode : DEFAULT_DELIVERY_MODE;
  } catch {
    return DEFAULT_DELIVERY_MODE;
  }
}
