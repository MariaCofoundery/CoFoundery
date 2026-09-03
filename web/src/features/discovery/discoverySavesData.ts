import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getActiveDiscoveryProfilesByIds } from "@/features/discovery/discoveryData";
import {
  projectVisibleSavedDiscoveryCandidates,
  type SavedDiscoveryCandidate,
} from "@/features/discovery/discoverySavedProjection";

type SupabaseError = { message?: string | null };
type SaveRow = { saved_profile_id: string; created_at: string };
type SavesClient = {
  from: (table: string) => unknown;
};
type SavesSelect = {
  eq: (column: string, value: unknown) => SavesSelect;
  order: (column: string, options?: { ascending?: boolean }) => SavesSelect;
  then: Promise<{ data: SaveRow[] | null; error: SupabaseError | null }>["then"];
};
type SavesMutation = {
  upsert: (
    values: Record<string, unknown>,
    options: { onConflict: string; ignoreDuplicates: boolean }
  ) => PromiseLike<{ error: SupabaseError | null }>;
  delete: () => {
    eq: (column: string, value: unknown) => {
      eq: (column: string, value: unknown) => PromiseLike<{ error: SupabaseError | null }>;
    };
  };
};

function assertId(value: string, errorCode: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(errorCode);
  return normalized;
}

async function resolveClient(client?: SavesClient) {
  return client ?? createClient();
}

function savesTable(client: SavesClient) {
  return client.from("founder_discovery_saves") as {
    select: (columns: string) => SavesSelect;
  } & SavesMutation;
}

export async function getOwnDiscoverySaves(
  ownerUserId: string,
  client?: SavesClient
): Promise<SaveRow[]> {
  const owner = assertId(ownerUserId, "discovery_save_missing_owner");
  const supabase = await resolveClient(client);
  const { data, error } = await savesTable(supabase)
    .select("saved_profile_id, created_at")
    .eq("owner_user_id", owner)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message ?? "discovery_saves_load_failed");
  return data ?? [];
}

export async function getOwnSavedDiscoveryProfileIds(
  ownerUserId: string,
  client?: SavesClient
): Promise<Set<string>> {
  const rows = await getOwnDiscoverySaves(ownerUserId, client);
  return new Set(rows.map((row) => row.saved_profile_id));
}

export async function getOwnSavedDiscoveryCandidates(
  ownerUserId: string,
  client?: SavesClient
): Promise<SavedDiscoveryCandidate[]> {
  const rows = await getOwnDiscoverySaves(ownerUserId, client);
  const profiles = await getActiveDiscoveryProfilesByIds(
    rows.map((row) => row.saved_profile_id),
    client
  );
  return projectVisibleSavedDiscoveryCandidates(rows, profiles);
}

export async function saveDiscoveryProfile(
  ownerUserId: string,
  profileId: string,
  client?: SavesClient
): Promise<void> {
  const owner = assertId(ownerUserId, "discovery_save_missing_owner");
  const target = assertId(profileId, "discovery_save_missing_profile");
  const supabase = await resolveClient(client);
  const { error } = await savesTable(supabase).upsert(
    { owner_user_id: owner, saved_profile_id: target },
    { onConflict: "owner_user_id,saved_profile_id", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message ?? "discovery_save_failed");
}

export async function unsaveDiscoveryProfile(
  ownerUserId: string,
  profileId: string,
  client?: SavesClient
): Promise<void> {
  const owner = assertId(ownerUserId, "discovery_save_missing_owner");
  const target = assertId(profileId, "discovery_save_missing_profile");
  const supabase = await resolveClient(client);
  const { error } = await savesTable(supabase)
    .delete()
    .eq("owner_user_id", owner)
    .eq("saved_profile_id", target);
  if (error) throw new Error(error.message ?? "discovery_unsave_failed");
}
