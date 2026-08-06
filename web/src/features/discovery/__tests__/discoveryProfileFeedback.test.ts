import assert from "node:assert/strict";
import test from "node:test";
import deDiscovery from "../../../../messages/de/discovery.json";
import enDiscovery from "../../../../messages/en/discovery.json";
import {
  DISCOVERY_PROFILE_DRAFT_ERROR_REASONS,
  DISCOVERY_PROFILE_DRAFT_SUCCESS_REASONS,
  DISCOVERY_PROFILE_PUBLISH_ERROR_REASONS,
  DISCOVERY_PROFILE_PUBLISH_ISSUES,
  DISCOVERY_PROFILE_PUBLISH_SUCCESS_REASONS,
  filterDiscoveryProfilePublishIssues,
  getDiscoveryProfileDraftMessageKey,
  getDiscoveryProfilePublishMessageKey,
  mapDiscoveryProfilePublishIssues,
  resolveDiscoveryProfileDraftFeedback,
  resolveDiscoveryProfilePublishFeedback,
} from "@/features/discovery/discoveryProfileFeedback";

const publishValidationTexts = [
  "Gib deinem Suchprofil einen Namen, der mindestens 2 Zeichen lang ist.",
  "Ergänze eine kurze Headline, damit andere dich einordnen können.",
  "Wähle mindestens eine Rolle, die du selbst einbringst.",
  "Wähle mindestens eine Rolle, die du bei einem Co-Founder suchst.",
  "Gib an, wie viel Zeit du pro Woche ungefähr einbringen kannst.",
  "Wähle ein Commitment-Level, bevor du dein Profil veröffentlichst.",
  "Wähle, wo du gerade mit deiner Idee oder Suche stehst.",
  "Wähle, welche Art von Aufbau du gerade suchst.",
];

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

test("Discovery profile publish validation text maps only to known issue codes", () => {
  assert.deepEqual(
    mapDiscoveryProfilePublishIssues([...publishValidationTexts, "unknown database detail"]),
    DISCOVERY_PROFILE_PUBLISH_ISSUES
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
