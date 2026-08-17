export const MATCHING_WORKSPACE_AGREEMENT_SUCCESS_REASONS = [
  "agreement_section_saved",
] as const;

export const MATCHING_WORKSPACE_AGREEMENT_ERROR_REASONS = [
  "not_authenticated",
  "invalid_section",
  "workspace_unavailable",
  "workspace_not_prepared",
  "agreement_save_failed",
] as const;

export type MatchingWorkspaceAgreementSuccessReason =
  (typeof MATCHING_WORKSPACE_AGREEMENT_SUCCESS_REASONS)[number];
export type MatchingWorkspaceAgreementErrorReason =
  (typeof MATCHING_WORKSPACE_AGREEMENT_ERROR_REASONS)[number];

export type MatchingWorkspaceAgreementSectionSaveResult =
  | { ok: true; reason: MatchingWorkspaceAgreementSuccessReason }
  | { ok: false; reason: MatchingWorkspaceAgreementErrorReason };

export type MatchingWorkspaceAgreementFeedbackReason =
  | MatchingWorkspaceAgreementSuccessReason
  | MatchingWorkspaceAgreementErrorReason
  | "unexpected_error";

export type MatchingWorkspaceAgreementFeedbackMessageKey =
  | "agreement.feedback.sectionSaved"
  | "agreement.feedback.notAuthenticated"
  | "agreement.feedback.invalidSection"
  | "agreement.feedback.workspaceUnavailable"
  | "agreement.feedback.workspaceNotPrepared"
  | "agreement.feedback.saveFailed"
  | "agreement.feedback.unexpectedError";

export type MatchingWorkspaceAgreementFeedback = {
  ok: boolean;
  reason: MatchingWorkspaceAgreementFeedbackReason;
  messageKey: MatchingWorkspaceAgreementFeedbackMessageKey;
};

const successReasons = new Set<string>(MATCHING_WORKSPACE_AGREEMENT_SUCCESS_REASONS);
const errorReasons = new Set<string>(MATCHING_WORKSPACE_AGREEMENT_ERROR_REASONS);

export function isMatchingWorkspaceAgreementSuccessReason(
  value: string
): value is MatchingWorkspaceAgreementSuccessReason {
  return successReasons.has(value);
}

export function isMatchingWorkspaceAgreementErrorReason(
  value: string
): value is MatchingWorkspaceAgreementErrorReason {
  return errorReasons.has(value);
}

export function getMatchingWorkspaceAgreementFeedbackMessageKey(
  reason: MatchingWorkspaceAgreementFeedbackReason
): MatchingWorkspaceAgreementFeedbackMessageKey {
  switch (reason) {
    case "agreement_section_saved":
      return "agreement.feedback.sectionSaved";
    case "not_authenticated":
      return "agreement.feedback.notAuthenticated";
    case "invalid_section":
      return "agreement.feedback.invalidSection";
    case "workspace_unavailable":
      return "agreement.feedback.workspaceUnavailable";
    case "workspace_not_prepared":
      return "agreement.feedback.workspaceNotPrepared";
    case "agreement_save_failed":
      return "agreement.feedback.saveFailed";
    case "unexpected_error":
      return "agreement.feedback.unexpectedError";
  }
}

export function resolveMatchingWorkspaceAgreementFeedback(input: {
  result?: string | null;
  error?: string | null;
}): MatchingWorkspaceAgreementFeedback | null {
  if (input.error) {
    const reason = isMatchingWorkspaceAgreementErrorReason(input.error)
      ? input.error
      : "unexpected_error";
    return {
      ok: false,
      reason,
      messageKey: getMatchingWorkspaceAgreementFeedbackMessageKey(reason),
    };
  }

  if (input.result) {
    if (isMatchingWorkspaceAgreementSuccessReason(input.result)) {
      return {
        ok: true,
        reason: input.result,
        messageKey: getMatchingWorkspaceAgreementFeedbackMessageKey(input.result),
      };
    }
    return {
      ok: false,
      reason: "unexpected_error",
      messageKey: getMatchingWorkspaceAgreementFeedbackMessageKey("unexpected_error"),
    };
  }

  return null;
}
