"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createMatchingSessionFromDiscoveryStart } from "@/features/matchingCore/matchingCoreData";

export type MatchingCoreActionState = {
  ok: boolean;
  message?: string;
};

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function createSessionErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Die Matching-Session konnte gerade nicht vorbereitet werden.";
  }

  if (error.message === "matching_core_discovery_start_unavailable") {
    return "Dieser Matching-Schritt ist aktuell nicht verfügbar.";
  }
  if (error.message === "matching_core_discovery_start_not_ready") {
    return "Das gemeinsame Matching ist noch nicht von beiden bestätigt.";
  }
  if (error.message === "matching_core_relationship_exists") {
    return "Für euch gibt es bereits einen bestehenden Cofoundery-Kontext.";
  }
  if (error.message === "matching_core_profiles_inactive") {
    return "Beide Discovery-Profile müssen aktiv sein, um die Matching-Session vorzubereiten.";
  }
  if (error.message === "matching_core_missing_service_role") {
    return "Die Matching-Session kann lokal gerade nicht vorbereitet werden.";
  }

  return "Die Matching-Session konnte gerade nicht vorbereitet werden.";
}

export async function createMatchingSessionFromDiscoveryStartAction(
  introRequestId: string,
  discoveryMatchingStartId: string
): Promise<MatchingCoreActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      message: "Bitte melde dich an, um die Matching-Session vorzubereiten.",
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
      message: "Matching-Session vorbereitet.",
    };
  } catch (error) {
    return {
      ok: false,
      message: createSessionErrorMessage(error),
    };
  }
}
