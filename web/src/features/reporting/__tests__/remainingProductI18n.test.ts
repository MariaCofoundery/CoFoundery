import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getAdvisorImpulseSectionMeta } from "@/features/reporting/advisorSectionImpulses";
import {
  getPresentationLocale,
  getSpeechRecognitionLocale,
} from "@/i18n/presentationLocale";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.resolve(root, relativePath), "utf8")) as Record<
    string,
    unknown
  >;
}

function shape(value: unknown): unknown {
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) return value.map(shape);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, shape(child)])
  );
}

function source(relativePath: string) {
  return fs.readFileSync(path.resolve(root, relativePath), "utf8");
}

test("active founder and advisor message groups stay structurally symmetric", () => {
  const deAdvisor = readJson("messages/de/advisor.json");
  const enAdvisor = readJson("messages/en/advisor.json");
  const deAssessment = readJson("messages/de/assessment.json");
  const enAssessment = readJson("messages/en/assessment.json");
  const deDashboard = readJson("messages/de/dashboard.json");
  const enDashboard = readJson("messages/en/dashboard.json");
  const deInvite = readJson("messages/de/invite.json");
  const enInvite = readJson("messages/en/invite.json");
  const deWorkbook = readJson("messages/de/workbook.json");
  const enWorkbook = readJson("messages/en/workbook.json");
  const deFeedback = readJson("messages/de/feedback.json");
  const enFeedback = readJson("messages/en/feedback.json");
  const deAuth = readJson("messages/de/auth.json");
  const enAuth = readJson("messages/en/auth.json");

  assert.deepEqual(shape(deAdvisor), shape(enAdvisor));
  assert.deepEqual(shape(deAssessment), shape(enAssessment));
  assert.deepEqual(shape(deDashboard), shape(enDashboard));
  assert.deepEqual(shape(deInvite), shape(enInvite));
  assert.deepEqual(shape(deWorkbook.speech), shape(enWorkbook.speech));
  assert.deepEqual(shape(deFeedback.dictation), shape(enFeedback.dictation));
  assert.deepEqual(shape(deAuth.login), shape(enAuth.login));

  assert.equal(
    (enAdvisor.snapshot as Record<string, unknown>).focus instanceof Object,
    true
  );
  assert.equal(
    ((enAdvisor.report as Record<string, unknown>).preview as Record<string, string>)
      .reviewTogether,
    "Review together"
  );
});

test("presentation locale controls dates and both speech entry points", () => {
  assert.equal(getPresentationLocale("de"), "de-DE");
  assert.equal(getPresentationLocale("en"), "en-US");
  assert.equal(getSpeechRecognitionLocale("de-DE"), "de-DE");
  assert.equal(getSpeechRecognitionLocale("en-GB"), "en-US");

  const workbook = source("src/features/reporting/FounderAlignmentWorkbookClient.tsx");
  const feedback = source("src/features/feedback/ProductFeedbackEntry.tsx");
  assert.match(workbook, /recognition\.lang = getSpeechRecognitionLocale\(locale\)/);
  assert.match(feedback, /recognition\.lang = getSpeechRecognitionLocale\(locale\)/);
  assert.doesNotMatch(workbook, /new Intl\.DateTimeFormat\("de-DE"/);
});

test("advisor impulse system copy is locale-aware while stored impulse text stays outside it", () => {
  const de = getAdvisorImpulseSectionMeta("de");
  const en = getAdvisorImpulseSectionMeta("en");
  assert.deepEqual(shape(de), shape(en));
  assert.equal(en.top_tensions.title, "Topics to discuss");
  assert.doesNotMatch(JSON.stringify(en), /Gesamt|Spannungsfelder|Zusammenarbeit|Werte/);
});

test("user-facing error boundaries do not render raw advisor or workbook diagnostics", () => {
  const client = source("src/features/reporting/FounderAlignmentWorkbookClient.tsx");
  const advisorInviteForm = source("src/features/dashboard/AdvisorTeamInviteForm.tsx");
  const advisorInviteAction = source("src/features/dashboard/advisorTeamInviteActions.ts");
  const dashboard = source("src/app/(product)/dashboard/page.tsx");
  const inviteDone = source("src/app/(product)/invite/[sessionId]/done/page.tsx");
  const joinClient = source("src/app/join/JoinClient.tsx");
  const joinWelcome = source("src/app/join/welcome/page.tsx");
  const workbookPage = source("src/app/(product)/founder-alignment/workbook/page.tsx");
  const loginPage = source("src/app/(product)/login/page.tsx");
  const valuesPage = source("src/app/me/values/page.tsx");

  const proposalFailure = client.slice(
    client.indexOf("function formatAdvisorProposalFailure"),
    client.indexOf("function handleProposeAdvisor")
  );
  assert.doesNotMatch(
    proposalFailure,
    /debug\.|invitationId=|relationshipId=|userId=|advisor_email=|validation=|db=/
  );
  assert.doesNotMatch(workbookPage, /statusWithReason|whyNotUsable|data\.reason/);
  assert.doesNotMatch(loginPage, /generic", \{ error \}/);
  assert.doesNotMatch(dashboard, /t\("hero\.error", \{ error: params\.error \}\)/);
  assert.doesNotMatch(dashboard, /runsResult\.error\.message\}<\/main>/);
  assert.doesNotMatch(valuesPage, /questionsLoadError", \{ error:/);
  assert.doesNotMatch(inviteDone, /description", \{ reason:/);
  assert.doesNotMatch(joinClient, /technicalHint", \{ detail: uiState\.technicalError/);
  assert.doesNotMatch(joinWelcome, /technicalHint", \{ detail/);
  assert.doesNotMatch(advisorInviteForm, /\{result\.emailError\}/);
  assert.doesNotMatch(advisorInviteAction, /error: insertError\?\.message/);
});

test("active advisor invite and workbook advisor chrome use locale-aware system copy", () => {
  const client = source("src/features/reporting/FounderAlignmentWorkbookClient.tsx");
  const form = source("src/features/dashboard/AdvisorTeamInviteForm.tsx");

  assert.match(client, /wt\("advisor\.proposedBy"/);
  assert.match(client, /wt\("advisor\.sentAt"/);
  assert.match(client, /wt\("advisor\.waitingForFounder"/);
  assert.match(client, /wt\("advisor\.approvalRow\.approved"/);
  assert.match(client, /wt\("client\.fieldReadOnly"\)/);
  assert.match(client, /wt\("client\.summary\.footer\.current"\)/);
  assert.doesNotMatch(client, /`Vorgeschlagen von \$\{/);
  assert.doesNotMatch(client, /`Gesendet am \$\{/);
  assert.doesNotMatch(client, /t\("Nur lesbar"\)/);
  assert.doesNotMatch(client, /t\("Diese Vereinbarung ist eure aktuelle Arbeitsgrundlage\./);
  assert.match(form, /dashboard\.inviteTeam\.errors\.invalidFounderAEmail/);
  assert.match(form, /dashboard\.inviteTeam\.emailDeliveryFailed/);
});

test("advisor report chrome uses neutral localized labels instead of raw classifications", () => {
  const preview = source("src/features/reporting/AdvisorReportPreview.tsx");
  assert.match(preview, /\{copy\.reviewTogether\}/);
  assert.doesNotMatch(preview, />\{dimension\.classification\}</);
  assert.doesNotMatch(
    preview,
    />Spannungsrisiko<|>Tragfaehigkeit<|>Kipprisiko<|>Priorisierte Moderationsfelder</
  );
});
