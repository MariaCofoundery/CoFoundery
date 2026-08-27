import assert from "node:assert/strict";
import test from "node:test";
import { deriveAdvisorInviteEmailStatus } from "@/features/dashboard/advisorTeamInviteDelivery";

test("advisor founder email delivery keeps all recipient combinations distinct", () => {
  assert.equal(deriveAdvisorInviteEmailStatus("sent", "sent"), "sent");
  assert.equal(deriveAdvisorInviteEmailStatus("sent", "failed"), "partial");
  assert.equal(deriveAdvisorInviteEmailStatus("failed", "sent"), "partial");
  assert.equal(deriveAdvisorInviteEmailStatus("failed", "failed"), "not_sent");
});
