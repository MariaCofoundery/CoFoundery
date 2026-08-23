"use server";

import { revalidatePath } from "next/cache";
import {
  cancelDiscoveryIntro,
  normalizeDiscoveryIntroMessage,
  requestDiscoveryIntro,
  respondDiscoveryIntro,
} from "@/features/discovery/discoveryIntroData";
import type {
  DiscoveryIntroActionErrorReason,
  DiscoveryIntroActionState,
} from "@/features/discovery/discoveryIntroFeedback";
import { isDiscoveryIntroResponseStatus } from "@/features/discovery/discoveryIntroTypes";
import { createClient } from "@/lib/supabase/server";

function revalidateDiscoveryIntroPaths(profileId?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/discovery");
  revalidatePath("/discovery/intros");
  if (profileId) {
    revalidatePath(`/discovery/${profileId}`);
  }
}

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function unauthenticatedState(): DiscoveryIntroActionState {
  return {
    ok: false,
    reason: "not_authenticated",
  };
}

function requestErrorReason(error: unknown): DiscoveryIntroActionErrorReason {
  if (!(error instanceof Error)) {
    return "request_failed";
  }

  if (error.message === "discovery_intro_requester_profile_inactive") {
    return "requester_profile_inactive";
  }
  if (error.message === "discovery_intro_recipient_profile_inactive") {
    return "recipient_profile_inactive";
  }
  if (error.message === "discovery_intro_self_request_forbidden") {
    return "self_request_forbidden";
  }
  if (error.message === "discovery_intro_pending_exists") {
    return "pending_request_exists";
  }

  return "request_failed";
}

function responseErrorReason(error: unknown): DiscoveryIntroActionErrorReason {
  if (!(error instanceof Error)) {
    return "response_failed";
  }

  if (error.message === "discovery_intro_not_pending") {
    return "intro_not_pending";
  }
  if (error.message === "discovery_intro_response_forbidden") {
    return "response_forbidden";
  }

  return "response_failed";
}

function cancelErrorReason(error: unknown): DiscoveryIntroActionErrorReason {
  if (!(error instanceof Error)) {
    return "cancel_failed";
  }

  if (error.message === "discovery_intro_not_pending") {
    return "intro_not_pending";
  }
  if (error.message === "discovery_intro_cancel_forbidden") {
    return "cancel_forbidden";
  }

  return "cancel_failed";
}

export async function requestDiscoveryIntroAction(
  profileId: string,
  formData: FormData
): Promise<DiscoveryIntroActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedState();
  }

  try {
    await requestDiscoveryIntro({
      requesterUserId: userId,
      recipientProfileId: profileId,
      message: normalizeDiscoveryIntroMessage(getFormString(formData, "message")),
    });

    revalidateDiscoveryIntroPaths(profileId);
    return {
      ok: true,
      reason: "request_sent",
    };
  } catch (error) {
    return {
      ok: false,
      reason: requestErrorReason(error),
    };
  }
}

export async function respondDiscoveryIntroAction(
  introRequestId: string,
  response: string,
  formData: FormData
): Promise<DiscoveryIntroActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedState();
  }
  if (!isDiscoveryIntroResponseStatus(response)) {
    return {
      ok: false,
      reason: "invalid_response",
    };
  }

  try {
    await respondDiscoveryIntro({
      userId,
      introRequestId,
      response,
      responseMessage: normalizeDiscoveryIntroMessage(getFormString(formData, "responseMessage")),
    });

    revalidateDiscoveryIntroPaths();
    return {
      ok: true,
      reason: response === "accepted" ? "response_accepted" : "response_declined",
    };
  } catch (error) {
    return {
      ok: false,
      reason: responseErrorReason(error),
    };
  }
}

export async function cancelDiscoveryIntroAction(
  introRequestId: string
): Promise<DiscoveryIntroActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedState();
  }

  try {
    await cancelDiscoveryIntro({
      userId,
      introRequestId,
    });

    revalidateDiscoveryIntroPaths();
    return {
      ok: true,
      reason: "request_canceled",
    };
  } catch (error) {
    return {
      ok: false,
      reason: cancelErrorReason(error),
    };
  }
}
