export const DISCOVERY_PROFILE_PUBLISH_SUCCESS_REASONS = ["profile_published"] as const;

export const DISCOVERY_PROFILE_DRAFT_SUCCESS_REASONS = ["draft_saved"] as const;

export const DISCOVERY_PROFILE_DRAFT_ERROR_REASONS = [
  "not_authenticated",
  "draft_save_failed",
] as const;

export const DISCOVERY_PROFILE_PUBLISH_ERROR_REASONS = [
  "not_authenticated",
  "profile_missing",
  "profile_not_publishable",
  "publish_failed",
] as const;

export const DISCOVERY_PROFILE_PUBLISH_ISSUES = [
  "displayName",
  "headline",
  "ownRoles",
  "seekingRoles",
  "availability",
  "commitment",
  "ventureStage",
  "ventureGoal",
] as const;

export type DiscoveryProfilePublishSuccessReason =
  (typeof DISCOVERY_PROFILE_PUBLISH_SUCCESS_REASONS)[number];
export type DiscoveryProfilePublishErrorReason =
  (typeof DISCOVERY_PROFILE_PUBLISH_ERROR_REASONS)[number];
export type DiscoveryProfilePublishReason =
  | DiscoveryProfilePublishSuccessReason
  | DiscoveryProfilePublishErrorReason;
export type DiscoveryProfilePublishIssue =
  (typeof DISCOVERY_PROFILE_PUBLISH_ISSUES)[number];

export type DiscoveryProfileDraftSuccessReason =
  (typeof DISCOVERY_PROFILE_DRAFT_SUCCESS_REASONS)[number];
export type DiscoveryProfileDraftErrorReason =
  (typeof DISCOVERY_PROFILE_DRAFT_ERROR_REASONS)[number];
export type DiscoveryProfileDraftReason =
  | DiscoveryProfileDraftSuccessReason
  | DiscoveryProfileDraftErrorReason;

export type DiscoveryProfileDraftResult =
  | { ok: true; reason: DiscoveryProfileDraftSuccessReason }
  | { ok: false; reason: DiscoveryProfileDraftErrorReason };

export type DiscoveryProfileDraftFeedbackReason =
  | DiscoveryProfileDraftReason
  | "unexpected_error";

export type DiscoveryProfileDraftMessageKey =
  | "profile.messages.draftSaved"
  | "profile.messages.notAuthenticated"
  | "profile.messages.draftSaveFailed"
  | "profile.messages.fallbackError";

export type DiscoveryProfilePublishResult =
  | { ok: true; reason: DiscoveryProfilePublishSuccessReason }
  | {
      ok: false;
      reason: DiscoveryProfilePublishErrorReason;
      issues?: DiscoveryProfilePublishIssue[];
    };

export type DiscoveryProfilePublishFeedbackReason =
  | DiscoveryProfilePublishReason
  | "unexpected_error";

export type DiscoveryProfilePublishMessageKey =
  | "profile.messages.published"
  | "profile.messages.notAuthenticated"
  | "profile.messages.profileMissing"
  | "profile.actions.publishIssues"
  | "profile.messages.publishFailed"
  | "profile.messages.fallbackError";

const publishSuccessReasons = new Set<string>(DISCOVERY_PROFILE_PUBLISH_SUCCESS_REASONS);
const publishErrorReasons = new Set<string>(DISCOVERY_PROFILE_PUBLISH_ERROR_REASONS);
const publishIssues = new Set<string>(DISCOVERY_PROFILE_PUBLISH_ISSUES);
const draftSuccessReasons = new Set<string>(DISCOVERY_PROFILE_DRAFT_SUCCESS_REASONS);
const draftErrorReasons = new Set<string>(DISCOVERY_PROFILE_DRAFT_ERROR_REASONS);

const publishIssueByValidationText: Record<string, DiscoveryProfilePublishIssue> = {
  "Gib deinem Suchprofil einen Namen, der mindestens 2 Zeichen lang ist.": "displayName",
  "Ergänze eine kurze Headline, damit andere dich einordnen können.": "headline",
  "Wähle mindestens eine Rolle, die du selbst einbringst.": "ownRoles",
  "Wähle mindestens eine Rolle, die du bei einem Co-Founder suchst.": "seekingRoles",
  "Gib an, wie viel Zeit du pro Woche ungefähr einbringen kannst.": "availability",
  "Wähle ein Commitment-Level, bevor du dein Profil veröffentlichst.": "commitment",
  "Wähle, wo du gerade mit deiner Idee oder Suche stehst.": "ventureStage",
  "Wähle, welche Art von Aufbau du gerade suchst.": "ventureGoal",
};

