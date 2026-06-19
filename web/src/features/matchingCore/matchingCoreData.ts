import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DiscoveryProfilePreview } from "@/features/discovery/discoveryTypes";
import {
  type MatchingSession,
  type MatchingSessionInput,
  type MatchingSessionModule,
  type MatchingSessionModuleConfig,
  type MatchingSessionParticipant,
  type MatchingSessionParticipantReadiness,
  type MatchingSessionSourceType,
  type MatchingSessionStatus,
  type MatchingSessionSummary,
} from "@/features/matchingCore/matchingCoreTypes";

const MATCHING_SESSION_COLUMNS = [
  "id",
  "source_type",
  "source_id",
  "status",
  "created_by_user_id",
  "created_at",
  "updated_at",
  "canceled_at",
  "report_ready_at",
].join(", ");

const MATCHING_SESSION_PARTICIPANT_COLUMNS = [
  "matching_session_id",
  "user_id",
  "role",
  "status",
  "confirmed_at",
  "created_at",
  "updated_at",
].join(", ");

const MATCHING_SESSION_MODULE_COLUMNS = [
  "matching_session_id",
  "module",
  "required",
  "created_at",
].join(", ");

const MATCHING_SESSION_INPUT_COLUMNS = [
  "id",
  "matching_session_id",
  "user_id",
  "module",
  "assessment_id",
  "created_at",
  "updated_at",
].join(", ");

type SupabaseError = {
  message?: string | null;
  code?: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;

type MatchingSessionRow = {
  id: string;
  source_type: string;
  source_id: string | null;
  status: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
  report_ready_at: string | null;
};

type MatchingSessionParticipantRow = {
  matching_session_id: string;
  user_id: string;
  role: string;
  status: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

type MatchingSessionModuleRow = {
  matching_session_id: string;
  module: string;
  required: boolean;
  created_at: string;
};

type MatchingSessionInputRow = {
  id: string;
  matching_session_id: string;
  user_id: string;
  module: string;
  assessment_id: string;
  created_at: string;
  updated_at: string;
};

type MatchingCoreProfileRow = {
  user_id: string;
  id: string;
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
};

type MatchingSessionFromDiscoveryRpcRow = {
  matching_session_id: string;
  status: string;
};

function getErrorMessage(error: SupabaseError | null | undefined, fallback: string) {
  return error?.message ?? fallback;
}

function assertUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("matching_core_missing_user_id");
  }
  return normalized;
}

function assertDiscoveryMatchingStartId(discoveryMatchingStartId: string) {
  const normalized = discoveryMatchingStartId.trim();
  if (!normalized) {
    throw new Error("matching_core_missing_discovery_matching_start_id");
  }
  return normalized;
}

function mapSession(row: MatchingSessionRow): MatchingSession {
  return {
    id: row.id,
    sourceType: row.source_type as MatchingSessionSourceType,
    sourceId: row.source_id,
    status: row.status as MatchingSessionStatus,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canceledAt: row.canceled_at,
    reportReadyAt: row.report_ready_at,
  };
}

