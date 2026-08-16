"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startWorkspaceFromMatchingSession } from "@/features/matchingCore/matchingWorkspaceData";
import type {
  MatchingWorkspaceStartErrorReason,
  MatchingWorkspaceStartResult,
} from "@/features/matchingCore/matchingWorkspaceFeedback";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function getWorkspaceStartErrorReason(
  error: unknown
): MatchingWorkspaceStartErrorReason {
  if (!(error instanceof Error)) {
    return "workspace_start_failed";
  }

  if (error.message === "matching_workspace_session_unavailable") {
    return "session_unavailable";
  }
  if (error.message === "matching_workspace_session_not_report_ready") {
    return "report_not_ready";
  }
  if (error.message === "matching_workspace_report_missing") {
    return "report_missing";
  }
  if (error.message === "matching_workspace_participants_invalid") {
    return "participants_invalid";
  }

  return "workspace_start_failed";
}

export async function startWorkspaceFromMatchingSessionAction(
  matchingSessionId: string
): Promise<MatchingWorkspaceStartResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
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
      reason: "workspace_prepared",
    };
  } catch (error) {
    return {
      ok: false,
      reason: getWorkspaceStartErrorReason(error),
    };
  }
}
