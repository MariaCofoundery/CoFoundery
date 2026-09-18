import "server-only";

import { createClient } from "@supabase/supabase-js";
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";

function privilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Wohin und in welcher Sprache.
 *
 * DIE SPRACHE IST DER GRUND, WARUM DAS ZUSAMMENGEHOERT.
 *
 *   Bis 18.09.2026 nahmen alle Benachrichtigungen `getRequestLocale()` - die
 *   Sprache der laufenden ANFRAGE. Eine Benachrichtigung entsteht aber durch
 *   die Handlung eines ANDEREN Menschen: Wer eine Anzeige veroeffentlicht,
 *   loest Mails an alle aus, deren gespeicherte Suche passt. Die kamen dann in
 *   der Sprache der veroeffentlichenden Person an.
 *
 *   Die Sprache der Empfaengerin steht in person_core.locale und ist ueber RLS
 *   nicht erreichbar - dieselbe Lage wie bei der Adresse, die in auth.users
 *   liegt. Beides holt deshalb derselbe privilegierte Aufruf.
 *
 * Null heisst: nicht benachrichtigen. Fehlen die Schluessel oder gibt es die
 * Person nicht mehr, wird eben nichts verschickt, statt dass etwas abbricht.
 */
export async function getNotificationRecipient(
  userId: string
): Promise<{ email: string; locale: AppLocale } | null> {
  const privileged = privilegedClient();
  if (!privileged) return null;

  const { data, error } = await privileged.auth.admin.getUserById(userId);
  if (error) return null;

  const email = data.user?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;

  const { data: core } = await privileged
    .from("person_core")
    .select("locale")
    .eq("user_id", userId)
    .maybeSingle();

  // Keine Wahl getroffen heisst Standardsprache - und ausdruecklich NICHT die
  // Sprache der ausloesenden Anfrage, sonst waere der Fehler nur seltener.
  return { email, locale: core?.locale ? normalizeLocale(core.locale) : DEFAULT_LOCALE };
}

/**
 * Nur die Adresse. Fuer Wege, die keine Sprache brauchen - etwa weil sie an
 * Menschen ohne Konto gehen.
 */
export async function getNotificationRecipientEmail(userId: string) {
  return (await getNotificationRecipient(userId))?.email ?? null;
}
