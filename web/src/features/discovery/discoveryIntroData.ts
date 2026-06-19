import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getActiveDiscoveryProfileById,
  getOwnDiscoveryProfile,
} from "@/features/discovery/discoveryData";
import type {
  DiscoveryCommitmentLevel,
  DiscoveryFounderRole,
  DiscoveryProfilePreview,
  DiscoveryRemoteMode,
  DiscoveryVentureGoal,
  DiscoveryVentureStage,
} from "@/features/discovery/discoveryTypes";
import type {
  DiscoveryIntroMatchingPreparation,
  DiscoveryIntroRequest,
  DiscoveryIntroRequestWithProfile,
  DiscoveryIntroStatus,
} from "@/features/discovery/discoveryIntroTypes";
import { canPrepareDiscoveryIntroMatching } from "@/features/discovery/discoveryIntroTypes";

const DISCOVERY_INTRO_COLUMNS = [
  "id",
  "requester_user_id",
  "recipient_user_id",
  "status",
  "message",
  "response_message",
  "created_at",
  "updated_at",
  "responded_at",
  "canceled_at",
].join(", ");

const DISCOVERY_INTRO_PROFILE_COLUMNS = [
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
].join(", ");

const DISCOVERY_INTRO_MESSAGE_LIMIT = 600;

type SupabaseError = {
  message?: string | null;
  code?: string | null;
};

type DiscoveryIntroRequestRow = {
  id: string;
  requester_user_id: string;
  recipient_user_id: string;
  status: string;
  message: string | null;
  response_message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  canceled_at: string | null;
};

type DiscoveryIntroProfileRow = {
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

function assertUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("discovery_intro_missing_user_id");
  }
  return normalized;
}

function assertIntroRequestId(introRequestId: string) {
  const normalized = introRequestId.trim();
  if (!normalized) {
    throw new Error("discovery_intro_missing_request_id");
  }
  return normalized;
}

function normalizeIntroMessage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, DISCOVERY_INTRO_MESSAGE_LIMIT);
}

function mapIntroRow(row: DiscoveryIntroRequestRow): DiscoveryIntroRequest {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id,
    recipientUserId: row.recipient_user_id,
    status: row.status as DiscoveryIntroStatus,
    message: row.message,
    responseMessage: row.response_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
    canceledAt: row.canceled_at,
  };
}

function mapIntroProfileRow(row: DiscoveryIntroProfileRow): DiscoveryProfilePreview {
  return {
    id: row.id,
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
  };
}

function getErrorMessage(error: SupabaseError | null | undefined, fallback: string) {
  return error?.message ?? fallback;
}

async function loadPublicProfilesByUserId(userIds: string[]) {
  const normalizedUserIds = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
  if (normalizedUserIds.length === 0) {
    return new Map<string, DiscoveryProfilePreview>();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("founder_discovery_profiles")
    .select(`user_id, ${DISCOVERY_INTRO_PROFILE_COLUMNS}`)
    .in("user_id", normalizedUserIds)
    .eq("status", "active");

  if (error) {
    throw new Error(getErrorMessage(error, "discovery_intro_profiles_load_failed"));
  }

  return new Map(
    ((data ?? []) as unknown as Array<DiscoveryIntroProfileRow & { user_id: string }>).map((row) => [
      row.user_id,
      mapIntroProfileRow(row),
    ])
  );
}

async function getIntroRequestById(introRequestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_intro_requests")
    .select(DISCOVERY_INTRO_COLUMNS)
    .eq("id", assertIntroRequestId(introRequestId))
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "discovery_intro_load_failed"));
  }

  return data ? mapIntroRow(data as unknown as DiscoveryIntroRequestRow) : null;
}

async function checkRelationshipExistsBetweenUsers(leftUserId: string, rightUserId: string) {
  if (leftUserId === rightUserId) {
    return true;
  }

  const [userLow, userHigh] = [leftUserId, rightUserId].sort();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("relationships")
    .select("id")
    .eq("user_low", userLow)
    .eq("user_high", userHigh)
    .limit(1)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data);
}

