export const MATCHING_WORKSPACE_START_SUCCESS_REASONS = [
  "workspace_prepared",
] as const;

export const MATCHING_WORKSPACE_START_ERROR_REASONS = [
  "not_authenticated",
  "session_unavailable",
  "report_not_ready",
  "report_missing",
  "participants_invalid",
  "workspace_start_failed",
] as const;

export type MatchingWorkspaceStartSuccessReason =
  (typeof MATCHING_WORKSPACE_START_SUCCESS_REASONS)[number];
export type MatchingWorkspaceStartErrorReason =
  (typeof MATCHING_WORKSPACE_START_ERROR_REASONS)[number];

export type MatchingWorkspaceStartResult =
  | { ok: true; reason: MatchingWorkspaceStartSuccessReason }
  | { ok: false; reason: MatchingWorkspaceStartErrorReason };

export type MatchingWorkspaceFeedbackReason =
  | MatchingWorkspaceStartSuccessReason
  | MatchingWorkspaceStartErrorReason
  | "unexpected_error";

export type MatchingWorkspaceFeedbackMessageKey =
  | "session.workspaceReadyTitle"
  | "session.workspaceFeedback.notAuthenticated"
  | "session.workspaceFeedback.sessionUnavailable"
  | "session.workspaceFeedback.reportNotReady"
  | "session.workspaceFeedback.reportMissing"
  | "session.workspaceFeedback.participantsInvalid"
  | "session.workspaceFeedback.startFailed"
  | "session.workspaceFeedback.unexpectedError";

export type MatchingWorkspaceFeedback = {
  ok: boolean;
  reason: MatchingWorkspaceFeedbackReason;
  messageKey: MatchingWorkspaceFeedbackMessageKey;
};

const successReasons = new Set<string>(
  MATCHING_WORKSPACE_START_SUCCESS_REASONS
);
const errorReasons = new Set<string>(MATCHING_WORKSPACE_START_ERROR_REASONS);

export function isMatchingWorkspaceStartSuccessReason(
  value: string
): value is MatchingWorkspaceStartSuccessReason {
  return successReasons.has(value);
}

export function isMatchingWorkspaceStartErrorReason(
  value: string
): value is MatchingWorkspaceStartErrorReason {
  return errorReasons.has(value);
}

export function getMatchingWorkspaceFeedbackMessageKey(
  reason: MatchingWorkspaceFeedbackReason
): MatchingWorkspaceFeedbackMessageKey {
  switch (reason) {
    case "workspace_prepared":
      return "session.workspaceReadyTitle";
    case "not_authenticated":
      return "session.workspaceFeedback.notAuthenticated";
    case "session_unavailable":
      return "session.workspaceFeedback.sessionUnavailable";
    case "report_not_ready":
      return "session.workspaceFeedback.reportNotReady";
    case "report_missing":
      return "session.workspaceFeedback.reportMissing";
    case "participants_invalid":
      return "session.workspaceFeedback.participantsInvalid";
    case "workspace_start_failed":
      return "session.workspaceFeedback.startFailed";
    case "unexpected_error":
      return "session.workspaceFeedback.unexpectedError";
  }
}

export function resolveMatchingWorkspaceFeedback(input: {
  result?: string | null;
  error?: string | null;
}): MatchingWorkspaceFeedback | null {
  if (input.error) {
    const reason = isMatchingWorkspaceStartErrorReason(input.error)
      ? input.error
      : "unexpected_error";

    return {
      ok: false,
      reason,
      messageKey: getMatchingWorkspaceFeedbackMessageKey(reason),
    };
  }

  if (input.result) {
    if (isMatchingWorkspaceStartSuccessReason(input.result)) {
      return {
        ok: true,
        reason: input.result,
        messageKey: getMatchingWorkspaceFeedbackMessageKey(input.result),
      };
    }

    return {
      ok: false,
      reason: "unexpected_error",
      messageKey: getMatchingWorkspaceFeedbackMessageKey("unexpected_error"),
    };
  }

  return null;
}
