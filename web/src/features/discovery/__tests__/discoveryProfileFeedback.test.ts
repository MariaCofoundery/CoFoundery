import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import deDiscovery from "../../../../messages/de/discovery.json";
import enDiscovery from "../../../../messages/en/discovery.json";

const source = (path: string) => readFileSync(path, "utf8");
import {
  DISCOVERY_PREFERENCES_ERROR_REASONS,
  DISCOVERY_PREFERENCES_SUCCESS_REASONS,
  DISCOVERY_PROFILE_DRAFT_ERROR_REASONS,
  DISCOVERY_PROFILE_DRAFT_SUCCESS_REASONS,
  DISCOVERY_PROFILE_PAUSE_ERROR_REASONS,
  DISCOVERY_PROFILE_PAUSE_SUCCESS_REASONS,
  DISCOVERY_PROFILE_PUBLISH_ERROR_REASONS,
  DISCOVERY_PROFILE_PUBLISH_ISSUES,
  DISCOVERY_PROFILE_PUBLISH_SUCCESS_REASONS,
  filterDiscoveryProfilePublishIssues,
  getDiscoveryPreferencesMessageKey,
  getDiscoveryProfileDraftMessageKey,
  getDiscoveryProfilePauseMessageKey,
  getDiscoveryProfilePublishMessageKey,
  resolveDiscoveryPreferencesFeedback,
  resolveDiscoveryProfileDraftFeedback,
  resolveDiscoveryProfilePauseFeedback,
  resolveDiscoveryProfilePublishFeedback,
  selectDiscoveryProfileFeedback,
} from "@/features/discovery/discoveryProfileFeedback";
import { getDiscoveryProfilePublishIssues } from "@/features/discovery/discoveryValidation";

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
  return [...value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]).sort();
}

test("Discovery profile publish reasons are classified safely", () => {
  assert.deepEqual(DISCOVERY_PROFILE_PUBLISH_SUCCESS_REASONS, ["profile_published"]);
  assert.deepEqual(resolveDiscoveryProfilePublishFeedback({ result: "profile_published" }), {
    ok: true,
    reason: "profile_published",
    messageKey: "profile.messages.published",
    issues: [],
  });

  for (const reason of DISCOVERY_PROFILE_PUBLISH_ERROR_REASONS) {
    const feedback = resolveDiscoveryProfilePublishFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }
});

test("Discovery profile publish query values are validated", () => {
  const rawError = 'relation "discovery_profiles" does not exist';
  const feedback = resolveDiscoveryProfilePublishFeedback({
    error: rawError,
    issues: ["displayName", "<script>"],
  });

  assert.deepEqual(feedback, {
    ok: false,
    reason: "unexpected_error",
    messageKey: "profile.messages.fallbackError",
    issues: [],
  });
  assert.notEqual(feedback?.reason, rawError);
  assert.deepEqual(
    filterDiscoveryProfilePublishIssues(["displayName", "headline", "<script>"]),
    ["displayName", "headline"]
  );
  assert.deepEqual(resolveDiscoveryProfilePublishFeedback({ result: "beliebiger Text" }), {
    ok: false,
    reason: "unexpected_error",
    messageKey: "profile.messages.fallbackError",
    issues: [],
  });
});

test("the publish check returns stable keys, not sentences", () => {
  // Vorher waren vollstaendige deutsche Saetze der Verbindungsschluessel
  // zwischen Pruefung und Anzeige, und die Abbildung verwarf still, was sie
  // nicht kannte: Ein geaendertes Komma haette einen Blocker unsichtbar
  // gemacht, ohne Fehler.
  const empty = getDiscoveryProfilePublishIssues({} as never);
  for (const issue of empty) {
    assert.ok(
      (DISCOVERY_PROFILE_PUBLISH_ISSUES as readonly string[]).includes(issue),
      `${issue} ist kein bekannter Schluessel`
    );
  }
  assert.ok(empty.length > 0, "ein leeres Profil ist nicht veroeffentlichbar");
  assert.match(
    source("src/features/discovery/discoveryValidation.ts"),
    /issues\.push\("displayName"\)/,
    "die Pruefung gibt Schluessel zurueck"
  );

  // Und aus einer Fehlermeldung mit Fremdinhalt kommt nur Bekanntes zurueck.
  assert.deepEqual(
    filterDiscoveryProfilePublishIssues(["displayName", "unknown database detail"]),
    ["displayName"]
  );
});

