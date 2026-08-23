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

test("advisor, workbook speech, feedback speech, and auth messages stay structurally symmetric", () => {
  const deAdvisor = readJson("messages/de/advisor.json");
  const enAdvisor = readJson("messages/en/advisor.json");
  const deWorkbook = readJson("messages/de/workbook.json");
  const enWorkbook = readJson("messages/en/workbook.json");
  const deFeedback = readJson("messages/de/feedback.json");
  const enFeedback = readJson("messages/en/feedback.json");
  const deAuth = readJson("messages/de/auth.json");
  const enAuth = readJson("messages/en/auth.json");

  assert.deepEqual(shape(deAdvisor), shape(enAdvisor));
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
  const workbookPage = source("src/app/(product)/founder-alignment/workbook/page.tsx");
  const loginPage = source("src/app/(product)/login/page.tsx");

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
