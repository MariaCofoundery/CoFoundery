import {
  CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
  upsertCurrentWorkbookDiscussionReaction,
  type FounderAlignmentWorkbookDiscussionReaction,
  type FounderAlignmentWorkbookDiscussionSignal,
  type FounderAlignmentWorkbookStepWorkspaceV2,
} from "@/features/reporting/founderAlignmentWorkbook";
import { getWorkbookReactionObservation } from "@/features/reporting/workbookReactionObservation";

export type WorkbookReactionPresentationState =
  | { kind: "legacy"; hasFurtherDiscussion: false }
  | { kind: "open"; hasFurtherDiscussion: boolean }
  | {
      kind: "similar";
      response: "important" | "agree" | "furtherDiscussion";
      hasFurtherDiscussion: boolean;
    }
  | { kind: "different"; hasFurtherDiscussion: boolean };

export type WorkbookReactionPresentationCounts = {
  similar: number;
  different: number;
  open: number;
};

export function isCurrentWorkbookReaction(
  reaction: FounderAlignmentWorkbookDiscussionReaction | undefined
): reaction is FounderAlignmentWorkbookDiscussionReaction & {
  semanticsVersion: typeof CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION;
} {
  return reaction?.semanticsVersion === CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION;
}

export function getWorkbookReactionPresentationState(
  reactions: readonly FounderAlignmentWorkbookDiscussionReaction[],
  entryId: string
): WorkbookReactionPresentationState {
  const observation = getWorkbookReactionObservation(reactions, entryId);

  if (observation.founderAState === "legacy" || observation.founderBState === "legacy") {
    return { kind: "legacy", hasFurtherDiscussion: false };
  }

  if (observation.founderAState === "missing" || observation.founderBState === "missing") {
    return {
      kind: "open",
      hasFurtherDiscussion: observation.hasFurtherDiscussion,
    };
  }

  if (observation.comparison === "different") {
    return {
      kind: "different",
      hasFurtherDiscussion: observation.hasFurtherDiscussion,
    };
  }

  return {
    kind: "similar",
    response: observation.bothImportant
      ? "important"
      : observation.bothAgree
        ? "agree"
        : "furtherDiscussion",
    hasFurtherDiscussion: observation.hasFurtherDiscussion,
  };
}

export function countWorkbookReactionPresentationStates(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2
): WorkbookReactionPresentationCounts {
  return workspace.entries.reduce<WorkbookReactionPresentationCounts>(
    (counts, entry) => {
      const state = getWorkbookReactionPresentationState(workspace.reactions, entry.id);
      if (state.kind === "similar") counts.similar += 1;
      else if (state.kind === "different") counts.different += 1;
      else counts.open += 1;
      return counts;
    },
    { similar: 0, different: 0, open: 0 }
  );
}

export function applyWorkbookReactionSelection(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2,
  selection: {
    entryId: string;
    userId: "founderA" | "founderB";
    signal: FounderAlignmentWorkbookDiscussionSignal;
    updatedAt: string;
  }
): FounderAlignmentWorkbookStepWorkspaceV2 {
  const existingReaction = workspace.reactions.find(
    (reaction) =>
      reaction.entryId === selection.entryId && reaction.userId === selection.userId
  );

  if (isCurrentWorkbookReaction(existingReaction) && existingReaction.signal === selection.signal) {
    return {
      ...workspace,
      reactions: workspace.reactions.filter(
        (reaction) =>
          !(reaction.entryId === selection.entryId && reaction.userId === selection.userId)
      ),
    };
  }

  return upsertCurrentWorkbookDiscussionReaction(workspace, selection);
}
