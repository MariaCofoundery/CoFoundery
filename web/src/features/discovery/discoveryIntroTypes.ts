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

export function canCancelDiscoveryIntro(request: Pick<DiscoveryIntroRequest, "status">) {
  return request.status === "pending";
}

export function canRespondToDiscoveryIntro(request: Pick<DiscoveryIntroRequest, "status">) {
  return request.status === "pending";
}
