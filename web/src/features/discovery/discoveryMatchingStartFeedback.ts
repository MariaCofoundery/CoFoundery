export const DISCOVERY_MATCHING_PREPARATION_SUCCESS_REASONS = [
  "matching_preparation_started",
] as const;

export const DISCOVERY_MATCHING_PREPARATION_ERROR_REASONS = [
  "not_authenticated",
  "matching_unavailable",
  "relationship_exists",
  "preparation_not_allowed",
  "preparation_failed",
] as const;

export const DISCOVERY_MATCHING_REQUEST_SUCCESS_REASONS = [
  "matching_start_requested",
] as const;

export const DISCOVERY_MATCHING_REQUEST_ERROR_REASONS = [
  "not_authenticated",
  "matching_unavailable",
  "relationship_exists",
  "other_participant_requested",
  "request_not_allowed",
  "request_failed",
] as const;

export const DISCOVERY_MATCHING_CONFIRMATION_SUCCESS_REASONS = [
  "matching_start_confirmed",
] as const;

export const DISCOVERY_MATCHING_CONFIRMATION_ERROR_REASONS = [
  "not_authenticated",
  "matching_unavailable",
  "relationship_exists",
  "self_confirmation_forbidden",
  "confirmation_not_allowed",
  "confirmation_failed",
] as const;

export const DISCOVERY_MATCHING_START_SUCCESS_REASONS = [
  ...DISCOVERY_MATCHING_PREPARATION_SUCCESS_REASONS,
  ...DISCOVERY_MATCHING_REQUEST_SUCCESS_REASONS,
  ...DISCOVERY_MATCHING_CONFIRMATION_SUCCESS_REASONS,
] as const;

export const DISCOVERY_MATCHING_START_ERROR_REASONS = [
  "not_authenticated",
  "matching_unavailable",
  "relationship_exists",
  "preparation_not_allowed",
  "preparation_failed",
  "other_participant_requested",
  "request_not_allowed",
  "request_failed",
  "self_confirmation_forbidden",
  "confirmation_not_allowed",
  "confirmation_failed",
] as const;

export type DiscoveryMatchingPreparationSuccessReason =
  (typeof DISCOVERY_MATCHING_PREPARATION_SUCCESS_REASONS)[number];
export type DiscoveryMatchingPreparationErrorReason =
  (typeof DISCOVERY_MATCHING_PREPARATION_ERROR_REASONS)[number];
export type DiscoveryMatchingRequestSuccessReason =
  (typeof DISCOVERY_MATCHING_REQUEST_SUCCESS_REASONS)[number];
export type DiscoveryMatchingRequestErrorReason =
  (typeof DISCOVERY_MATCHING_REQUEST_ERROR_REASONS)[number];
export type DiscoveryMatchingConfirmationSuccessReason =
  (typeof DISCOVERY_MATCHING_CONFIRMATION_SUCCESS_REASONS)[number];
export type DiscoveryMatchingConfirmationErrorReason =
  (typeof DISCOVERY_MATCHING_CONFIRMATION_ERROR_REASONS)[number];

export type DiscoveryMatchingPreparationResult =
  | { ok: true; reason: DiscoveryMatchingPreparationSuccessReason }
  | { ok: false; reason: DiscoveryMatchingPreparationErrorReason };

export type DiscoveryMatchingRequestResult =
  | { ok: true; reason: DiscoveryMatchingRequestSuccessReason }
  | { ok: false; reason: DiscoveryMatchingRequestErrorReason };

export type DiscoveryMatchingConfirmationResult =
  | { ok: true; reason: DiscoveryMatchingConfirmationSuccessReason }
  | { ok: false; reason: DiscoveryMatchingConfirmationErrorReason };

export type DiscoveryMatchingStartResult =
  | DiscoveryMatchingPreparationResult
  | DiscoveryMatchingRequestResult
  | DiscoveryMatchingConfirmationResult;

export type DiscoveryMatchingStartSuccessReason =
  (typeof DISCOVERY_MATCHING_START_SUCCESS_REASONS)[number];
export type DiscoveryMatchingStartErrorReason =
  (typeof DISCOVERY_MATCHING_START_ERROR_REASONS)[number];
export type DiscoveryMatchingStartFeedbackReason =
  | DiscoveryMatchingStartSuccessReason
  | DiscoveryMatchingStartErrorReason
  | "unexpected_error";

