import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Capability-Matching-Freigabe: Darf Made2Found Bereich, Erfahrung und
 * Verantwortungswunsch einer Person intern für Founder-Vorschläge verwenden?
 *
 * GETRENNT von `capability_disclosure` (wer die Fähigkeiten SEHEN darf). Keine
 * der beiden Angaben wird aus der anderen gelesen. Gespeichert in
 * `person_core.capability_matching_allowed` (Migration 20261128120000).
 *
 * FAIL CLOSED: fehlende Zeile, fehlender Wert, Ladefehler -> nicht erlaubt.
 *
 * Der Typ ist bewusst „gestempelt“: Ein Matching-Pfad bekommt die Freigabe aus
 * diesem Modul (Datenbank), nicht als frei übergebenen Boolean aus einer
 * Oberfläche.
 *
 * Für die eigene Person genügt der normale Server-Client (RLS: nur die Person
 * selbst liest ihre Zeile). Für Matching über andere Personen braucht der
 * Aufrufer einen serverseitigen Service-Role-Client - kein anderer Nutzer kann
 * den Wert lesen.
 *
 * Noch an keinen Produktpfad angeschlossen: FIND nutzt die Matching-Engine nicht.
 */
declare const permissionBrand: unique symbol;

export type CapabilityMatchingPermission = Readonly<{
  allowed: boolean;
  readonly [permissionBrand]: true;
}>;

type PermissionClient = Pick<SupabaseClient, "from">;

/** Liest die Freigabe aus einer person_core-Zeile. Nur `true` ist eine Freigabe. */
export function capabilityMatchingPermissionFromRow(row: unknown): CapabilityMatchingPermission {
  const allowed =
    row !== null && typeof row === "object" && (row as Record<string, unknown>).capability_matching_allowed === true;
  return { allowed } as CapabilityMatchingPermission;
}

export const CAPABILITY_MATCHING_DENIED = capabilityMatchingPermissionFromRow(null);

export async function getCapabilityMatchingPermission(
  client: PermissionClient,
  userId: string | null | undefined,
): Promise<CapabilityMatchingPermission> {
  if (!userId) return CAPABILITY_MATCHING_DENIED;
  try {
    const { data, error } = await client
      .from("person_core")
      .select("capability_matching_allowed")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return CAPABILITY_MATCHING_DENIED;
    return capabilityMatchingPermissionFromRow(data);
  } catch {
    return CAPABILITY_MATCHING_DENIED;
  }
}

/** Mehrere Personen in einer Abfrage; jede nicht gefundene oder fehlerhafte gilt als nicht freigegeben. */
export async function getCapabilityMatchingPermissions(
  client: PermissionClient,
  userIds: readonly string[],
): Promise<ReadonlyMap<string, CapabilityMatchingPermission>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const result = new Map<string, CapabilityMatchingPermission>(ids.map((id) => [id, CAPABILITY_MATCHING_DENIED]));
  if (ids.length === 0) return result;
  try {
    const { data, error } = await client
      .from("person_core")
      .select("user_id, capability_matching_allowed")
      .in("user_id", ids);
    if (error || !Array.isArray(data)) return result;
    for (const row of data as { user_id?: unknown }[]) {
      if (typeof row.user_id === "string" && result.has(row.user_id)) {
        result.set(row.user_id, capabilityMatchingPermissionFromRow(row));
      }
    }
    return result;
  } catch {
    return result;
  }
}
