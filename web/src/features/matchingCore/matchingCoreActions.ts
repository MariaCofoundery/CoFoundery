"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createMatchingSessionFromDiscoveryStart } from "@/features/matchingCore/matchingCoreData";
import type {
  MatchingSessionErrorReason,
  MatchingSessionPreparationResult,
} from "@/features/matchingCore/matchingSessionReportFeedback";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function createSessionErrorReason(
  error: unknown
): MatchingSessionErrorReason {
  if (!(error instanceof Error)) {
    return "session_prepare_failed";
  }

  if (error.message === "matching_core_discovery_start_unavailable") {
    return "matching_unavailable";
  }
  if (error.message === "matching_core_discovery_start_not_ready") {
    return "confirmation_incomplete";
  }
  if (error.message === "matching_core_relationship_exists") {
    return "relationship_exists";
  }
  if (error.message === "matching_core_profiles_inactive") {
    return "profiles_inactive";
  }
  if (error.message === "matching_core_missing_service_role") {
    return "local_session_unavailable";
  }

  return "session_prepare_failed";
}

export async function createMatchingSessionFromDiscoveryStartAction(
  introRequestId: string,
  discoveryMatchingStartId: string
): Promise<MatchingSessionPreparationResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    await createMatchingSessionFromDiscoveryStart({
      discoveryMatchingStartId,
      userId,
    });

    revalidatePath(`/discovery/intros/${introRequestId}/matching`);
    revalidatePath("/discovery/intros");
    return {
      ok: true,
      reason: "matching_session_prepared",
    };
  } catch (error) {
    return {
      ok: false,
      reason: createSessionErrorReason(error),
    };
  }
}
