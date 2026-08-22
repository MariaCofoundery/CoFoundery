import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  WORKBOOK_STRUCTURED_STEP_IDS,
  type WorkbookStructuredOutputType,
} from "@/features/reporting/founderAlignmentWorkbook";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";

type MessageTree = { [key: string]: string | MessageTree };

const root = process.cwd();
const clientSource = fs.readFileSync(
  path.resolve(root, "src/features/reporting/FounderAlignmentWorkbookClient.tsx"),
  "utf8"
);
const workbookModelSource = fs.readFileSync(
  path.resolve(root, "src/features/reporting/founderAlignmentWorkbook.ts"),
  "utf8"
);
const de = JSON.parse(
  fs.readFileSync(path.resolve(root, "messages/de/workbook.json"), "utf8")
) as MessageTree;
const en = JSON.parse(
  fs.readFileSync(path.resolve(root, "messages/en/workbook.json"), "utf8")
) as MessageTree;

const structuredOutputKeys: WorkbookStructuredOutputType[] = [
  "principle",
  "operatingRule",
  "escalationRule",
  "boundaryRule",
  "reviewTrigger",
];

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

function functionSource(source: string, name: string, nextName: string) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `missing ${name}`);
  assert.notEqual(end, -1, `missing boundary ${nextName}`);
  return source.slice(start, end);
}

test("structured output chrome messages are parallel and non-empty", () => {
  const deStructured = valueAt(de, "client.premium.structured");
  const enStructured = valueAt(en, "client.premium.structured");
  assert.ok(deStructured, "missing German client.premium.structured");
  assert.ok(enStructured, "missing English client.premium.structured");
  assertParallelMessages(deStructured, enStructured, "client.premium.structured");
});

test("all structured output keys retain locale-aware content labels", () => {
  const expectedLabels = {
    de: ["Leitprinzip", "Arbeitsregel", "Eskalationsregel", "Grenzregel", "Review-Trigger"],
    en: ["Guiding principle", "Working rule", "Escalation rule", "Boundary rule", "Review trigger"],
  } as const;

  for (const locale of ["de", "en"] as const) {
    const content = getWorkbookContent(locale);
    for (const stepId of WORKBOOK_STRUCTURED_STEP_IDS) {
      const fields = content.stepContent[stepId].outputFields ?? [];
      assert.deepEqual(fields.map((field) => field.key), structuredOutputKeys, `${locale} keys: ${stepId}`);
      assert.deepEqual(
        fields.map((field) => field.title),
        expectedLabels[locale],
        `${locale} labels: ${stepId}`
      );
    }
  }
});

test("structured fields and missing state use localized chrome without changing requiredness", () => {
  for (const messagePath of [
    "client.premium.structured.sectionTitle",
    "client.premium.structured.requiredHint",
    "client.premium.structured.missingTitle",
    "client.premium.structured.advisorMissingRequired",
    "client.premium.structured.founderMissingRequired",
  ]) {
    assert.match(clientSource, new RegExp(`wt\\("${messagePath.replaceAll(".", "\\.")}"`, "u"));
  }

  assert.match(
    clientSource,
    /title=\{\s*required\s*\? `\$\{field\.title\} \*`\s*: field\.title\s*\}/u
  );
  assert.match(clientSource, /currentStepMissingStructuredFields\.map\(\(field\) =>/u);
  assert.match(clientSource, /<li key=\{field\.key\}>\{field\.title\}<\/li>/u);
  assert.doesNotMatch(clientSource, /function buildMissingStructuredOutputsText/u);
  assert.doesNotMatch(clientSource, /function structuredOutputLabel/u);
  assert.doesNotMatch(
    clientSource,
    /Die zugehoerige Arbeitsregel ist noch nicht vollstaendig ausgefuellt|Pflichtfelder fuer diese Arbeitsregel/u
  );

  const requirednessSource = functionSource(
    workbookModelSource,
    "getWorkbookRequiredStructuredOutputKeys",
    "getMissingWorkbookStructuredOutputKeys"
  );
  const missingSource = functionSource(
    workbookModelSource,
    "getMissingWorkbookStructuredOutputKeys",
    "emptyFounderScores"
  );
  assert.doesNotMatch(requirednessSource, /workbook\.client|useTranslations|\bwt\(/u);
  assert.doesNotMatch(missingSource, /workbook\.client|useTranslations|\bwt\(/u);
});

test("structured founder values and persistence paths remain free of chrome messages", () => {
  assert.match(clientSource, /value=\{fieldValue\}/u);
  assert.match(clientSource, /text=\{summaryItem\.text\}/u);
  assert.doesNotMatch(clientSource, /(?:\bt|\bwt|normalizeGermanText)\(fieldValue\)/u);
  assert.doesNotMatch(clientSource, /(?:\bt|\bwt|normalizeGermanText)\(summaryItem\.text\)/u);

  const updateSource = functionSource(clientSource, "updateStructuredOutput", "updateApproval");
  const suggestionSource = functionSource(
    clientSource,
    "applyDecisionRulesSuggestion",
    "canEditStructuredOutputs"
  );
  assert.doesNotMatch(updateSource, /client\.premium\.structured/u);
  assert.doesNotMatch(suggestionSource, /client\.premium\.structured/u);
  assert.match(updateSource, /\[field\]: value/u);
  assert.match(suggestionSource, /operatingRule: localizedSuggestion\.agreement/u);
  assert.match(
    suggestionSource,
    /agreement: systemText\(decisionRulesSuggestion\.agreement\)/u
  );
});
