import assert from "node:assert/strict";
import test from "node:test";
import {
  canCancelDiscoveryIntro,
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
