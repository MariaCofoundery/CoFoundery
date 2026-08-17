export const MATCHING_SESSION_SUCCESS_REASONS = ["matching_session_prepared"] as const;

export const MATCHING_SESSION_ERROR_REASONS = [
  "not_authenticated",
  "matching_unavailable",
  "confirmation_incomplete",
  "relationship_exists",
  "profiles_inactive",
  "local_session_unavailable",
  "session_prepare_failed",
] as const;

export const MATCHING_REPORT_SUCCESS_REASONS = ["matching_report_created"] as const;

export const MATCHING_REPORT_ERROR_REASONS = [
  "not_authenticated",
  "report_unavailable",
  "session_not_ready",
  "required_answers_missing",
  "local_report_unavailable",
  "values_report_not_supported",
  "report_creation_failed",
] as const;

export type MatchingSessionSuccessReason =
  (typeof MATCHING_SESSION_SUCCESS_REASONS)[number];
export type MatchingSessionErrorReason =
  (typeof MATCHING_SESSION_ERROR_REASONS)[number];
export type MatchingReportSuccessReason =
  (typeof MATCHING_REPORT_SUCCESS_REASONS)[number];
export type MatchingReportErrorReason =
  (typeof MATCHING_REPORT_ERROR_REASONS)[number];

export type MatchingSessionPreparationResult =
  | { ok: true; reason: MatchingSessionSuccessReason }
  | { ok: false; reason: MatchingSessionErrorReason };

export type MatchingReportCreationResult =
  | {
      ok: true;
      reason: MatchingReportSuccessReason;
      reportHref: string;
    }
  | { ok: false; reason: MatchingReportErrorReason };

export type MatchingSessionFeedbackReason =
  | MatchingSessionSuccessReason
  | MatchingSessionErrorReason
  | "unexpected_error";
export type MatchingReportFeedbackReason =
  | MatchingReportSuccessReason
  | MatchingReportErrorReason
  | "unexpected_error";

export type MatchingSessionFeedbackMessageKey =
  | "matchingPreparation.feedback.sessionPrepared"
  | "matchingPreparation.feedback.notAuthenticated"
  | "matchingPreparation.unavailable.title"
  | "matchingPreparation.feedback.confirmationIncomplete"
  | "matchingPreparation.existingContextTitle"
  | "matchingPreparation.feedback.profilesInactive"
  | "matchingPreparation.feedback.localSessionUnavailable"
  | "matchingPreparation.feedback.sessionPrepareFailed"
  | "matchingPreparation.feedback.unexpectedError";

export type MatchingReportFeedbackMessageKey =
  | "matchingPreparation.feedback.reportCreated"
  | "matchingPreparation.feedback.notAuthenticated"
  | "matchingPreparation.feedback.reportUnavailable"
  | "matchingPreparation.feedback.sessionNotReady"
  | "matchingPreparation.feedback.requiredAnswersMissing"
  | "matchingPreparation.feedback.localReportUnavailable"
  | "matchingPreparation.feedback.valuesReportNotSupported"
  | "matchingPreparation.feedback.reportCreationFailed"
  | "matchingPreparation.feedback.unexpectedError";

export type MatchingSessionFeedback = {
  ok: boolean;
  reason: MatchingSessionFeedbackReason;
  messageKey: MatchingSessionFeedbackMessageKey;
};

export type MatchingReportFeedback = {
  ok: boolean;
  reason: MatchingReportFeedbackReason;
  messageKey: MatchingReportFeedbackMessageKey;
};

const sessionSuccessReasons = new Set<string>(MATCHING_SESSION_SUCCESS_REASONS);
const sessionErrorReasons = new Set<string>(MATCHING_SESSION_ERROR_REASONS);
const reportSuccessReasons = new Set<string>(MATCHING_REPORT_SUCCESS_REASONS);
const reportErrorReasons = new Set<string>(MATCHING_REPORT_ERROR_REASONS);

export function isMatchingSessionSuccessReason(
  value: string
): value is MatchingSessionSuccessReason {
  return sessionSuccessReasons.has(value);
}

export function isMatchingSessionErrorReason(
  value: string
): value is MatchingSessionErrorReason {
  return sessionErrorReasons.has(value);
}

export function isMatchingReportSuccessReason(
  value: string
): value is MatchingReportSuccessReason {
  return reportSuccessReasons.has(value);
}

