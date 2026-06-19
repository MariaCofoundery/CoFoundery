import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAcceptedDiscoveryIntroForMatchingPreparation } from "@/features/discovery/discoveryIntroData";
import {
  canCreateDiscoveryMatchingStart,
  type DiscoveryMatchingPreparation,
  type DiscoveryMatchingStart,
  type DiscoveryMatchingStartStatus,
} from "@/features/discovery/discoveryMatchingStartTypes";

const DISCOVERY_MATCHING_START_COLUMNS = [
  "id",
  "intro_request_id",
  "initiator_user_id",
  "requester_user_id",
  "recipient_user_id",
  "status",
  "created_at",
  "updated_at",
].join(", ");

type SupabaseError = {
  message?: string | null;
  code?: string | null;
};

type DiscoveryMatchingStartRow = {
  id: string;
  intro_request_id: string;
  initiator_user_id: string;
  requester_user_id: string;
  recipient_user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function assertUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("discovery_matching_start_missing_user_id");
  }
  return normalized;
}

function assertIntroRequestId(introRequestId: string) {
  const normalized = introRequestId.trim();
  if (!normalized) {
    throw new Error("discovery_matching_start_missing_intro_request_id");
  }
  return normalized;
}

function getErrorMessage(error: SupabaseError | null | undefined, fallback: string) {
  return error?.message ?? fallback;
}

function mapMatchingStartRow(row: DiscoveryMatchingStartRow): DiscoveryMatchingStart {
  return {
    id: row.id,
    introRequestId: row.intro_request_id,
    initiatorUserId: row.initiator_user_id,
    requesterUserId: row.requester_user_id,
    recipientUserId: row.recipient_user_id,
    status: row.status as DiscoveryMatchingStartStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDiscoveryMatchingStartByIntroRequestId(introRequestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_matching_starts")
    .select(DISCOVERY_MATCHING_START_COLUMNS)
    .eq("intro_request_id", assertIntroRequestId(introRequestId))
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "discovery_matching_start_load_failed"));
  }

  return data ? mapMatchingStartRow(data as unknown as DiscoveryMatchingStartRow) : null;
}

export async function getDiscoveryMatchingPreparation(
  introRequestId: string,
  userId: string
): Promise<DiscoveryMatchingPreparation | null> {
  const normalizedUserId = assertUserId(userId);
  const introPreparation = await getAcceptedDiscoveryIntroForMatchingPreparation(
    assertIntroRequestId(introRequestId),
    normalizedUserId
  );

  if (!introPreparation) {
    return null;
  }

  const matchingStart = await getDiscoveryMatchingStartByIntroRequestId(introPreparation.introRequest.id);

  return {
    ...introPreparation,
    matchingStart,
  };
}

export async function startDiscoveryMatchingPreparation(params: {
  introRequestId: string;
  userId: string;
}): Promise<DiscoveryMatchingPreparation> {
  const normalizedUserId = assertUserId(params.userId);
  const preparation = await getDiscoveryMatchingPreparation(params.introRequestId, normalizedUserId);

  if (!preparation) {
    throw new Error("discovery_matching_start_unavailable");
  }

  if (preparation.matchingStart) {
    return preparation;
  }

  if (
    !canCreateDiscoveryMatchingStart({
      introStatus: preparation.introRequest.status,
      requesterUserId: preparation.introRequest.requesterUserId,
      recipientUserId: preparation.introRequest.recipientUserId,
      userId: normalizedUserId,
      relationshipExists: preparation.relationshipExists,
      matchingStartExists: false,
    })
  ) {
    if (preparation.relationshipExists) {
      throw new Error("discovery_matching_start_relationship_exists");
    }
    throw new Error("discovery_matching_start_forbidden");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_matching_starts")
    .insert({
      intro_request_id: preparation.introRequest.id,
      initiator_user_id: normalizedUserId,
      requester_user_id: preparation.introRequest.requesterUserId,
      recipient_user_id: preparation.introRequest.recipientUserId,
      status: "preparing",
    })
    .select(DISCOVERY_MATCHING_START_COLUMNS)
    .single();

  if (error || !data) {
    if ((error as SupabaseError | null)?.code === "23505") {
      const existing = await getDiscoveryMatchingPreparation(params.introRequestId, normalizedUserId);
      if (existing?.matchingStart) {
        return existing;
      }
    }
    throw new Error(getErrorMessage(error as SupabaseError | null, "discovery_matching_start_failed"));
  }

  return {
    ...preparation,
    matchingStart: mapMatchingStartRow(data as unknown as DiscoveryMatchingStartRow),
  };
}
