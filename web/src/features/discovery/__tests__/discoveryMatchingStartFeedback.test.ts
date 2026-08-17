import assert from "node:assert/strict";
import test from "node:test";
import deDiscovery from "../../../../messages/de/discovery.json";
import enDiscovery from "../../../../messages/en/discovery.json";
import {
  DISCOVERY_MATCHING_CONFIRMATION_ERROR_REASONS,
  DISCOVERY_MATCHING_CONFIRMATION_SUCCESS_REASONS,
  DISCOVERY_MATCHING_PREPARATION_ERROR_REASONS,
  DISCOVERY_MATCHING_PREPARATION_SUCCESS_REASONS,
  DISCOVERY_MATCHING_REQUEST_ERROR_REASONS,
  DISCOVERY_MATCHING_REQUEST_SUCCESS_REASONS,
  DISCOVERY_MATCHING_START_ERROR_REASONS,
  DISCOVERY_MATCHING_START_SUCCESS_REASONS,
  getDiscoveryMatchingStartFeedbackMessageKey,
  resolveDiscoveryMatchingStartFeedback,
  type DiscoveryMatchingStartFeedbackReason,
} from "@/features/discovery/discoveryMatchingStartFeedback";

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

const visibleReasons: DiscoveryMatchingStartFeedbackReason[] = [
  ...DISCOVERY_MATCHING_START_SUCCESS_REASONS,
  ...DISCOVERY_MATCHING_START_ERROR_REASONS,
  "unexpected_error",
];

test("Discovery matching start actions expose action-specific reason sets", () => {
  assert.deepEqual(DISCOVERY_MATCHING_PREPARATION_SUCCESS_REASONS, [
    "matching_preparation_started",
  ]);
  assert.deepEqual(DISCOVERY_MATCHING_REQUEST_SUCCESS_REASONS, [
    "matching_start_requested",
  ]);
  assert.deepEqual(DISCOVERY_MATCHING_CONFIRMATION_SUCCESS_REASONS, [
    "matching_start_confirmed",
  ]);

  assert.deepEqual(DISCOVERY_MATCHING_PREPARATION_ERROR_REASONS, [
    "not_authenticated",
    "matching_unavailable",
    "relationship_exists",
    "preparation_not_allowed",
    "preparation_failed",
  ]);
  assert.deepEqual(DISCOVERY_MATCHING_REQUEST_ERROR_REASONS, [
    "not_authenticated",
    "matching_unavailable",
    "relationship_exists",
    "other_participant_requested",
    "request_not_allowed",
    "request_failed",
  ]);
  assert.deepEqual(DISCOVERY_MATCHING_CONFIRMATION_ERROR_REASONS, [
    "not_authenticated",
    "matching_unavailable",
    "relationship_exists",
    "self_confirmation_forbidden",
    "confirmation_not_allowed",
    "confirmation_failed",
  ]);
});

test("Discovery matching start query values are validated with errors taking priority", () => {
  for (const reason of DISCOVERY_MATCHING_START_SUCCESS_REASONS) {
    const feedback = resolveDiscoveryMatchingStartFeedback({ result: reason });
    assert.equal(feedback?.ok, true);
    assert.equal(feedback?.reason, reason);
  }

  for (const reason of DISCOVERY_MATCHING_START_ERROR_REASONS) {
    const feedback = resolveDiscoveryMatchingStartFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }

  assert.equal(
    resolveDiscoveryMatchingStartFeedback({ result: "<script>" })?.reason,
    "unexpected_error"
  );

  const rawError = "duplicate key value violates unique constraint";
  const feedback = resolveDiscoveryMatchingStartFeedback({
    result: "matching_preparation_started",
    error: rawError,
  });
  assert.equal(feedback?.ok, false);
  assert.equal(feedback?.reason, "unexpected_error");
  assert.doesNotMatch(JSON.stringify(feedback), /duplicate key|unique constraint/i);
});

test("Discovery matching start feedback has parallel German and English messages", () => {
  const visibleMessages = visibleReasons.flatMap((reason) => {
    const key = getDiscoveryMatchingStartFeedbackMessageKey(reason);
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