export type DiscoveryMatchingStartFeedbackMessageKey =
  | "matchingPreparation.states.startedTitle"
  | "matchingPreparation.feedback.matchingStartRequested"
  | "matchingPreparation.steps.bothConfirmed"
  | "matchingPreparation.feedback.notAuthenticated"
  | "matchingPreparation.unavailable.title"
  | "matchingPreparation.existingContextTitle"
  | "matchingPreparation.feedback.preparationNotAllowed"
  | "matchingPreparation.feedback.preparationFailed"
  | "matchingPreparation.feedback.otherParticipantRequested"
  | "matchingPreparation.feedback.requestNotAllowed"
  | "matchingPreparation.feedback.requestFailed"
  | "matchingPreparation.feedback.selfConfirmationForbidden"
  | "matchingPreparation.feedback.confirmationNotAllowed"
  | "matchingPreparation.feedback.confirmationFailed"
  | "matchingPreparation.feedback.unexpectedError";

export type DiscoveryMatchingStartFeedback = {
  ok: boolean;
  reason: DiscoveryMatchingStartFeedbackReason;
  messageKey: DiscoveryMatchingStartFeedbackMessageKey;
};

const successReasons = new Set<string>(DISCOVERY_MATCHING_START_SUCCESS_REASONS);
const errorReasons = new Set<string>(DISCOVERY_MATCHING_START_ERROR_REASONS);

export function isDiscoveryMatchingStartSuccessReason(
  value: string
): value is DiscoveryMatchingStartSuccessReason {
  return successReasons.has(value);
}

export function isDiscoveryMatchingStartErrorReason(
  value: string
): value is DiscoveryMatchingStartErrorReason {
  return errorReasons.has(value);
}

export function getDiscoveryMatchingStartFeedbackMessageKey(
  reason: DiscoveryMatchingStartFeedbackReason
): DiscoveryMatchingStartFeedbackMessageKey {
  switch (reason) {
    case "matching_preparation_started":
      return "matchingPreparation.states.startedTitle";
    case "matching_start_requested":
      return "matchingPreparation.feedback.matchingStartRequested";
    case "matching_start_confirmed":
      return "matchingPreparation.steps.bothConfirmed";
    case "not_authenticated":
      return "matchingPreparation.feedback.notAuthenticated";
    case "matching_unavailable":
      return "matchingPreparation.unavailable.title";
    case "relationship_exists":
      return "matchingPreparation.existingContextTitle";
    case "preparation_not_allowed":
      return "matchingPreparation.feedback.preparationNotAllowed";
    case "preparation_failed":
      return "matchingPreparation.feedback.preparationFailed";
    case "other_participant_requested":
      return "matchingPreparation.feedback.otherParticipantRequested";
    case "request_not_allowed":
      return "matchingPreparation.feedback.requestNotAllowed";
    case "request_failed":
      return "matchingPreparation.feedback.requestFailed";
    case "self_confirmation_forbidden":
      return "matchingPreparation.feedback.selfConfirmationForbidden";
    case "confirmation_not_allowed":
      return "matchingPreparation.feedback.confirmationNotAllowed";
    case "confirmation_failed":
      return "matchingPreparation.feedback.confirmationFailed";
    case "unexpected_error":
      return "matchingPreparation.feedback.unexpectedError";
  }
}

export function resolveDiscoveryMatchingStartFeedback(input: {
  result?: string | null;
  error?: string | null;
}): DiscoveryMatchingStartFeedback | null {
  if (input.error) {
    const reason = isDiscoveryMatchingStartErrorReason(input.error)
      ? input.error
      : "unexpected_error";

    return {
      ok: false,
      reason,
      messageKey: getDiscoveryMatchingStartFeedbackMessageKey(reason),
    };
  }

  if (input.result) {
    if (isDiscoveryMatchingStartSuccessReason(input.result)) {
      return {
        ok: true,
        reason: input.result,
        messageKey: getDiscoveryMatchingStartFeedbackMessageKey(input.result),
      };
    }

    return {
      ok: false,
      reason: "unexpected_error",
      messageKey: getDiscoveryMatchingStartFeedbackMessageKey("unexpected_error"),
    };
  }

  return null;
}
