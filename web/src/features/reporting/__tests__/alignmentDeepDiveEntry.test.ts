import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildWorkbookDeepDiveHref } from "@/features/reporting/workbookNavigation";

const deReport = JSON.parse(readFileSync("messages/de/report.json", "utf8"));
const enReport = JSON.parse(readFileSync("messages/en/report.json", "utf8"));
const deWorkbook = JSON.parse(readFileSync("messages/de/workbook.json", "utf8"));
const enWorkbook = JSON.parse(readFileSync("messages/en/workbook.json", "utf8"));

test("report CTA leads to current collaboration, not the retired three-topic stage", () => {
  assert.match(deReport.legacy.workbookText, /Founder Setup/);
  assert.match(enReport.legacy.workbookText, /Founder Setup/);
  assert.doesNotMatch(deReport.legacy.workbookCta, /Workbook|vertiefen/);
});

test("historical intro copy preserves the three original topics", () => {
  assert.equal(Object.keys(deWorkbook.intro.steps).length, 3);
  assert.deepEqual(Object.keys(deWorkbook.intro.steps), Object.keys(enWorkbook.intro.steps));
  assert.equal(deWorkbook.intro.chooseTopic, "Thema auswählen");
  assert.equal(enWorkbook.intro.chooseTopic, "Choose a topic");
  assert.equal(deWorkbook.intro.topics.decisionRules.title, "Entscheidungen & Entscheidungshoheit");
  assert.equal(deWorkbook.intro.topics.collaborationConflict.title, "Konflikt & Zusammenarbeit");
  assert.equal(enWorkbook.intro.topics.decisionRules.title, "Decisions & decision authority");
  assert.equal(enWorkbook.intro.topics.collaborationConflict.title, "Conflict & collaboration");
  assert.equal(deWorkbook.intro.topics.openPoints.title, "Offene Punkte aus eurem Alignment");
  assert.equal(enWorkbook.intro.topics.openPoints.title, "Open points from your alignment");
  assert.equal(deWorkbook.intro.topics.openPoints.action, "Eigenen Punkt vertiefen");
  assert.equal(enWorkbook.intro.topics.openPoints.action, "Explore your own point");
});

test("saved topic links retain their original encoding for historical compatibility", () => {
  const decisionHref = buildWorkbookDeepDiveHref("invite 1", "pre_founder", "decision_rules");
  const conflictHref = buildWorkbookDeepDiveHref(
    "invite 1",
    "pre_founder",
    "collaboration_conflict"
  );
  const openPointHref = buildWorkbookDeepDiveHref(
    "invite 1",
    "pre_founder",
    "alignment_open_points"
  );
  assert.match(decisionHref, /invitationId=invite%201/u);
  assert.match(decisionHref, /deepDiveStep=decision_rules/u);
  assert.match(conflictHref, /deepDiveStep=collaboration_conflict/u);
  assert.match(openPointHref, /deepDiveStep=alignment_open_points/u);
  assert.notEqual(decisionHref, conflictHref);
  assert.notEqual(conflictHref, openPointHref);
});

test("historical deep-dive URLs render saved content; intro routes to Setup", () => {
  const intro = readFileSync("src/app/(product)/founder-alignment/workbook/intro/page.tsx", "utf8");
  const page = readFileSync("src/app/(product)/founder-alignment/workbook/page.tsx", "utf8");
  assert.match(intro, /currentTeamForInvitation/);
  assert.match(intro, /teams\/\$\{team\}\/setup/);
  assert.match(page, /HistoricalWorkbookPage/);
  assert.doesNotMatch(page, /FounderAlignmentWorkbookClient|currentStepId|deepDiveTopicsHref/);
});
