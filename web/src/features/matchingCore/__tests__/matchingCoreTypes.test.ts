import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateMatchingSessionFromDiscoveryStart,
  getMatchingSessionInputReadinessStatus,
  isMatchingSessionSourceType,
  isMatchingSessionStatus,
} from "@/features/matchingCore/matchingCoreTypes";

test("accepts only supported matching session statuses", () => {
  assert.equal(isMatchingSessionStatus("awaiting_inputs"), true);
  assert.equal(isMatchingSessionStatus("ready_for_report"), true);
  assert.equal(isMatchingSessionStatus("report_ready"), true);
  assert.equal(isMatchingSessionStatus("canceled"), true);
  assert.equal(isMatchingSessionStatus("ready_for_matching"), false);
  assert.equal(isMatchingSessionStatus("pending"), false);
});

test("accepts supported matching session source types", () => {
  assert.equal(isMatchingSessionSourceType("discovery_matching_start"), true);
  assert.equal(isMatchingSessionSourceType("invitation"), true);
  assert.equal(isMatchingSessionSourceType("manual"), true);
  assert.equal(isMatchingSessionSourceType("program"), true);
  assert.equal(isMatchingSessionSourceType("advisor"), true);
  assert.equal(isMatchingSessionSourceType("email"), false);
});

test("allows creating a matching session only from ready discovery starts and involved users", () => {
  assert.equal(
    canCreateMatchingSessionFromDiscoveryStart({
      discoveryMatchingStartStatus: "ready_for_matching",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    true
  );
  assert.equal(
    canCreateMatchingSessionFromDiscoveryStart({
      discoveryMatchingStartStatus: "ready_for_matching",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "recipient",
    }),
    true
  );
});

test("blocks matching session creation for non-ready, unrelated or relationship contexts", () => {
  assert.equal(
    canCreateMatchingSessionFromDiscoveryStart({
      discoveryMatchingStartStatus: "preparing",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
    }),
    false
  );
  assert.equal(
    canCreateMatchingSessionFromDiscoveryStart({
      discoveryMatchingStartStatus: "awaiting_other_confirmation",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "recipient",
    }),
    false
  );
  assert.equal(
    canCreateMatchingSessionFromDiscoveryStart({
      discoveryMatchingStartStatus: "ready_for_matching",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "other-user",
    }),
    false
  );
  assert.equal(
    canCreateMatchingSessionFromDiscoveryStart({
      discoveryMatchingStartStatus: "ready_for_matching",
      requesterUserId: "requester",
      recipientUserId: "recipient",
      userId: "requester",
      relationshipExists: true,
    }),
    false
  );
});

test("marks matching session ready only when every active participant has required base input", () => {
  assert.equal(
    getMatchingSessionInputReadinessStatus({
      activeParticipantUserIds: ["a", "b"],
      requiredModules: ["base"],
      submittedInputs: [
        { userId: "a", module: "base" },
        { userId: "b", module: "base" },
      ],
    }),
    "ready_for_report"
  );
});

test("keeps matching session awaiting inputs when required base input is missing", () => {
  assert.equal(
    getMatchingSessionInputReadinessStatus({
      activeParticipantUserIds: ["a", "b"],
      requiredModules: ["base"],
      submittedInputs: [{ userId: "a", module: "base" }],
    }),
    "awaiting_inputs"
  );
  assert.equal(
    getMatchingSessionInputReadinessStatus({
      activeParticipantUserIds: ["a", "b"],
      requiredModules: ["base"],
      submittedInputs: [],
    }),
    "awaiting_inputs"
  );
});
