import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Die kanonische Identitaetszeile eines Menschen. Jede registrierte Person hat
 * genau eine, angelegt per Trigger auf auth.users.
 *
 * Ein leeres Feld bedeutet ausschliesslich, dass noch nichts eingetragen wurde
 * - der Kern enthaelt keine geratenen Werte aus Auth-Metadaten.
 *
 * person_core ist owner-only. Fuer die Anzeige ANDERER Menschen bleiben die
 * Publikationszeilen (founder_discovery_profiles, network_profiles) die
 * Quelle, weil dort die Sichtbarkeitsentscheidung getroffen wurde.
 */
export type PersonCore = {
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location_region: string | null;
  remote_mode: string | null;
  expertise: string[] | null;
  industries: string[] | null;
};

const PERSON_CORE_COLUMNS =
  "display_name,headline,bio,location_region,remote_mode,expertise,industries";

export async function getPersonCore(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("person_core")
    .select(PERSON_CORE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as PersonCore | null) ?? null;
}
