import type { DiscoveryProfilePreview } from "@/features/discovery/discoveryTypes";

export const DISCOVERY_INTRO_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "canceled",
] as const;

export type DiscoveryIntroStatus = (typeof DISCOVERY_INTRO_STATUSES)[number];

export type DiscoveryIntroRequest = {
  id: string;
  requesterUserId: string;
  recipientUserId: string;
  status: DiscoveryIntroStatus;
  message: string | null;
  responseMessage: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  canceledAt: string | null;
};

export type DiscoveryIntroRequestWithProfile = DiscoveryIntroRequest & {
  profile: DiscoveryProfilePreview | null;
};

export type DiscoveryIntroMatchingPreparation = {
  introRequest: DiscoveryIntroRequest;
  requesterProfile: DiscoveryProfilePreview;
  recipientProfile: DiscoveryProfilePreview;
  currentUserRole: "requester" | "recipient";
  relationshipExists: boolean;
  invitationExists: boolean;
};

export const DISCOVERY_INTRO_STATUS_LABELS: Record<DiscoveryIntroStatus, string> = {
  pending: "Intro angefragt",
  accepted: "Intro angenommen",
  declined: "Intro nicht angenommen",
  canceled: "Anfrage zurückgezogen",
};

export function isDiscoveryIntroResponseStatus(
  value: string
): value is Extract<DiscoveryIntroStatus, "accepted" | "declined"> {
  return value === "accepted" || value === "declined";
}

export function isAcceptedInvitationContextStatus(value: unknown) {
  return value === "accepted";
}

export function canCancelDiscoveryIntro(request: Pick<DiscoveryIntroRequest, "status">) {
  return request.status === "pending";
}

export function canRespondToDiscoveryIntro(request: Pick<DiscoveryIntroRequest, "status">) {
  return request.status === "pending";
}

export function isIncomingOpenDiscoveryIntroRequest(
  request: Pick<DiscoveryIntroRequest, "recipientUserId" | "status">,
  userId: string
) {
  return request.recipientUserId === userId && request.status === "pending";
}

export function countIncomingOpenDiscoveryIntroRequests(
  requests: Array<Pick<DiscoveryIntroRequest, "recipientUserId" | "status">>,
  userId: string
) {
  return requests.filter((request) => isIncomingOpenDiscoveryIntroRequest(request, userId)).length;
}

export function formatIncomingRequestBadgeCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  return count > 9 ? "9+" : String(Math.floor(count));
}

export function getIncomingRequestBadgePresentation(count: number) {
  const displayCount = formatIncomingRequestBadgeCount(count);
  if (!displayCount) {
    return null;
  }

  return {
    displayCount,
    messageKey:
      count === 1
        ? ("incomingRequestBadgeSingular" as const)
        : ("incomingRequestBadgePlural" as const),
  };
}

export function canPrepareDiscoveryIntroMatching(
  request: Pick<DiscoveryIntroRequest, "status" | "requesterUserId" | "recipientUserId">,
  userId: string
) {
  return (
    request.status === "accepted" &&
    request.requesterUserId !== request.recipientUserId &&
    (request.requesterUserId === userId || request.recipientUserId === userId)
  );
}
