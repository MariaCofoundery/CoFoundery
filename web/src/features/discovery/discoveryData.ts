import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  normalizeDiscoveryPreferencesInput,
  normalizeDiscoveryProfileInput,
  normalizeMustHaves,
  normalizePriorityWeights,
  getDiscoveryProfilePublishIssues,
} from "@/features/discovery/discoveryValidation";
import {
  buildDiscoveryCandidateRecommendations,
} from "@/features/discovery/discoveryRecommendation";
import {
  getDiscoveryAssessmentSignalAvailabilityForCandidates,
} from "@/features/discovery/discoveryAssessmentSignals";
import { resolveDiscoveryAssessmentConsentState } from "@/features/discovery/discoveryConsent";
import type {
  DiscoveryCandidate,
  DiscoveryCommitmentLevel,
  DiscoveryFounderRole,
  DiscoveryMustHaves,
  DiscoveryPreferencesInput,
  DiscoveryPriorityWeights,
  DiscoveryProfileInput,
  DiscoveryProfilePreview,
  DiscoveryRemoteMode,
  DiscoveryStatus,
  DiscoveryVentureGoal,
  DiscoveryVentureStage,
  FounderDiscoveryProfile,
  FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";

type SupabaseLikeClient = {
  from: (table: string) => unknown;
};

type SupabaseError = {
  message?: string | null;
};

type QueryResult<T> = Promise<{ data: T | null; error: SupabaseError | null }>;
type MutationResult<T> = Promise<{ data: T | null; error: SupabaseError | null }>;

type SelectBuilder<T> = {
  eq: (column: string, value: unknown) => SelectBuilder<T>;
  neq: (column: string, value: unknown) => SelectBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => SelectBuilder<T>;
  limit: (count: number) => SelectBuilder<T>;
  maybeSingle: () => QueryResult<T>;
  then: Promise<{ data: T[] | null; error: SupabaseError | null }>["then"];
  catch: Promise<{ data: T[] | null; error: SupabaseError | null }>["catch"];
  finally: Promise<{ data: T[] | null; error: SupabaseError | null }>["finally"];
};

type TableAccess<T> = {
  select: (columns: string) => SelectBuilder<T>;
  upsert: (
    values: Record<string, unknown>,
    options: { onConflict: string }
  ) => {
    select: (columns: string) => {
      single: () => MutationResult<T>;
    };
  };
};

type FounderDiscoveryProfileRow = {
  id: string;
  user_id: string;
  status: string;
  display_name: string;
  headline: string;
  bio: string;
  own_roles: string[];
  seeking_roles: string[];
  industries: string[];
  location_label: string | null;
  remote_mode: string;
  availability_hours_per_week: number | null;
  commitment_level: string;
  venture_stage: string;
  venture_goal: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type FounderSearchPreferencesRow = {
  id: string;
  user_id: string;
  priority_weights: unknown;
  must_haves: unknown;
  include_assessment_signals: boolean;
  assessment_signals_consented_at: string | null;
  created_at: string;
  updated_at: string;
};

const DISCOVERY_PROFILE_COLUMNS = [
  "id",
  "user_id",
  "status",
  "display_name",
  "headline",
  "bio",
  "own_roles",
  "seeking_roles",
  "industries",
  "location_label",
  "remote_mode",
  "availability_hours_per_week",
  "commitment_level",
  "venture_stage",
  "venture_goal",
  "published_at",
  "created_at",
  "updated_at",
].join(", ");

const DISCOVERY_PREFERENCES_COLUMNS = [
  "id",
  "user_id",
  "priority_weights",
  "must_haves",
  "include_assessment_signals",
  "assessment_signals_consented_at",
  "created_at",
  "updated_at",
].join(", ");

function assertUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("discovery_missing_user_id");
  }
  return normalized;
}

function assertProfileId(profileId: string) {
  const normalized = profileId.trim();
  if (!normalized) {
    throw new Error("discovery_missing_profile_id");
  }
  return normalized;
}

async function resolveClient(client?: SupabaseLikeClient): Promise<SupabaseLikeClient> {
  if (client) {
    return client;
  }
  return createClient();
}

