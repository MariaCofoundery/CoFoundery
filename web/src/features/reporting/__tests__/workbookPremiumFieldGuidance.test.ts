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

const expectedEnglishGuidance = {
  vision_direction: {
    collectHelper: "Start with two or three clear observations about priorities or focus.",
    agreementTitle: "Direction rule",
    reviewSummary: "Add an optional review point",
  },
  roles_responsibility: {
    collectHelper:
      "A useful point names the topic, who leads it, and when the other person needs to be involved.",
    agreementTitle: "Responsibility rule",
    reviewSummary: "Add an optional ownership signal",
  },
  decision_rules: {
    collectHelper: "Start with two or three points rather than a perfect formulation.",
    agreementTitle: "Decision rule",
    reviewSummary: "Add an optional review trigger",
  },
  commitment_load: {
    collectHelper:
      "A useful point names an expectation, boundary, or early signal. No justification is needed.",
    agreementTitle: "Commitment rule",
    reviewSummary: "Add an optional early warning signal",
  },
  collaboration_conflict: {
    collectHelper: "Start with specific situations rather than long explanations.",
    agreementTitle: "Clarification rule",
    reviewSummary: "Add an optional early warning signal",
  },
  ownership_risk: {
    collectHelper: "A useful point names the risk, the threshold, and who needs to be involved by then.",
    agreementTitle: "Risk ownership rule",
    reviewSummary: "Add an optional early warning signal",
  },
  values_guardrails: {
    collectHelper: "A useful point describes a real case rather than an abstract statement of values.",
    agreementTitle: "Guardrail rule",
    reviewSummary: "Add an optional review question",
  },
  alignment_90_days: {
    collectHelper: "A useful point is a focus decision for the next phase, not a to-do.",
    agreementTitle: "90-day focus",
    reviewSummary: "Set a progress and review point",
  },
} as const;

function sourceBetween(startMarker: string, endMarker: string) {
  const start = clientSource.indexOf(startMarker);
  const end = clientSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source boundary: ${endMarker}`);
  return clientSource.slice(start, end);
}

test("premium field guidance has identical typed DE and EN structure", () => {
  const de = getWorkbookContent("de").premiumSteps;
  const en = getWorkbookContent("en").premiumSteps;

  assert.deepEqual(Object.keys(de), premiumStepIds);
  assert.deepEqual(Object.keys(en), premiumStepIds);

  for (const stepId of premiumStepIds) {
    assert.deepEqual(Object.keys(de[stepId]).sort(), ["agreementTitle", "collectHelper", "reviewSummary"]);
    assert.deepEqual(Object.keys(en[stepId]).sort(), ["agreementTitle", "collectHelper", "reviewSummary"]);
    for (const property of ["collectHelper", "agreementTitle", "reviewSummary"] as const) {
      assert.notEqual(de[stepId][property].trim(), "", `empty German ${stepId}.${property}`);
      assert.notEqual(en[stepId][property].trim(), "", `empty English ${stepId}.${property}`);
    }
  }

  assert.deepEqual(en, expectedEnglishGuidance);
});

test("the active client renders only the approved field guidance from locale-aware content", () => {
  assert.match(
    clientSource,
    /workbookContent\.premiumSteps\[currentPremiumV2StepId\]/u
  );
  for (const property of ["collectHelper", "agreementTitle", "reviewSummary"] as const) {
    assert.match(clientSource, new RegExp(`systemText\\(currentPremiumFieldGuidance\\.${property}\\)`, "u"));
    assert.doesNotMatch(clientSource, new RegExp(`currentPremiumV2Config\\.${property}`, "u"));
  }
});

test("remaining yellow and red premium copy stays on the existing config path", () => {
  for (const property of [
    "collectPlaceholder",
    "weightingIntro",
    "ruleIntro",
    "signalOptions",
    "sharedInsightTitle",
    "pendingInsightTitle",
    "criticalInsightTitle",
  ]) {
    assert.match(clientSource, new RegExp(`${property}[?:]`, "u"), `missing config property ${property}`);
  }

  assert.match(clientSource, /currentPremiumV2Config\.collectPlaceholder/u);
  assert.match(clientSource, /workbookContent\.premiumWorkflow\.reactionPresentation/u);
  assert.match(clientSource, /currentPremiumV2Config\.ruleIntro/u);
});

test("premium field guidance stays outside founder content and persistence paths", () => {
  for (const source of [
    sourceBetween("function addDecisionRulesDiscussionEntry", "function addAdvisorReply"),
    sourceBetween("function updateDecisionRulesAgreement", "function applyDecisionRulesSuggestion"),
    sourceBetween("function updateStructuredOutput", "function updateApproval"),
    sourceBetween("const performSave", "function persist"),
  ]) {
    assert.doesNotMatch(source, /premiumSteps|currentPremiumFieldGuidance/u);
  }

  assert.match(clientSource, /content,\s*createdBy: currentUserRole/u);
  assert.match(clientSource, /agreement: value/u);
  assert.match(clientSource, /\[field\]: value/u);
});
