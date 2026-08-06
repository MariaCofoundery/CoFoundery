export const DISCOVERY_INTRO_ACTION_SUCCESS_REASONS = [
  "request_sent",
  "response_accepted",
  "response_declined",
  "request_canceled",
] as const;

export const DISCOVERY_INTRO_ACTION_ERROR_REASONS = [
  "not_authenticated",
  "requester_profile_inactive",
  "recipient_profile_inactive",
  "self_request_forbidden",
  "pending_request_exists",
  "request_failed",
  "invalid_response",
  "intro_not_pending",
  "response_forbidden",
  "response_failed",
  "cancel_forbidden",
  "cancel_failed",
] as const;

export type DiscoveryIntroActionSuccessReason =
  (typeof DISCOVERY_INTRO_ACTION_SUCCESS_REASONS)[number];
export type DiscoveryIntroActionErrorReason =
  (typeof DISCOVERY_INTRO_ACTION_ERROR_REASONS)[number];
export type DiscoveryIntroActionReason =
  | DiscoveryIntroActionSuccessReason
  | DiscoveryIntroActionErrorReason;

export type DiscoveryIntroActionState =
  | { ok: true; reason: DiscoveryIntroActionSuccessReason }
  | { ok: false; reason: DiscoveryIntroActionErrorReason };

export type DiscoveryIntroFeedbackKey =
  | `intros.feedback.${DiscoveryIntroActionReason}`
  | "intros.feedback.unexpected_error";

const successReasons = new Set<string>(DISCOVERY_INTRO_ACTION_SUCCESS_REASONS);
const errorReasons = new Set<string>(DISCOVERY_INTRO_ACTION_ERROR_REASONS);

export function resolveDiscoveryIntroFeedback(reason: string | null | undefined): {
  ok: boolean;
  messageKey: DiscoveryIntroFeedbackKey;
} {
  if (reason && successReasons.has(reason)) {
    return {
      ok: true,
      messageKey: `intros.feedback.${reason}` as DiscoveryIntroFeedbackKey,
    };
  }

  if (reason && errorReasons.has(reason)) {
    return {
      ok: false,
      messageKey: `intros.feedback.${reason}` as DiscoveryIntroFeedbackKey,
    };
  }

  return {
    ok: false,
    messageKey: "intros.feedback.unexpected_error",
  };
}
