"use server";

import { revalidatePath } from "next/cache";
import {
  confirmFullDiscoveryMatching,
  requestFullDiscoveryMatching,
  startDiscoveryMatchingPreparation,
} from "@/features/discovery/discoveryMatchingStartData";
import type {
  DiscoveryMatchingConfirmationErrorReason,
  DiscoveryMatchingConfirmationResult,
  DiscoveryMatchingPreparationErrorReason,
  DiscoveryMatchingPreparationResult,
  DiscoveryMatchingRequestErrorReason,
  DiscoveryMatchingRequestResult,
  DiscoveryMatchingStartResult,
} from "@/features/discovery/discoveryMatchingStartFeedback";
import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function matchingPreparationErrorReason(
  error: unknown
): DiscoveryMatchingPreparationErrorReason {
  if (!(error instanceof Error)) {
    return "preparation_failed";
  }

  if (error.message === "discovery_matching_start_unavailable") {
    return "matching_unavailable";
  }
  if (error.message === "discovery_matching_start_relationship_exists") {
    return "relationship_exists";
  }
  if (error.message === "discovery_matching_start_forbidden") {
    return "preparation_not_allowed";
  }

  return "preparation_failed";
}

function fullMatchingRequestErrorReason(
  error: unknown
): DiscoveryMatchingRequestErrorReason {
  if (!(error instanceof Error)) {
    return "request_failed";
  }

  if (error.message === "discovery_matching_start_unavailable") {
    return "matching_unavailable";
  }
  if (error.message === "discovery_matching_start_relationship_exists") {
    return "relationship_exists";
  }
  if (error.message === "discovery_matching_start_other_user_requested") {
    return "other_participant_requested";
  }
  if (error.message === "discovery_matching_start_request_forbidden") {
    return "request_not_allowed";
  }

  return "request_failed";
}

function fullMatchingConfirmationErrorReason(
  error: unknown
): DiscoveryMatchingConfirmationErrorReason {
  if (!(error instanceof Error)) {
    return "confirmation_failed";
  }

  if (error.message === "discovery_matching_start_unavailable") {
    return "matching_unavailable";
  }
  if (error.message === "discovery_matching_start_relationship_exists") {
    return "relationship_exists";
  }
  if (error.message === "discovery_matching_start_self_confirm_forbidden") {
    return "self_confirmation_forbidden";
  }
  if (error.message === "discovery_matching_start_confirm_forbidden") {
    return "confirmation_not_allowed";
  }

  return "confirmation_failed";
}

export async function startDiscoveryMatchingPreparationAction(
  introRequestId: string
): Promise<DiscoveryMatchingPreparationResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    await startDiscoveryMatchingPreparation({
      introRequestId,
      userId,
    });

    revalidatePath(`/discovery/intros/${introRequestId}/matching`);
    revalidatePath("/discovery/intros");
    return {
      ok: true,
      reason: "matching_preparation_started",
    };
  } catch (error) {
    return {
      ok: false,
      reason: matchingPreparationErrorReason(error),
    };
  }
}

/**
 * Treats the founder's explicit "explore together" action as both the
 * technical preparation and the request that needs the other founder's
 * confirmation. Both data operations are idempotent, so a retry can safely
 * resume after either step without creating another preparation.
 */
export async function requestDiscoveryJointCheckAction(
  introRequestId: string
): Promise<DiscoveryMatchingStartResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    const preparation = await startDiscoveryMatchingPreparation({
      introRequestId,
      userId,
    });
    const matchingStart = preparation.matchingStart;
    if (!matchingStart) {
      return {
        ok: false,
        reason: "preparation_failed",
      };
    }

    await requestFullDiscoveryMatching({
      matchingStartId: matchingStart.id,
      userId,
    });

    revalidatePath(`/discovery/intros/${introRequestId}/matching`);
    revalidatePath("/discovery/intros");
    return {
      ok: true,
      reason: "matching_start_requested",
    };
  } catch (error) {
    const preparationReason = matchingPreparationErrorReason(error);
    if (preparationReason !== "preparation_failed") {
      return { ok: false, reason: preparationReason };
    }
    return {
      ok: false,
      reason: fullMatchingRequestErrorReason(error),
    };
  }
}

export async function requestFullDiscoveryMatchingAction(
  introRequestId: string,
  matchingStartId: string
): Promise<DiscoveryMatchingRequestResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    await requestFullDiscoveryMatching({
      matchingStartId,
      userId,
    });

    revalidatePath(`/discovery/intros/${introRequestId}/matching`);
    revalidatePath("/discovery/intros");
    return {
      ok: true,
      reason: "matching_start_requested",
    };
  } catch (error) {
    return {
      ok: false,
      reason: fullMatchingRequestErrorReason(error),
    };
  }
}

export async function confirmFullDiscoveryMatchingAction(
  introRequestId: string,
  matchingStartId: string
): Promise<DiscoveryMatchingConfirmationResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    await confirmFullDiscoveryMatching({
      matchingStartId,
      userId,
    });

    revalidatePath(`/discovery/intros/${introRequestId}/matching`);
    revalidatePath("/discovery/intros");
    return {
      ok: true,
      reason: "matching_start_confirmed",
    };
  } catch (error) {
    return {
      ok: false,
      reason: fullMatchingConfirmationErrorReason(error),
    };
  }
}
