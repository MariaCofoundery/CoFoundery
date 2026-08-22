import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
  type FounderAlignmentWorkbookDiscussionReaction,
  type FounderAlignmentWorkbookDiscussionSignal,
  type FounderAlignmentWorkbookStepWorkspaceV2,
} from "@/features/reporting/founderAlignmentWorkbook";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";
import {
  applyWorkbookReactionSelection,
  countWorkbookReactionPresentationStates,
  getWorkbookReactionPresentationState,
} from "@/features/reporting/workbookReactionPresentation";

const entry = {
  id: "entry-a",
  content: "Founder content stays unchanged.",
  createdBy: "founderA" as const,
  createdAt: "2026-08-22T08:00:00.000Z",
  sourceEntryId: null,
  updatedAt: null,
  updatedBy: null,
};

function reaction(
  userId: "founderA" | "founderB",
  signal: FounderAlignmentWorkbookDiscussionSignal,
  current = false,
  entryId = entry.id
): FounderAlignmentWorkbookDiscussionReaction {
  return {
    entryId,
    userId,
    signal,
    updatedAt: null,
    ...(current
      ? { semanticsVersion: CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION }
      : {}),
  };
}

function workspace(
  reactions: FounderAlignmentWorkbookDiscussionReaction[],
  entries = [entry]
): FounderAlignmentWorkbookStepWorkspaceV2 {
  return { entries, reactions };
}

test("reaction presentation content has symmetric non-empty DE and EN structure", () => {
  const de = getWorkbookContent("de").premiumWorkflow.reactionPresentation;
  const en = getWorkbookContent("en").premiumWorkflow.reactionPresentation;

  const shape = (value: unknown): unknown =>
    typeof value === "string"
      ? "string"
      : Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, shape(child)])
        );

  assert.deepEqual(shape(de), shape(en));
  assert.deepEqual(de.labels, {
    important: "Besonders wichtig",
    agree: "Kann so stehen",
    critical: "Weiter klaeren",
  });
  assert.deepEqual(en.labels, {
    important: "Especially important",
    agree: "Works for me as is",
    critical: "Discuss further",
  });
  assert.equal(de.prompt, "Wie moechtest du diesen Punkt im Moment einordnen?");
  assert.equal(de.choiceHint, "Waehle die Option, die am ehesten passt.");
  assert.equal(en.prompt, "How would you like to respond to this point right now?");
  assert.equal(en.choiceHint, "Choose the option that fits best.");
  assert.equal(de.legacy.label, "Fruehere Einordnung");
  assert.equal(en.legacy.label, "Earlier response");
  assert.equal(de.observations.missing.title, "Einordnung noch offen");
  assert.equal(en.observations.missing.title, "Response still open");
  assert.equal(de.observations.similar.title, "Aehnlich eingeordnet");
  assert.equal(en.observations.similar.title, "Similar responses");
  assert.equal(de.observations.different.title, "Unterschiedlich eingeordnet");
  assert.equal(en.observations.different.title, "Different responses");

  for (const [locale, copy] of [["de", de], ["en", en]] as const) {
    const strings: string[] = [];
    const collectStrings = (value: unknown) => {
      if (typeof value === "string") strings.push(value);
      else Object.values(value as Record<string, unknown>).forEach(collectStrings);
    };
    collectStrings(copy);
    assert.equal(strings.every((value) => value.trim().length > 0), true, locale);
  }

  assert.doesNotMatch(
    JSON.stringify(en),
    /Einordnung|Wichtig|Klaeren|Anschlussfaehig|Klaerungsbeduerftig|Grenzfall|Vorrang|Gemeinsam|geparkt|Tragbar/iu
  );
});

test("presentation states prioritize legacy, then open, then current comparisons", () => {
  assert.deepEqual(getWorkbookReactionPresentationState([], entry.id), {
    kind: "open",
    hasFurtherDiscussion: false,
  });
  assert.equal(
    getWorkbookReactionPresentationState([reaction("founderA", "important", true)], entry.id).kind,
    "open"
  );
  assert.equal(
    getWorkbookReactionPresentationState([reaction("founderA", "agree")], entry.id).kind,
    "legacy"
  );
  assert.equal(
    getWorkbookReactionPresentationState(
      [reaction("founderA", "critical"), reaction("founderB", "critical", true)],
      entry.id
    ).kind,
    "legacy"
  );
});

test("current same and different reactions map only to descriptive presentation facts", () => {
  const sameCases = [
    ["important", "important"],
    ["agree", "agree"],
    ["critical", "furtherDiscussion"],
  ] as const;

  for (const [signal, response] of sameCases) {
    assert.deepEqual(
      getWorkbookReactionPresentationState(
        [reaction("founderA", signal, true), reaction("founderB", signal, true)],
        entry.id
      ),
      {
        kind: "similar",
        response,
        hasFurtherDiscussion: signal === "critical",
      }
    );
  }

  assert.deepEqual(
    getWorkbookReactionPresentationState(
      [reaction("founderA", "important", true), reaction("founderB", "agree", true)],
      entry.id
    ),
    { kind: "different", hasFurtherDiscussion: false }
  );
  assert.deepEqual(
    getWorkbookReactionPresentationState(
      [reaction("founderA", "agree", true), reaction("founderB", "critical", true)],
      entry.id
    ),
    { kind: "different", hasFurtherDiscussion: true }
  );
});

