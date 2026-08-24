import type { FounderAlignmentWorkbookEntry } from "@/features/reporting/founderAlignmentWorkbook";
import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

export const WORKBOOK_DEEP_DIVE_PILOT_STEPS = [
  "decision_rules",
  "collaboration_conflict",
] as const;

export type WorkbookDeepDivePilotStepId =
  (typeof WORKBOOK_DEEP_DIVE_PILOT_STEPS)[number];

export type WorkbookDeepDiveHandoffContext = {
  teamId: string;
  memberCount: number;
  targetWorkingNotes: Partial<Record<WorkbookDeepDivePilotStepId, string>>;
};

const SETUP_KEY_BY_STEP: Record<WorkbookDeepDivePilotStepId, FounderSetupItemKey> = {
  decision_rules: "decision_rights",
  collaboration_conflict: "conflict_deadlock",
};

export function isWorkbookDeepDivePilotStep(
  stepId: string
): stepId is WorkbookDeepDivePilotStepId {
  return (WORKBOOK_DEEP_DIVE_PILOT_STEPS as readonly string[]).includes(stepId);
}

export function getWorkbookDeepDiveSetupKey(stepId: WorkbookDeepDivePilotStepId) {
  return SETUP_KEY_BY_STEP[stepId];
}

export function hasLegacyWorkbookAgreement(entry: FounderAlignmentWorkbookEntry) {
  return (
    entry.agreement.trim().length > 0 ||
    entry.founderAApproved ||
    entry.founderBApproved ||
    Object.values(entry.structuredOutputs ?? {}).some((outputs) =>
      Object.values(outputs ?? {}).some(
        (value) => typeof value === "string" && value.trim().length > 0
      )
    )
  );
}

export type WorkbookDeepDiveHandoffState =
  | "unavailable"
  | "two_founder_ready"
  | "existing_note"
  | "three_founder_link_only";

export function getWorkbookDeepDiveHandoffState(
  context: WorkbookDeepDiveHandoffContext | null,
  stepId: WorkbookDeepDivePilotStepId
): WorkbookDeepDiveHandoffState {
  if (!context) return "unavailable";
  if (context.memberCount !== 2) return "three_founder_link_only";
  return context.targetWorkingNotes[stepId]?.trim()
    ? "existing_note"
    : "two_founder_ready";
}
