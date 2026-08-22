import type { FounderAlignmentWorkbookStepWorkspaceV2 } from "@/features/reporting/founderAlignmentWorkbook";
import { getWorkbookReactionObservation } from "@/features/reporting/workbookReactionObservation";

const FURTHER_DISCUSSION_GUIDANCE =
  "Punkte, die mindestens eine Person weiter klaeren moechte, besprecht ihr vor einer endgueltigen Fassung erneut und haltet fest, was noch offen ist.";
const DIFFERENT_REACTIONS_GUIDANCE =
  "Unterschiedlich eingeordnete Punkte besprecht ihr vor einer endgueltigen Fassung und haltet fest, was jede Person fuer die Vereinbarung braucht.";

export function getWorkbookReactionSuggestionGuidance(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2
): string | null {
  let hasDifferentCurrentReactions = false;

  for (const entry of workspace.entries) {
    const observation = getWorkbookReactionObservation(workspace.reactions, entry.id);

    if (observation.hasFurtherDiscussion) {
      return FURTHER_DISCUSSION_GUIDANCE;
    }

    if (observation.comparison === "different") {
      hasDifferentCurrentReactions = true;
    }
  }

  return hasDifferentCurrentReactions ? DIFFERENT_REACTIONS_GUIDANCE : null;
}
