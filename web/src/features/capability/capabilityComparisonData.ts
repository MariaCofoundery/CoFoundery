import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getDisclosedCapability, getOwnCapabilityEntries } from "./capabilityData";
import type { ComparisonSide } from "./capabilityComparison";

/**
 * Wer verglichen werden darf, und woher die zwei Seiten kommen.
 *
 * Der Vergleich braucht eine angenommene Verbindung - nicht als
 * Produktkomfort, sondern weil er sonst nicht geht: Die Tiefe der anderen
 * Person liefert `get_disclosed_capability` nur bei angenommener Verbindung
 * und ausreichender Freigabestufe. Ohne beides kaeme ueberall `null` zurueck
 * und der Vergleich haette nichts zu sagen.
 *
 * Die eigene Seite kommt vollstaendig aus den eigenen Eintraegen, die andere
 * ausschliesslich aus der freigegebenen Sicht. Es gibt hier bewusst keinen
 * Weg, der die Freigabeleiter umgeht.
 */

export type ComparisonContext = "connect" | "discovery";

export type ComparablePerson = {
  userId: string;
  displayName: string;
  context: ComparisonContext;
};

/**
 * Die Menschen, mit denen ein Vergleich moeglich ist: angenommene Verbindungen
 * aus Connect und aus Discovery.
 *
 * Namen kommen aus dem jeweiligen Kontextprofil, nicht aus `person_core` - der
 * Kern ist owner-only, und das soll er bleiben.
 */
export async function getComparablePeople(
  client: SupabaseClient,
  userId: string
): Promise<ComparablePerson[]> {
  const [connectRows, discoveryRows] = await Promise.all([
    client
      .from("network_contact_requests")
      .select("sender_user_id,recipient_user_id")
      .eq("status", "accepted")
      .or(`sender_user_id.eq.${userId},recipient_user_id.eq.${userId}`),
    client
      .from("discovery_intro_requests")
      .select("requester_user_id,recipient_user_id")
      .eq("status", "accepted")
      .or(`requester_user_id.eq.${userId},recipient_user_id.eq.${userId}`),
  ]);

  const other = (a: string, b: string) => (a === userId ? b : a);

  const connectIds = new Set(
    (connectRows.data ?? []).map((row) =>
      other(row.sender_user_id as string, row.recipient_user_id as string)
    )
  );
  const discoveryIds = new Set(
    (discoveryRows.data ?? []).map((row) =>
      other(row.requester_user_id as string, row.recipient_user_id as string)
    )
  );
  connectIds.delete(userId);
  discoveryIds.delete(userId);

  const [connectProfiles, discoveryProfiles] = await Promise.all([
    connectIds.size
      ? client
          .from("network_profiles")
          .select("user_id,display_name")
          .in("user_id", [...connectIds])
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
    discoveryIds.size
      ? client
          .from("founder_discovery_profiles")
          .select("user_id,display_name")
          .in("user_id", [...discoveryIds])
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
  ]);

  const people = new Map<string, ComparablePerson>();

  // Discovery zuerst, Connect danach: Wer ueber beide Wege verbunden ist,
  // wird im Connect-Kontext verglichen, weil dort die Verbindung
  // ausdruecklicher ist.
  for (const row of (discoveryProfiles.data ?? []) as { user_id: string; display_name: string | null }[]) {
    people.set(row.user_id, {
      userId: row.user_id,
      displayName: row.display_name?.trim() || "",
      context: "discovery",
    });
  }
  for (const row of (connectProfiles.data ?? []) as { user_id: string; display_name: string | null }[]) {
    people.set(row.user_id, {
      userId: row.user_id,
      displayName: row.display_name?.trim() || "",
      context: "connect",
    });
  }

  // Ohne Namen keine Zeile: Eine Vergleichsauswahl mit leerem Eintrag waere
  // ein Kontakt, den niemand zuordnen kann.
  return [...people.values()]
    .filter((person) => person.displayName.length > 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Ob mit dieser Person verglichen werden darf, und in welchem Kontext.
 * Wird von der Seite geprueft, bevor irgendetwas geladen wird - eine
 * beliebige user_id in der URL soll nichts ergeben.
 */
export async function findComparablePerson(
  client: SupabaseClient,
  userId: string,
  otherUserId: string
) {
  if (otherUserId === userId) return null;
  const people = await getComparablePeople(client, userId);
  return people.find((person) => person.userId === otherUserId) ?? null;
}

/**
 * Die zwei Seiten. Die eigene vollstaendig, die andere nur so weit, wie sie
 * freigegeben ist - Stufe und Wunsch koennen dort null sein, und der
 * Vergleich macht daraus `noBasis` statt einer Aussage.
 */
export async function getComparisonSides(
  client: SupabaseClient,
  userId: string,
  person: ComparablePerson
): Promise<{ own: ComparisonSide[]; other: ComparisonSide[] }> {
  const [ownEntries, disclosed] = await Promise.all([
    getOwnCapabilityEntries(client, userId),
    getDisclosedCapability(client, person.userId, person.context),
  ]);

  return {
    own: ownEntries.map((entry) => ({
      areaId: entry.area_id,
      applicationLevel: entry.application_level,
      ownershipWish: entry.ownership_wish,
    })),
    other: disclosed.map((row) => ({
      areaId: row.area_id,
      applicationLevel: row.application_level,
      ownershipWish: row.ownership_wish,
    })),
  };
}