function mapParticipant(row: MatchingSessionParticipantRow): MatchingSessionParticipant {
  return {
    matchingSessionId: row.matching_session_id,
    userId: row.user_id,
    role: row.role as MatchingSessionParticipant["role"],
    status: row.status as MatchingSessionParticipant["status"],
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapModule(row: MatchingSessionModuleRow): MatchingSessionModuleConfig {
  return {
    matchingSessionId: row.matching_session_id,
    module: row.module as MatchingSessionModule,
    required: row.required,
    createdAt: row.created_at,
  };
}

function mapInput(row: MatchingSessionInputRow): MatchingSessionInput {
  return {
    id: row.id,
    matchingSessionId: row.matching_session_id,
    userId: row.user_id,
    module: row.module as MatchingSessionModule,
    assessmentId: row.assessment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfile(row: MatchingCoreProfileRow): DiscoveryProfilePreview {
  return {
    id: row.id,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    ownRoles: row.own_roles as DiscoveryProfilePreview["ownRoles"],
    seekingRoles: row.seeking_roles as DiscoveryProfilePreview["seekingRoles"],
    industries: row.industries,
    locationLabel: row.location_label,
    remoteMode: row.remote_mode as DiscoveryProfilePreview["remoteMode"],
    availabilityHoursPerWeek: row.availability_hours_per_week,
    commitmentLevel: row.commitment_level as DiscoveryProfilePreview["commitmentLevel"],
    ventureStage: row.venture_stage as DiscoveryProfilePreview["ventureStage"],
    ventureGoal: row.venture_goal as DiscoveryProfilePreview["ventureGoal"],
    publishedAt: row.published_at,
  };
}

async function loadMatchingSessionByDiscoveryStart(
  discoveryMatchingStartId: string,
  client: SupabaseLikeClient
) {
  const { data, error } = await client
    .from("matching_sessions")
    .select(MATCHING_SESSION_COLUMNS)
    .eq("source_type", "discovery_matching_start")
    .eq("source_id", discoveryMatchingStartId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "matching_session_load_failed"));
  }

  return data ? mapSession(data as unknown as MatchingSessionRow) : null;
}

async function loadSessionParticipants(sessionId: string, client: SupabaseLikeClient) {
  const { data, error } = await client
    .from("matching_session_participants")
    .select(MATCHING_SESSION_PARTICIPANT_COLUMNS)
    .eq("matching_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, "matching_session_participants_load_failed"));
  }

  return ((data ?? []) as unknown as MatchingSessionParticipantRow[]).map(mapParticipant);
}

async function loadSessionModules(sessionId: string, client: SupabaseLikeClient) {
  const { data, error } = await client
    .from("matching_session_modules")
    .select(MATCHING_SESSION_MODULE_COLUMNS)
    .eq("matching_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, "matching_session_modules_load_failed"));
  }

  return ((data ?? []) as unknown as MatchingSessionModuleRow[]).map(mapModule);
}

async function loadSessionInputs(sessionId: string, client: SupabaseLikeClient) {
  const { data, error } = await client
    .from("matching_session_inputs")
    .select(MATCHING_SESSION_INPUT_COLUMNS)
    .eq("matching_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, "matching_session_inputs_load_failed"));
  }

  return ((data ?? []) as unknown as MatchingSessionInputRow[]).map(mapInput);
}

async function loadActiveProfilesByUserId(userIds: string[], client: SupabaseLikeClient) {
  const normalizedUserIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (normalizedUserIds.length === 0) {
    return new Map<string, DiscoveryProfilePreview>();
  }

  const { data, error } = await client
    .from("founder_discovery_profiles")
    .select(
      [
        "user_id",
        "id",
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
      ].join(", ")
    )
    .in("user_id", normalizedUserIds)
    .eq("status", "active");

  if (error) {
    throw new Error(getErrorMessage(error, "matching_session_profiles_load_failed"));
  }

  return new Map(
    ((data ?? []) as unknown as MatchingCoreProfileRow[]).map((row) => [
      row.user_id,
      mapProfile(row),
    ])
  );
}

function buildSessionSummary(params: {
  session: MatchingSession;
  participants: MatchingSessionParticipant[];
  modules: MatchingSessionModuleConfig[];
  inputs: MatchingSessionInput[];
  profilesByUserId: Map<string, DiscoveryProfilePreview>;
}): MatchingSessionSummary {
  const requiredModules = params.modules
    .filter((module) => module.required)
    .map((module) => module.module);
  const baseInputUserIds = new Set(
    params.inputs
      .filter((input) => input.module === "base")
      .map((input) => input.userId)
  );
  const activeParticipants = params.participants.filter(
    (participant) => participant.status === "active"
  );
  const participants: MatchingSessionParticipantReadiness[] = activeParticipants.map((participant) => ({
    userId: participant.userId,
    profile: params.profilesByUserId.get(participant.userId) ?? null,
    baseInputStatus: baseInputUserIds.has(participant.userId) ? "present" : "missing",
  }));

  return {
    session: params.session,
    participants,
    requiredModules,
  };
}

export async function getMatchingSessionForDiscoveryStart(
  discoveryMatchingStartId: string,
  userId: string
): Promise<MatchingSessionSummary | null> {
  const normalizedUserId = assertUserId(userId);
  const normalizedStartId = assertDiscoveryMatchingStartId(discoveryMatchingStartId);
  const client = await createClient();
  const session = await loadMatchingSessionByDiscoveryStart(normalizedStartId, client);
  if (!session) {
    return null;
  }

  const participants = await loadSessionParticipants(session.id, client);
  const isParticipant = participants.some(
    (participant) => participant.userId === normalizedUserId && participant.status === "active"
  );
  if (!isParticipant) {
    return null;
  }

  const [modules, inputs] = await Promise.all([
    loadSessionModules(session.id, client),
    loadSessionInputs(session.id, client),
  ]);
  const profilesByUserId = await loadActiveProfilesByUserId(
    participants.map((participant) => participant.userId),
    client
  );

  return buildSessionSummary({
    session,
    participants,
    modules,
    inputs,
    profilesByUserId,
  });
}

export async function createMatchingSessionFromDiscoveryStart(params: {
  discoveryMatchingStartId: string;
  userId: string;
}): Promise<MatchingSessionSummary> {
  const normalizedUserId = assertUserId(params.userId);
  const normalizedStartId = assertDiscoveryMatchingStartId(params.discoveryMatchingStartId);
  const existing = await getMatchingSessionForDiscoveryStart(normalizedStartId, normalizedUserId);
  if (existing) {
    return existing;
  }

  const client = await createClient();
  const { data, error } = await client.rpc("create_matching_session_from_discovery_start", {
    p_discovery_matching_start_id: normalizedStartId,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "matching_session_create_failed"));
  }

  const created = Array.isArray(data)
    ? (data[0] as MatchingSessionFromDiscoveryRpcRow | undefined)
    : (data as MatchingSessionFromDiscoveryRpcRow | null);

  if (!created?.matching_session_id) {
    throw new Error("matching_session_create_failed");
  }

  const summary = await getMatchingSessionForDiscoveryStart(normalizedStartId, normalizedUserId);
  if (!summary || summary.session.id !== created.matching_session_id) {
    throw new Error("matching_session_create_failed");
  }

  return summary;
}
