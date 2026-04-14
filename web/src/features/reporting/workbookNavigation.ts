import {
  type FounderAlignmentWorkbookEntry,
  resolveFounderAlignmentWorkbookSteps,
  sanitizeFounderAlignmentWorkbookPayload,
} from "@/features/reporting/founderAlignmentWorkbook";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export function buildWorkbookHref(invitationId: string, teamContext: TeamContext | null) {
  const base = `/founder-alignment/workbook?invitationId=${encodeURIComponent(invitationId)}`;
  return teamContext ? `${base}&teamContext=${encodeURIComponent(teamContext)}` : base;
}

export function buildWorkbookIntroHref(invitationId: string, teamContext: TeamContext | null) {
  const base = `/founder-alignment/workbook/intro?invitationId=${encodeURIComponent(invitationId)}`;
  return teamContext ? `${base}&teamContext=${encodeURIComponent(teamContext)}` : base;
}

function hasStructuredOutputs(step: FounderAlignmentWorkbookEntry) {
  return Object.values(step.structuredOutputs ?? {}).some((stepOutputs) =>
    Object.values(stepOutputs ?? {}).some(
      (value) => typeof value === "string" && value.trim().length > 0
    )
  );
}

function hasStepV2Progress(step: FounderAlignmentWorkbookEntry) {
  return (
    (step.workspaceV2?.entries.length ?? 0) > 0 ||
    hasStructuredOutputs(step) ||
    step.agreement.trim().length > 0
  );
}

export function hasWorkbookStarted(
  payload: ReturnType<typeof sanitizeFounderAlignmentWorkbookPayload>
) {
  const hasStepProgress = Object.values(payload.steps).some(hasStepV2Progress);
  const hasAdvisorProgress =
    payload.advisorClosing.observations.trim().length > 0 ||
    payload.advisorClosing.questions.trim().length > 0 ||
    payload.advisorClosing.nextSteps.trim().length > 0 ||
    payload.founderReaction.status !== null ||
    payload.founderReaction.comment.trim().length > 0 ||
    payload.advisorFollowUp !== "none";

  return hasStepProgress || hasAdvisorProgress;
}

export function isWorkbookCompleted(
  payload: ReturnType<typeof sanitizeFounderAlignmentWorkbookPayload>,
  teamContext: TeamContext | null
) {
  if (!hasWorkbookStarted(payload)) {
    return false;
  }

  const visibleSteps = resolveFounderAlignmentWorkbookSteps(teamContext === "existing_team", false);
  const founderSteps = visibleSteps.filter((step) => step.id !== "advisor_closing");

  return founderSteps.every((step) => {
    const entry = payload.steps[step.id];
    return entry?.founderAApproved === true && entry?.founderBApproved === true;
  });
}

export function deriveWorkbookNavigationState(
  payload: ReturnType<typeof sanitizeFounderAlignmentWorkbookPayload>,
  teamContext: TeamContext | null
) {
  const started = hasWorkbookStarted(payload);
  if (!started) {
    return {
      hasStarted: false,
      isCompleted: false,
      statusKind: "ready" as const,
      statusLabel: "Workbook bereit",
    };
  }

  const completed = isWorkbookCompleted(payload, teamContext);
  if (completed) {
    return {
      hasStarted: true,
      isCompleted: true,
      statusKind: "completed" as const,
      statusLabel: "Abgeschlossen",
    };
  }

  return {
    hasStarted: true,
    isCompleted: false,
    statusKind: "in_progress" as const,
    statusLabel: "In Arbeit",
  };
}
