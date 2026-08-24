import {
  ALIGNMENT_OPEN_POINT_AREA_VALUES,
  type AlignmentOpenPointArea,
  type FounderAlignmentWorkbookEntry,
} from "@/features/reporting/founderAlignmentWorkbook";
import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

export const WORKBOOK_DEEP_DIVE_PILOT_STEPS = [
  "decision_rules",
  "collaboration_conflict",
  "alignment_open_points",
] as const;

export type WorkbookDeepDivePilotStepId =
  (typeof WORKBOOK_DEEP_DIVE_PILOT_STEPS)[number];

export type WorkbookDeepDiveHandoffContext = {
  teamId: string;
  memberCount: number;
  targetWorkingNotes: Partial<
    Record<Exclude<WorkbookDeepDivePilotStepId, "alignment_open_points">, string>
  >;
  setupWorkingNotes: Partial<Record<FounderSetupItemKey, string>>;
};

const SETUP_KEY_BY_STEP: Partial<Record<WorkbookDeepDivePilotStepId, FounderSetupItemKey>> = {
  decision_rules: "decision_rights",
  collaboration_conflict: "conflict_deadlock",
};

export function isWorkbookDeepDivePilotStep(
  stepId: string
): stepId is WorkbookDeepDivePilotStepId {
  return (WORKBOOK_DEEP_DIVE_PILOT_STEPS as readonly string[]).includes(stepId);
}

export function getWorkbookDeepDiveSetupKey(stepId: WorkbookDeepDivePilotStepId) {
  return SETUP_KEY_BY_STEP[stepId] ?? null;
}

export function getAlignmentOpenPointAreas(includeValues: boolean): AlignmentOpenPointArea[] {
  return ALIGNMENT_OPEN_POINT_AREA_VALUES.filter(
    (area) => includeValues || area !== "values"
  );
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
  stepId: Exclude<WorkbookDeepDivePilotStepId, "alignment_open_points">
): WorkbookDeepDiveHandoffState {
  if (!context) return "unavailable";
  if (context.memberCount !== 2) return "three_founder_link_only";
  return context.targetWorkingNotes[stepId]?.trim()
    ? "existing_note"
    : "two_founder_ready";
}
