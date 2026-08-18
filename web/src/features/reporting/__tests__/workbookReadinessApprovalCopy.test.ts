import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";

const root = process.cwd();
const clientSource = fs.readFileSync(
  path.resolve(root, "src/features/reporting/FounderAlignmentWorkbookClient.tsx"),
  "utf8"
);

function sourceBetween(startMarker: string, endMarker: string) {
  const start = clientSource.indexOf(startMarker);
  const end = clientSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source boundary: ${endMarker}`);
  return clientSource.slice(start, end);
}

function workflowStrings(locale: "de" | "en") {
  const workflow = getWorkbookContent(locale).premiumWorkflow;
  return [
    workflow.readyText,
    workflow.advisorReadyText,
    workflow.missingPerspectiveText("Alex"),
    ...Object.values(workflow.approval),
  ];
}

test("readiness and approval copy has symmetric non-empty DE and EN structure", () => {
  const de = getWorkbookContent("de").premiumWorkflow;
  const en = getWorkbookContent("en").premiumWorkflow;

  assert.deepEqual(Object.keys(de), Object.keys(en));
  assert.deepEqual(Object.keys(de.approval), Object.keys(en.approval));

  for (const [locale, values] of [
    ["de", workflowStrings("de")],
    ["en", workflowStrings("en")],
  ] as const) {
    for (const value of values) {
      assert.notEqual(value.trim(), "", `empty ${locale} premium workflow copy`);
    }
  }
});

test("ready and missing copy describes only observable workflow state", () => {
  const de = getWorkbookContent("de").premiumWorkflow;
  const en = getWorkbookContent("en").premiumWorkflow;

  assert.equal(
    de.readyText,
    "Ihr habt beide eure Perspektive eingebracht. Im naechsten Schritt koennt ihr die Punkte gemeinsam einordnen."
  );
  assert.equal(
    en.readyText,
    "You have both added your perspective. Next, you can review and discuss the points together."
  );
  assert.equal(
    de.missingPerspectiveText("Alex"),
    "Bevor ihr gemeinsam weiterarbeitet, fehlt noch die Perspektive von Alex."
  );
  assert.equal(
    en.missingPerspectiveText("Alex"),
    "Before you continue together, a perspective from Alex is still missing."
  );

  const systemCopy = [...workflowStrings("de"), ...workflowStrings("en")].join("\n");
  assert.doesNotMatch(
    systemCopy,
    /tragfaehig|belastbar|passt zusammen|gemeinsam getragen|wirklich traegt|robust|sustainable|successfully aligned|future-proof|works in practice/iu
  );
});

test("approval copy confirms only the current version", () => {
  const de = getWorkbookContent("de").premiumWorkflow.approval;
  const en = getWorkbookContent("en").premiumWorkflow.approval;

  assert.deepEqual(de, {
    title: "Diese Fassung bestaetigen",
    intro:
      "Prueft die aktuelle Fassung noch einmal. Bestaetigt sie, wenn sie das festhaelt, worauf ihr euch fuer diesen Punkt verstaendigt habt.",
    confirmButton: "Ich bestaetige diese Fassung",
    withdrawButton: "Bestaetigung zuruecknehmen",
  });
  assert.deepEqual(en, {
    title: "Confirm this version",
    intro:
      "Review the current version once more. Confirm it if it reflects what you have agreed to record for this point.",
    confirmButton: "I confirm this version",
    withdrawButton: "Withdraw confirmation",
  });
});

test("the active client uses locale-aware workflow copy without step-specific duplicates", () => {
  for (const expression of [
    "workbookContent.premiumWorkflow.readyText",
    "workbookContent.premiumWorkflow.advisorReadyText",
    "workbookContent.premiumWorkflow.missingPerspectiveText",
    "workbookContent.premiumWorkflow.approval.title",
    "workbookContent.premiumWorkflow.approval.intro",
    "workbookContent.premiumWorkflow.approval.withdrawButton",
    "workbookContent.premiumWorkflow.approval.confirmButton",
  ]) {
    assert.match(clientSource, new RegExp(expression.replaceAll(".", "\\."), "u"));
  }

  for (const removedProperty of [
    "collectReadyText",
    "missingPerspectiveText",
    "approvalTitle",
    "approvalIntro",
  ]) {
    assert.doesNotMatch(clientSource, new RegExp(`${removedProperty}[?:]`, "u"));
    assert.doesNotMatch(clientSource, new RegExp(`currentPremiumV2Config\\.${removedProperty}`, "u"));
  }

  assert.match(clientSource, /wt\("client\.premium\.status\.confirmed"\)/u);
  assert.match(clientSource, /wt\("client\.premium\.status\.awaitingSecondApproval"\)/u);
  assert.match(clientSource, /wt\("client\.premium\.status\.awaitingApproval"\)/u);
  assert.match(clientSource, /wt\("client\.premium\.status\.open"\)/u);
});

test("reaction and insight configuration remains on its existing path", () => {
  for (const property of [
    "signalOptions",
    "sharedInsightTitle",
    "sharedInsightText",
    "pendingInsightTitle",
    "pendingInsightText",
    "criticalInsightTitle",
    "criticalInsightText",
  ]) {
    assert.match(clientSource, new RegExp(`${property}[?:]`, "u"));
  }
  assert.match(clientSource, /function updateDecisionRulesReaction/u);
  assert.match(clientSource, /currentPremiumV2InsightCopy/u);
});

test("workflow copy stays outside approval and founder-content persistence paths", () => {
  for (const source of [
    sourceBetween("function addDecisionRulesDiscussionEntry", "function addAdvisorReply"),
    sourceBetween("function updateDecisionRulesAgreement", "function applyDecisionRulesSuggestion"),
    sourceBetween("function updateStructuredOutput", "function updateApproval"),
    sourceBetween("function updateApproval", "function updateAdvisorClosing"),
    sourceBetween("const performSave", "function persist"),
  ]) {
    assert.doesNotMatch(source, /premiumWorkflow/u);
  }

  assert.match(clientSource, /content,\s*createdBy: currentUserRole/u);
  assert.match(clientSource, /agreement: value/u);
  assert.match(clientSource, /\[field\]: value/u);
});
