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
import { getWorkbookReactionSuggestionGuidance } from "@/features/reporting/workbookReactionSuggestion";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";

const root = process.cwd();
const clientSource = fs.readFileSync(
  path.resolve(root, "src/features/reporting/FounderAlignmentWorkbookClient.tsx"),
  "utf8"
);
const builderStart = clientSource.indexOf("function buildWorkbookV2Suggestion");
const builderEnd = clientSource.indexOf("export function FounderAlignmentWorkbookClient", builderStart);
const builderSource = clientSource.slice(builderStart, builderEnd);
const forbiddenSeverity =
  /kritisch|gefahr|tragfaehig|tragbar|risikoampel|eskalationspunkt|nicht unser weg|bewusst freigeben|bewusst geparkt|gemeinsamer fokus/iu;

const premiumStepIds = [
  "vision_direction",
  "roles_responsibility",
  "decision_rules",
  "commitment_load",
  "collaboration_conflict",
  "ownership_risk",
  "values_guardrails",
  "alignment_90_days",
] as const;
const suggestionGuidance = getWorkbookContent("de").premiumWorkflow.suggestionGuidance;

function reaction(
  userId: "founderA" | "founderB",
  signal: FounderAlignmentWorkbookDiscussionSignal,
  current = false
): FounderAlignmentWorkbookDiscussionReaction {
  return {
    entryId: "entry-a",
    userId,
    signal,
    updatedAt: null,
    ...(current
      ? { semanticsVersion: CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION }
      : {}),
  };
}

function workspace(
  reactions: FounderAlignmentWorkbookDiscussionReaction[]
): FounderAlignmentWorkbookStepWorkspaceV2 {
  return {
    entries: [
      {
        id: "entry-a",
        content: "Founder input remains unchanged.",
        createdBy: "founderA",
        createdAt: "2026-08-22T08:00:00.000Z",
        sourceEntryId: null,
        updatedAt: null,
        updatedBy: null,
      },
    ],
    reactions,
  };
}

test("legacy reactions do not create current suggestion meaning", () => {
  assert.equal(
    getWorkbookReactionSuggestionGuidance(
      workspace([reaction("founderA", "critical")]),
      suggestionGuidance
    ),
    null
  );
  assert.equal(
    getWorkbookReactionSuggestionGuidance(
      workspace([reaction("founderA", "agree"), reaction("founderB", "agree")]),
      suggestionGuidance
    ),
    null
  );
  assert.equal(
    getWorkbookReactionSuggestionGuidance(
      workspace([reaction("founderA", "important"), reaction("founderB", "important")]),
      suggestionGuidance
    ),
    null
  );
});

test("current further-discussion reactions produce only neutral guidance", () => {
  const guidance = getWorkbookReactionSuggestionGuidance(
    workspace([reaction("founderA", "critical", true)]),
    suggestionGuidance
  );

  assert.equal(guidance, suggestionGuidance.furtherDiscussion);
  assert.match(guidance ?? "", /Klaerungsbedarf/u);
  assert.match(guidance ?? "", /was noch offen ist/u);
  assert.doesNotMatch(guidance ?? "", forbiddenSeverity);
});

test("current same and different reactions remain descriptive", () => {
  assert.equal(
    getWorkbookReactionSuggestionGuidance(
      workspace([
        reaction("founderA", "agree", true),
        reaction("founderB", "agree", true),
      ]),
      suggestionGuidance
    ),
    null
  );
  assert.equal(
    getWorkbookReactionSuggestionGuidance(
      workspace([
        reaction("founderA", "important", true),
        reaction("founderB", "important", true),
      ]),
      suggestionGuidance
    ),
    null
  );

  const different = getWorkbookReactionSuggestionGuidance(
    workspace([
      reaction("founderA", "important", true),
      reaction("founderB", "agree", true),
    ]),
    suggestionGuidance
  );
  assert.equal(different, suggestionGuidance.differentResponses);
  assert.match(different ?? "", /unterschiedlich eingeordnete Punkte/u);
  assert.doesNotMatch(different ?? "", /gemeinsam getragen|gemeinsame Position/iu);
});

test("all premium steps share the neutral current-critical guidance", () => {
  const guidance = getWorkbookReactionSuggestionGuidance(
    workspace([reaction("founderA", "critical", true)]),
    suggestionGuidance
  );

  for (const stepId of premiumStepIds) {
    assert.ok(guidance, `${stepId} must retain useful clarification guidance`);
    assert.doesNotMatch(guidance, forbiddenSeverity, stepId);
  }
});

test("the active builder uses observations without legacy shared or severity branches", () => {
  assert.notEqual(builderStart, -1);
  assert.notEqual(builderEnd, -1);
  assert.match(
    builderSource,
    /getWorkbookReactionSuggestionGuidance\(\s*params\.workspace,\s*params\.guidance\s*\)/u
  );
  assert.match(builderSource, /\.\.\.params\.suggestion/u);
  assert.doesNotMatch(builderSource, /criticalEntries|sharedEntries/u);

  for (const oldReactionClaim of [
    "klar kritisch sieht",
    "nicht mehr allein tragbar",
    "Tragbare Kompromisse",
    "Grenzfaelle werden",
    "Punkte, die beide klar tragen",
  ]) {
    assert.equal(builderSource.includes(oldReactionClaim), false, oldReactionClaim);
  }
});

test("applying a suggestion keeps the existing explicit persistence boundary", () => {
  const start = clientSource.indexOf("function applyDecisionRulesSuggestion");
  const end = clientSource.indexOf("function canEditStructuredOutputs", start);
  const applySource = clientSource.slice(start, end);

  assert.match(applySource, /agreement: systemText\(decisionRulesSuggestion\.agreement\)/u);
  assert.match(applySource, /escalationRule: systemText\(decisionRulesSuggestion\.escalationRule\)/u);
  assert.match(applySource, /reviewTrigger: systemText\(decisionRulesSuggestion\.reviewTrigger\)/u);
  assert.match(applySource, /operatingRule: localizedSuggestion\.agreement/u);
  assert.match(applySource, /agreement: localizedSuggestion\.agreement/u);
  assert.doesNotMatch(applySource, /semanticsVersion|workspace\.reactions/u);
});
