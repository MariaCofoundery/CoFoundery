import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getPrioritizedDiscoveryAlignmentDimensions,
  normalizeDiscoveryAlignmentPreferences,
} from "@/features/discovery/discoveryV2Alignment";
import {
  normalizeDiscoveryPreferencesInput,
  normalizeDiscoveryProfileInput,
  normalizeMustHaves,
  normalizePriorityWeights,
  getDiscoveryProfilePublishIssues,
} from "@/features/discovery/discoveryValidation";
import {
  attachDiscoveryV2AlignmentSignals,
  buildDiscoveryV2Candidate,
} from "@/features/discovery/discoveryV2Search";
import {
  getDiscoveryV2AlignmentSignalsForCandidates,
} from "@/features/discovery/discoveryAssessmentSignals";
import { resolveDiscoveryAssessmentConsentState } from "@/features/discovery/discoveryConsent";
import type {
  DiscoveryCommitmentLevel,
  DiscoveryFounderRole,
  DiscoveryMustHaves,
  DiscoveryPreferencesInput,
  DiscoveryPriorityWeights,
  DiscoveryProfileInput,
  DiscoveryProfilePreview,
  DiscoverySearchPage,
  DiscoveryRemoteMode,
  DiscoverySearchIntent,
  DiscoveryStartHorizon,
  DiscoveryStatus,
  DiscoveryVentureGoal,
  DiscoveryVentureStage,
  FounderDiscoveryProfile,
  FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";

type DiscoveryV2SearchRow = {
  id: string;
  candidate_user_id: string;
  display_name: string;
  headline: string;
  own_roles: DiscoveryFounderRole[];
  seeking_roles: DiscoveryFounderRole[];
  expertise: string[];
  location_region: string | null;
  remote_mode: DiscoveryRemoteMode;
  availability_hours_per_week: number | null;
  commitment_level: DiscoveryCommitmentLevel;
  venture_stage: DiscoveryVentureStage;
  venture_goal: DiscoveryVentureGoal;
  search_intent: DiscoverySearchIntent | null;
  start_horizon: DiscoveryStartHorizon | null;
  published_at: string | null;
  total_count: number | string;
};

type SupabaseLikeClient = {
  from: (table: string) => unknown;
  rpc?: (name: string, args: Record<string, unknown>) => unknown;
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
  expertise: string[];
  industries: string[];
  location_label: string | null;
  location_region: string | null;
  remote_mode: string;
  availability_hours_per_week: number | null;
  commitment_level: string;
  venture_stage: string;
  venture_goal: string;
  search_intent: DiscoverySearchIntent | null;
  start_horizon: DiscoveryStartHorizon | null;
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
  discovery_v2_alignment_enabled: boolean;
  discovery_v2_alignment_dimensions: string[];
  discovery_v2_alignment_preferences: unknown;
  discovery_v2_alignment_consented_at: string | null;
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
  "expertise",
  "industries",
  "location_label",
  "location_region",
  "remote_mode",
  "availability_hours_per_week",
  "commitment_level",
  "venture_stage",
  "venture_goal",
  "search_intent",
  "start_horizon",
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
  "discovery_v2_alignment_enabled",
  "discovery_v2_alignment_dimensions",
  "discovery_v2_alignment_preferences",
  "discovery_v2_alignment_consented_at",
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
    expertise: row.expertise ?? [],
    industries: row.industries,
    locationLabel: row.location_label,
    locationRegion: row.location_region,
    remoteMode: row.remote_mode as DiscoveryRemoteMode,
    availabilityHoursPerWeek: row.availability_hours_per_week,
    commitmentLevel: row.commitment_level as DiscoveryCommitmentLevel,
    ventureStage: row.venture_stage as DiscoveryVentureStage,
    ventureGoal: row.venture_goal as DiscoveryVentureGoal,
    searchIntent: row.search_intent,
    startHorizon: row.start_horizon,
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
    discoveryV2AlignmentEnabled: row.discovery_v2_alignment_enabled === true,
    discoveryV2AlignmentDimensions: normalizeDiscoveryPreferencesInput({
      discoveryV2AlignmentDimensions: row.discovery_v2_alignment_dimensions,
    }).discoveryV2AlignmentDimensions,
    discoveryV2AlignmentPreferences: normalizeDiscoveryAlignmentPreferences(
      row.discovery_v2_alignment_preferences
    ),
    discoveryV2AlignmentConsentedAt: row.discovery_v2_alignment_consented_at,
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
    expertise: profile.expertise,
    industries: profile.industries,
    locationLabel: profile.locationLabel,
    locationRegion: profile.locationRegion,
    remoteMode: profile.remoteMode,
    availabilityHoursPerWeek: profile.availabilityHoursPerWeek,
    commitmentLevel: profile.commitmentLevel,
    ventureStage: profile.ventureStage,
    ventureGoal: profile.ventureGoal,
    searchIntent: profile.searchIntent,
    startHorizon: profile.startHorizon,
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
        expertise: normalized.expertise,
        industries: normalized.industries,
        location_label: normalized.locationLabel,
        location_region: normalized.locationRegion,
        remote_mode: normalized.remoteMode,
        availability_hours_per_week: normalized.availabilityHoursPerWeek,
        commitment_level: normalized.commitmentLevel,
        venture_stage: normalized.ventureStage,
        venture_goal: normalized.ventureGoal,
        search_intent: normalized.searchIntent,
        start_horizon: normalized.startHorizon,
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
  const rawMustHaves =
    input.mustHaves && typeof input.mustHaves === "object" && !Array.isArray(input.mustHaves)
      ? (input.mustHaves as Record<string, unknown>)
      : null;
  const hasV2PracticalInput =
    rawMustHaves != null &&
    [
      "requiredExpertiseAny",
      "required_expertise_any",
      "desiredLocationRegion",
      "desired_location_region",
    ].some((key) => Object.prototype.hasOwnProperty.call(rawMustHaves, key));
  const persistedMustHaves = hasV2PracticalInput
    ? normalized.mustHaves
    : {
        ...normalized.mustHaves,
        requiredExpertiseAny: existing?.mustHaves.requiredExpertiseAny ?? [],
        desiredLocationRegion: existing?.mustHaves.desiredLocationRegion ?? null,
      };
  const consentState = resolveDiscoveryAssessmentConsentState({
    includeAssessmentSignals: normalized.includeAssessmentSignals === true,
    existingConsentedAt: existing?.assessmentSignalsConsentedAt ?? null,
    now: new Date().toISOString(),
  });
  const hasDiscoveryV2AlignmentInput =
    input.discoveryV2AlignmentEnabled !== undefined ||
    input.discoveryV2AlignmentDimensions !== undefined ||
    input.discoveryV2AlignmentPreferences !== undefined;
  const requestedAlignmentPreferences = hasDiscoveryV2AlignmentInput
    ? normalized.discoveryV2AlignmentPreferences
    : existing?.discoveryV2AlignmentPreferences ?? {};
  const requestedAlignmentDimensions =
    Object.keys(requestedAlignmentPreferences).length > 0
      ? getPrioritizedDiscoveryAlignmentDimensions(requestedAlignmentPreferences)
      : hasDiscoveryV2AlignmentInput
        ? normalized.discoveryV2AlignmentDimensions
        : existing?.discoveryV2AlignmentDimensions ?? [];
  const alignmentEnabled = hasDiscoveryV2AlignmentInput
    ? normalized.discoveryV2AlignmentEnabled && requestedAlignmentDimensions.length > 0
    : existing?.discoveryV2AlignmentEnabled === true;
  const alignmentConsentedAt = alignmentEnabled
    ? existing?.discoveryV2AlignmentConsentedAt ?? new Date().toISOString()
    : null;
  const { data, error } = await getPreferencesTable(supabase)
    .upsert(
      {
        user_id: normalizedUserId,
        priority_weights: normalized.priorityWeights,
        must_haves: persistedMustHaves,
        include_assessment_signals: consentState.includeAssessmentSignals,
        assessment_signals_consented_at: consentState.assessmentSignalsConsentedAt,
        discovery_v2_alignment_enabled: alignmentEnabled,
        discovery_v2_alignment_dimensions: alignmentEnabled
          ? requestedAlignmentDimensions
          : [],
        discovery_v2_alignment_preferences: alignmentEnabled
          ? requestedAlignmentPreferences
          : {},
        discovery_v2_alignment_consented_at: alignmentConsentedAt,
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

export async function upsertOwnDiscoveryV2SearchPreferences(
  userId: string,
  input: {
    requiredRolesAny: unknown;
    requiredExpertiseAny: unknown;
    desiredLocationRegion: unknown;
    acceptedRemoteModes: unknown;
    minimumAvailabilityHoursPerWeek: unknown;
    discoveryV2AlignmentEnabled?: unknown;
    discoveryV2AlignmentDimensions?: unknown;
    discoveryV2AlignmentPreferences?: unknown;
  },
  client?: SupabaseLikeClient
) {
  const normalizedUserId = assertUserId(userId);
  const supabase = await resolveClient(client);
  const existing = await getOwnSearchPreferences(normalizedUserId, supabase);
  const practicalMustHaves = normalizeMustHaves({
    requiredRolesAny: input.requiredRolesAny,
    requiredExpertiseAny: input.requiredExpertiseAny,
    desiredLocationRegion: input.desiredLocationRegion,
    acceptedRemoteModes: input.acceptedRemoteModes,
    minimumAvailabilityHoursPerWeek: input.minimumAvailabilityHoursPerWeek,
  });

  return upsertOwnSearchPreferences(
    normalizedUserId,
    {
      priorityWeights: existing?.priorityWeights ?? {},
      mustHaves: {
        ...(existing?.mustHaves ?? normalizeMustHaves(null)),
        requiredRolesAny: practicalMustHaves.requiredRolesAny,
        requiredExpertiseAny: practicalMustHaves.requiredExpertiseAny,
        desiredLocationRegion: practicalMustHaves.desiredLocationRegion,
        acceptedRemoteModes: practicalMustHaves.acceptedRemoteModes,
        minimumAvailabilityHoursPerWeek:
          practicalMustHaves.minimumAvailabilityHoursPerWeek,
      },
      includeAssessmentSignals: existing?.includeAssessmentSignals ?? false,
      ...(input.discoveryV2AlignmentEnabled !== undefined ||
      input.discoveryV2AlignmentDimensions !== undefined ||
      input.discoveryV2AlignmentPreferences !== undefined
        ? {
            discoveryV2AlignmentEnabled: input.discoveryV2AlignmentEnabled,
            discoveryV2AlignmentDimensions: input.discoveryV2AlignmentDimensions,
            discoveryV2AlignmentPreferences: input.discoveryV2AlignmentPreferences,
          }
        : {}),
    },
    supabase
  );
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

export async function getDiscoveryV2AlignmentContextForCandidate(
  ownerUserId: string,
  candidateUserId: string,
  client?: SupabaseLikeClient
) {
  const normalizedOwnerUserId = assertUserId(ownerUserId);
  const normalizedCandidateUserId = assertUserId(candidateUserId);
  const preferences = await getOwnSearchPreferences(normalizedOwnerUserId, client);
  if (
    !preferences?.discoveryV2AlignmentEnabled ||
    preferences.discoveryV2AlignmentDimensions.length === 0
  ) {
    return { preferences: preferences?.discoveryV2AlignmentPreferences ?? {}, signals: [] };
  }

  const signals = await getDiscoveryV2AlignmentSignalsForCandidates({
    ownerUserId: normalizedOwnerUserId,
    candidateUserIds: [normalizedCandidateUserId],
    prioritizedDimensions: preferences.discoveryV2AlignmentDimensions,
  });
  return {
    preferences: preferences.discoveryV2AlignmentPreferences,
    signals: signals.get(normalizedCandidateUserId) ?? [],
  };
}

export async function getDiscoveryCandidatesForCurrentUser(
  userId: string,
  client?: SupabaseLikeClient,
  _locale?: string | null,
  requestedPage = 1
): Promise<DiscoverySearchPage> {
  const normalizedUserId = assertUserId(userId);
  const supabase = await resolveClient(client);
  const ownProfile = await getOwnDiscoveryProfile(normalizedUserId, supabase);
  if (!ownProfile || ownProfile.status !== "active") {
    return { candidates: [], page: 1, pageSize: 12, totalCount: 0 };
  }
  const preferences = await getOwnSearchPreferences(normalizedUserId, supabase);
  const mustHaves = preferences?.mustHaves ?? normalizeMustHaves(null);
  const pageSize = 12;
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const rpcClient = supabase as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>
    ) => PromiseLike<{ data: DiscoveryV2SearchRow[] | null; error: SupabaseError | null }>;
  };
  const { data, error } = await rpcClient.rpc("search_founder_discovery_profiles_v2", {
    p_roles: mustHaves.requiredRolesAny,
    p_expertise: mustHaves.requiredExpertiseAny,
    p_location_region: mustHaves.desiredLocationRegion,
    p_remote_modes: mustHaves.acceptedRemoteModes,
    p_min_availability: mustHaves.minimumAvailabilityHoursPerWeek,
    p_page_size: pageSize,
    p_offset: (page - 1) * pageSize,
  });

  if (error) {
    throw new Error(error.message ?? "discovery_candidates_load_failed");
  }

  const rows = data ?? [];
  const candidateProfiles: FounderDiscoveryProfile[] = rows.map((row) => ({
    id: row.id,
    userId: row.candidate_user_id,
    status: "active",
    displayName: row.display_name,
    headline: row.headline,
    bio: "",
    ownRoles: row.own_roles,
    seekingRoles: row.seeking_roles,
    expertise: row.expertise ?? [],
    industries: [],
    locationLabel: null,
    locationRegion: row.location_region,
    remoteMode: row.remote_mode,
    availabilityHoursPerWeek: row.availability_hours_per_week,
    commitmentLevel: row.commitment_level,
    ventureStage: row.venture_stage,
    ventureGoal: row.venture_goal,
    searchIntent: row.search_intent,
    startHorizon: row.start_horizon,
    publishedAt: row.published_at,
    createdAt: row.published_at ?? "",
    updatedAt: row.published_at ?? "",
  }));
  const alignmentSignals =
    preferences?.discoveryV2AlignmentEnabled &&
    preferences.discoveryV2AlignmentDimensions.length > 0
      ? await getDiscoveryV2AlignmentSignalsForCandidates({
          ownerUserId: normalizedUserId,
          candidateUserIds: candidateProfiles.map((profile) => profile.userId),
          prioritizedDimensions: preferences.discoveryV2AlignmentDimensions,
        })
      : new Map();
  const candidates = attachDiscoveryV2AlignmentSignals(
    candidateProfiles.map((profile) => buildDiscoveryV2Candidate(profile, mustHaves)),
    alignmentSignals,
    new Map(candidateProfiles.map((profile) => [profile.id, profile.userId]))
  );

  return {
    candidates,
    page,
    pageSize,
    totalCount: rows[0] ? Number(rows[0].total_count) : 0,
  };
}

export async function getDiscoveryExploreProfilesForCurrentUser(
  userId: string,
  client?: SupabaseLikeClient,
  requestedPage = 1
): Promise<DiscoverySearchPage> {
  assertUserId(userId);
  const supabase = await resolveClient(client);
  const pageSize = 12;
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const rpcClient = supabase as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>
    ) => PromiseLike<{ data: DiscoveryV2SearchRow[] | null; error: SupabaseError | null }>;
  };
  const { data, error } = await rpcClient.rpc("search_founder_discovery_profiles_v2", {
    p_roles: [],
    p_expertise: [],
    p_location_region: null,
    p_remote_modes: [],
    p_min_availability: null,
    p_page_size: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new Error(error.message ?? "discovery_explore_load_failed");

  const rows = data ?? [];
  const candidates = rows.map((row) =>
    buildDiscoveryV2Candidate(
      {
        id: row.id,
        userId: row.candidate_user_id,
        status: "active",
        displayName: row.display_name,
        headline: row.headline,
        bio: "",
        ownRoles: row.own_roles,
        seekingRoles: row.seeking_roles,
        expertise: row.expertise ?? [],
        industries: [],
        locationLabel: null,
        locationRegion: row.location_region,
        remoteMode: row.remote_mode,
        availabilityHoursPerWeek: row.availability_hours_per_week,
        commitmentLevel: row.commitment_level,
        ventureStage: row.venture_stage,
        ventureGoal: row.venture_goal,
        searchIntent: row.search_intent,
        startHorizon: row.start_horizon,
        publishedAt: row.published_at,
        createdAt: row.published_at ?? "",
        updatedAt: row.published_at ?? "",
      },
      normalizeMustHaves(null)
    )
  );

  return {
    candidates,
    page,
    pageSize,
    totalCount: rows[0] ? Number(rows[0].total_count) : 0,
  };
}
