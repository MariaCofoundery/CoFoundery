import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
  WORKBOOK_DISCUSSION_SIGNAL_VALUES,
  type FounderAlignmentWorkbookDiscussionAuthor,
  type FounderAlignmentWorkbookDiscussionReaction,
  type FounderAlignmentWorkbookDiscussionSignal,
} from "@/features/reporting/founderAlignmentWorkbook";
import { getWorkbookReactionObservation } from "@/features/reporting/workbookReactionObservation";

const entryId = "entry-a";

function reaction(
  userId: FounderAlignmentWorkbookDiscussionAuthor,
  signal: FounderAlignmentWorkbookDiscussionSignal,
  semanticsVersion?: 2,
  targetEntryId = entryId
): FounderAlignmentWorkbookDiscussionReaction {
  return {
    entryId: targetEntryId,
    userId,
    signal,
    updatedAt: null,
    ...(semanticsVersion ? { semanticsVersion } : {}),
  };
}

const currentReaction = (
  userId: FounderAlignmentWorkbookDiscussionAuthor,
  signal: FounderAlignmentWorkbookDiscussionSignal,
  targetEntryId = entryId
) =>
  reaction(
    userId,
    signal,
    CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
    targetEntryId
  );

test("reports missing, legacy, and current participant states without comparing them", () => {
  const cases: Array<{
    name: string;
    reactions: FounderAlignmentWorkbookDiscussionReaction[];
    founderAState: "missing" | "legacy" | "current";
    founderBState: "missing" | "legacy" | "current";
    hasFurtherDiscussion?: boolean;
  }> = [
    {
      name: "no reactions",
      reactions: [],
      founderAState: "missing",
      founderBState: "missing",
    },
    {
      name: "one current reaction",
      reactions: [currentReaction("founderA", "important")],
      founderAState: "current",
      founderBState: "missing",
    },
    {
      name: "one legacy reaction",
      reactions: [reaction("founderA", "important")],
      founderAState: "legacy",
      founderBState: "missing",
    },
    {
      name: "two matching legacy codes",
      reactions: [reaction("founderA", "agree"), reaction("founderB", "agree")],
      founderAState: "legacy",
      founderBState: "legacy",
    },
    {
      name: "legacy and current matching raw codes",
      reactions: [reaction("founderA", "important"), currentReaction("founderB", "important")],
      founderAState: "legacy",
      founderBState: "current",
    },
    {
      name: "legacy critical and current agree",
      reactions: [reaction("founderA", "critical"), currentReaction("founderB", "agree")],
      founderAState: "legacy",
      founderBState: "current",
    },
    {
      name: "current critical and legacy agree",
      reactions: [currentReaction("founderA", "critical"), reaction("founderB", "agree")],
      founderAState: "current",
      founderBState: "legacy",
      hasFurtherDiscussion: true,
    },
  ];

  for (const scenario of cases) {
    const observation = getWorkbookReactionObservation(scenario.reactions, entryId);

    assert.equal(observation.founderAState, scenario.founderAState, scenario.name);
    assert.equal(observation.founderBState, scenario.founderBState, scenario.name);
    assert.equal(observation.comparison, null, scenario.name);
    assert.equal(
      observation.hasFurtherDiscussion,
      scenario.hasFurtherDiscussion ?? false,
      scenario.name
    );
    assert.equal(observation.bothImportant, false, scenario.name);
    assert.equal(observation.bothAgree, false, scenario.name);
    assert.equal(observation.bothFurtherDiscussion, false, scenario.name);
  }
});

test("derives the complete current-semantics reaction matrix", () => {
  for (const founderASignal of WORKBOOK_DISCUSSION_SIGNAL_VALUES) {
    for (const founderBSignal of WORKBOOK_DISCUSSION_SIGNAL_VALUES) {
      const observation = getWorkbookReactionObservation(
        [
          currentReaction("founderA", founderASignal),
          currentReaction("founderB", founderBSignal),
        ],
        entryId
      );

      assert.equal(observation.founderAState, "current");
      assert.equal(observation.founderBState, "current");
      assert.equal(
        observation.comparison,
        founderASignal === founderBSignal ? "same" : "different",
        `${founderASignal} + ${founderBSignal}`
      );
      assert.equal(
        observation.hasFurtherDiscussion,
        founderASignal === "critical" || founderBSignal === "critical"
      );
      assert.equal(
        observation.bothImportant,
        founderASignal === "important" && founderBSignal === "important"
      );
      assert.equal(
        observation.bothAgree,
        founderASignal === "agree" && founderBSignal === "agree"
      );
      assert.equal(
        observation.bothFurtherDiscussion,
        founderASignal === "critical" && founderBSignal === "critical"
      );
    }
  }
});

test("isolates observations to the requested entry", () => {
  const observation = getWorkbookReactionObservation(
    [
      currentReaction("founderA", "critical", "other-entry"),
      currentReaction("founderB", "critical", "other-entry"),
      currentReaction("founderA", "important"),
      currentReaction("founderB", "agree"),
    ],
    entryId
  );

  assert.deepEqual(observation, {
    founderAState: "current",
    founderBState: "current",
    comparison: "different",
    hasFurtherDiscussion: false,
    bothImportant: false,
    bothAgree: false,
    bothFurtherDiscussion: false,
  });
});
