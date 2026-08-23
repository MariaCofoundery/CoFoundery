import assert from "node:assert/strict";
import test from "node:test";
import deNavigation from "../../../../messages/de/navigation.json";
import enNavigation from "../../../../messages/en/navigation.json";
import {
  countIncomingOpenDiscoveryIntroRequests,
  formatIncomingRequestBadgeCount,
  getIncomingRequestBadgePresentation,
  type DiscoveryIntroStatus,
} from "@/features/discovery/discoveryIntroTypes";

function request(recipientUserId: string, status: DiscoveryIntroStatus) {
  return { recipientUserId, status };
}

test("counts only pending intro requests addressed to the current founder", () => {
  const founderId = "founder-current";

  assert.equal(countIncomingOpenDiscoveryIntroRequests([], founderId), 0);
  assert.equal(
    countIncomingOpenDiscoveryIntroRequests([request("founder-other", "pending")], founderId),
    0
  );
  assert.equal(
    countIncomingOpenDiscoveryIntroRequests([request(founderId, "pending")], founderId),
    1
  );
  assert.equal(
    countIncomingOpenDiscoveryIntroRequests(
      [request(founderId, "pending"), request(founderId, "pending")],
      founderId
    ),
    2
  );

  for (const status of ["accepted", "declined", "canceled"] as const) {
    assert.equal(
      countIncomingOpenDiscoveryIntroRequests([request(founderId, status)], founderId),
      0,
      `${status} must not require a recipient response`
    );
  }
});

test("formats the compact notification badge", () => {
  assert.equal(formatIncomingRequestBadgeCount(0), null);
  assert.equal(formatIncomingRequestBadgeCount(1), "1");
  assert.equal(formatIncomingRequestBadgeCount(9), "9");
  assert.equal(formatIncomingRequestBadgeCount(10), "9+");
  assert.equal(formatIncomingRequestBadgeCount(42), "9+");

  assert.equal(getIncomingRequestBadgePresentation(0), null);
  assert.deepEqual(getIncomingRequestBadgePresentation(1), {
    displayCount: "1",
    messageKey: "incomingRequestBadgeSingular",
  });
  assert.deepEqual(getIncomingRequestBadgePresentation(10), {
    displayCount: "9+",
    messageKey: "incomingRequestBadgePlural",
  });
});

test("provides singular and plural accessible labels in German and English", () => {
  assert.equal(deNavigation.incomingRequestBadgeSingular, "1 offene Co-Founder-Anfrage");
  assert.equal(deNavigation.incomingRequestBadgePlural.replace("{count}", "3"), "3 offene Co-Founder-Anfragen");
  assert.equal(enNavigation.incomingRequestBadgeSingular, "1 open co-founder request");
  assert.equal(enNavigation.incomingRequestBadgePlural.replace("{count}", "3"), "3 open co-founder requests");
});
