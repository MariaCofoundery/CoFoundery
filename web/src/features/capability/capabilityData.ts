import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CapabilityArea,
  CapabilityEntry,
  CapabilityFamily,
  DisclosedCapabilityRow,
} from "./capabilityTypes";

/**
 * Das Vokabular liegt in der Datenbank, nicht als Konstante im Code - so gibt
 * es genau eine Wahrheit und die Eintraege haben echte Fremdschluessel.
 * Anzeigetexte kommen aus i18n, geschluesselt ueber die IDs.
 *
 * 9 Familien und 43 Bereiche sind wenige Zeilen; die Abfrage ist billig.
 */
export async function getCapabilityVocabulary(client: SupabaseClient) {
  const [families, areas] = await Promise.all([
    client.from("capability_families").select("family_id,sort_order").order("sort_order"),
    client.from("capability_areas").select("area_id,family_id,sort_order").order("sort_order"),
  ]);

  return {
    families: (families.data ?? []) as CapabilityFamily[],
    areas: (areas.data ?? []) as CapabilityArea[],
  };
}

/**
 * Die eigenen Eintraege samt Belegen. person_capability_* ist owner-only, die
 * RLS filtert also bereits auf die aufrufende Person; die user_id-Bedingung
 * steht trotzdem da, damit die Absicht im Code lesbar bleibt.
 */
export async function getOwnCapabilityEntries(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("person_capability_entries")
    .select("id,area_id,application_level,ownership_wish,person_capability_evidence(id,narrative)")
    .eq("user_id", userId);

  if (error) return [];

  return (data ?? []).map((row) => {
    const raw = row as {
      id: string;
      area_id: string;
      application_level: number | null;
      ownership_wish: string | null;
      person_capability_evidence: { id: string; narrative: string }[] | null;
    };
    return {
      id: raw.id,
      area_id: raw.area_id,
      application_level: raw.application_level,
      ownership_wish: raw.ownership_wish,
      evidence: raw.person_capability_evidence ?? [],
    } as CapabilityEntry;
  });
}

/**
 * Die freigegebene Capability-Sicht auf eine ANDERE Person.
 *
 * Die Bedingungen prueft die Datenbank in get_disclosed_capability, damit die
 * Zusage an einer Stelle steht: aktives Kontextprofil, Freigabestufe
 * mindestens `areas`, und fuer die Tiefe zusaetzlich eine angenommene
 * Verbindung. Kommt eine leere Liste zurueck, wird nichts angezeigt - kein
 * leerer Block, kein Hinweis. Ein sichtbarer Leerplatz wuerde aus einem
 * fehlenden Eintrag eine Aussage machen.
 */
export async function getDisclosedCapability(
  client: SupabaseClient,
  userId: string,
  context: "discovery" | "connect"
) {
  const { data, error } = await client.rpc("get_disclosed_capability", {
    p_user_id: userId,
    p_context: context,
  });

  if (error) return [];
  return (data ?? []) as DisclosedCapabilityRow[];
}
