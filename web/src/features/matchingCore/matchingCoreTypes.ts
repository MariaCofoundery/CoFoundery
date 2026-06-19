import type { DiscoveryProfilePreview } from "@/features/discovery/discoveryTypes";

export const MATCHING_SESSION_SOURCE_TYPES = [
  "discovery_matching_start",
  "invitation",
  "manual",
  "program",
  "advisor",
] as const;

export type MatchingSessionSourceType = (typeof MATCHING_SESSION_SOURCE_TYPES)[number];

export const MATCHING_SESSION_STATUSES = [
  "awaiting_inputs",
  "ready_for_report",
  "report_ready",
  "canceled",
] as const;

export type MatchingSessionStatus = (typeof MATCHING_SESSION_STATUSES)[number];

export type MatchingSessionModule = "base" | "values";

export type MatchingSession = {
  id: string;
  sourceType: MatchingSessionSourceType;
  sourceId: string | null;
  status: MatchingSessionStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  canceledAt: string | null;
  reportReadyAt: string | null;
};

export type MatchingSessionParticipant = {
  matchingSessionId: string;
  userId: string;
  role: "founder" | "advisor_viewer";
  status: "active" | "left" | "removed";
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchingSessionModuleConfig = {
  matchingSessionId: string;
  module: MatchingSessionModule;
  required: boolean;
  createdAt: string;
};

export type MatchingSessionInput = {
  id: string;
  matchingSessionId: string;
  userId: string;
  module: MatchingSessionModule;
  assessmentId: string;
  createdAt: string;
  updatedAt: string;
};

export type MatchingSessionParticipantReadiness = {
  userId: string;
  profile: DiscoveryProfilePreview | null;
  baseInputStatus: "present" | "missing";
};

export type MatchingSessionSummary = {
  session: MatchingSession;
  participants: MatchingSessionParticipantReadiness[];
  requiredModules: MatchingSessionModule[];
};

export function isMatchingSessionStatus(value: string): value is MatchingSessionStatus {
  return MATCHING_SESSION_STATUSES.includes(value as MatchingSessionStatus);
}

export function isMatchingSessionSourceType(value: string): value is MatchingSessionSourceType {
  return MATCHING_SESSION_SOURCE_TYPES.includes(value as MatchingSessionSourceType);
}

export function getMatchingSessionInputReadinessStatus(params: {
  activeParticipantUserIds: string[];
  requiredModules: MatchingSessionModule[];
  submittedInputs: Array<{ userId: string; module: MatchingSessionModule }>;
}): Extract<MatchingSessionStatus, "awaiting_inputs" | "ready_for_report"> {
  const participantUserIds = [...new Set(params.activeParticipantUserIds.filter(Boolean))];
  const requiredModules = [...new Set(params.requiredModules)];

  if (participantUserIds.length === 0 || requiredModules.length === 0) {
    return "awaiting_inputs";
  }

  const inputKeys = new Set(
    params.submittedInputs.map((input) => `${input.userId}:${input.module}`)
  );
  const allRequiredInputsPresent = participantUserIds.every((userId) =>
    requiredModules.every((module) => inputKeys.has(`${userId}:${module}`))
  );

  return allRequiredInputsPresent ? "ready_for_report" : "awaiting_inputs";
}

export function canCreateMatchingSessionFromDiscoveryStart(params: {
  discoveryMatchingStartStatus: string;
  requesterUserId: string;
  recipientUserId: string;
  userId: string;
  relationshipExists?: boolean;
}) {
  return (
    params.discoveryMatchingStartStatus === "ready_for_matching" &&
    params.requesterUserId !== params.recipientUserId &&
    (params.userId === params.requesterUserId || params.userId === params.recipientUserId) &&
    params.relationshipExists !== true
  );
}
