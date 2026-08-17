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
const summarySource = clientSource.slice(
  clientSource.indexOf("function WorkbookSummaryView"),
  clientSource.indexOf("function buildWorkbookSummaryStructuredItems")
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

test("summary chrome messages are complete, parallel, and non-empty", () => {
  const deSummary = valueAt(de, "client.summary");
  const enSummary = valueAt(en, "client.summary");
  assert.ok(deSummary, "missing German client.summary");
  assert.ok(enSummary, "missing English client.summary");
  assertParallelMessages(deSummary, enSummary, "client.summary");
});

test("summary structure, empty states, statuses, and actions use messages", () => {
  for (const messagePath of [
    "client.summaryTitle",
    "client.summary.outsidePerspective",
    "client.summary.empty.agreement",
    "client.summary.reactionStatuses.understood",
    "client.summary.followUp.fourWeeks",
    "client.summary.advisorNotes",
    "client.exportPdf",
    "client.backToLastStep",
  ]) {
    assert.match(clientSource, new RegExp(`wt\\("${messagePath.replaceAll(".", "\\.")}`, "u"));
  }

  for (const legacyText of [
    "Aussenblick",
    "Noch kein Aussenblick festgehalten.",
    "Noch kein Reaktionsstatus festgehalten.",
    "Zu diesem Schritt liegt aktuell noch keine klare Regel vor.",
    "Impuls aus der Begleitung",
  ]) {
    assert.doesNotMatch(summarySource, new RegExp(`t\\("${legacyText}`, "u"));
  }
});

test("stored summary content and identities remain direct", () => {
  for (const directValue of [
    /primaryAgreement \|\| wt\("client\.summary\.empty\.agreement"\)/u,
    /item\.advisorClosing\?\.observations \|\|/u,
    /item\.advisorClosing\?\.questions \|\|/u,
    /item\.advisorClosing\?\.nextSteps \|\|/u,
    /\$\{item\.founderReaction\.comment\}/u,
    /\{item\.advisorNotes\}/u,
    /\{founderALabel\} x \{founderBLabel\}/u,
  ]) {
    assert.match(clientSource, directValue);
  }

  assert.doesNotMatch(
    summarySource,
    /(?:wt|t|normalizeGermanText|normalizeWorkbookSystemText)\(\s*(?:primaryAgreement|item\.(?:advisorNotes|founderReaction\.comment)|item\.advisorClosing\?\.(?:observations|questions|nextSteps))/u
  );
});

test("interactive summary keeps print implementation and product feedback separate", () => {
  assert.match(summarySource, /onClick=\{\(\) => window\.print\(\)\}/u);
  assert.match(summarySource, /<ProductFeedbackEntry/u);
  assert.doesNotMatch(summarySource, /founder-alignment\/workbook\/print/u);
});
