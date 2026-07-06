export const MATCHING_WORKSPACE_STATUSES = ["prepared"] as const;

export type MatchingWorkspaceStatus = (typeof MATCHING_WORKSPACE_STATUSES)[number];

export type MatchingWorkspace = {
  id: string;
  matchingSessionId: string;
  matchingReportRunId: string;
  relationshipId: string;
  createdByUserId: string;
  status: MatchingWorkspaceStatus;
  createdAt: string;
  updatedAt: string;
};

export type MatchingWorkspaceSummary = {
  workspace: MatchingWorkspace;
};

export function isMatchingWorkspaceStatus(value: string): value is MatchingWorkspaceStatus {
  return MATCHING_WORKSPACE_STATUSES.includes(value as MatchingWorkspaceStatus);
}

export function canStartMatchingWorkspaceFromSession(params: {
  sessionStatus: string;
  currentUserIsParticipant: boolean;
  reportRunExists: boolean;
  existingWorkspaceId?: string | null;
}) {
  if (params.existingWorkspaceId) {
    return true;
  }

  return (
    params.sessionStatus === "report_ready" &&
    params.currentUserIsParticipant &&
    params.reportRunExists
  );
}
