import { createHash } from "crypto";

export type FounderAlignmentWorkbookAdvisorInviteState = {
  founderAApproved: boolean;
  founderBApproved: boolean;
  advisorLinked: boolean;
  advisorName: string | null;
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
