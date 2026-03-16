import { createHash } from "crypto";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

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
  invitationId,
  teamContext,
  token,
}: {
  invitationId: string;
  teamContext: TeamContext;
  token: string;
}) {
  const search = new URLSearchParams({
    invitationId,
    teamContext,
    advisorToken: token,
  });

  return `/founder-alignment/workbook?${search.toString()}`;
}
