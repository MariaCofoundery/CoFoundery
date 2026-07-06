"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createOrGetMatchingWorkspaceAgreement } from "@/features/matchingCore/matchingWorkspaceAgreementData";

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