test("Discovery profile publish feedback has parallel German and English messages", () => {
  const visibleReasons = [
    ...DISCOVERY_PROFILE_PUBLISH_SUCCESS_REASONS,
    ...DISCOVERY_PROFILE_PUBLISH_ERROR_REASONS,
    "unexpected_error",
  ] as const;

  for (const reason of visibleReasons) {
    const key = getDiscoveryProfilePublishMessageKey(reason);
    const deMessage = readMessage({ profile: deDiscovery.profile }, key);
    const enMessage = readMessage({ profile: enDiscovery.profile }, key);
    assert.ok(deMessage, `missing German message for ${reason}`);
    assert.ok(enMessage, `missing English message for ${reason}`);
    assert.deepEqual(placeholders(deMessage), placeholders(enMessage));
  }

  assert.deepEqual(
    Object.keys(deDiscovery.profile.publishIssueItems).sort(),
    Object.keys(enDiscovery.profile.publishIssueItems).sort()
  );
  for (const issue of DISCOVERY_PROFILE_PUBLISH_ISSUES) {
    assert.notEqual(deDiscovery.profile.publishIssueItems[issue].trim(), "");
    assert.notEqual(enDiscovery.profile.publishIssueItems[issue].trim(), "");
  }

  const visibleMessages = visibleReasons.flatMap((reason) => {
    const key = getDiscoveryProfilePublishMessageKey(reason);
    return [
      readMessage({ profile: deDiscovery.profile }, key),
      readMessage({ profile: enDiscovery.profile }, key),
    ];
  });
  assert.doesNotMatch(visibleMessages.join(" "), /discovery_profiles|relation .* does not exist/i);
});

test("Discovery profile draft reasons are classified safely", () => {
  assert.deepEqual(DISCOVERY_PROFILE_DRAFT_SUCCESS_REASONS, ["draft_saved"]);
  assert.deepEqual(resolveDiscoveryProfileDraftFeedback({ result: "draft_saved" }), {
    ok: true,
    reason: "draft_saved",
    messageKey: "profile.messages.draftSaved",
  });

  for (const reason of DISCOVERY_PROFILE_DRAFT_ERROR_REASONS) {
    const feedback = resolveDiscoveryProfileDraftFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }
});

test("Discovery profile draft query values are validated with errors taking priority", () => {
  const rawError = 'relation "discovery_profiles" does not exist';
  const feedback = resolveDiscoveryProfileDraftFeedback({
    result: "draft_saved",
    error: rawError,
  });

  assert.deepEqual(feedback, {
    ok: false,
    reason: "unexpected_error",
    messageKey: "profile.messages.fallbackError",
  });
  assert.notEqual(feedback?.reason, rawError);
  assert.deepEqual(resolveDiscoveryProfileDraftFeedback({ result: "<script>" }), {
    ok: false,
    reason: "unexpected_error",
    messageKey: "profile.messages.fallbackError",
  });
});

test("Discovery profile draft feedback has parallel German and English messages", () => {
  const visibleReasons = [
    ...DISCOVERY_PROFILE_DRAFT_SUCCESS_REASONS,
    ...DISCOVERY_PROFILE_DRAFT_ERROR_REASONS,
    "unexpected_error",
  ] as const;

  const visibleMessages = visibleReasons.flatMap((reason) => {
    const key = getDiscoveryProfileDraftMessageKey(reason);
    const deMessage = readMessage({ profile: deDiscovery.profile }, key);
    const enMessage = readMessage({ profile: enDiscovery.profile }, key);
    assert.ok(deMessage, `missing German message for ${reason}`);
    assert.ok(enMessage, `missing English message for ${reason}`);
    assert.deepEqual(placeholders(deMessage), placeholders(enMessage));
    return [deMessage, enMessage];
  });

  assert.doesNotMatch(visibleMessages.join(" "), /discovery_profiles|relation .* does not exist/i);
});

