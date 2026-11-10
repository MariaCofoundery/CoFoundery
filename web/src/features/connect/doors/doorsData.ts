import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDoorCloseness, typesForFilter, type Door, type DoorFilters, type DoorResult } from "@/features/connect/doors/doorCatalog";

type Row = { door_id?: string; id?: string; user_id?: string; display_name?: string; headline?: string | null; type_key: string; other_label: string | null; sector_key: string | null; region: string | null; closeness: string; note: string | null; doors_open?: boolean };

const doorOf = (row: Row): Door => ({ id: (row.door_id ?? row.id) as string, typeKey: row.type_key, otherLabel: row.other_label, sectorKey: row.sector_key, region: row.region, closeness: isDoorCloseness(row.closeness) ? row.closeness : "via", note: row.note });

/** Die eigenen Tueren (Zeilensicherheit: nur die eigenen). */
export async function listOwnDoors(client: SupabaseClient, userId: string): Promise<Door[]> {
  const { data } = await client.from("network_doors").select("id, type_key, other_label, sector_key, region, closeness, note").eq("user_id", userId).order("created_at");
  return ((data ?? []) as Row[]).map(doorOf);
}

/** Tueren anderer Mitglieder, neueste zuerst. Nie nach Passung sortiert. */
export async function searchDoors(client: SupabaseClient, filters: DoorFilters, offset = 0): Promise<DoorResult[]> {
  const { data } = await client.rpc("search_network_doors", { p_types: typesForFilter(filters), p_sector: filters.sector ?? "", p_region: filters.region, p_offset: offset });
  return ((data ?? []) as Row[]).map((row) => ({ ...doorOf(row), userId: row.user_id as string, displayName: row.display_name ?? "", headline: row.headline ?? null, doorsOpen: row.doors_open !== false }));
}

/** Die Tueren einer sichtbaren Person (fuer ihre Profilseite). */
export async function listDoorsOf(client: SupabaseClient, userId: string): Promise<(Door & { doorsOpen: boolean })[]> {
  const { data } = await client.rpc("list_network_doors_of", { p_user_id: userId });
  return ((data ?? []) as Row[]).map((row) => ({ ...doorOf(row), doorsOpen: row.doors_open !== false }));
}

export async function getDoor(client: SupabaseClient, userId: string, doorId: string): Promise<(Door & { doorsOpen: boolean }) | null> {
  return (await listDoorsOf(client, userId)).find((door) => door.id === doorId) ?? null;
}
