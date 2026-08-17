import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  workbookPremiumPhaseMessageKey,
  type WorkbookPremiumPhase,
} from "@/features/reporting/workbookClientChrome";

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

function functionSource(name: string, nextName: string) {
  const start = clientSource.indexOf(`function ${name}`);
  const end = clientSource.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `missing ${name}`);
  assert.notEqual(end, -1, `missing boundary ${nextName}`);
  return clientSource.slice(start, end);
}

test("premium workflow chrome messages are complete, parallel, and non-empty", () => {
  const dePremium = valueAt(de, "client.premium");
  const enPremium = valueAt(en, "client.premium");
  assert.ok(dePremium, "missing German client.premium");
  assert.ok(enPremium, "missing English client.premium");
  assertParallelMessages(dePremium, enPremium, "client.premium");
});

test("premium phase codes keep their semantics while labels are locale-aware", () => {
  const phases: WorkbookPremiumPhase[] = ["collect", "weight", "rule", "approval"];
  assert.deepEqual(
    phases.map((phase) => workbookPremiumPhaseMessageKey(phase, "decision_rules")),
    [
      "client.premium.phases.collect",
      "client.premium.phases.weight",
      "client.premium.phases.rule",
      "client.premium.phases.approval",
    ]
  );
  assert.deepEqual(
    phases.map((phase) => workbookPremiumPhaseMessageKey(phase, "values_guardrails")),
    [
      "client.premium.phases.boundaries",
      "client.premium.phases.classify",
      "client.premium.phases.guardrail",
      "client.premium.phases.approval",
    ]
  );
  assert.deepEqual(
    phases.map((phase) => workbookPremiumPhaseMessageKey(phase, "alignment_90_days")),
    [
      "client.premium.phases.focus",
      "client.premium.phases.prioritize",
      "client.premium.phases.agreement",
      "client.premium.phases.approval",
    ]
  );
});

test("premium status and transition chrome use messages", () => {
  for (const messagePath of [
    "client.premium.currentPhase",
    "client.premium.status.perspectives",
    "client.premium.status.awaitingSecondApproval",
    "client.premium.status.advisorReplies",
    "client.premium.transitions.toWeightHint",
    "client.premium.transitions.toRuleAction",
    "client.premium.transitions.toApprovalAction",
  ]) {
    assert.match(clientSource, new RegExp(`wt\\("${messagePath.replaceAll(".", "\\.")}`, "u"));
  }

  for (const oldChrome of [
    "Aktuell: ${advisorCurrentPhaseMeta.label}",
    "wartet auf zweite Bestaetigung",
    "Weiter zur Einordnung",
    "Weiter zum Entwurf",
    "Weiter zur finalen Absprache",
  ]) {
    assert.equal(clientSource.includes(oldChrome), false, `legacy chrome remains: ${oldChrome}`);
  }
});

test("persistable suggestions and workbook content stay outside localized chrome", () => {
  const suggestionSource = functionSource("buildWorkbookV2Suggestion", "FounderAlignmentWorkbookClient");
  const agreementDraftSource = functionSource("buildAgreementDraft", "buildStepSpecificAgreementDraft");
  assert.doesNotMatch(suggestionSource, /\bwt\(/u);
  assert.doesNotMatch(agreementDraftSource, /\bwt\(/u);
  assert.match(clientSource, /onUseItem=\{useWorkbookImpulseAsDraft\}/u);
  assert.match(clientSource, /onClick=\{applyDecisionRulesSuggestion\}/u);
  assert.match(clientSource, /applyAgreementDraft\(\)/u);

  for (const directContent of [
    /\{entry\.content\}/u,
    /\{reply\.content\}/u,
    /\{item\.advisorNotes\}/u,
  ]) {
    assert.match(clientSource, directContent);
  }
});
