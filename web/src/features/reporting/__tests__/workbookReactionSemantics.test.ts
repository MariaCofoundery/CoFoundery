import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
  WORKBOOK_DISCUSSION_SIGNAL_VALUES,
  sanitizeFounderAlignmentWorkbookPayload,
  sanitizeWorkbookStepWorkspaceV2,
  upsertCurrentWorkbookDiscussionReaction,
  type FounderAlignmentWorkbookDiscussionReaction,
  type FounderAlignmentWorkbookStepWorkspaceV2,
} from "@/features/reporting/founderAlignmentWorkbook";

const entry = {
  id: "entry-a",
  content: "Wir machen den Punkt sichtbar.",
  createdBy: "founderA" as const,
  createdAt: "2026-08-18T08:00:00.000Z",
  sourceEntryId: null,
  updatedAt: null,
  updatedBy: null,
};

function workspaceWith(
  reactions: FounderAlignmentWorkbookDiscussionReaction[]
): FounderAlignmentWorkbookStepWorkspaceV2 {
  return {
    entries: [entry],
    reactions,
  };
}

test("legacy reactions remain unversioned when sanitized and loaded", () => {
  const updatedAt = "2026-04-09T08:15:00.000Z";
  const workspace = sanitizeWorkbookStepWorkspaceV2(
    workspaceWith([
      {
        entryId: entry.id,
        userId: "founderA",
        signal: "agree",
        updatedAt,
      },
    ])
  );

  assert.deepEqual(workspace?.reactions, [
    {
      entryId: entry.id,
      userId: "founderA",
      signal: "agree",
      updatedAt,
    },
  ]);
  assert.equal(Object.hasOwn(workspace?.reactions[0] ?? {}, "semanticsVersion"), false);
});

test("current reaction semantics survive sanitization for every signal code", () => {
  for (const signal of WORKBOOK_DISCUSSION_SIGNAL_VALUES) {
    const workspace = sanitizeWorkbookStepWorkspaceV2(
      workspaceWith([
        {
          entryId: entry.id,
          userId: "founderA",
          signal,
          updatedAt: null,
          semanticsVersion: CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
        },
      ])
    );

    assert.equal(workspace?.reactions[0]?.signal, signal);
    assert.equal(
      workspace?.reactions[0]?.semanticsVersion,
      CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION
    );
  }
});

test("unknown reaction semantics are preserved as legacy rather than treated as current", () => {
  const workspace = sanitizeWorkbookStepWorkspaceV2({
    entries: [entry],
    reactions: [
      {
        entryId: entry.id,
        userId: "founderA",
        signal: "critical",
        updatedAt: null,
        semanticsVersion: 99,
      },
    ],
  });

  assert.equal(workspace?.reactions[0]?.signal, "critical");
  assert.equal(workspace?.reactions[0]?.semanticsVersion, undefined);
  assert.equal(Object.hasOwn(workspace?.reactions[0] ?? {}, "semanticsVersion"), false);
});

test("current-semantics upsert versions new reactions and replacements", () => {
  for (const signal of WORKBOOK_DISCUSSION_SIGNAL_VALUES) {
    const created = upsertCurrentWorkbookDiscussionReaction(workspaceWith([]), {
      entryId: entry.id,
      userId: "founderA",
      signal,
      updatedAt: null,
    });

    assert.equal(created.reactions[0]?.signal, signal);
    assert.equal(
      created.reactions[0]?.semanticsVersion,
      CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION
    );
  }

  const legacyReaction: FounderAlignmentWorkbookDiscussionReaction = {
    entryId: entry.id,
    userId: "founderA",
    signal: "important",
    updatedAt: "2026-04-09T08:15:00.000Z",
  };
  const untouchedLegacyReaction: FounderAlignmentWorkbookDiscussionReaction = {
    entryId: entry.id,
    userId: "founderB",
    signal: "critical",
    updatedAt: "2026-04-09T08:16:00.000Z",
  };

  const replaced = upsertCurrentWorkbookDiscussionReaction(
    workspaceWith([legacyReaction, untouchedLegacyReaction]),
    {
      entryId: entry.id,
      userId: "founderA",
      signal: "agree",
      updatedAt: "2026-08-18T08:30:00.000Z",
    }
  );

  assert.deepEqual(replaced.reactions, [
    untouchedLegacyReaction,
    {
      entryId: entry.id,
      userId: "founderA",
      signal: "agree",
      updatedAt: "2026-08-18T08:30:00.000Z",
      semanticsVersion: CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
    },
  ]);
});

test("unrelated payload roundtrips do not upgrade legacy reactions", () => {
  const legacyWorkspace = workspaceWith([
    {
      entryId: entry.id,
      userId: "founderA",
      signal: "important",
      updatedAt: null,
    },
  ]);
  const loaded = sanitizeFounderAlignmentWorkbookPayload({
    currentStepId: "vision_direction",
    steps: {
      vision_direction: {
        mode: "collaborative",
        workspaceV2: legacyWorkspace,
        advisorNotes: "Bestehende Notiz",
      },
    },
  });

  loaded.steps.vision_direction.advisorNotes = "Unabhängig aktualisierte Notiz";
  const roundtripped = sanitizeFounderAlignmentWorkbookPayload(loaded);
  const reaction = roundtripped.steps.vision_direction.workspaceV2?.reactions[0];

  assert.equal(reaction?.signal, "important");
  assert.equal(reaction?.semanticsVersion, undefined);
  assert.equal(Object.hasOwn(reaction ?? {}, "semanticsVersion"), false);
});
