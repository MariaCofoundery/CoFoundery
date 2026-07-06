"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startWorkspaceFromMatchingSession } from "@/features/matchingCore/matchingWorkspaceData";

export type MatchingWorkspaceActionState = {
  ok: boolean;
  message?: string;
  reportHref?: string;
};

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function createWorkspaceErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Der gemeinsame Arbeitsraum konnte gerade nicht vorbereitet werden.";
  }

  if (error.message === "matching_workspace_session_unavailable") {
    return "Dieser Matching-Arbeitsraum ist aktuell nicht verfügbar.";
  }
  if (error.message === "matching_workspace_session_not_report_ready") {
    return "Der Dynamik-Report muss erstellt sein, bevor ihr den Arbeitsraum vorbereitet.";
  }
  if (error.message === "matching_workspace_report_missing") {
    return "Für diese Matching-Session fehlt noch der Dynamik-Report.";
  }
  if (error.message === "matching_workspace_participants_invalid") {
    return "Der Arbeitsraum kann nur für genau zwei aktive Founder vorbereitet werden.";
  }

  return "Der gemeinsame Arbeitsraum konnte gerade nicht vorbereitet werden.";
}

export async function startWorkspaceFromMatchingSessionAction(
  matchingSessionId: string
): Promise<MatchingWorkspaceActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      message: "Bitte melde dich an, um den gemeinsamen Arbeitsraum vorzubereiten.",
    };
  }

  try {
    const workspace = await startWorkspaceFromMatchingSession({
      matchingSessionId,
      userId,
    });
    const reportHref = `/matching/${workspace.workspace.matchingSessionId}/report`;

    revalidatePath(reportHref);
    revalidatePath("/discovery/intros");
    return {
      ok: true,
      message: "Arbeitsraum vorbereitet.",
      reportHref,
    };
  } catch (error) {
    return {
      ok: false,
      message: createWorkspaceErrorMessage(error),
    };
  }
}
