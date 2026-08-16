import assert from "node:assert/strict";
import test from "node:test";
import deReport from "../../../../messages/de/report.json";
import enReport from "../../../../messages/en/report.json";
import {
  MATCHING_WORKSPACE_START_ERROR_REASONS,
  MATCHING_WORKSPACE_START_SUCCESS_REASONS,
  getMatchingWorkspaceFeedbackMessageKey,
  resolveMatchingWorkspaceFeedback,
  type MatchingWorkspaceFeedbackReason,
} from "@/features/matchingCore/matchingWorkspaceFeedback";

type MessageTree = Record<string, unknown>;

function readMessage(messages: MessageTree, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return (current as MessageTree)[segment];
  }, messages);

  return typeof value === "string" ? value : undefined;
}

function placeholders(value: string) {
  return [...value.matchAll(/\{([^{}]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

const visibleReasons: MatchingWorkspaceFeedbackReason[] = [
  ...MATCHING_WORKSPACE_START_SUCCESS_REASONS,
  ...MATCHING_WORKSPACE_START_ERROR_REASONS,
  "unexpected_error",
];

test("Matching workspace feedback classifies success and error codes", () => {
  for (const reason of MATCHING_WORKSPACE_START_SUCCESS_REASONS) {
    const feedback = resolveMatchingWorkspaceFeedback({ result: reason });
    assert.equal(feedback?.ok, true);
    assert.equal(feedback?.reason, reason);
  }

  for (const reason of MATCHING_WORKSPACE_START_ERROR_REASONS) {
    const feedback = resolveMatchingWorkspaceFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }
});

test("Matching workspace query values are validated with errors taking priority", () => {
  const technicalError =
    "function start_workspace_from_matching_session does not exist";

  assert.deepEqual(
    resolveMatchingWorkspaceFeedback({
      result: "workspace_prepared",
      error: "report_not_ready",
    }),
    {
      ok: false,
      reason: "report_not_ready",
      messageKey: "session.workspaceFeedback.reportNotReady",
    }
  );

  assert.deepEqual(resolveMatchingWorkspaceFeedback({ result: "<script>" }), {
    ok: false,
    reason: "unexpected_error",
    messageKey: "session.workspaceFeedback.unexpectedError",
  });

  const resolvedTechnicalError = resolveMatchingWorkspaceFeedback({
    error: technicalError,
  });
  assert.equal(resolvedTechnicalError?.reason, "unexpected_error");
  assert.doesNotMatch(JSON.stringify(resolvedTechnicalError), /start_workspace_from_matching_session/);
});

test("Matching workspace feedback has parallel German and English messages", () => {
  for (const reason of visibleReasons) {
    const key = getMatchingWorkspaceFeedbackMessageKey(reason);
    const german = readMessage(deReport, key);
    const english = readMessage(enReport, key);

    assert.ok(german, `missing German message for ${reason}`);
    assert.ok(english, `missing English message for ${reason}`);
    assert.deepEqual(placeholders(german), placeholders(english));
  }

  const serializedMessages = JSON.stringify({ deReport, enReport });
  assert.doesNotMatch(
    serializedMessages,
    /function start_workspace_from_matching_session does not exist/
  );
});
