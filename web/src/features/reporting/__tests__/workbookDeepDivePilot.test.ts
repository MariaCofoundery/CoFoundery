import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildEmptyFounderAlignmentWorkbookPayload,
  sanitizeFounderAlignmentWorkbookPayload,
} from "@/features/reporting/founderAlignmentWorkbook";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";
import {
  getWorkbookDeepDiveHandoffState,
  getWorkbookDeepDiveSetupKey,
  getAlignmentOpenPointAreas,
  hasLegacyWorkbookAgreement,
} from "@/features/reporting/workbookDeepDivePilot";

const decisionQuestionDe =
  "Wenn ihr bei einer wichtigen Frage unterschiedlich denkt: Was brauchst du, um eine Entscheidung mitzutragen - auch wenn sie nicht deiner eigenen Praeferenz entspricht?";
const decisionQuestionEn =
  "When you see an important issue differently, what do you need in order to support a decision even when it is not your own preference?";
const conflictQuestionDe =
  "Wenn es zwischen euch wirklich schwierig wird: Was brauchst du, damit ein Konflikt angesprochen, verstanden und wieder bearbeitet werden kann?";
const conflictQuestionEn =
  "When things become genuinely difficult between you, what do you need so a conflict can be raised, understood, and worked through again?";

test("the two pilot topics use the new DE/EN deep-dive contract", () => {
  const de = getWorkbookContent("de");
  const en = getWorkbookContent("en");

  assert.equal(de.premiumSteps.decision_rules.question, decisionQuestionDe);
  assert.equal(en.premiumSteps.decision_rules.question, decisionQuestionEn);
  assert.equal(de.premiumSteps.decision_rules.impulseQuestions.length, 4);
  assert.equal(en.premiumSteps.decision_rules.impulseQuestions.length, 4);
  assert.equal(de.premiumSteps.collaboration_conflict.question, conflictQuestionDe);
  assert.equal(en.premiumSteps.collaboration_conflict.question, conflictQuestionEn);
  assert.equal(de.premiumSteps.collaboration_conflict.impulseQuestions.length, 4);
  assert.equal(en.premiumSteps.collaboration_conflict.impulseQuestions.length, 4);
  assert.equal(de.steps.find((step) => step.id === "decision_rules")?.title, "Entscheidungen & Entscheidungshoheit");
  assert.equal(en.steps.find((step) => step.id === "decision_rules")?.title, "Decisions & decision authority");
  assert.equal(de.steps.find((step) => step.id === "collaboration_conflict")?.title, "Konflikt & Zusammenarbeit");
  assert.equal(en.steps.find((step) => step.id === "collaboration_conflict")?.title, "Conflict & collaboration");
});

test("pilot mappings target exactly one Founder Setup item", () => {
  assert.equal(getWorkbookDeepDiveSetupKey("decision_rules"), "decision_rights");
  assert.equal(getWorkbookDeepDiveSetupKey("collaboration_conflict"), "conflict_deadlock");
  assert.equal(getWorkbookDeepDiveSetupKey("alignment_open_points"), null);
});

test("the fixed open-point deep dive is neutral, locale-aware, and has exactly three prompts", () => {
  const de = getWorkbookContent("de");
  const en = getWorkbookContent("en");
  const deStep = de.steps.find((step) => step.id === "alignment_open_points");
  const enStep = en.steps.find((step) => step.id === "alignment_open_points");

  assert.equal(deStep?.title, "Offene Punkte aus eurem Alignment");
  assert.equal(enStep?.title, "Open points from your alignment");
  assert.equal(
    de.premiumSteps.alignment_open_points.question,
    "Was ist dir an diesem Punkt besonders aufgefallen oder wichtig?"
  );
  assert.equal(
    en.premiumSteps.alignment_open_points.question,
    "What particularly stood out to you or matters to you about this point?"
  );
  assert.equal(de.premiumSteps.alignment_open_points.impulseQuestions.length, 3);
  assert.equal(en.premiumSteps.alignment_open_points.impulseQuestions.length, 3);
  assert.deepEqual(getAlignmentOpenPointAreas(false), [
    "company_logic",
    "decision_logic",
    "work_structure",
    "commitment",
    "risk_orientation",
    "conflict_style",
    "other",
  ]);
  assert.equal(getAlignmentOpenPointAreas(true).includes("values"), true);
  assert.equal(de.premiumWorkflow.deepDivePilot.openPoint.areas.values, "Werte");
  assert.equal(en.premiumWorkflow.deepDivePilot.openPoint.areas.values, "Values");
});

test("open-point selection and focus round-trip without changing agreement semantics", () => {
  const payload = buildEmptyFounderAlignmentWorkbookPayload();
  payload.steps.alignment_open_points.deepDiveArea = "conflict_style";
  payload.steps.alignment_open_points.deepDiveFocus = "Wie gehen wir mit Pausen um?";
  payload.steps.alignment_open_points.reflectionNote = "Wir sprechen Pausen explizit ab.";

  const sanitized = sanitizeFounderAlignmentWorkbookPayload(payload);
  assert.equal(sanitized.steps.alignment_open_points.deepDiveArea, "conflict_style");
  assert.equal(
    sanitized.steps.alignment_open_points.deepDiveFocus,
    "Wie gehen wir mit Pausen um?"
  );
  assert.equal(
    sanitized.steps.alignment_open_points.reflectionNote,
    "Wir sprechen Pausen explizit ab."
  );
  assert.equal(sanitized.steps.alignment_open_points.agreement, "");
  assert.equal(sanitized.steps.alignment_open_points.founderAApproved, false);
  assert.equal(sanitized.steps.alignment_open_points.founderBApproved, false);

  const invalid = sanitizeFounderAlignmentWorkbookPayload({
    ...payload,
    steps: {
      ...payload.steps,
      alignment_open_points: {
        ...payload.steps.alignment_open_points,
        deepDiveArea: "critical_risk",
      },
    },
  });
  assert.equal(invalid.steps.alignment_open_points.deepDiveArea, null);
});

