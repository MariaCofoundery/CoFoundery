import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAcceptedDiscoveryIntroForMatchingPreparation } from "@/features/discovery/discoveryIntroData";
import {
  canCreateDiscoveryMatchingStart,
  canConfirmFullDiscoveryMatching,
  canRequestFullDiscoveryMatching,
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
  "requested_by_user_id",
  "requested_at",
  "confirmed_by_user_id",
  "confirmed_at",
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
  requested_by_user_id: string | null;
  requested_at: string | null;
  confirmed_by_user_id: string | null;
  confirmed_at: string | null;
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
    requestedByUserId: row.requested_by_user_id,
    requestedAt: row.requested_at,
    confirmedByUserId: row.confirmed_by_user_id,
    confirmedAt: row.confirmed_at,
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

async function getDiscoveryMatchingStartById(matchingStartId: string) {
  const normalizedMatchingStartId = matchingStartId.trim();
  if (!normalizedMatchingStartId) {
    throw new Error("discovery_matching_start_missing_id");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_matching_starts")
    .select(DISCOVERY_MATCHING_START_COLUMNS)
    .eq("id", normalizedMatchingStartId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "discovery_matching_start_load_failed"));
  }

  return data ? mapMatchingStartRow(data as unknown as DiscoveryMatchingStartRow) : null;
}

async function getDiscoveryMatchingPreparationByStartId(matchingStartId: string, userId: string) {
  const matchingStart = await getDiscoveryMatchingStartById(matchingStartId);
  if (!matchingStart) {
    return null;
  }

  const preparation = await getDiscoveryMatchingPreparation(matchingStart.introRequestId, userId);
  if (!preparation || preparation.matchingStart?.id !== matchingStart.id) {
    return null;
  }

  return preparation;
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

export async function requestFullDiscoveryMatching(params: {
  matchingStartId: string;
  userId: string;
}): Promise<DiscoveryMatchingPreparation> {
  const normalizedUserId = assertUserId(params.userId);
  const preparation = await getDiscoveryMatchingPreparationByStartId(
    params.matchingStartId,
    normalizedUserId
  );

  if (!preparation?.matchingStart) {
    throw new Error("discovery_matching_start_unavailable");
  }

  if (preparation.matchingStart.status === "awaiting_other_confirmation") {
    if (preparation.matchingStart.requestedByUserId === normalizedUserId) {
      return preparation;
    }
    throw new Error("discovery_matching_start_other_user_requested");
  }

  if (
    !canRequestFullDiscoveryMatching({
      status: preparation.matchingStart.status,
      requesterUserId: preparation.matchingStart.requesterUserId,
      recipientUserId: preparation.matchingStart.recipientUserId,
      userId: normalizedUserId,
      relationshipExists: preparation.relationshipExists,
    })
  ) {
    if (preparation.relationshipExists) {
      throw new Error("discovery_matching_start_relationship_exists");
    }
    throw new Error("discovery_matching_start_request_forbidden");
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_matching_starts")
    .update({
      status: "awaiting_other_confirmation",
      requested_by_user_id: normalizedUserId,
      requested_at: now,
      confirmed_by_user_id: null,
      confirmed_at: null,
    })
    .eq("id", preparation.matchingStart.id)
    .eq("status", "preparing")
    .select(DISCOVERY_MATCHING_START_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error as SupabaseError | null, "discovery_matching_start_request_failed"));
  }

  return {
    ...preparation,
    matchingStart: mapMatchingStartRow(data as unknown as DiscoveryMatchingStartRow),
  };
}

export async function confirmFullDiscoveryMatching(params: {
  matchingStartId: string;
  userId: string;
}): Promise<DiscoveryMatchingPreparation> {
  const normalizedUserId = assertUserId(params.userId);
  const preparation = await getDiscoveryMatchingPreparationByStartId(
    params.matchingStartId,
    normalizedUserId
  );

  if (!preparation?.matchingStart) {
    throw new Error("discovery_matching_start_unavailable");
  }

  if (preparation.matchingStart.status === "ready_for_matching") {
    return preparation;
  }

  if (
    !canConfirmFullDiscoveryMatching({
      status: preparation.matchingStart.status,
      requesterUserId: preparation.matchingStart.requesterUserId,
      recipientUserId: preparation.matchingStart.recipientUserId,
      requestedByUserId: preparation.matchingStart.requestedByUserId,
      userId: normalizedUserId,
      relationshipExists: preparation.relationshipExists,
    })
  ) {
    if (preparation.relationshipExists) {
      throw new Error("discovery_matching_start_relationship_exists");
    }
    if (preparation.matchingStart.requestedByUserId === normalizedUserId) {
      throw new Error("discovery_matching_start_self_confirm_forbidden");
    }
    throw new Error("discovery_matching_start_confirm_forbidden");
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discovery_matching_starts")
    .update({
      status: "ready_for_matching",
      confirmed_by_user_id: normalizedUserId,
      confirmed_at: now,
    })
    .eq("id", preparation.matchingStart.id)
    .eq("status", "awaiting_other_confirmation")
    .select(DISCOVERY_MATCHING_START_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error as SupabaseError | null, "discovery_matching_start_confirm_failed"));
  }

  return {
    ...preparation,
    matchingStart: mapMatchingStartRow(data as unknown as DiscoveryMatchingStartRow),
  };
}