export function isMatchingReportErrorReason(
  value: string
): value is MatchingReportErrorReason {
  return reportErrorReasons.has(value);
}

export function getMatchingSessionFeedbackMessageKey(
  reason: MatchingSessionFeedbackReason
): MatchingSessionFeedbackMessageKey {
  switch (reason) {
    case "matching_session_prepared":
      return "matchingPreparation.feedback.sessionPrepared";
    case "not_authenticated":
      return "matchingPreparation.feedback.notAuthenticated";
    case "matching_unavailable":
      return "matchingPreparation.unavailable.title";
    case "confirmation_incomplete":
      return "matchingPreparation.feedback.confirmationIncomplete";
    case "relationship_exists":
      return "matchingPreparation.existingContextTitle";
    case "profiles_inactive":
      return "matchingPreparation.feedback.profilesInactive";
    case "local_session_unavailable":
      return "matchingPreparation.feedback.localSessionUnavailable";
    case "session_prepare_failed":
      return "matchingPreparation.feedback.sessionPrepareFailed";
    case "unexpected_error":
      return "matchingPreparation.feedback.unexpectedError";
  }
}

export function getMatchingReportFeedbackMessageKey(
  reason: MatchingReportFeedbackReason
): MatchingReportFeedbackMessageKey {
  switch (reason) {
    case "matching_report_created":
      return "matchingPreparation.feedback.reportCreated";
    case "not_authenticated":
      return "matchingPreparation.feedback.notAuthenticated";
    case "report_unavailable":
      return "matchingPreparation.feedback.reportUnavailable";
    case "session_not_ready":
      return "matchingPreparation.feedback.sessionNotReady";
    case "required_answers_missing":
      return "matchingPreparation.feedback.requiredAnswersMissing";
    case "local_report_unavailable":
      return "matchingPreparation.feedback.localReportUnavailable";
    case "values_report_not_supported":
      return "matchingPreparation.feedback.valuesReportNotSupported";
    case "report_creation_failed":
      return "matchingPreparation.feedback.reportCreationFailed";
    case "unexpected_error":
      return "matchingPreparation.feedback.unexpectedError";
  }
}

export function resolveMatchingSessionFeedback(input: {
  result?: string | null;
  error?: string | null;
}): MatchingSessionFeedback | null {
  if (input.error) {
    const reason = isMatchingSessionErrorReason(input.error)
      ? input.error
      : "unexpected_error";
    return {
      ok: false,
      reason,
      messageKey: getMatchingSessionFeedbackMessageKey(reason),
    };
  }

  if (input.result) {
    if (isMatchingSessionSuccessReason(input.result)) {
      return {
        ok: true,
        reason: input.result,
        messageKey: getMatchingSessionFeedbackMessageKey(input.result),
      };
    }
    return {
      ok: false,
      reason: "unexpected_error",
      messageKey: getMatchingSessionFeedbackMessageKey("unexpected_error"),
    };
  }

  return null;
}

export function resolveMatchingReportFeedback(input: {
  result?: string | null;
  error?: string | null;
}): MatchingReportFeedback | null {
  if (input.error) {
    const reason = isMatchingReportErrorReason(input.error)
      ? input.error
      : "unexpected_error";
    return {
      ok: false,
      reason,
      messageKey: getMatchingReportFeedbackMessageKey(reason),
    };
  }

  if (input.result) {
    if (isMatchingReportSuccessReason(input.result)) {
      return {
        ok: true,
        reason: input.result,
        messageKey: getMatchingReportFeedbackMessageKey(input.result),
      };
    }
    return {
      ok: false,
      reason: "unexpected_error",
      messageKey: getMatchingReportFeedbackMessageKey("unexpected_error"),
    };
  }

  return null;
}

type FeedbackCandidate = {
  ok: boolean;
  reason: string;
};

export function selectMatchingPreparationFeedback<
  TStart extends FeedbackCandidate,
  TSession extends FeedbackCandidate,
  TReport extends FeedbackCandidate,
>(input: {
  matchingStartError: TStart | null;
  matchingSessionError: TSession | null;
  matchingReportError: TReport | null;
  matchingStartResult: TStart | null;
  matchingSessionResult: TSession | null;
  matchingReportResult: TReport | null;
}): TStart | TSession | TReport | null {
  return (
    input.matchingStartError ??
    input.matchingSessionError ??
    input.matchingReportError ??
    input.matchingStartResult ??
    input.matchingSessionResult ??
    input.matchingReportResult
  );
}
