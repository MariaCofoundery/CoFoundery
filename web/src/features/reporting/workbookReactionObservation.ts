import {
  CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
  type FounderAlignmentWorkbookDiscussionAuthor,
  type FounderAlignmentWorkbookDiscussionReaction,
} from "@/features/reporting/founderAlignmentWorkbook";

export type WorkbookReactionParticipantState = "missing" | "legacy" | "current";
export type WorkbookReactionComparison = "same" | "different";

export type WorkbookReactionObservation = {
  founderAState: WorkbookReactionParticipantState;
  founderBState: WorkbookReactionParticipantState;
  comparison: WorkbookReactionComparison | null;
  hasFurtherDiscussion: boolean;
  bothImportant: boolean;
  bothAgree: boolean;
  bothFurtherDiscussion: boolean;
};

function getParticipantState(
  reaction: FounderAlignmentWorkbookDiscussionReaction | undefined
): WorkbookReactionParticipantState {
  if (!reaction) {
    return "missing";
  }

  return reaction.semanticsVersion === CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION
    ? "current"
    : "legacy";
}

export function getWorkbookReactionObservation(
  reactions: readonly FounderAlignmentWorkbookDiscussionReaction[],
  entryId: string
): WorkbookReactionObservation {
  const getReaction = (userId: FounderAlignmentWorkbookDiscussionAuthor) =>
    reactions.find((reaction) => reaction.entryId === entryId && reaction.userId === userId);
  const founderAReaction = getReaction("founderA");
  const founderBReaction = getReaction("founderB");
  const founderAState = getParticipantState(founderAReaction);
  const founderBState = getParticipantState(founderBReaction);
  const founderASignal = founderAState === "current" ? founderAReaction?.signal ?? null : null;
  const founderBSignal = founderBState === "current" ? founderBReaction?.signal ?? null : null;
  const bothCurrent = founderASignal !== null && founderBSignal !== null;
  const founderAHasFurtherDiscussion = founderASignal === "critical";
  const founderBHasFurtherDiscussion = founderBSignal === "critical";

  return {
    founderAState,
    founderBState,
    comparison: bothCurrent
      ? founderASignal === founderBSignal
        ? "same"
        : "different"
      : null,
    hasFurtherDiscussion: founderAHasFurtherDiscussion || founderBHasFurtherDiscussion,
    bothImportant:
      bothCurrent && founderASignal === "important" && founderBSignal === "important",
    bothAgree: bothCurrent && founderASignal === "agree" && founderBSignal === "agree",
    bothFurtherDiscussion:
      bothCurrent && founderAHasFurtherDiscussion && founderBHasFurtherDiscussion,
  };
}
