import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { capabilityMatchingPermissionFromRow } from "@/features/capability/capabilityMatchingPermission";
import type { CapabilityDisclosure } from "@/features/capability/capabilityTypes";
import type { DiscoveryMustHaves, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { findPersonFromDiscovery, type CapabilityRowLike } from "@/lib/matching/v01/adapters";
import type { FindMustHavesInput, FindPersonInput } from "@/lib/matching/v01/types";

/**
 * Gemeinsamer Aufbau der Matching-v0.1-Eingabe einer Person für die FIND-Shadows
 * (Seite: findMatchingShadow.ts, global: findMatchingGlobalShadow.ts).
 *
 * Branchen, Expertise, Ort und Remote kommen aus person_core (Spec §4). Capability
 * geht nur mit ausdrücklicher Matching-Freigabe hinein; die Disclosure wirkt nur auf
 * Reasons. Workstyle, Research und die vier Produktfelder kommen hier nicht vor.
 */

export const PERSON_CORE_MATCHING_COLUMNS =
  "user_id, industries, expertise, location_region, remote_mode, capability_disclosure, capability_matching_allowed";

export type MatchingCoreRow = {
  user_id: string;
  industries: string[] | null;
  expertise: string[] | null;
  location_region: string | null;
  remote_mode: string | null;
  capability_disclosure: string | null;
  capability_matching_allowed: boolean | null;
};

export type CapabilityEntryRow = CapabilityRowLike & { user_id: string };

export type FindMatchingPersonParts = Readonly<{
  core: MatchingCoreRow | undefined;
  isFounder: boolean;
  /** Nur Einträge von Personen mit Matching-Freigabe werden überhaupt geladen. */
  entries: readonly CapabilityEntryRow[];
  /** Angenommene Verbindung zur betrachtenden Person - nur für die Tiefen-Sichtbarkeit von Reasons. */
  hasContact: boolean;
}>;

export function hasMatchingPermission(core: MatchingCoreRow | undefined): boolean {
  return capabilityMatchingPermissionFromRow(core ?? null).allowed;
}

export function buildFindPersonInput(
  profile: FounderDiscoveryProfile,
  mustHaves: DiscoveryMustHaves | FindMustHavesInput | null,
  parts: FindMatchingPersonParts,
): FindPersonInput {
  const core = parts.core;
  return findPersonFromDiscovery({
    // Fehlt die person_core-Zeile, bleiben die Profilwerte.
    profile: core
      ? {
          ...profile,
          industries: core.industries ?? [],
          expertise: core.expertise ?? [],
          locationRegion: core.location_region,
          remoteMode: (core.remote_mode ?? profile.remoteMode) as FounderDiscoveryProfile["remoteMode"],
        }
      : profile,
    mustHaves,
    isFounder: parts.isFounder,
    capabilityRows: parts.entries.filter((e) => e.user_id === profile.userId),
    capabilityDisclosure: (core?.capability_disclosure ?? null) as CapabilityDisclosure | null,
    hasContact: parts.hasContact,
    capabilityMatchingPermission: capabilityMatchingPermissionFromRow(core ?? null),
  });
}

/** FIND nutzt kein IDF (Spec §11.2); das Ergebnis trägt die Version trotzdem mit. */
export const FIND_SHADOW_IDF_CORPUS_VERSION = "none-find-does-not-use-idf";

export type ShadowClient = Pick<SupabaseClient, "from">;

/** Service-Role-Client für die Shadows; ohne Konfiguration null (Shadow meldet dann service_unavailable). */
export function createShadowServiceClient(): ShadowClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