export function mapDiscoveryProfilePublishIssues(
  values: readonly string[]
): DiscoveryProfilePublishIssue[] {
  return values
    .map((value) => publishIssueByValidationText[value])
    .filter((value): value is DiscoveryProfilePublishIssue => value !== undefined);
}

export function filterDiscoveryProfilePublishIssues(
  values: readonly string[]
): DiscoveryProfilePublishIssue[] {
  return values.filter((value): value is DiscoveryProfilePublishIssue => publishIssues.has(value));
}

export function getDiscoveryProfilePublishMessageKey(
  reason: DiscoveryProfilePublishFeedbackReason
): DiscoveryProfilePublishMessageKey {
  switch (reason) {
    case "profile_published":
      return "profile.messages.published";
    case "not_authenticated":
      return "profile.messages.notAuthenticated";
    case "profile_missing":
      return "profile.messages.profileMissing";
    case "profile_not_publishable":
      return "profile.actions.publishIssues";
    case "publish_failed":
      return "profile.messages.publishFailed";
    case "unexpected_error":
      return "profile.messages.fallbackError";
  }
}

export function getDiscoveryProfileDraftMessageKey(
  reason: DiscoveryProfileDraftFeedbackReason
): DiscoveryProfileDraftMessageKey {
  switch (reason) {
    case "draft_saved":
      return "profile.messages.draftSaved";
    case "not_authenticated":
      return "profile.messages.notAuthenticated";
    case "draft_save_failed":
      return "profile.messages.draftSaveFailed";
    case "unexpected_error":
      return "profile.messages.fallbackError";
  }
}

export function resolveDiscoveryProfileDraftFeedback({
  result,
  error,
}: {
  result?: string | null;
  error?: string | null;
}): {
  ok: boolean;
  reason: DiscoveryProfileDraftFeedbackReason;
  messageKey: DiscoveryProfileDraftMessageKey;
} | null {
  if (error) {
    const reason: DiscoveryProfileDraftFeedbackReason = draftErrorReasons.has(error)
      ? (error as DiscoveryProfileDraftErrorReason)
      : "unexpected_error";
    return {
      ok: false,
      reason,
      messageKey: getDiscoveryProfileDraftMessageKey(reason),
    };
  }

  if (result) {
    const reason: DiscoveryProfileDraftFeedbackReason = draftSuccessReasons.has(result)
      ? (result as DiscoveryProfileDraftSuccessReason)
      : "unexpected_error";
    return {
      ok: reason === "draft_saved",
      reason,
      messageKey: getDiscoveryProfileDraftMessageKey(reason),
    };
  }

  return null;
}

export function resolveDiscoveryProfilePublishFeedback({
  result,
  error,
  issues = [],
}: {
  result?: string | null;
  error?: string | null;
  issues?: readonly string[];
}): {
  ok: boolean;
  reason: DiscoveryProfilePublishFeedbackReason;
  messageKey: DiscoveryProfilePublishMessageKey;
  issues: DiscoveryProfilePublishIssue[];
} | null {
  const validatedIssues = filterDiscoveryProfilePublishIssues(issues);

  if (error) {
    const reason: DiscoveryProfilePublishFeedbackReason = publishErrorReasons.has(error)
      ? (error as DiscoveryProfilePublishErrorReason)
      : "unexpected_error";
    return {
      ok: false,
      reason,
      messageKey: getDiscoveryProfilePublishMessageKey(reason),
      issues: reason === "profile_not_publishable" ? validatedIssues : [],
    };
  }

  if (result) {
    const reason: DiscoveryProfilePublishFeedbackReason = publishSuccessReasons.has(result)
      ? (result as DiscoveryProfilePublishSuccessReason)
      : "unexpected_error";
    return {
      ok: reason === "profile_published",
      reason,
      messageKey: getDiscoveryProfilePublishMessageKey(reason),
      issues: [],
    };
  }

  if (issues.length > 0) {
    return {
      ok: false,
      reason: "unexpected_error",
      messageKey: getDiscoveryProfilePublishMessageKey("unexpected_error"),
      issues: [],
    };
  }

  return null;
}