async function checkAcceptedInvitationExistsBetweenUsers(leftUserId: string, rightUserId: string) {
  if (leftUserId === rightUserId) {
    return false;
  }

  const supabase = await createClient();
  const { data: leftToRight, error: leftError } = await supabase
    .from("invitations")
    .select("id")
    .eq("inviter_user_id", leftUserId)
    .eq("invitee_user_id", rightUserId)
    .limit(1)
    .maybeSingle();

  if (leftError) {
    return false;
  }

  if (leftToRight) {
    return true;
  }

  const { data: rightToLeft, error: rightError } = await supabase
    .from("invitations")
    .select("id")
    .eq("inviter_user_id", rightUserId)
    .eq("invitee_user_id", leftUserId)
    .limit(1)
    .maybeSingle();

  if (rightError) {
    return false;
  }

  return Boolean(rightToLeft);
}

export function normalizeDiscoveryIntroMessage(value: unknown) {
  return normalizeIntroMessage(value);
}

export async function getDiscoveryIntroRequestForProfile(
  userId: string,
  profileId: string
): Promise<DiscoveryIntroRequest | null> {
  const normalizedUserId = assertUserId(userId);
  const profile = await getActiveDiscoveryProfileById(profileId);
  if (!profile || profile.userId === normalizedUserId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_intro_requests")
    .select(DISCOVERY_INTRO_COLUMNS)
    .eq("requester_user_id", normalizedUserId)
    .eq("recipient_user_id", profile.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "discovery_intro_status_load_failed"));
  }

  return data ? mapIntroRow(data as unknown as DiscoveryIntroRequestRow) : null;
}