test("reflection notes are additive and preserve historical agreement semantics", () => {
  const payload = buildEmptyFounderAlignmentWorkbookPayload();
  payload.steps.decision_rules.reflectionNote = "Was wir aus dem Gespraech mitnehmen";
  payload.steps.decision_rules.agreement = "Historische Entscheidungsregel";
  payload.steps.decision_rules.founderAApproved = true;
  payload.steps.decision_rules.founderBApproved = true;

  const sanitized = sanitizeFounderAlignmentWorkbookPayload(payload);
  assert.equal(
    sanitized.steps.decision_rules.reflectionNote,
    "Was wir aus dem Gespraech mitnehmen"
  );
  assert.equal(sanitized.steps.decision_rules.agreement, "Historische Entscheidungsregel");
  assert.equal(sanitized.steps.decision_rules.founderAApproved, true);
  assert.equal(sanitized.steps.decision_rules.founderBApproved, true);
  assert.equal(hasLegacyWorkbookAgreement(sanitized.steps.decision_rules), true);
});

test("handoff presentation never treats a three-founder pair as team-wide input", () => {
  const twoFounder = {
    teamId: "team-1",
    memberCount: 2,
    targetWorkingNotes: { decision_rules: "", collaboration_conflict: "Vorhanden" },
  };
  assert.equal(getWorkbookDeepDiveHandoffState(twoFounder, "decision_rules"), "two_founder_ready");
  assert.equal(getWorkbookDeepDiveHandoffState(twoFounder, "collaboration_conflict"), "existing_note");
  assert.equal(
    getWorkbookDeepDiveHandoffState({ ...twoFounder, memberCount: 3 }, "decision_rules"),
    "three_founder_link_only"
  );
  assert.equal(getWorkbookDeepDiveHandoffState(null, "decision_rules"), "unavailable");
});

test("the handoff action is relationship-bound and only calls the atomic working-note handoff", () => {
  const action = readFileSync(
    "src/features/reporting/workbookDeepDiveHandoffActions.ts",
    "utf8"
  );
  assert.match(action, /resolveRelationshipIdForInvitation/);
  assert.match(action, /founder_team_members/);
  assert.match(action, /members\.length !== 2/);
  assert.match(action, /item\?\.working_note\?\.trim\(\)/);
  assert.match(action, /handoff_workbook_deep_dive_note_if_empty/);
  assert.doesNotMatch(action, /propose_founder_team_setup_revision/);
  assert.doesNotMatch(action, /confirm_founder_team_setup_revision/);
  assert.doesNotMatch(action, /founder_team_setup_confirmations/);
  assert.doesNotMatch(action, /clarified|documented|not_relevant/);
});

test("the pilot reuses discussion, reactions, advisor replies, speech, and legacy rendering", () => {
  const client = readFileSync(
    "src/features/reporting/FounderAlignmentWorkbookClient.tsx",
    "utf8"
  );
  assert.match(client, /WorkbookV2DiscussionThreadList/);
  assert.match(client, /mode=\{currentStepIsDeepDivePilot \? "weight" : "collect"\}/);
  assert.match(client, /getWorkbookReactionPresentationState/);
  assert.match(client, /currentStepAdvisorReplyGroups/);
  assert.match(client, /getSpeechRecognitionLocale/);
  assert.match(client, /deepDivePilot\.legacyTitle/);
  assert.match(client, /reflectionNote/);
});

test("pilot topics render as focused linear deep dives with an always-present setup destination", () => {
  const client = readFileSync(
    "src/features/reporting/FounderAlignmentWorkbookClient.tsx",
    "utf8"
  );
  assert.match(client, /visibleWorkbookV2Phase === "collect" \|\| currentStepIsDeepDivePilot/u);
  assert.match(client, /visibleWorkbookV2Phase === "weight" && !currentStepIsDeepDivePilot/u);
  assert.match(client, /visibleWorkbookV2Phase === "rule" \|\| currentStepIsDeepDivePilot/u);
  assert.match(client, /currentDeepDiveDestinationHref/u);
  assert.match(client, /openTeamContext/u);
  assert.match(client, /continueExistingNote/u);
  assert.match(client, /continueWithTeam/u);
  assert.match(client, /currentStepIsDeepDivePilot \? "xl:grid-cols-1"/u);
  assert.match(client, /readStructuredOutputValue\(currentStepStructuredOutputs, field\.key\)/u);
  assert.match(client, /getAlignmentOpenPointAreas\(showValuesStep\)/u);
  assert.match(client, /updateEntry\("deepDiveFocus", value\)/u);
  assert.match(client, /currentOpenPointDestinationHref/u);
  assert.match(client, /openPoint\.handoffAction/u);
  assert.doesNotMatch(
    readFileSync("src/features/reporting/workbookDeepDiveHandoffActions.ts", "utf8"),
    /alignment_open_points[\s\S]*handoff_workbook_deep_dive_note_if_empty/u
  );
});
