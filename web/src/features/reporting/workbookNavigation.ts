import { sanitizeFounderAlignmentWorkbookPayload } from "@/features/reporting/founderAlignmentWorkbook";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export function buildWorkbookHref(invitationId: string, teamContext: TeamContext | null) {
  const base = `/founder-alignment/workbook?invitationId=${encodeURIComponent(invitationId)}`;
  return teamContext ? `${base}&teamContext=${encodeURIComponent(teamContext)}` : base;
}

export function buildWorkbookIntroHref(invitationId: string, teamContext: TeamContext | null) {
  const base = `/founder-alignment/workbook/intro?invitationId=${encodeURIComponent(invitationId)}`;
  return teamContext ? `${base}&teamContext=${encodeURIComponent(teamContext)}` : base;
}

export function countWorkbookContentSignals(
  payload: ReturnType<typeof sanitizeFounderAlignmentWorkbookPayload>
) {
  let count = 0;

  for (const step of Object.values(payload.steps)) {
    if (step.founderA.trim()) count += 1;
    if (step.founderB.trim()) count += 1;
    if (step.agreement.trim()) count += 1;
    if (step.advisorNotes.trim()) count += 1;
  }

  if (payload.advisorClosing.observations.trim()) count += 1;
  if (payload.advisorClosing.questions.trim()) count += 1;
  if (payload.advisorClosing.nextSteps.trim()) count += 1;
  if (payload.founderReaction.status) count += 1;
  if (payload.founderReaction.comment.trim()) count += 1;

  return count;
}