function getProfilesTable(client: SupabaseLikeClient) {
  return client.from("founder_discovery_profiles") as unknown as TableAccess<FounderDiscoveryProfileRow>;
}

function getPreferencesTable(client: SupabaseLikeClient) {
  return client.from("founder_search_preferences") as unknown as TableAccess<FounderSearchPreferencesRow>;
}

function mapProfileRow(row: FounderDiscoveryProfileRow): FounderDiscoveryProfile {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status as DiscoveryStatus,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    ownRoles: row.own_roles as DiscoveryFounderRole[],
    seekingRoles: row.seeking_roles as DiscoveryFounderRole[],
    industries: row.industries,
    locationLabel: row.location_label,
    remoteMode: row.remote_mode as DiscoveryRemoteMode,
    availabilityHoursPerWeek: row.availability_hours_per_week,
    commitmentLevel: row.commitment_level as DiscoveryCommitmentLevel,
    ventureStage: row.venture_stage as DiscoveryVentureStage,
    ventureGoal: row.venture_goal as DiscoveryVentureGoal,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPreferencesRow(row: FounderSearchPreferencesRow): FounderSearchPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    priorityWeights: normalizePriorityWeights(row.priority_weights) as DiscoveryPriorityWeights,
    mustHaves: normalizeMustHaves(row.must_haves) as DiscoveryMustHaves,
    includeAssessmentSignals: row.include_assessment_signals === true,
    assessmentSignalsConsentedAt: row.assessment_signals_consented_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDiscoveryProfilePreview(profile: FounderDiscoveryProfile): DiscoveryProfilePreview {
  return {
    id: profile.id,
    displayName: profile.displayName,
    headline: profile.headline,
    bio: profile.bio,
    ownRoles: profile.ownRoles,
    seekingRoles: profile.seekingRoles,
    industries: profile.industries,
    locationLabel: profile.locationLabel,
    remoteMode: profile.remoteMode,
    availabilityHoursPerWeek: profile.availabilityHoursPerWeek,
    commitmentLevel: profile.commitmentLevel,
    ventureStage: profile.ventureStage,
    ventureGoal: profile.ventureGoal,
    publishedAt: profile.publishedAt,
  };
}

export async function getOwnDiscoveryProfile(
  userId: string,
  client?: SupabaseLikeClient
): Promise<FounderDiscoveryProfile | null> {
  const normalizedUserId = assertUserId(userId);
  const supabase = await resolveClient(client);
  const { data, error } = await getProfilesTable(supabase)
    .select(DISCOVERY_PROFILE_COLUMNS)
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "discovery_profile_load_failed");
  }

  return data ? mapProfileRow(data) : null;
}

export async function upsertOwnDiscoveryProfile(
  userId: string,
  input: DiscoveryProfileInput,
  client?: SupabaseLikeClient
): Promise<FounderDiscoveryProfile> {
  const normalizedUserId = assertUserId(userId);
  const normalized = normalizeDiscoveryProfileInput(input);
  if (normalized.status === "active") {
    const issues = getDiscoveryProfilePublishIssues(normalized);
    if (issues.length > 0) {
      throw new Error(`discovery_profile_not_publishable:${issues.join("|")}`);
    }
  }

  const supabase = await resolveClient(client);
  const now = new Date().toISOString();
  const nextPublishedAt =
    normalized.status === "active" ? normalized.publishedAt ?? now : normalized.publishedAt;
  const { data, error } = await getProfilesTable(supabase)
    .upsert(
      {
        user_id: normalizedUserId,
        status: normalized.status,
        display_name: normalized.displayName,
        headline: normalized.headline,
        bio: normalized.bio,
        own_roles: normalized.ownRoles,
        seeking_roles: normalized.seekingRoles,
        industries: normalized.industries,
        location_label: normalized.locationLabel,
        remote_mode: normalized.remoteMode,
        availability_hours_per_week: normalized.availabilityHoursPerWeek,
        commitment_level: normalized.commitmentLevel,
        venture_stage: normalized.ventureStage,
        venture_goal: normalized.ventureGoal,
        published_at: nextPublishedAt,
      },
      { onConflict: "user_id" }
    )
    .select(DISCOVERY_PROFILE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "discovery_profile_save_failed");
  }

  return mapProfileRow(data);
}

