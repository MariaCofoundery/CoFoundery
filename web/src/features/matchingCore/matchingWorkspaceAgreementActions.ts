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

function saveAgreementSectionErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Die Section konnte gerade nicht gespeichert werden.";
  }

  if (error.message === "matching_workspace_agreement_invalid_section_key") {
    return "Diese Agreement-Section ist nicht verfügbar.";
  }
  if (error.message === "matching_workspace_agreement_workspace_unavailable") {
    return "Dieser Arbeitsraum ist aktuell nicht verfügbar.";
  }
  if (error.message === "matching_workspace_agreement_workspace_not_prepared") {
    return "Der Arbeitsraum ist noch nicht bereit für das Operating Agreement.";
  }
  if (error.message === "matching_workspace_agreement_service_role_unavailable") {
    return "Die Speicherfunktion ist serverseitig nicht vollständig konfiguriert.";
  }

  return "Die Section konnte gerade nicht gespeichert werden.";
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
): Promise<MatchingWorkspaceAgreementActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      message: "Bitte melde dich an, um das Operating Agreement zu bearbeiten.",
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
      message: "Section gespeichert.",
      workspaceHref,
    };
  } catch (error) {
    return {
      ok: false,
      message: saveAgreementSectionErrorMessage(error),
    };
  }
}
