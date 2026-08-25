import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildEmptyFounderAlignmentWorkbookPayload,
  hasLegacyFounderAlignmentWorkbookContent,
  projectFounderAlignmentWorkbookForLegacyAdvisor,
} from "@/features/reporting/founderAlignmentWorkbook";

test("advisor legacy projection removes Deep Dive and Open Point content server-side", () => {
  const payload = buildEmptyFounderAlignmentWorkbookPayload();
  payload.currentStepId = "alignment_open_points";
  payload.steps.decision_rules.founderA = "Legacy founder perspective";
  payload.steps.decision_rules.agreement = "Historical agreement";
  payload.steps.decision_rules.founderAApproved = true;
  payload.steps.decision_rules.reflectionNote = "PRIVATE DECISION REFLECTION";
  payload.steps.decision_rules.workspaceV2 = {
    entries: [{
      id: "decision-private-entry",
      content: "PRIVATE DECISION DISCUSSION",
      createdBy: "founderA",
      createdAt: "2026-08-25T10:00:00.000Z",
      sourceEntryId: null,
      updatedAt: null,
      updatedBy: null,
    }],
    reactions: [],
  };
  payload.steps.collaboration_conflict.reflectionNote = "PRIVATE CONFLICT REFLECTION";
  payload.steps.alignment_open_points.openPoints = [{
    id: "private-point",
    area: "commitment",
    focus: "PRIVATE OPEN POINT",
    founderA: "PRIVATE A",
    founderB: "PRIVATE B",
    reflectionNote: "PRIVATE OPEN POINT REFLECTION",
    advisorReplies: [],
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: null,
  }];

  const projected = projectFounderAlignmentWorkbookForLegacyAdvisor(payload);

  assert.equal(projected.currentStepId, "vision_direction");
  assert.equal(projected.steps.decision_rules.founderA, "Legacy founder perspective");
  assert.equal(projected.steps.decision_rules.agreement, "Historical agreement");
  assert.equal(projected.steps.decision_rules.founderAApproved, true);
  assert.equal(projected.steps.decision_rules.reflectionNote, "");
  assert.equal(projected.steps.decision_rules.workspaceV2, undefined);
  assert.equal(projected.steps.collaboration_conflict.reflectionNote, "");
  assert.deepEqual(projected.steps.alignment_open_points.openPoints, []);
  assert.doesNotMatch(JSON.stringify(projected), /PRIVATE (DECISION|CONFLICT|OPEN POINT)/u);
});

test("founder-only activity is not classified as a historical workbook", () => {
  const payload = buildEmptyFounderAlignmentWorkbookPayload();
  payload.steps.decision_rules.reflectionNote = "Founder-only reflection";
  payload.steps.alignment_open_points.openPoints = [{
    id: "point",
    area: "other",
    focus: "Founder-only focus",
    founderA: "Perspective",
    founderB: "",
    reflectionNote: "",
    advisorReplies: [],
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: null,
  }];
  assert.equal(hasLegacyFounderAlignmentWorkbookContent(payload), false);
  payload.steps.decision_rules.agreement = "Historical agreement";
  assert.equal(hasLegacyFounderAlignmentWorkbookContent(payload), true);
});

test("advisor writes and UI cannot enter founder-only Deep Dive scope", () => {
  const actions = readFileSync(
    "src/features/reporting/founderAlignmentWorkbookActions.ts",
    "utf8"
  );
  const data = readFileSync("src/features/reporting/founderAlignmentWorkbookData.ts", "utf8");
  const client = readFileSync("src/features/reporting/FounderAlignmentWorkbookClient.tsx", "utf8");

  assert.match(data, /projectFounderAlignmentWorkbookForLegacyAdvisor\(workbook\)/u);
  assert.match(actions, /advisorPatchTargetsFounderOnlyDeepDive/u);
  assert.match(actions, /patch\.stepId === "alignment_open_points"/u);
  assert.match(actions, /founderOnlyEntryIds\.has\(reply\.sourceEntryId\)/u);
  assert.match(client, /!isAdvisorViewer && isWorkbookDeepDivePilotStep/u);

});

test("Advisor V2 copy is parallel and avoids current Workbook primary navigation", () => {
  const deAdvisor = JSON.parse(readFileSync("messages/de/advisor.json", "utf8"));
  const enAdvisor = JSON.parse(readFileSync("messages/en/advisor.json", "utf8"));
  const deTeams = JSON.parse(readFileSync("messages/de/teams.json", "utf8"));
  const enTeams = JSON.parse(readFileSync("messages/en/teams.json", "utf8"));
  const dashboard = readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8");
  const navigation = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");

  assert.deepEqual(
    Object.keys(deAdvisor.dashboard.setupStatuses),
    Object.keys(enAdvisor.dashboard.setupStatuses)
  );
  assert.deepEqual(
    Object.keys(deTeams.setup.advisorView.accessStatuses),
    Object.keys(enTeams.setup.advisorView.accessStatuses)
  );
  assert.match(deTeams.setup.advisorAccess.description, /Commitment Lab.*privat/u);
  assert.match(enTeams.setup.advisorAccess.description, /Commitment Lab.*private/u);
  assert.match(dashboard, /openHistoricalWorkbook/u);
  assert.doesNotMatch(dashboard, /t\("dashboard\.openWorkbook"\)/u);
  assert.doesNotMatch(navigation, /\{t\("workbook"\)\}/u);
  assert.doesNotMatch(dashboard, /CommitmentLab|commitment-lab/u);
});
