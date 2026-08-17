import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import deDiscovery from "../../../../messages/de/discovery.json";
import enDiscovery from "../../../../messages/en/discovery.json";
import {
  MATCHING_REPORT_ERROR_REASONS,
  MATCHING_REPORT_SUCCESS_REASONS,
  MATCHING_SESSION_ERROR_REASONS,
  MATCHING_SESSION_SUCCESS_REASONS,
  getMatchingReportFeedbackMessageKey,
  getMatchingSessionFeedbackMessageKey,
  resolveMatchingReportFeedback,
  resolveMatchingSessionFeedback,
  selectMatchingPreparationFeedback,
  type MatchingReportFeedbackReason,
  type MatchingSessionFeedbackReason,
} from "@/features/matchingCore/matchingSessionReportFeedback";

function readMessage(messages: unknown, key: string) {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : null;
}

function placeholders(value: string) {
  return [...value.matchAll(/\{([^{}]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

const sessionVisibleReasons: MatchingSessionFeedbackReason[] = [
  ...MATCHING_SESSION_SUCCESS_REASONS,
  ...MATCHING_SESSION_ERROR_REASONS,
  "unexpected_error",
];
const reportVisibleReasons: MatchingReportFeedbackReason[] = [
  ...MATCHING_REPORT_SUCCESS_REASONS,
  ...MATCHING_REPORT_ERROR_REASONS,
  "unexpected_error",
];

test("matching session and report actions expose bounded reason sets", () => {
  assert.deepEqual(MATCHING_SESSION_SUCCESS_REASONS, ["matching_session_prepared"]);
  assert.deepEqual(MATCHING_SESSION_ERROR_REASONS, [
    "not_authenticated",
    "matching_unavailable",
    "confirmation_incomplete",
    "relationship_exists",
    "profiles_inactive",
    "local_session_unavailable",
    "session_prepare_failed",
  ]);
  assert.deepEqual(MATCHING_REPORT_SUCCESS_REASONS, ["matching_report_created"]);
  assert.deepEqual(MATCHING_REPORT_ERROR_REASONS, [
    "not_authenticated",
    "report_unavailable",
    "session_not_ready",
    "required_answers_missing",
    "local_report_unavailable",
    "values_report_not_supported",
    "report_creation_failed",
  ]);
});

test("matching session query values are validated with errors taking priority", () => {
  assert.equal(
    resolveMatchingSessionFeedback({ result: "matching_session_prepared" })?.ok,
    true
  );
  for (const reason of MATCHING_SESSION_ERROR_REASONS) {
    const feedback = resolveMatchingSessionFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }

  assert.equal(
    resolveMatchingSessionFeedback({ result: "<script>" })?.reason,
    "unexpected_error"
  );
  assert.equal(
    resolveMatchingSessionFeedback({ error: "unknown_session_error" })?.reason,
    "unexpected_error"
  );
  const rawError = "duplicate key value violates unique constraint";
  const rawFeedback = resolveMatchingSessionFeedback({ error: rawError });
  assert.equal(rawFeedback?.reason, "unexpected_error");
  assert.doesNotMatch(JSON.stringify(rawFeedback), /duplicate key|unique constraint/i);
  assert.equal(
    resolveMatchingSessionFeedback({
      result: "matching_session_prepared",
      error: "session_prepare_failed",
    })?.reason,
    "session_prepare_failed"
  );
});

test("matching report query values are validated with errors taking priority", () => {
  assert.equal(
    resolveMatchingReportFeedback({ result: "matching_report_created" })?.ok,
    true
  );
  for (const reason of MATCHING_REPORT_ERROR_REASONS) {
    const feedback = resolveMatchingReportFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }

  assert.equal(
    resolveMatchingReportFeedback({ result: "<script>" })?.reason,
    "unexpected_error"
  );
  assert.equal(
    resolveMatchingReportFeedback({ error: "unknown_report_error" })?.reason,
    "unexpected_error"
  );
  const rawError = "duplicate key value violates unique constraint";
  const rawFeedback = resolveMatchingReportFeedback({ error: rawError });
  assert.equal(rawFeedback?.reason, "unexpected_error");
  assert.doesNotMatch(JSON.stringify(rawFeedback), /duplicate key|unique constraint/i);
  assert.equal(
    resolveMatchingReportFeedback({
      result: "matching_report_created",
      error: "report_creation_failed",
    })?.reason,
    "report_creation_failed"
  );
});

test("matching preparation feedback follows the cross-flow priority", () => {
  const candidate = (reason: string, ok = false) => ({ ok, reason });
  const selected = selectMatchingPreparationFeedback({
    matchingStartError: candidate("start_error"),
    matchingSessionError: candidate("session_error"),
    matchingReportError: candidate("report_error"),
    matchingStartResult: candidate("start_result", true),
    matchingSessionResult: candidate("session_result", true),
    matchingReportResult: candidate("report_result", true),
  });
  assert.equal(selected?.reason, "start_error");

  assert.equal(
    selectMatchingPreparationFeedback({
      matchingStartError: null,
      matchingSessionError: candidate("session_error"),
      matchingReportError: candidate("report_error"),
      matchingStartResult: candidate("start_result", true),
      matchingSessionResult: candidate("session_result", true),
      matchingReportResult: candidate("report_result", true),
    })?.reason,
    "session_error"
  );
  assert.equal(
    selectMatchingPreparationFeedback({
      matchingStartError: null,
      matchingSessionError: null,
      matchingReportError: candidate("report_error"),
      matchingStartResult: candidate("start_result", true),
      matchingSessionResult: candidate("session_result", true),
      matchingReportResult: candidate("report_result", true),
    })?.reason,
    "report_error"
  );
  assert.equal(
    selectMatchingPreparationFeedback({
      matchingStartError: null,
      matchingSessionError: null,
      matchingReportError: null,
      matchingStartResult: candidate("start_result", true),
      matchingSessionResult: candidate("session_result", true),
      matchingReportResult: candidate("report_result", true),
    })?.reason,
    "start_result"
  );
  assert.equal(
    selectMatchingPreparationFeedback({
      matchingStartError: null,
      matchingSessionError: null,
      matchingReportError: null,
      matchingStartResult: null,
      matchingSessionResult: candidate("session_result", true),
      matchingReportResult: candidate("report_result", true),
    })?.reason,
    "session_result"
  );
  assert.equal(
    selectMatchingPreparationFeedback({
      matchingStartError: null,
      matchingSessionError: null,
      matchingReportError: null,
      matchingStartResult: null,
      matchingSessionResult: null,
      matchingReportResult: candidate("report_result", true),
    })?.reason,
    "report_result"
  );
});

test("matching session and report feedback has parallel localized messages", () => {
  const pairs = [
    ...sessionVisibleReasons.map((reason) => ({
      reason,
      key: getMatchingSessionFeedbackMessageKey(reason),
    })),
    ...reportVisibleReasons.map((reason) => ({
      reason,
      key: getMatchingReportFeedbackMessageKey(reason),
    })),
  ];
  const visibleMessages = pairs.flatMap(({ reason, key }) => {
    const german = readMessage(deDiscovery, key);
    const english = readMessage(enDiscovery, key);
    if (typeof german !== "string") {
      assert.fail(`missing German message for ${reason}`);
    }
    if (typeof english !== "string") {
      assert.fail(`missing English message for ${reason}`);
    }
    assert.notEqual(german.trim(), "", `empty German message for ${reason}`);
    assert.notEqual(english.trim(), "", `empty English message for ${reason}`);
    assert.deepEqual(placeholders(german), placeholders(english));
    return [german, english];
  });

  assert.doesNotMatch(
    visibleMessages.join(" "),
    /duplicate key value violates unique constraint/i
  );
});

test("matching preparation page no longer exposes the legacy free-text query channel", () => {
  const pageSource = readFileSync(
    new URL(
      "../../../app/(product)/discovery/intros/[introRequestId]/matching/page.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const legacyMessageParameter = ["matching", "Message"].join("");
  const legacyStatusParameter = ["matching", "Ok"].join("");
  assert.equal(pageSource.includes(legacyMessageParameter), false);
  assert.equal(pageSource.includes(legacyStatusParameter), false);
  assert.match(pageSource, /matchingSessionResult/);
  assert.match(pageSource, /matchingSessionError/);
  assert.match(pageSource, /matchingReportResult/);
  assert.match(pageSource, /matchingReportError/);
});
