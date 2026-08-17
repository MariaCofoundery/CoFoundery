"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createOrGetMatchingWorkspaceAgreement,
  updateMatchingWorkspaceAgreementSection,
} from "@/features/matchingCore/matchingWorkspaceAgreementData";
import {
  isMatchingWorkspaceAgreementSectionKey,
  normalizeMatchingWorkspaceAgreementSectionInput,
} from "@/features/matchingCore/matchingWorkspaceAgreementTypes";
import type {
  MatchingWorkspaceAgreementErrorReason,
  MatchingWorkspaceAgreementSectionSaveResult,
} from "@/features/matchingCore/matchingWorkspaceAgreementFeedback";

export type MatchingWorkspaceAgreementActionState = {
  ok: boolean;
  message?: string;
  workspaceHref?: string;
};

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function createAgreementErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Das Operating Agreement konnte gerade nicht vorbereitet werden.";
  }

  if (error.message === "matching_workspace_agreement_workspace_unavailable") {
    return "Dieser Arbeitsraum ist aktuell nicht verfügbar.";
  }
  if (error.message === "matching_workspace_agreement_workspace_not_prepared") {
    return "Der Arbeitsraum ist noch nicht bereit für das Operating Agreement.";
  }

  return "Das Operating Agreement konnte gerade nicht vorbereitet werden.";
}

function saveAgreementSectionErrorReason(
  error: unknown
): MatchingWorkspaceAgreementErrorReason {
  if (!(error instanceof Error)) {
    return "agreement_save_failed";
  }

  if (error.message === "matching_workspace_agreement_invalid_section_key") {
    return "invalid_section";
  }
  if (error.message === "matching_workspace_agreement_workspace_unavailable") {
    return "workspace_unavailable";
  }
  if (error.message === "matching_workspace_agreement_workspace_not_prepared") {
    return "workspace_not_prepared";
  }
  if (error.message === "matching_workspace_agreement_service_role_unavailable") {
    return "agreement_save_failed";
  }

  return "agreement_save_failed";
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function createOrGetMatchingWorkspaceAgreementAction(
  workspaceId: string
): Promise<MatchingWorkspaceAgreementActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      message: "Bitte melde dich an, um das Operating Agreement vorzubereiten.",
    };
  }

  try {
    await createOrGetMatchingWorkspaceAgreement({
      workspaceId,
      userId,
    });
    const workspaceHref = `/workspaces/${workspaceId}`;

    revalidatePath(workspaceHref);
    return {
      ok: true,
      message: "Operating Agreement vorbereitet.",
      workspaceHref,
    };
  } catch (error) {
    return {
      ok: false,
      message: createAgreementErrorMessage(error),
    };
  }
}

export async function saveMatchingWorkspaceAgreementSectionAction(
  workspaceId: string,
  formData: FormData
): Promise<MatchingWorkspaceAgreementSectionSaveResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    const sectionKey = getFormString(formData, "sectionKey");
    if (!isMatchingWorkspaceAgreementSectionKey(sectionKey)) {
      throw new Error("matching_workspace_agreement_invalid_section_key");
    }

    const sectionInput = normalizeMatchingWorkspaceAgreementSectionInput({
      notes: getFormString(formData, "notes"),
      agreement: getFormString(formData, "agreement"),
    });

    await updateMatchingWorkspaceAgreementSection({
      workspaceId,
      userId,
      sectionKey,
      notes: sectionInput.notes,
      agreement: sectionInput.agreement,
    });

    const workspaceHref = `/workspaces/${workspaceId}`;
    revalidatePath(workspaceHref);
    return {
      ok: true,
      reason: "agreement_section_saved",
    };
  } catch (error) {
    return {
      ok: false,
      reason: saveAgreementSectionErrorReason(error),
    };
  }
}
