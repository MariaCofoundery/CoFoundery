import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Das Logo der Programmseite liegt im privaten Bucket `program-logos`. Der
 * Bucket hat keine Policies: Geschrieben und gelesen wird nur mit dem
 * Dienstschluessel - und nur, nachdem die Anwendung geprueft hat, dass die
 * Person die Organisation fuehrt (Schreiben) oder die Seite veroeffentlicht
 * ist (Lesen).
 */
export const PROGRAM_LOGO_BUCKET = "program-logos";

export function programStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
