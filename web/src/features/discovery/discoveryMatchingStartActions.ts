"use server";

import { revalidatePath } from "next/cache";
import { startDiscoveryMatchingPreparation } from "@/features/discovery/discoveryMatchingStartData";
import { createClient } from "@/lib/supabase/server";

export type DiscoveryMatchingStartActionState = {
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

function matchingStartErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Die Matching-Vorbereitung konnte gerade nicht gestartet werden.";
  }

  if (error.message === "discovery_matching_start_unavailable") {
    return "Dieser Matching-Schritt ist aktuell nicht verfügbar.";
  }
  if (error.message === "discovery_matching_start_relationship_exists") {
    return "Für euch gibt es bereits einen bestehenden Cofoundery-Kontext.";
  }
  if (error.message === "discovery_matching_start_forbidden") {
    return "Du kannst diese Matching-Vorbereitung nicht starten.";
  }

  return "Die Matching-Vorbereitung konnte gerade nicht gestartet werden.";
}

export async function startDiscoveryMatchingPreparationAction(
  introRequestId: string
): Promise<DiscoveryMatchingStartActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      message: "Bitte melde dich an, um die Matching-Vorbereitung zu starten.",
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
      message: "Matching-Vorbereitung gestartet.",
    };
  } catch (error) {
    return {
      ok: false,
      message: matchingStartErrorMessage(error),
    };
  }
}
