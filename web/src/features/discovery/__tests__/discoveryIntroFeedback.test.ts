import assert from "node:assert/strict";
import test from "node:test";
import deDiscovery from "../../../../messages/de/discovery.json";
import enDiscovery from "../../../../messages/en/discovery.json";
import {
  DISCOVERY_INTRO_ACTION_ERROR_REASONS,
  DISCOVERY_INTRO_ACTION_SUCCESS_REASONS,
  resolveDiscoveryIntroFeedback,
} from "@/features/discovery/discoveryIntroFeedback";

const actionReasons = [
  ...DISCOVERY_INTRO_ACTION_SUCCESS_REASONS,
  ...DISCOVERY_INTRO_ACTION_ERROR_REASONS,
];

test("Discovery Intro action reasons have parallel German and English messages", () => {
  const deFeedback = deDiscovery.intros.feedback;
  const enFeedback = enDiscovery.intros.feedback;
  const expectedKeys = [...actionReasons, "unexpected_error"].sort();

  assert.deepEqual(Object.keys(deFeedback).sort(), expectedKeys);
  assert.deepEqual(Object.keys(enFeedback).sort(), expectedKeys);
  for (const reason of expectedKeys) {
    assert.notEqual(deFeedback[reason as keyof typeof deFeedback].trim(), "");
    assert.notEqual(enFeedback[reason as keyof typeof enFeedback].trim(), "");
  }
});

test("Discovery Intro feedback distinguishes success and error reasons", () => {
  for (const reason of DISCOVERY_INTRO_ACTION_SUCCESS_REASONS) {
    assert.deepEqual(resolveDiscoveryIntroFeedback(reason), {
      ok: true,
      messageKey: `intros.feedback.${reason}`,
    });
  }

  for (const reason of DISCOVERY_INTRO_ACTION_ERROR_REASONS) {
    assert.deepEqual(resolveDiscoveryIntroFeedback(reason), {
      ok: false,
      messageKey: `intros.feedback.${reason}`,
    });
  }
});

test("unknown Discovery Intro reasons use a safe generic message", () => {
  const rawTechnicalError = "duplicate key violates discovery_intro_requests_unique_pending";
  const feedback = resolveDiscoveryIntroFeedback(rawTechnicalError);
  const deMessage = deDiscovery.intros.feedback.unexpected_error;
  const enMessage = enDiscovery.intros.feedback.unexpected_error;

  assert.deepEqual(feedback, {
    ok: false,
    messageKey: "intros.feedback.unexpected_error",
  });
  assert.doesNotMatch(deMessage, /duplicate key|discovery_intro_requests|unique_pending/i);
  assert.doesNotMatch(enMessage, /duplicate key|discovery_intro_requests|unique_pending/i);
  assert.notEqual(deMessage, rawTechnicalError);
  assert.notEqual(enMessage, rawTechnicalError);
});
