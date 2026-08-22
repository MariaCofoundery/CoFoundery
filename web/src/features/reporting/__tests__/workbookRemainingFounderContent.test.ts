import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildWorkbookStepImpulseContent } from "@/features/reporting/founderAlignmentWorkbookImpulses";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";
import { getWorkbookReactionSuggestionGuidance } from "@/features/reporting/workbookReactionSuggestion";
import type { FounderAlignmentWorkbookStepWorkspaceV2 } from "@/features/reporting/founderAlignmentWorkbook";

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

function contentShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(contentShape);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, contentShape(nestedValue)])
    );
  }
  return typeof value;
}

function stringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}

function sourceBetween(startMarker: string, endMarker: string) {
  const start = clientSource.indexOf(startMarker);
  const end = clientSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source boundary: ${endMarker}`);
  return clientSource.slice(start, end);
}

test("remaining active premium content groups have symmetric non-empty DE and EN content", () => {
  const de = getWorkbookContent("de");
  const en = getWorkbookContent("en");

  const workflowGroups = [
    "sectionTitles",
    "sharedSpace",
    "ruleFields",
    "suggestionPresentation",
    "suggestionGuidance",
    "matchingHints",
    "markerImpulseIntro",
    "markerImpulses",
  ] as const;

  for (const group of workflowGroups) {
    assert.deepEqual(contentShape(de.premiumWorkflow[group]), contentShape(en.premiumWorkflow[group]));
    for (const value of [
      ...stringsIn(de.premiumWorkflow[group]),
      ...stringsIn(en.premiumWorkflow[group]),
    ]) {
      assert.notEqual(value.trim(), "", `empty ${group} string`);
    }
  }

  for (const stepId of premiumStepIds) {
    for (const property of ["collectPlaceholder", "impulseQuestions", "suggestion"] as const) {
      assert.deepEqual(
        contentShape(de.premiumSteps[stepId][property]),
        contentShape(en.premiumSteps[stepId][property]),
        `${stepId}.${property}`
      );
      for (const value of [
        ...stringsIn(de.premiumSteps[stepId][property]),
        ...stringsIn(en.premiumSteps[stepId][property]),
      ]) {
        assert.notEqual(value.trim(), "", `empty ${stepId}.${property}`);
      }
    }
  }
});

test("placeholders, hints, impulses, and suggestion templates use the active locale content", () => {
  assert.match(
    clientSource,
    /placeholder=\{systemText\(currentPremiumFieldGuidance\.collectPlaceholder\)\}/u
  );
  assert.doesNotMatch(clientSource, /currentPremiumV2Config\.collectPlaceholder/u);
  assert.match(clientSource, /workbookContent\.premiumWorkflow\.matchingHints/u);
  assert.match(clientSource, /currentPremiumFieldGuidance\.impulseQuestions/u);
  assert.match(clientSource, /workbookContent\.premiumWorkflow\.markerImpulses/u);
  assert.match(clientSource, /suggestion: workbookContent\.premiumSteps\[currentPremiumV2StepId\]\.suggestion/u);
  assert.match(clientSource, /guidance: workbookContent\.premiumWorkflow\.suggestionGuidance/u);
  assert.doesNotMatch(clientSource, /buildWorkbookV2MatchingHint/u);

  for (const configProperty of [
    "agreementPlaceholder",
    "escalationTitle",
    "escalationPlaceholder",
    "escalationHelper",
    "reviewTitle",
    "reviewPlaceholder",
    "reviewHelper",
  ]) {
    assert.doesNotMatch(
      clientSource,
      new RegExp(`currentPremiumV2Config\\.${configProperty}`, "u"),
      configProperty
    );
  }
});

test("localized impulses remain prompts and system suggestions avoid normative team claims", () => {
  for (const locale of ["de", "en"] as const) {
    const content = getWorkbookContent(locale);
    const releasedSystemCopy = [
      ...stringsIn(content.premiumWorkflow.matchingHints),
      ...stringsIn(content.premiumWorkflow.markerImpulses),
      ...premiumStepIds.flatMap((stepId) => [
        ...content.premiumSteps[stepId].impulseQuestions,
        ...stringsIn(content.premiumSteps[stepId].suggestion),
      ]),
    ].join("\n");

    assert.doesNotMatch(
      releasedSystemCopy,
      /tragfaehig|belastbar|gefaehrlich|kritischer Eskalationspunkt|ihr seid euch einig|ihr ergaenzt euch gut|produktiver Unterschied|gemeinsame Basis|nicht unser Weg|opportunistisch|bewusst geparkt|robust team|dangerous|conflict diagnosis|you are aligned|you complement each other|common ground/iu
    );
  }
});

test("the released English founder-workbook scope contains no active German system copy", () => {
  const content = getWorkbookContent("en");
  const englishScope = [
    ...stringsIn(content.premiumWorkflow.sectionTitles),
    ...stringsIn(content.premiumWorkflow.sharedSpace),
    ...stringsIn(content.premiumWorkflow.ruleFields),
    ...stringsIn(content.premiumWorkflow.suggestionPresentation),
    ...stringsIn(content.premiumWorkflow.suggestionGuidance),
    ...stringsIn(content.premiumWorkflow.matchingHints),
    content.premiumWorkflow.markerImpulseIntro,
    ...stringsIn(content.premiumWorkflow.markerImpulses),
    ...premiumStepIds.flatMap((stepId) => [
      content.premiumSteps[stepId].collectPlaceholder,
      ...content.premiumSteps[stepId].impulseQuestions,
      ...stringsIn(content.premiumSteps[stepId].suggestion),
    ]),
  ].join("\n");

  assert.doesNotMatch(
    englishScope,
    /\b(?:ihr|euch|eure|koennt|klaeren|Vereinbarung|Einordnung|Perspektive|Verantwortung|Entwurf|Prueft|Haltet|Beschreibt)\b/iu
  );
});

test("impulse selection returns locale content without changing its wording", () => {
  for (const locale of ["de", "en"] as const) {
    const content = getWorkbookContent(locale);
    for (const stepId of premiumStepIds) {
      const result = buildWorkbookStepImpulseContent(
        content.premiumSteps[stepId].impulseQuestions,
        content.premiumWorkflow.markerImpulses,
        "conditional_complement"
      );
      assert.deepEqual(result.questions, content.premiumSteps[stepId].impulseQuestions);
      assert.deepEqual(
        result.matchingImpulses,
        content.premiumWorkflow.markerImpulses.conditional_complement
      );
    }
  }
});

test("reaction guidance accepts locale copy without changing reaction semantics", () => {
  const workspace: FounderAlignmentWorkbookStepWorkspaceV2 = {
    entries: [
      {
        id: "entry-a",
        content: "Founder content remains unchanged.",
        createdBy: "founderA",
        createdAt: "2026-08-22T08:00:00.000Z",
        sourceEntryId: null,
        updatedAt: null,
        updatedBy: null,
      },
    ],
    reactions: [
      {
        entryId: "entry-a",
        userId: "founderA",
        signal: "critical",
        semanticsVersion: 2,
        updatedAt: null,
      },
    ],
  };

  for (const locale of ["de", "en"] as const) {
    const copy = getWorkbookContent(locale).premiumWorkflow.suggestionGuidance;
    assert.equal(getWorkbookReactionSuggestionGuidance(workspace, copy), copy.furtherDiscussion);
  }
});

test("system templates cross the persistence boundary only after explicit founder action", () => {
  const applySource = sourceBetween(
    "function applyDecisionRulesSuggestion",
    "function canEditStructuredOutputs"
  );
  const agreementUpdateSource = sourceBetween(
    "function updateDecisionRulesAgreement",
    "function applyDecisionRulesSuggestion"
  );
  const saveSource = sourceBetween("const performSave", "function persist");

  assert.match(applySource, /agreement: systemText\(decisionRulesSuggestion\.agreement\)/u);
  assert.match(applySource, /escalationRule: systemText\(decisionRulesSuggestion\.escalationRule\)/u);
  assert.match(applySource, /reviewTrigger: systemText\(decisionRulesSuggestion\.reviewTrigger\)/u);
  assert.match(applySource, /operatingRule: localizedSuggestion\.agreement/u);
  assert.match(agreementUpdateSource, /agreement: value/u);
  assert.doesNotMatch(agreementUpdateSource, /getWorkbookContent|systemText/u);
  assert.doesNotMatch(saveSource, /premiumSteps|suggestionGuidance|markerImpulses/u);
});
