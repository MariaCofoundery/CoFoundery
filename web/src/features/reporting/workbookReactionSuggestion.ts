import type { FounderAlignmentWorkbookStepWorkspaceV2 } from "@/features/reporting/founderAlignmentWorkbook";
import { getWorkbookReactionObservation } from "@/features/reporting/workbookReactionObservation";

export function getWorkbookReactionSuggestionGuidance(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2,
  copy: {
    furtherDiscussion: string;
    differentResponses: string;
  }
): string | null {
  let hasDifferentCurrentReactions = false;

  for (const entry of workspace.entries) {
    const observation = getWorkbookReactionObservation(workspace.reactions, entry.id);

    if (observation.hasFurtherDiscussion) {
      return copy.furtherDiscussion;
    }

    if (observation.comparison === "different") {
      hasDifferentCurrentReactions = true;
    }
  }

  return hasDifferentCurrentReactions ? copy.differentResponses : null;
}
