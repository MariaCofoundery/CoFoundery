import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import deWorkspace from "../../../../messages/de/workspace.json";
import enWorkspace from "../../../../messages/en/workspace.json";
import {
  MATCHING_WORKSPACE_AGREEMENT_ERROR_REASONS,
  MATCHING_WORKSPACE_AGREEMENT_SUCCESS_REASONS,
  getMatchingWorkspaceAgreementFeedbackMessageKey,
  resolveMatchingWorkspaceAgreementFeedback,
  type MatchingWorkspaceAgreementFeedbackReason,
} from "@/features/matchingCore/matchingWorkspaceAgreementFeedback";

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

const visibleReasons: MatchingWorkspaceAgreementFeedbackReason[] = [
  ...MATCHING_WORKSPACE_AGREEMENT_SUCCESS_REASONS,
  ...MATCHING_WORKSPACE_AGREEMENT_ERROR_REASONS,
  "unexpected_error",
];

test("agreement section feedback exposes a bounded result contract", () => {
  assert.deepEqual(MATCHING_WORKSPACE_AGREEMENT_SUCCESS_REASONS, [
    "agreement_section_saved",
  ]);
  assert.deepEqual(MATCHING_WORKSPACE_AGREEMENT_ERROR_REASONS, [
    "not_authenticated",
    "invalid_section",
    "workspace_unavailable",
    "workspace_not_prepared",
    "agreement_save_failed",
  ]);
});

test("agreement section query values are validated with errors taking priority", () => {
  const success = resolveMatchingWorkspaceAgreementFeedback({
    result: "agreement_section_saved",
  });
  assert.equal(success?.ok, true);
  assert.equal(success?.reason, "agreement_section_saved");

  for (const reason of MATCHING_WORKSPACE_AGREEMENT_ERROR_REASONS) {
    const feedback = resolveMatchingWorkspaceAgreementFeedback({ error: reason });
    assert.equal(feedback?.ok, false);
    assert.equal(feedback?.reason, reason);
  }

  assert.equal(
    resolveMatchingWorkspaceAgreementFeedback({ result: "<script>" })?.reason,
    "unexpected_error"
  );

  const rawError = 'relation "matching_workspace_agreements" does not exist';
  const rawFeedback = resolveMatchingWorkspaceAgreementFeedback({
    result: "agreement_section_saved",
    error: rawError,
  });
  assert.equal(rawFeedback?.ok, false);
  assert.equal(rawFeedback?.reason, "unexpected_error");
  assert.doesNotMatch(
    JSON.stringify(rawFeedback),
    /matching_workspace_agreements|does not exist/i
  );
});

test("agreement section feedback has parallel German and English messages", () => {
  const visibleMessages = visibleReasons.flatMap((reason) => {
    const key = getMatchingWorkspaceAgreementFeedbackMessageKey(reason);
    const german = readMessage(deWorkspace, key);
    const english = readMessage(enWorkspace, key);

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
    /matching_workspace_agreements|does not exist|serverseitig/i
  );
});

test("workspace page no longer exposes the legacy agreement free-text channel", () => {
  const pageSource = readFileSync(
    new URL("../../../app/(product)/workspaces/[workspaceId]/page.tsx", import.meta.url),
    "utf8"
  );
  const legacyMessageParameter = ["agreement", "Message"].join("");
  const legacyStatusParameter = ["agreement", "Ok"].join("");
  assert.equal(pageSource.includes(legacyMessageParameter), false);
  assert.equal(pageSource.includes(legacyStatusParameter), false);
  assert.match(pageSource, /agreementResult/);
  assert.match(pageSource, /agreementError/);
});
