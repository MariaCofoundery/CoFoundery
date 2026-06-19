"use server";

import { revalidatePath } from "next/cache";
import {
  cancelDiscoveryIntro,
  normalizeDiscoveryIntroMessage,
  requestDiscoveryIntro,
  respondDiscoveryIntro,
} from "@/features/discovery/discoveryIntroData";
import { isDiscoveryIntroResponseStatus } from "@/features/discovery/discoveryIntroTypes";
import { createClient } from "@/lib/supabase/server";

export type DiscoveryIntroActionState = {
  ok: boolean;
  message?: string;
};

function revalidateDiscoveryIntroPaths(profileId?: string) {
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
    message: "Bitte melde dich an, um Discovery-Intros zu nutzen.",
  };
}

function requestErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Deine Intro-Anfrage konnte gerade nicht gesendet werden.";
  }

  if (error.message === "discovery_intro_requester_profile_inactive") {
    return "Veröffentliche zuerst dein eigenes Discovery-Profil, bevor du ein Intro anfragst.";
  }
  if (error.message === "discovery_intro_recipient_profile_inactive") {
    return "Dieses Discovery-Profil ist aktuell nicht sichtbar.";
  }
  if (error.message === "discovery_intro_self_request_forbidden") {
    return "Du kannst für dein eigenes Profil kein Intro anfragen.";
  }
  if (error.message === "discovery_intro_pending_exists") {
    return "Für dieses Profil wartet bereits eine Intro-Anfrage auf Antwort.";
  }

  return "Deine Intro-Anfrage konnte gerade nicht gesendet werden.";
}

function responseErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Die Intro-Anfrage konnte gerade nicht beantwortet werden.";
  }

  if (error.message === "discovery_intro_not_pending") {
    return "Diese Anfrage ist nicht mehr offen.";
  }
  if (error.message === "discovery_intro_response_forbidden") {
    return "Du kannst diese Intro-Anfrage nicht beantworten.";
  }

  return "Die Intro-Anfrage konnte gerade nicht beantwortet werden.";
}

function cancelErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Die Intro-Anfrage konnte gerade nicht zurückgezogen werden.";
  }

  if (error.message === "discovery_intro_not_pending") {
    return "Diese Anfrage ist nicht mehr offen.";
  }
  if (error.message === "discovery_intro_cancel_forbidden") {
    return "Du kannst diese Intro-Anfrage nicht zurückziehen.";
  }

  return "Die Intro-Anfrage konnte gerade nicht zurückgezogen werden.";
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
      message: "Intro-Anfrage gesendet.",
    };
  } catch (error) {
    return {
      ok: false,
      message: requestErrorMessage(error),
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
      message: "Diese Antwort ist für Discovery-Intros nicht vorgesehen.",
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
      message: response === "accepted" ? "Intro angenommen." : "Intro abgelehnt.",
    };
  } catch (error) {
    return {
      ok: false,
      message: responseErrorMessage(error),
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
      message: "Anfrage zurückgezogen.",
    };
  } catch (error) {
    return {
      ok: false,
      message: cancelErrorMessage(error),
    };
  }
}
