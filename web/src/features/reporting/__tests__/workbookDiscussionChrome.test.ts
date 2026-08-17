import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

type MessageTree = { [key: string]: string | MessageTree };

const root = process.cwd();
const clientSource = fs.readFileSync(
  path.resolve(root, "src/features/reporting/FounderAlignmentWorkbookClient.tsx"),
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

function assertParallelMessages(
  deValue: string | MessageTree,
  enValue: string | MessageTree,
  key: string
) {
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

test("discussion chrome messages are complete, parallel, and non-empty", () => {
  const deDiscussion = valueAt(de, "client.discussion");
  const enDiscussion = valueAt(en, "client.discussion");
  assert.ok(deDiscussion, "missing German client.discussion");
  assert.ok(enDiscussion, "missing English client.discussion");
  assertParallelMessages(deDiscussion, enDiscussion, "client.discussion");
});

test("discussion counters use locale-aware ICU plural forms", () => {
  const expectations = [
    ["client.discussion.classifications", "Einordnung", "Einordnungen", "classification", "classifications"],
    ["client.discussion.advisorReplyCount", "Antwort", "Antworten", "advisor reply", "advisor replies"],
    ["client.discussion.connectionCount", "Anschlussbeitrag", "Anschlussbeiträge", "follow-up", "follow-ups"],
  ] as const;

  for (const [key, deOne, deOther, enOne, enOther] of expectations) {
    const deValue = valueAt(de, key);
    const enValue = valueAt(en, key);
    assert.equal(typeof deValue, "string", `missing German ${key}`);
    assert.equal(typeof enValue, "string", `missing English ${key}`);
    assert.match(deValue as string, /\{count, plural, one \{/u);
    assert.match(enValue as string, /\{count, plural, one \{/u);
    assert.match(deValue as string, new RegExp(deOne, "u"));
    assert.match(deValue as string, new RegExp(deOther, "u"));
    assert.match(enValue as string, new RegExp(enOne, "u"));
    assert.match(enValue as string, new RegExp(enOther, "u"));
  }
});

test("discussion UI uses messages while stored content and names stay direct", () => {
  for (const messagePath of [
    "client.discussion.sharedSpace",
    "client.discussion.addOwnPoint",
    "client.discussion.empty",
    "client.discussion.replyPlaceholder",
    "client.discussion.connectionCount",
  ]) {
    assert.match(clientSource, new RegExp(`wt\\("${messagePath.replaceAll(".", "\\.")}`, "u"));
  }

  for (const directValue of [
    /value=\{entry\.content\}/u,
    /\{entry\.content\}/u,
    /\{reply\.content\}/u,
    /\{compactPreview\}/u,
    /\{authorLabel\}/u,
    /\{reply\.advisorName \|\| advisorLabel\}/u,
  ]) {
    assert.match(clientSource, directValue);
  }

  assert.doesNotMatch(
    clientSource,
    /(?:wt|t|normalizeGermanText|normalizeWorkbookSystemText)\([^\n]*(?:entry\.content|reply\.content|compactPreview)/u
  );
});

test("legacy German discussion chrome is no longer rendered through the normalizer", () => {
  for (const legacyText of [
    "Eigenen Punkt hinzufuegen",
    "Noch keine Punkte im gemeinsamen Raum",
    "Antwort speichern",
    "Anschlussbeitraege",
    "Antworten aus der Begleitung",
  ]) {
    assert.doesNotMatch(clientSource, new RegExp(`t\\("${legacyText}`, "u"));
  }
});
