"use server";

import { revalidatePath } from "next/cache";
import {
  confirmFullDiscoveryMatching,
  requestFullDiscoveryMatching,
  startDiscoveryMatchingPreparation,
} from "@/features/discovery/discoveryMatchingStartData";
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

function fullMatchingRequestErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Der gemeinsame Matching-Start konnte gerade nicht angefragt werden.";
  }

  if (error.message === "discovery_matching_start_unavailable") {
    return "Dieser Matching-Schritt ist aktuell nicht verfügbar.";
  }
  if (error.message === "discovery_matching_start_relationship_exists") {
    return "Für euch gibt es bereits einen bestehenden Cofoundery-Kontext.";
  }
  if (error.message === "discovery_matching_start_other_user_requested") {
    return "Die andere Person hat den Matching-Start bereits angefragt. Du kannst ihn bestätigen.";
  }
  if (error.message === "discovery_matching_start_request_forbidden") {
    return "Du kannst den gemeinsamen Matching-Start aktuell nicht anfragen.";
  }

  return "Der gemeinsame Matching-Start konnte gerade nicht angefragt werden.";
}

function fullMatchingConfirmErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Der gemeinsame Matching-Start konnte gerade nicht bestätigt werden.";
  }

  if (error.message === "discovery_matching_start_unavailable") {
    return "Dieser Matching-Schritt ist aktuell nicht verfügbar.";
  }
  if (error.message === "discovery_matching_start_relationship_exists") {
    return "Für euch gibt es bereits einen bestehenden Cofoundery-Kontext.";
  }
  if (error.message === "discovery_matching_start_self_confirm_forbidden") {
    return "Die andere Person muss den gemeinsamen Matching-Start bestätigen.";
  }
  if (error.message === "discovery_matching_start_confirm_forbidden") {
    return "Du kannst diesen Matching-Start aktuell nicht bestätigen.";
  }

  return "Der gemeinsame Matching-Start konnte gerade nicht bestätigt werden.";
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

export async function requestFullDiscoveryMatchingAction(
  introRequestId: string,
  matchingStartId: string
): Promise<DiscoveryMatchingStartActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      message: "Bitte melde dich an, um den Matching-Start anzufragen.",
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
      message: "Gemeinsamer Matching-Start angefragt.",
    };
  } catch (error) {
    return {
      ok: false,
      message: fullMatchingRequestErrorMessage(error),
    };
  }
}

export async function confirmFullDiscoveryMatchingAction(
  introRequestId: string,
  matchingStartId: string
): Promise<DiscoveryMatchingStartActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      message: "Bitte melde dich an, um den Matching-Start zu bestätigen.",
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
      message: "Gemeinsamer Matching-Start bestätigt.",
    };
  } catch (error) {
    return {
      ok: false,
      message: fullMatchingConfirmErrorMessage(error),
    };
  }
}
