import type {
  FounderAlignmentWorkbookStepId,
  FounderAlignmentWorkbookStepStatus,
} from "@/features/reporting/founderAlignmentWorkbook";

export type WorkbookStepStatusMessageKey =
  | "client.statuses.inProgress"
  | "client.statuses.draftReady"
  | "client.statuses.awaitingApproval"
  | "client.statuses.finalized";

export function workbookStepStatusMessageKey(
  status: FounderAlignmentWorkbookStepStatus
): WorkbookStepStatusMessageKey {
  switch (status) {
    case "draft_ready":
      return "client.statuses.draftReady";
    case "awaiting_approval":
      return "client.statuses.awaitingApproval";
    case "finalized":
      return "client.statuses.finalized";
    default:
      return "client.statuses.inProgress";
  }
}

export type WorkbookPremiumPhase = "collect" | "weight" | "rule" | "approval";

export type WorkbookPremiumPhaseMessageKey =
  | "client.premium.phases.collect"
  | "client.premium.phases.boundaries"
  | "client.premium.phases.focus"
  | "client.premium.phases.weight"
  | "client.premium.phases.classify"
  | "client.premium.phases.prioritize"
  | "client.premium.phases.rule"
  | "client.premium.phases.guardrail"
  | "client.premium.phases.agreement"
  | "client.premium.phases.approval";

export function workbookPremiumPhaseMessageKey(
  phase: WorkbookPremiumPhase,
  stepId: FounderAlignmentWorkbookStepId
): WorkbookPremiumPhaseMessageKey {
  if (phase === "approval") return "client.premium.phases.approval";
  if (stepId === "values_guardrails") {
    if (phase === "collect") return "client.premium.phases.boundaries";
    if (phase === "weight") return "client.premium.phases.classify";
    return "client.premium.phases.guardrail";
  }
  if (stepId === "alignment_90_days") {
    if (phase === "collect") return "client.premium.phases.focus";
    if (phase === "weight") return "client.premium.phases.prioritize";
    return "client.premium.phases.agreement";
  }
  if (phase === "collect") return "client.premium.phases.collect";
  if (phase === "weight") return "client.premium.phases.weight";
  return "client.premium.phases.rule";
}
