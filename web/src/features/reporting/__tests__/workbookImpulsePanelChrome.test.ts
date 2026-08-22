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
const impulseSource = fs.readFileSync(
  path.resolve(root, "src/features/reporting/founderAlignmentWorkbookImpulses.ts"),
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

function functionSource(name: string, nextName: string) {
  const start = clientSource.indexOf(`function ${name}`);
  const end = clientSource.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `missing ${name}`);
  assert.notEqual(end, -1, `missing boundary ${nextName}`);
  return clientSource.slice(start, end);
}

test("impulse panel chrome messages are parallel and non-empty", () => {
  const deImpulses = valueAt(de, "client.premium.impulses");
  const enImpulses = valueAt(en, "client.premium.impulses");
  assert.ok(deImpulses, "missing German client.premium.impulses");
  assert.ok(enImpulses, "missing English client.premium.impulses");
  assertParallelMessages(deImpulses, enImpulses, "client.premium.impulses");
});

test("toggle and panel chrome use localized messages", () => {
  for (const messagePath of [
    "client.premium.impulses.title",
    "client.premium.impulses.show",
    "client.premium.impulses.hide",
    "client.premium.impulses.intro",
    "client.premium.impulses.editable",
    "client.premium.impulses.readOnly",
    "client.premium.impulses.questions",
    "client.premium.impulses.matchingTitle",
    "client.premium.impulses.contextual",
  ]) {
    assert.match(clientSource, new RegExp(`wt\\("${messagePath.replaceAll(".", "\\.")}"`, "u"));
  }

  for (const oldChrome of [
    't("Fragen & Impulse")',
    't("Direkt uebernehmbar und frei anpassbar")',
    't("Nur lesbar in dieser Rolle")',
    't("Gute Fragen")',
    't("Impuls aus eurem Matching")',
    't("Kontextbezogen")',
  ]) {
    assert.equal(clientSource.includes(oldChrome), false, `legacy panel chrome remains: ${oldChrome}`);
  }
});

test("locale-aware impulse content is normalized only before display or explicit use", () => {
  const panelSource = functionSource("WorkbookStepImpulsePanel", "WorkbookFounderAvatar");

  assert.match(panelSource, /\{systemText\(question\)\}/u);
  assert.match(panelSource, /\{systemText\(impulse\)\}/u);
  assert.match(panelSource, /onClick=\{\(\) => onUseItem\(systemText\(question\)\)\}/u);
  assert.match(panelSource, /onClick=\{\(\) => onUseItem\(systemText\(impulse\)\)\}/u);
  assert.doesNotMatch(panelSource, /onUseItem\(wt\(/u);

  assert.doesNotMatch(impulseSource, /const STEP_QUESTIONS:/u);
  assert.doesNotMatch(impulseSource, /const STEP_MATCHING_IMPULSES:/u);
  assert.match(impulseSource, /export function buildWorkbookStepImpulseContent/u);
});

test("using an impulse keeps the existing prompt-to-draft path free of messages", () => {
  const useImpulseSource = functionSource("useWorkbookImpulseAsDraft", "addDecisionRulesDiscussionEntry");

  assert.match(useImpulseSource, /const nextPrompt = prompt\.trim\(\);/u);
  assert.match(useImpulseSource, /setDiscussionDraft\(nextDraft\);/u);
  assert.doesNotMatch(useImpulseSource, /\bwt\(/u);
  assert.doesNotMatch(useImpulseSource, /normalizeGermanText|\bt\(/u);
  assert.match(clientSource, /onUseItem=\{useWorkbookImpulseAsDraft\}/u);
});