test("Discovery preferences reasons are classified safely", () => {
  assert.deepEqual(DISCOVERY_PREFERENCES_SUCCESS_REASONS, ["preferences_saved"]);
  assert.deepEqual(resolveDiscoveryPreferencesFeedback({ result: "preferences_saved" }), {
    ok: true,
    reason: "preferences_saved",
    messageKey: "profile.messages.preferencesSaved",
  });

  for (const reason of DISCOVERY_PREFERENCES_ERROR_REASONS) {
    const feedback = resolveDiscoveryPreferencesFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }
});

test("Discovery preferences query values are validated with errors taking priority", () => {
  const rawError = 'relation "discovery_preferences" does not exist';
  const feedback = resolveDiscoveryPreferencesFeedback({
    result: "preferences_saved",
    error: rawError,
  });

  assert.deepEqual(feedback, {
    ok: false,
    reason: "unexpected_error",
    messageKey: "profile.messages.fallbackError",
  });
  assert.notEqual(feedback?.reason, rawError);
  assert.deepEqual(resolveDiscoveryPreferencesFeedback({ result: "<script>" }), {
    ok: false,
    reason: "unexpected_error",
    messageKey: "profile.messages.fallbackError",
  });
});

test("Discovery profile pause reasons are classified safely", () => {
  assert.deepEqual(DISCOVERY_PROFILE_PAUSE_SUCCESS_REASONS, ["profile_paused"]);
  assert.deepEqual(resolveDiscoveryProfilePauseFeedback({ result: "profile_paused" }), {
    ok: true,
    reason: "profile_paused",
    messageKey: "profile.messages.paused",
  });

  for (const reason of DISCOVERY_PROFILE_PAUSE_ERROR_REASONS) {
    const feedback = resolveDiscoveryProfilePauseFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }
});

test("Discovery profile pause query values are validated with errors taking priority", () => {
  const rawError = 'relation "discovery_profiles" does not exist';
  const feedback = resolveDiscoveryProfilePauseFeedback({
    result: "profile_paused",
    error: rawError,
  });

  assert.deepEqual(feedback, {
    ok: false,
    reason: "unexpected_error",
    messageKey: "profile.messages.fallbackError",
  });
  assert.notEqual(feedback?.reason, rawError);
  assert.deepEqual(resolveDiscoveryProfilePauseFeedback({ result: "<script>" }), {
    ok: false,
    reason: "unexpected_error",
    messageKey: "profile.messages.fallbackError",
  });
});

test("Discovery profile pause feedback has parallel German and English messages", () => {
  const visibleReasons = [
    ...DISCOVERY_PROFILE_PAUSE_SUCCESS_REASONS,
    ...DISCOVERY_PROFILE_PAUSE_ERROR_REASONS,
    "unexpected_error",
  ] as const;

  const visibleMessages = visibleReasons.flatMap((reason) => {
    const key = getDiscoveryProfilePauseMessageKey(reason);
    const deMessage = readMessage({ profile: deDiscovery.profile }, key);
    const enMessage = readMessage({ profile: enDiscovery.profile }, key);
    assert.ok(deMessage, `missing German message for ${reason}`);
    assert.ok(enMessage, `missing English message for ${reason}`);
    assert.deepEqual(placeholders(deMessage), placeholders(enMessage));
    return [deMessage, enMessage];
  });

  assert.doesNotMatch(visibleMessages.join(" "), /discovery_profiles|relation .* does not exist/i);
});

