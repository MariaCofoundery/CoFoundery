import type { DiscoveryIntroMatchingPreparation } from "@/features/discovery/discoveryIntroTypes";

export const DISCOVERY_MATCHING_START_STATUSES = [
  "preparing",
  "awaiting_other_confirmation",
  "ready_for_matching",
  "canceled",
] as const;

export type DiscoveryMatchingStartStatus = (typeof DISCOVERY_MATCHING_START_STATUSES)[number];

export type DiscoveryMatchingStart = {
  id: string;
  introRequestId: string;
  initiatorUserId: string;
  requesterUserId: string;
  recipientUserId: string;
  status: DiscoveryMatchingStartStatus;
  requestedByUserId: string | null;
  requestedAt: string | null;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiscoveryMatchingPreparation = DiscoveryIntroMatchingPreparation & {
  matchingStart: DiscoveryMatchingStart | null;
};

export function isDiscoveryMatchingStartStatus(value: string): value is DiscoveryMatchingStartStatus {
  return DISCOVERY_MATCHING_START_STATUSES.includes(value as DiscoveryMatchingStartStatus);
}

export function canCreateDiscoveryMatchingStart(params: {
  introStatus: string;
  requesterUserId: string;
  recipientUserId: string;
  userId: string;
  relationshipExists?: boolean;
  matchingStartExists?: boolean;
}) {
  return (
    params.introStatus === "accepted" &&
    params.requesterUserId !== params.recipientUserId &&
    (params.requesterUserId === params.userId || params.recipientUserId === params.userId) &&
    params.relationshipExists !== true &&
    params.matchingStartExists !== true
  );
}

export function canRequestFullDiscoveryMatching(params: {
  status: DiscoveryMatchingStartStatus;
  requesterUserId: string;
  recipientUserId: string;
  userId: string;
  relationshipExists?: boolean;
}) {
  return (
    params.status === "preparing" &&
    params.requesterUserId !== params.recipientUserId &&
    (params.requesterUserId === params.userId || params.recipientUserId === params.userId) &&
    params.relationshipExists !== true
  );
}

export function canConfirmFullDiscoveryMatching(params: {
  status: DiscoveryMatchingStartStatus;
  requesterUserId: string;
  recipientUserId: string;
  requestedByUserId: string | null;
  userId: string;
  relationshipExists?: boolean;
}) {
  return (
    params.status === "awaiting_other_confirmation" &&
    params.requesterUserId !== params.recipientUserId &&
    (params.requesterUserId === params.userId || params.recipientUserId === params.userId) &&
    params.requestedByUserId !== null &&
    params.requestedByUserId !== params.userId &&
    params.relationshipExists !== true
  );
}