test("summary counters partition similar, different, missing, and legacy entries", () => {
  const entries = ["similar", "different", "missing", "legacy"].map((id) => ({
    ...entry,
    id,
  }));
  const reactions = [
    reaction("founderA", "agree", true, "similar"),
    reaction("founderB", "agree", true, "similar"),
    reaction("founderA", "important", true, "different"),
    reaction("founderB", "agree", true, "different"),
    reaction("founderA", "important", true, "missing"),
    reaction("founderA", "critical", false, "legacy"),
    reaction("founderB", "critical", true, "legacy"),
  ];
  const counts = countWorkbookReactionPresentationStates(workspace(reactions, entries));

  assert.deepEqual(counts, { similar: 1, different: 1, open: 2 });
  assert.equal(counts.similar + counts.different + counts.open, entries.length);
});

test("legacy reselection upgrades while current same-code selection still deletes", () => {
  const otherLegacy = reaction("founderB", "critical");
  const legacySame = applyWorkbookReactionSelection(
    workspace([reaction("founderA", "agree"), otherLegacy]),
    { entryId: entry.id, userId: "founderA", signal: "agree", updatedAt: "now" }
  );
  assert.deepEqual(legacySame.reactions, [
    otherLegacy,
    {
      entryId: entry.id,
      userId: "founderA",
      signal: "agree",
      updatedAt: "now",
      semanticsVersion: CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
    },
  ]);

  const legacyDifferent = applyWorkbookReactionSelection(
    workspace([reaction("founderA", "agree"), otherLegacy]),
    { entryId: entry.id, userId: "founderA", signal: "important", updatedAt: "later" }
  );
  assert.equal(legacyDifferent.reactions[1]?.signal, "important");
  assert.equal(
    legacyDifferent.reactions[1]?.semanticsVersion,
    CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION
  );
  assert.equal(legacyDifferent.reactions[0], otherLegacy);

  const currentSame = applyWorkbookReactionSelection(
    workspace([reaction("founderA", "agree", true)]),
    { entryId: entry.id, userId: "founderA", signal: "agree", updatedAt: "later" }
  );
  assert.deepEqual(currentSame.reactions, []);

  const currentDifferent = applyWorkbookReactionSelection(
    workspace([reaction("founderA", "agree", true)]),
    { entryId: entry.id, userId: "founderA", signal: "important", updatedAt: "later" }
  );
  assert.equal(currentDifferent.reactions[0]?.signal, "important");
  assert.equal(
    currentDifferent.reactions[0]?.semanticsVersion,
    CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION
  );
});

test("active founder and advisor presentation uses locale content without signal colors or old labels", () => {
  const clientSource = fs.readFileSync(
    path.resolve(process.cwd(), "src/features/reporting/FounderAlignmentWorkbookClient.tsx"),
    "utf8"
  );
  const listStart = clientSource.indexOf("function WorkbookV2DiscussionThreadList");
  const listEnd = clientSource.indexOf("function WorkbookV2SignalBadge", listStart);
  const activePresentation = clientSource.slice(listStart, listEnd);
  const signalStart = clientSource.indexOf("function renderSignals", listStart);
  const signalEnd = clientSource.indexOf("function renderEntry", signalStart);
  const signalPresentation = clientSource.slice(signalStart, signalEnd);

  assert.match(activePresentation, /reactionPresentation\.labels\[signal\]/u);
  assert.match(activePresentation, /reactionPresentation\.legacy\.label/u);
  assert.match(activePresentation, /getWorkbookReactionPresentationState/u);
  assert.match(activePresentation, /viewerFounderRole == null/u);
  assert.doesNotMatch(activePresentation, /option\.shortLabel|getDiscussionSignalShortLabel/u);
  assert.doesNotMatch(
    signalPresentation,
    /Hilfreich|Mitsicht|Frueh sichtbar|Grenzfall|Vorrang|Anschlussfaehig|Klaerungsbeduerftig/u
  );
  assert.doesNotMatch(signalPresentation, /rose-|amber-|emerald-/u);
  assert.match(clientSource, /applyWorkbookReactionSelection\(decisionRulesWorkspace/u);
  assert.match(clientSource, /countWorkbookReactionPresentationStates/u);
  assert.match(clientSource, /systemText\(reactionPresentation\.prompt\)/u);
  assert.match(clientSource, /systemText\(reactionPresentation\.choiceHint\)/u);
  const updateWorkspaceSource = clientSource.slice(
    clientSource.indexOf("function updateWorkspaceV2"),
    clientSource.indexOf("function updateAdvisorReplies")
  );
  assert.match(updateWorkspaceSource, /founderAApproved: false/u);
  assert.match(updateWorkspaceSource, /founderBApproved: false/u);
  const reactionHandler = clientSource.slice(
    clientSource.indexOf("function updateDecisionRulesReaction"),
    clientSource.indexOf("function updateDecisionRulesAgreement")
  );
  assert.match(reactionHandler, /currentUserRole !== "founderA" && currentUserRole !== "founderB"/u);
  assert.doesNotMatch(
    clientSource.slice(
      clientSource.indexOf("const workbookV2ReactionCounts"),
      clientSource.indexOf("const currentStepStatus")
    ),
    /decisionRulesSharedCount|decisionRulesCriticalCount|workbookV2Guardrail|workbookV2PriorityCount|workbookV2DeferredCount/u
  );
});
