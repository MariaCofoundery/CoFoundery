import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Haelt fest, wann ein geplanter Lauf zuletzt fertig war - fuer das
 * Admin-Dashboard. Best effort: Ein Fehler hier darf den Lauf nie scheitern
 * lassen, und ohne Service-Role-Schluessel (lokal) passiert einfach nichts.
 */
export async function recordCronHeartbeat(job: "connect-suggestions" | "privacy-retention", ok: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    await client.rpc("record_cron_heartbeat", { p_job: job, p_ok: ok });
  } catch {
    // Absichtlich still.
  }
}
