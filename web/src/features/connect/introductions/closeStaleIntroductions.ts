import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Schliesst unbeantwortete Vorstellungen nach 14 Tagen still (Funktion close_stale_introductions, nur fuer den Dienst-Schluessel). Nur Zahlen, keine Namen. */
export async function closeStaleIntroductions(): Promise<{ ok: true; closed: number } | { ok: false }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return { ok: false };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.rpc("close_stale_introductions");
  return error ? { ok: false } : { ok: true, closed: typeof data === "number" ? data : 0 };
}
