import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  isMatchingWorkspaceStatus,
  type MatchingWorkspace,
  type MatchingWorkspaceSummary,
} from "@/features/matchingCore/matchingWorkspaceTypes";

const MATCHING_WORKSPACE_COLUMNS = [
  "id",
  "matching_session_id",
  "matching_report_run_id",
  "relationship_id",
  "created_by_user_id",
  "status",
  "created_at",
  "updated_at",
].join(", ");

type SupabaseError = {
  message?: string | null;
};

type MatchingWorkspaceRow = {
  id: string;
  matching_session_id: string;
  matching_report_run_id: string;
  relationship_id: string;
  created_by_user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type StartWorkspaceRpcRow = {
  matching_workspace_id: string;
  relationship_id: string;
};

function getErrorMessage(error: SupabaseError | null | undefined, fallback: string) {
  return error?.message ?? fallback;
}

function assertUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("matching_workspace_missing_user_id");
  }
  return normalized;
}

function assertMatchingSessionId(matchingSessionId: string) {
  const normalized = matchingSessionId.trim();
  if (!normalized) {
    throw new Error("matching_workspace_missing_matching_session_id");
  }
  return normalized;
}

function mapMatchingWorkspace(row: MatchingWorkspaceRow): MatchingWorkspace {
  if (!isMatchingWorkspaceStatus(row.status)) {
    throw new Error("matching_workspace_status_invalid");
  }

  return {
    id: row.id,
    matchingSessionId: row.matching_session_id,
    matchingReportRunId: row.matching_report_run_id,
    relationshipId: row.relationship_id,
    createdByUserId: row.created_by_user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseStartWorkspaceResult(value: unknown): StartWorkspaceRpcRow | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  const typed = row as Partial<StartWorkspaceRpcRow>;
  if (
    typeof typed.matching_workspace_id !== "string" ||
    typeof typed.relationship_id !== "string"
  ) {
    return null;
  }

  return {
    matching_workspace_id: typed.matching_workspace_id,
    relationship_id: typed.relationship_id,
  };
}

export async function getMatchingWorkspaceForSession(
  matchingSessionId: string,
  userId: string
): Promise<MatchingWorkspaceSummary | null> {
  const normalizedSessionId = assertMatchingSessionId(matchingSessionId);
  const normalizedUserId = assertUserId(userId);
  const supabase = await createClient();

  const { data: isParticipant, error: participantError } = await supabase.rpc(
    "is_matching_session_active_participant",
    {
      p_matching_session_id: normalizedSessionId,
      p_user_id: normalizedUserId,
    }
  );

  if (participantError) {
    throw new Error(getErrorMessage(participantError, "matching_workspace_participant_check_failed"));
  }

  if (isParticipant !== true) {
    return null;
  }

  const { data, error } = await supabase
    .from("matching_workspaces")
    .select(MATCHING_WORKSPACE_COLUMNS)
    .eq("matching_session_id", normalizedSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "matching_workspace_load_failed"));
  }

  if (!data) {
    return null;
  }

  return {
    workspace: mapMatchingWorkspace(data as unknown as MatchingWorkspaceRow),
  };
}

export async function startWorkspaceFromMatchingSession(params: {
  matchingSessionId: string;
  userId: string;
}): Promise<MatchingWorkspaceSummary> {
  const normalizedSessionId = assertMatchingSessionId(params.matchingSessionId);
  const normalizedUserId = assertUserId(params.userId);
  const existing = await getMatchingWorkspaceForSession(normalizedSessionId, normalizedUserId);
  if (existing) {
    return existing;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_workspace_from_matching_session", {
    p_matching_session_id: normalizedSessionId,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "matching_workspace_start_failed"));
  }

  const result = parseStartWorkspaceResult(data);
  if (!result) {
    throw new Error("matching_workspace_start_failed");
  }

  const summary = await getMatchingWorkspaceForSession(normalizedSessionId, normalizedUserId);
  if (!summary || summary.workspace.id !== result.matching_workspace_id) {
    throw new Error("matching_workspace_start_failed");
  }

  return summary;
}
