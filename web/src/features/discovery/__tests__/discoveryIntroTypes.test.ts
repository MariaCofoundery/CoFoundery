import assert from "node:assert/strict";
import test from "node:test";
import {
  canCancelDiscoveryIntro,
  canPrepareDiscoveryIntroMatching,
  canRespondToDiscoveryIntro,
  isDiscoveryIntroResponseStatus,
} from "@/features/discovery/discoveryIntroTypes";

test("accepts only accepted or declined as intro response statuses", () => {
  assert.equal(isDiscoveryIntroResponseStatus("accepted"), true);
  assert.equal(isDiscoveryIntroResponseStatus("declined"), true);
  assert.equal(isDiscoveryIntroResponseStatus("pending"), false);
  assert.equal(isDiscoveryIntroResponseStatus("canceled"), false);
  assert.equal(isDiscoveryIntroResponseStatus("other"), false);
});

test("allows canceling only pending intro requests", () => {
  assert.equal(canCancelDiscoveryIntro({ status: "pending" }), true);
  assert.equal(canCancelDiscoveryIntro({ status: "accepted" }), false);
  assert.equal(canCancelDiscoveryIntro({ status: "declined" }), false);
  assert.equal(canCancelDiscoveryIntro({ status: "canceled" }), false);
});

test("allows responding only to pending intro requests", () => {
  assert.equal(canRespondToDiscoveryIntro({ status: "pending" }), true);
  assert.equal(canRespondToDiscoveryIntro({ status: "accepted" }), false);
  assert.equal(canRespondToDiscoveryIntro({ status: "declined" }), false);
  assert.equal(canRespondToDiscoveryIntro({ status: "canceled" }), false);
});

test("allows matching preparation only for accepted intros with involved users", () => {
  const acceptedIntro = {
    status: "accepted" as const,
    requesterUserId: "requester",
    recipientUserId: "recipient",
  };

  assert.equal(canPrepareDiscoveryIntroMatching(acceptedIntro, "requester"), true);
  assert.equal(canPrepareDiscoveryIntroMatching(acceptedIntro, "recipient"), true);
  assert.equal(canPrepareDiscoveryIntroMatching(acceptedIntro, "other-user"), false);
});

test("rejects matching preparation for non-accepted or invalid intros", () => {
  assert.equal(
    canPrepareDiscoveryIntroMatching(
      {
        status: "pending",
        requesterUserId: "requester",
        recipientUserId: "recipient",
      },
      "requester"
    ),
    false
  );
  assert.equal(
    canPrepareDiscoveryIntroMatching(
      {
        status: "declined",
        requesterUserId: "requester",
        recipientUserId: "recipient",
      },
      "recipient"
    ),
    false
  );
  assert.equal(
    canPrepareDiscoveryIntroMatching(
      {
        status: "canceled",
        requesterUserId: "requester",
        recipientUserId: "recipient",
      },
      "requester"
    ),
    false
  );
  assert.equal(
    canPrepareDiscoveryIntroMatching(
      {
        status: "accepted",
        requesterUserId: "same-user",
        recipientUserId: "same-user",
      },
      "same-user"
    ),
    false
  );
});
