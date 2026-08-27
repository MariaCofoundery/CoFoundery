"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveFounderAlignmentAdvisorProposal,
  proposeFounderAlignmentAdvisor,
  revokeFounderAlignmentAdvisorAccess,
  sendFounderAlignmentAdvisorInvite,
} from "@/features/reporting/founderAlignmentWorkbookActions";

function homebaseHref(teamId: string, result: "success" | "error") {
  return `/teams/${encodeURIComponent(teamId)}?advisor=${result}#relationship-advisor-access`;
}

export async function proposeRelationshipAdvisorFromTeamAction(
  teamId: string,
  invitationId: string,
  relationshipId: string,
  formData: FormData
) {
  const result = await proposeFounderAlignmentAdvisor({
    invitationId,
    relationshipId,
    advisorName: String(formData.get("advisorName") ?? ""),
    advisorEmail: String(formData.get("advisorEmail") ?? ""),
  });
  revalidatePath(`/teams/${teamId}`);
  redirect(homebaseHref(teamId, result.ok ? "success" : "error"));
}

export async function approveRelationshipAdvisorFromTeamAction(
  teamId: string,
  invitationId: string,
  relationshipId: string,
  advisorEntryId: string
) {
  const result = await approveFounderAlignmentAdvisorProposal({
    invitationId,
    relationshipId,
    advisorEntryId,
  });
  revalidatePath(`/teams/${teamId}`);
  redirect(homebaseHref(teamId, result.ok ? "success" : "error"));
}

export async function sendRelationshipAdvisorInviteFromTeamAction(
  teamId: string,
  invitationId: string,
  relationshipId: string,
  advisorEntryId: string,
  teamContext: "pre_founder" | "existing_team"
) {
  const result = await sendFounderAlignmentAdvisorInvite({
    invitationId,
    relationshipId,
    advisorEntryId,
    teamContext,
  });
  revalidatePath(`/teams/${teamId}`);
  redirect(homebaseHref(teamId, result.ok ? "success" : "error"));
}

export async function revokeRelationshipAdvisorFromTeamAction(
  teamId: string,
  invitationId: string,
  relationshipId: string,
  advisorEntryId: string
) {
  const result = await revokeFounderAlignmentAdvisorAccess({
    invitationId,
    relationshipId,
    advisorEntryId,
  });
  revalidatePath(`/teams/${teamId}`);
  redirect(homebaseHref(teamId, result.ok ? "success" : "error"));
}
