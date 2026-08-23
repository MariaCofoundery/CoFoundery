import assert from "node:assert/strict";
import test from "node:test";
import { getAdvisorInviteClaimIdentityDecision } from "@/features/reporting/advisorInviteClaimIdentity";

test("allows a new advisor claim only for the invited email", () => {
  assert.equal(
    getAdvisorInviteClaimIdentityDecision({
      invitedEmail: "advisor@example.com",
      authenticatedEmail: "advisor@example.com",
      linkedAdvisorUserId: null,
      authenticatedUserId: "advisor-user",
    }),
    "allow_new_claim"
  );
});

test("compares advisor claim emails case-insensitively after trimming", () => {
  assert.equal(
    getAdvisorInviteClaimIdentityDecision({
      invitedEmail: " Advisor@Example.com ",
      authenticatedEmail: "advisor@example.COM",
      linkedAdvisorUserId: null,
      authenticatedUserId: "advisor-user",
    }),
    "allow_new_claim"
  );
});

test("rejects another email and missing identity email before a claim", () => {
  for (const authenticatedEmail of ["other@example.com", "", null]) {
    assert.equal(
      getAdvisorInviteClaimIdentityDecision({
        invitedEmail: "advisor@example.com",
        authenticatedEmail,
        linkedAdvisorUserId: null,
        authenticatedUserId: "other-user",
      }),
      "email_mismatch"
    );
  }

  assert.equal(
    getAdvisorInviteClaimIdentityDecision({
      invitedEmail: null,
      authenticatedEmail: "advisor@example.com",
      linkedAdvisorUserId: null,
      authenticatedUserId: "advisor-user",
    }),
    "email_mismatch"
  );
});

test("keeps an existing claim idempotent only for the same account and email", () => {
  assert.equal(
    getAdvisorInviteClaimIdentityDecision({
      invitedEmail: "advisor@example.com",
      authenticatedEmail: "advisor@example.com",
      linkedAdvisorUserId: "advisor-user",
      authenticatedUserId: "advisor-user",
    }),
    "allow_existing_claim"
  );

  assert.equal(
    getAdvisorInviteClaimIdentityDecision({
      invitedEmail: "advisor@example.com",
      authenticatedEmail: "advisor@example.com",
      linkedAdvisorUserId: "advisor-user",
      authenticatedUserId: "other-user",
    }),
    "already_claimed"
  );
});
