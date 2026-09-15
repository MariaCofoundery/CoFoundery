import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Die Mailadresse einer Person, fuer Benachrichtigungen.
 *
 * Adressen liegen in auth.users und sind ueber RLS nicht erreichbar - dafuer
 * braucht es den Service-Role-Schluessel. Das Muster stammt aus
 * readMyMindNotificationRecipient und liegt jetzt an einer Stelle, damit der
 * privilegierte Zugriff nicht in jedem Feature neu entsteht.
 *
 * Gibt null zurueck, wenn die Schluessel fehlen - dann wird eben nicht
 * benachrichtigt, statt dass etwas abbricht.
 */
export async function getNotificationRecipientEmail(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const privileged = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await privileged.auth.admin.getUserById(userId);
  if (error) return null;

  const email = data.user?.email?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}
