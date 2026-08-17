import type { FounderAlignmentWorkbookStepStatus } from "@/features/reporting/founderAlignmentWorkbook";

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
