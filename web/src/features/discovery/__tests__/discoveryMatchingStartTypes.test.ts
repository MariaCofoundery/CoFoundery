import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateDiscoveryMatchingStart,
  isDiscoveryMatchingStartStatus,
} from "@/features/discovery/discoveryMatchingStartTypes";

test("accepts only supported discovery matching start statuses", () => {
  assert.equal(isDiscoveryMatchingStartStatus("preparing"), true);
  assert.equal(isDiscoveryMatchingStartStatus("canceled"), true);
  assert.equal(isDiscoveryMatchingStartStatus("accepted"), false);
  assert.equal(isDiscoveryMatchingStartStatus("pending"), false);
});

test("allows creating a matching start for an accepted intro and involved user", () => {
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "accepted",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    true
  );
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "accepted",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "recipient",
    }),
    true
  );
});

test("rejects matching starts for non-accepted intros and unrelated users", () => {
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "pending",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    false
  );
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "declined",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "recipient",
    }),
    false
  );
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "canceled",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    false
  );
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "accepted",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "other-user",
    }),
    false
  );
});

test("rejects duplicate, self-pair and existing relationship starts", () => {
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "accepted",
      requesterUserId: "same-user",
      recipientUserId: "same-user",
      userId: "same-user",
    }),
    false
  );
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "accepted",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
      relationshipExists: true,
    }),
    false
  );
  assert.equal(
    canCreateDiscoveryMatchingStart({
      introStatus: "accepted",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
      matchingStartExists: true,
    }),
    false
  );
});