test("Discovery profile feedback follows the cross-flow priority", () => {
  const publishError = resolveDiscoveryProfilePublishFeedback({ error: "publish_failed" });
  const draftError = resolveDiscoveryProfileDraftFeedback({ error: "draft_save_failed" });
  const preferencesError = resolveDiscoveryPreferencesFeedback({
    error: "preferences_save_failed",
  });
  const pauseError = resolveDiscoveryProfilePauseFeedback({ error: "pause_failed" });
  const publishSuccess = resolveDiscoveryProfilePublishFeedback({ result: "profile_published" });
  const draftSuccess = resolveDiscoveryProfileDraftFeedback({ result: "draft_saved" });
  const preferencesSuccess = resolveDiscoveryPreferencesFeedback({ result: "preferences_saved" });
  const pauseSuccess = resolveDiscoveryProfilePauseFeedback({ result: "profile_paused" });

  assert.equal(
    selectDiscoveryProfileFeedback({
      publish: publishError,
      draft: draftError,
      preferences: preferencesError,
      pause: pauseError,
    })?.reason,
    "publish_failed"
  );
  assert.equal(
    selectDiscoveryProfileFeedback({
      publish: publishSuccess,
      draft: draftError,
      preferences: preferencesError,
      pause: pauseError,
    })?.reason,
    "draft_save_failed"
  );
  assert.equal(
    selectDiscoveryProfileFeedback({
      publish: publishSuccess,
      draft: draftSuccess,
      preferences: preferencesError,
      pause: pauseError,
    })?.reason,
    "preferences_save_failed"
  );
  assert.equal(
    selectDiscoveryProfileFeedback({
      publish: publishSuccess,
      draft: draftSuccess,
      preferences: preferencesSuccess,
      pause: pauseError,
    })?.reason,
    "pause_failed"
  );
  assert.equal(
    selectDiscoveryProfileFeedback({
      publish: publishSuccess,
      draft: draftSuccess,
      preferences: preferencesSuccess,
      pause: pauseSuccess,
    })?.reason,
    "profile_published"
  );
  assert.equal(
    selectDiscoveryProfileFeedback({
      publish: null,
      draft: draftSuccess,
      preferences: preferencesSuccess,
      pause: pauseSuccess,
    })?.reason,
    "draft_saved"
  );
  assert.equal(
    selectDiscoveryProfileFeedback({
      publish: null,
      draft: null,
      preferences: preferencesSuccess,
      pause: pauseSuccess,
    })?.reason,
    "preferences_saved"
  );

  assert.equal(
    selectDiscoveryProfileFeedback({
      publish: null,
      draft: null,
      preferences: null,
      pause: pauseSuccess,
    })?.reason,
    "profile_paused"
  );

  const preferencesBeforePause = selectDiscoveryProfileFeedback({
    publish: null,
    draft: null,
    preferences: preferencesSuccess,
    pause: pauseSuccess,
  });
  assert.equal(
    preferencesBeforePause?.messageKey,
    "profile.messages.preferencesSaved"
  );
});

test("Discovery preferences feedback has parallel German and English messages", () => {
  const visibleReasons = [
    ...DISCOVERY_PREFERENCES_SUCCESS_REASONS,
    ...DISCOVERY_PREFERENCES_ERROR_REASONS,
    "unexpected_error",
  ] as const;

  const visibleMessages = visibleReasons.flatMap((reason) => {
    const key = getDiscoveryPreferencesMessageKey(reason);
    const deMessage = readMessage({ profile: deDiscovery.profile }, key);
    const enMessage = readMessage({ profile: enDiscovery.profile }, key);
    assert.ok(deMessage, `missing German message for ${reason}`);
    assert.ok(enMessage, `missing English message for ${reason}`);
    assert.deepEqual(placeholders(deMessage), placeholders(enMessage));
    return [deMessage, enMessage];
  });

  assert.doesNotMatch(
    visibleMessages.join(" "),
    /discovery_preferences|relation .* does not exist/i
  );
});
