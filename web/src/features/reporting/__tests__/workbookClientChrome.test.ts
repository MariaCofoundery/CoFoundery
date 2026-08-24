import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";
import { workbookStepStatusMessageKey } from "@/features/reporting/workbookClientChrome";

type MessageTree = { [key: string]: string | MessageTree };

const root = process.cwd();
const clientSource = fs.readFileSync(
  path.resolve(root, "src/features/reporting/FounderAlignmentWorkbookClient.tsx"),
  "utf8"
);
const introSource = fs.readFileSync(
  path.resolve(root, "src/features/reporting/FounderAlignmentWorkbookIntro.tsx"),
  "utf8"
);
const de = JSON.parse(
  fs.readFileSync(path.resolve(root, "messages/de/workbook.json"), "utf8")
) as MessageTree;
const en = JSON.parse(
  fs.readFileSync(path.resolve(root, "messages/en/workbook.json"), "utf8")
) as MessageTree;

function valueAt(tree: MessageTree, dottedPath: string): string | MessageTree | undefined {
  return dottedPath.split(".").reduce<string | MessageTree | undefined>((value, segment) => {
    return typeof value === "object" && value != null ? value[segment] : undefined;
  }, tree);
}

function placeholders(value: string) {
  return [...value.matchAll(/\{([a-zA-Z][\w]*)/gu)].map((match) => match[1]).sort();
}

function assertParallelMessages(deValue: string | MessageTree, enValue: string | MessageTree, key: string) {
  assert.equal(typeof deValue, typeof enValue, `type mismatch for ${key}`);
  if (typeof deValue === "string" || typeof enValue === "string") {
    assert.equal(typeof deValue, "string", `German leaf mismatch for ${key}`);
    assert.equal(typeof enValue, "string", `English leaf mismatch for ${key}`);
    const deText = deValue as string;
    const enText = enValue as string;
    assert.notEqual(deText.trim(), "", `empty German ${key}`);
    assert.notEqual(enText.trim(), "", `empty English ${key}`);
    assert.deepEqual(placeholders(deText), placeholders(enText), `placeholder mismatch for ${key}`);
    return;
  }

  const deTree = deValue as MessageTree;
  const enTree = enValue as MessageTree;
  assert.deepEqual(Object.keys(deTree).sort(), Object.keys(enTree).sort(), `key mismatch for ${key}`);
  for (const childKey of Object.keys(deTree)) {
    assertParallelMessages(deTree[childKey], enTree[childKey], `${key}.${childKey}`);
  }
}

test("workbook core chrome messages are complete and parallel", () => {
  for (const key of ["client.logoLabel", "client.mode", "client.statuses", "client.stepChrome", "client.navigation"]) {
    const deValue = valueAt(de, key);
    const enValue = valueAt(en, key);
    assert.ok(deValue, `missing German ${key}`);
    assert.ok(enValue, `missing English ${key}`);
    assertParallelMessages(deValue, enValue, key);
  }
});

test("intro presents all three deep-dive pilots as equal direct choices", () => {
  assert.match(introSource, /decisionRulesHref/u);
  assert.match(introSource, /collaborationConflictHref/u);
  assert.match(introSource, /openPointsHref/u);
  assert.match(introSource, /intro\.topics\.decisionRules\.title/u);
  assert.match(introSource, /intro\.topics\.collaborationConflict\.title/u);
  assert.match(introSource, /intro\.topics\.openPoints\.title/u);
  assert.doesNotMatch(introSource, /prioritizedStepIds|suggestedTopics/u);
  assert.equal(
    getWorkbookContent("de").steps.find((step) => step.id === "decision_rules")?.title,
    "Entscheidungen & Entscheidungshoheit"
  );
  assert.equal(
    getWorkbookContent("en").steps.find((step) => step.id === "collaboration_conflict")
      ?.title,
    "Conflict & collaboration"
  );
});

test("workbook step statuses map to localized chrome without changing their codes", () => {
  const statuses = ["collecting_inputs", "draft_ready", "awaiting_approval", "finalized"] as const;
  assert.deepEqual(statuses.map(workbookStepStatusMessageKey), [
    "client.statuses.inProgress",
    "client.statuses.draftReady",
    "client.statuses.awaitingApproval",
    "client.statuses.finalized",
  ]);
});

test("representative core chrome uses messages without weakening user-content guards", () => {
  for (const messagePath of ["client.mode.title", "client.navigation.nextStep"]) {
    assert.match(clientSource, new RegExp(`wt\\(\"${messagePath.replaceAll(".", "\\.")}\"`, "u"));
  }
  for (const directContent of [/\{entry\.content\}/u, /\{reply\.content\}/u, /\{item\.advisorNotes\}/u]) {
    assert.match(clientSource, directContent);
  }
  assert.doesNotMatch(clientSource, /wt\([^\n]*(?:entry\.content|reply\.content|item\.advisorNotes)/u);
});