export async function requestDiscoveryIntro(params: {
  requesterUserId: string;
  recipientProfileId: string;
  message?: unknown;
}): Promise<DiscoveryIntroRequest> {
  const requesterUserId = assertUserId(params.requesterUserId);
  const [ownProfile, recipientProfile] = await Promise.all([
    getOwnDiscoveryProfile(requesterUserId),
    getActiveDiscoveryProfileById(params.recipientProfileId),
  ]);

  if (!ownProfile || ownProfile.status !== "active") {
    throw new Error("discovery_intro_requester_profile_inactive");
  }
  if (!recipientProfile || recipientProfile.status !== "active") {
    throw new Error("discovery_intro_recipient_profile_inactive");
  }
  if (recipientProfile.userId === requesterUserId) {
    throw new Error("discovery_intro_self_request_forbidden");
  }

  const existingPending = await getDiscoveryIntroRequestForProfile(
    requesterUserId,
    params.recipientProfileId
  );
  if (existingPending?.status === "pending") {
    throw new Error("discovery_intro_pending_exists");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_intro_requests")
    .insert({
      requester_user_id: requesterUserId,
      recipient_user_id: recipientProfile.userId,
      status: "pending",
      message: normalizeIntroMessage(params.message),
    })
    .select(DISCOVERY_INTRO_COLUMNS)
    .single();

  if (error || !data) {
    if ((error as SupabaseError | null)?.code === "23505") {
      throw new Error("discovery_intro_pending_exists");
    }
    throw new Error(getErrorMessage(error as SupabaseError | null, "discovery_intro_request_failed"));
  }

  return mapIntroRow(data as unknown as DiscoveryIntroRequestRow);
}

export async function respondDiscoveryIntro(params: {
  userId: string;
  introRequestId: string;
  response: Extract<DiscoveryIntroStatus, "accepted" | "declined">;
  responseMessage?: unknown;
}): Promise<DiscoveryIntroRequest> {
  const userId = assertUserId(params.userId);
  const existing = await getIntroRequestById(params.introRequestId);
  if (!existing || existing.recipientUserId !== userId) {
    throw new Error("discovery_intro_response_forbidden");
  }
  if (existing.status !== "pending") {
    throw new Error("discovery_intro_not_pending");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_intro_requests")
    .update({
      status: params.response,
      response_message: normalizeIntroMessage(params.responseMessage),
      responded_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .eq("recipient_user_id", userId)
    .eq("status", "pending")
    .select(DISCOVERY_INTRO_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error as SupabaseError | null, "discovery_intro_response_failed"));
  }

  return mapIntroRow(data as unknown as DiscoveryIntroRequestRow);
}

export async function cancelDiscoveryIntro(params: {
  userId: string;
  introRequestId: string;
}): Promise<DiscoveryIntroRequest> {
  const userId = assertUserId(params.userId);
  const existing = await getIntroRequestById(params.introRequestId);
  if (!existing || existing.requesterUserId !== userId) {
    throw new Error("discovery_intro_cancel_forbidden");
  }
  if (existing.status !== "pending") {
    throw new Error("discovery_intro_not_pending");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_intro_requests")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .eq("requester_user_id", userId)
    .eq("status", "pending")
    .select(DISCOVERY_INTRO_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error as SupabaseError | null, "discovery_intro_cancel_failed"));
  }

  return mapIntroRow(data as unknown as DiscoveryIntroRequestRow);
}

export async function getReceivedDiscoveryIntroRequests(
  userId: string
): Promise<DiscoveryIntroRequestWithProfile[]> {
  const normalizedUserId = assertUserId(userId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_intro_requests")
    .select(DISCOVERY_INTRO_COLUMNS)
    .eq("recipient_user_id", normalizedUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(getErrorMessage(error, "discovery_intro_received_load_failed"));
  }

  const requests = ((data ?? []) as unknown as DiscoveryIntroRequestRow[]).map(mapIntroRow);
  const profilesByUserId = await loadPublicProfilesByUserId(
    requests.map((request) => request.requesterUserId)
  );

  return requests.map((request) => ({
    ...request,
    profile: profilesByUserId.get(request.requesterUserId) ?? null,
  }));
}

export async function getSentDiscoveryIntroRequests(
  userId: string
): Promise<DiscoveryIntroRequestWithProfile[]> {
  const normalizedUserId = assertUserId(userId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_intro_requests")
    .select(DISCOVERY_INTRO_COLUMNS)
    .eq("requester_user_id", normalizedUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(getErrorMessage(error, "discovery_intro_sent_load_failed"));
  }

  const requests = ((data ?? []) as unknown as DiscoveryIntroRequestRow[]).map(mapIntroRow);
  const profilesByUserId = await loadPublicProfilesByUserId(
    requests.map((request) => request.recipientUserId)
  );

  return requests.map((request) => ({
    ...request,
    profile: profilesByUserId.get(request.recipientUserId) ?? null,
  }));
}

export async function getAcceptedDiscoveryIntroForMatchingPreparation(
  introRequestId: string,
  userId: string
): Promise<DiscoveryIntroMatchingPreparation | null> {
  const normalizedUserId = assertUserId(userId);
  const introRequest = await getIntroRequestById(introRequestId);

  if (!introRequest || !canPrepareDiscoveryIntroMatching(introRequest, normalizedUserId)) {
    return null;
  }

  const profilesByUserId = await loadPublicProfilesByUserId([
    introRequest.requesterUserId,
    introRequest.recipientUserId,
  ]);
  const requesterProfile = profilesByUserId.get(introRequest.requesterUserId);
  const recipientProfile = profilesByUserId.get(introRequest.recipientUserId);

  if (!requesterProfile || !recipientProfile) {
    return null;
  }

  const [relationshipExists, invitationExists] = await Promise.all([
    checkRelationshipExistsBetweenUsers(introRequest.requesterUserId, introRequest.recipientUserId),
    checkAcceptedInvitationExistsBetweenUsers(introRequest.requesterUserId, introRequest.recipientUserId),
  ]);

  return {
    introRequest,
    requesterProfile,
    recipientProfile,
    currentUserRole:
      introRequest.requesterUserId === normalizedUserId ? "requester" : "recipient",
    relationshipExists,
    invitationExists,
  };
}
