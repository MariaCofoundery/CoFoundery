import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildWorkbookDeepDiveHref } from "@/features/reporting/workbookNavigation";

const deReport = JSON.parse(readFileSync("messages/de/report.json", "utf8"));
const enReport = JSON.parse(readFileSync("messages/en/report.json", "utf8"));
const deWorkbook = JSON.parse(readFileSync("messages/de/workbook.json", "utf8"));
const enWorkbook = JSON.parse(readFileSync("messages/en/workbook.json", "utf8"));

test("active report CTA frames the next step as an alignment deep dive in DE and EN", () => {
  assert.deepEqual(deReport.legacy.workbookTitle, "Manche Unterschiede versteht man erst im Gespräch.");
  assert.deepEqual(deReport.legacy.workbookCta, "Alignment vertiefen");
  assert.deepEqual(enReport.legacy.workbookCta, "Alignment deep dive");
  assert.notEqual(deReport.legacy.workbookCta, "Workbook starten");
  assert.notEqual(enReport.legacy.workbookCta, "Start workbook");
});

test("intro is a compact three-step guide with three equal direct topics", () => {
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

test("each topic opens its deep dive independently through the existing safe route", () => {
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

test("started workbooks keep the topic overview and deep dives return to it", () => {
  const introPage = readFileSync(
    "src/app/(product)/founder-alignment/workbook/intro/page.tsx",
    "utf8"
  );
  const workbookPage = readFileSync(
    "src/app/(product)/founder-alignment/workbook/page.tsx",
    "utf8"
  );
  const client = readFileSync(
    "src/features/reporting/FounderAlignmentWorkbookClient.tsx",
    "utf8"
  );
  assert.doesNotMatch(introPage, /hasWorkbookStarted/u);
  assert.match(workbookPage, /isWorkbookDeepDivePilotStep\(params\.deepDiveStep\)/u);
  assert.match(workbookPage, /currentStepId: requestedDeepDiveStep/u);
  assert.match(workbookPage, /deepDiveTopicsHref=\{deepDiveTopicsHref\}/u);
  assert.match(client, /deepDivePilot\.backToTopics/u);
  assert.match(client, /currentDeepDiveDestinationHref/u);
});
