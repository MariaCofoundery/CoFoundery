import type { DiscoveryIntroMatchingPreparation } from "@/features/discovery/discoveryIntroTypes";

export const DISCOVERY_MATCHING_START_STATUSES = ["preparing", "canceled"] as const;

export type DiscoveryMatchingStartStatus = (typeof DISCOVERY_MATCHING_START_STATUSES)[number];

export type DiscoveryMatchingStart = {
  id: string;
  introRequestId: string;
  initiatorUserId: string;
  requesterUserId: string;
  recipientUserId: string;
  status: DiscoveryMatchingStartStatus;
  createdAt: string;
  updatedAt: string;
};

export type DiscoveryMatchingPreparation = DiscoveryIntroMatchingPreparation & {
  matchingStart: DiscoveryMatchingStart | null;
};

export function isDiscoveryMatchingStartStatus(value: string): value is DiscoveryMatchingStartStatus {
  return value === "preparing" || value === "canceled";
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