export async function getOwnSearchPreferences(
  userId: string,
  client?: SupabaseLikeClient
): Promise<FounderSearchPreferences | null> {
  const normalizedUserId = assertUserId(userId);
  const supabase = await resolveClient(client);
  const { data, error } = await getPreferencesTable(supabase)
    .select(DISCOVERY_PREFERENCES_COLUMNS)
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "discovery_preferences_load_failed");
  }

  return data ? mapPreferencesRow(data) : null;
}

export async function upsertOwnSearchPreferences(
  userId: string,
  input: DiscoveryPreferencesInput,
  client?: SupabaseLikeClient
): Promise<FounderSearchPreferences> {
  const normalizedUserId = assertUserId(userId);
  const normalized = normalizeDiscoveryPreferencesInput(input);
  const supabase = await resolveClient(client);
  const existing = await getOwnSearchPreferences(normalizedUserId, supabase);
  const consentState = resolveDiscoveryAssessmentConsentState({
    includeAssessmentSignals: normalized.includeAssessmentSignals === true,
    existingConsentedAt: existing?.assessmentSignalsConsentedAt ?? null,
    now: new Date().toISOString(),
  });
  const { data, error } = await getPreferencesTable(supabase)
    .upsert(
      {
        user_id: normalizedUserId,
        priority_weights: normalized.priorityWeights,
        must_haves: normalized.mustHaves,
        include_assessment_signals: consentState.includeAssessmentSignals,
        assessment_signals_consented_at: consentState.assessmentSignalsConsentedAt,
      },
      { onConflict: "user_id" }
    )
    .select(DISCOVERY_PREFERENCES_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "discovery_preferences_save_failed");
  }

  return mapPreferencesRow(data);
}

export async function getActiveDiscoveryProfileById(
  profileId: string,
  client?: SupabaseLikeClient
): Promise<FounderDiscoveryProfile | null> {
  const normalizedProfileId = assertProfileId(profileId);
  const supabase = await resolveClient(client);
  const { data, error } = await getProfilesTable(supabase)
    .select(DISCOVERY_PROFILE_COLUMNS)
    .eq("id", normalizedProfileId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "discovery_active_profile_load_failed");
  }

  return data ? mapProfileRow(data) : null;
}

async function prepareDiscoveryAssessmentSignalAvailability(
  ownerUserId: string,
  candidateProfiles: FounderDiscoveryProfile[]
) {
  if (candidateProfiles.length === 0) {
    return;
  }

  try {
    await getDiscoveryAssessmentSignalAvailabilityForCandidates({
      ownerUserId,
      candidateUserIds: candidateProfiles.map((profile) => profile.userId),
    });
  } catch (error) {
    console.warn("discovery assessment availability preparation failed", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function getDiscoveryCandidatesForCurrentUser(
  userId: string,
  client?: SupabaseLikeClient
): Promise<DiscoveryCandidate[]> {
  const normalizedUserId = assertUserId(userId);
  const supabase = await resolveClient(client);
  const ownProfile = await getOwnDiscoveryProfile(normalizedUserId, supabase);
  if (!ownProfile || ownProfile.status !== "active") {
    return [];
  }
  const preferences = await getOwnSearchPreferences(normalizedUserId, supabase);

  const { data, error } = await getProfilesTable(supabase)
    .select(DISCOVERY_PROFILE_COLUMNS)
    .eq("status", "active")
    .neq("user_id", normalizedUserId)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message ?? "discovery_candidates_load_failed");
  }

  const candidateProfiles = (data ?? []).map(mapProfileRow);
  await prepareDiscoveryAssessmentSignalAvailability(normalizedUserId, candidateProfiles);

  return buildDiscoveryCandidateRecommendations({
    ownProfile,
    candidateProfiles,
    preferences,
  });
}
