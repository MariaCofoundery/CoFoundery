import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateDiscoveryMatchingStart,
  canConfirmFullDiscoveryMatching,
  canRequestFullDiscoveryMatching,
  isDiscoveryMatchingStartStatus,
} from "@/features/discovery/discoveryMatchingStartTypes";

test("accepts only supported discovery matching start statuses", () => {
  assert.equal(isDiscoveryMatchingStartStatus("preparing"), true);
  assert.equal(isDiscoveryMatchingStartStatus("awaiting_other_confirmation"), true);
  assert.equal(isDiscoveryMatchingStartStatus("ready_for_matching"), true);
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

test("allows requesting full matching only from preparing state", () => {
  assert.equal(
    canRequestFullDiscoveryMatching({
      status: "preparing",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    true
  );
  assert.equal(
    canRequestFullDiscoveryMatching({
      status: "awaiting_other_confirmation",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    false
  );
  assert.equal(
    canRequestFullDiscoveryMatching({
      status: "ready_for_matching",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    false
  );
  assert.equal(
    canRequestFullDiscoveryMatching({
      status: "canceled",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    false
  );
});

test("rejects full matching requests by unrelated users or existing relationships", () => {
  assert.equal(
    canRequestFullDiscoveryMatching({
      status: "preparing",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "other-user",
    }),
    false
  );
  assert.equal(
    canRequestFullDiscoveryMatching({
      status: "preparing",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
      relationshipExists: true,
    }),
    false
  );
});

test("allows only the other participant to confirm full matching", () => {
  assert.equal(
    canConfirmFullDiscoveryMatching({
      status: "awaiting_other_confirmation",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      requestedByUserId: "requester",
      userId: "recipient",
    }),
    true
  );
  assert.equal(
    canConfirmFullDiscoveryMatching({
      status: "awaiting_other_confirmation",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      requestedByUserId: "requester",
      userId: "requester",
    }),
    false
  );
});

test("rejects confirmation outside awaiting state or for unrelated users", () => {
  assert.equal(
    canConfirmFullDiscoveryMatching({
      status: "preparing",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      requestedByUserId: null,
      userId: "recipient",
    }),
    false
  );
  assert.equal(
    canConfirmFullDiscoveryMatching({
      status: "ready_for_matching",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      requestedByUserId: "requester",
      userId: "recipient",
    }),
    false
  );
  assert.equal(
    canConfirmFullDiscoveryMatching({
      status: "awaiting_other_confirmation",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      requestedByUserId: "requester",
      userId: "other-user",
    }),
    false
  );
  assert.equal(
    canConfirmFullDiscoveryMatching({
      status: "awaiting_other_confirmation",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      requestedByUserId: "requester",
      userId: "recipient",
      relationshipExists: true,
    }),
    false
  );
});
