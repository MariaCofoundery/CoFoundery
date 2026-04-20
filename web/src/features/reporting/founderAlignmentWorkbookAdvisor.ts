import { createHash } from "crypto";

export type FounderAlignmentWorkbookAdvisorInviteState = {
  founderAApproved: boolean;
  founderBApproved: boolean;
  advisorLinked: boolean;
  advisorName: string | null;
};

export type FounderAlignmentWorkbookAdvisorEntryStatus =
  | "pending"
  | "approved"
  | "invited"
  | "linked"
  | "revoked";

export type FounderAlignmentWorkbookAdvisorEntry = {
  id: string;
  relationshipId: string;
  invitationId: string | null;
  advisorName: string | null;
  advisorEmail: string | null;
  status: FounderAlignmentWorkbookAdvisorEntryStatus;
  founderAApproved: boolean;
  founderBApproved: boolean;
  suggestedByRole: "founderA" | "founderB" | "unknown";
  suggestedByLabel: string;
  invitedAt: string | null;
  linkedAt: string | null;
};

export function hashFounderAlignmentAdvisorToken(token: string) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function buildFounderAlignmentAdvisorInvitePath({
  token,
}: {
  token: string;
}) {
  return `/advisor/invite/${encodeURIComponent(token)}`;
}
