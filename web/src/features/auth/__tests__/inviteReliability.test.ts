import assert from "node:assert/strict";
import test from "node:test";
import { getAllowedBetaCodes, isValidBetaAccessCode } from "@/features/auth/betaAccess";
import { persistInviteBeforeMail } from "@/features/invitations/inviteDelivery";
import { logInviteFlowDebug } from "@/features/onboarding/inviteFlowDebug";
import { buildLocaleContinuationPath } from "@/i18n/localeContinuation";

test("beta access fails closed without configured codes", () => {
  const previousCodes = process.env.BETA_ACCESS_CODES;
  delete process.env.BETA_ACCESS_CODES;
  try {
    assert.deepEqual(getAllowedBetaCodes(), []);
    assert.equal(isValidBetaAccessCode("cofoundery-beta"), false);
  } finally {
    if (previousCodes === undefined) delete process.env.BETA_ACCESS_CODES;
    else process.env.BETA_ACCESS_CODES = previousCodes;
  }
});

test("configured beta codes remain usable", () => {
  const previousCodes = process.env.BETA_ACCESS_CODES;
  process.env.BETA_ACCESS_CODES = "first-secret, SECOND-secret";
  try {
    assert.deepEqual(getAllowedBetaCodes(), ["first-secret", "second-secret"]);
    assert.equal(isValidBetaAccessCode(" second-SECRET "), true);
  } finally {
    if (previousCodes === undefined) delete process.env.BETA_ACCESS_CODES;
    else process.env.BETA_ACCESS_CODES = previousCodes;
  }
});

test("invite delivery persists before sending and preserves persisted state on mail failure", async () => {
  const calls: string[] = [];
  const success = await persistInviteBeforeMail({
    persist: async () => {
      calls.push("persist");
      return { ok: true as const, value: { id: "invite-1" } };
    },
    send: async () => {
      calls.push("send");
      return { ok: true as const };
    },
  });
  assert.deepEqual(calls, ["persist", "send"]);
  assert.deepEqual(success, { ok: true, value: { id: "invite-1" } });

  const failedMail = await persistInviteBeforeMail({
    persist: async () => ({ ok: true as const, value: { id: "invite-2" } }),
    send: async () => ({ ok: false as const, error: "provider_failure" }),
  });
  assert.deepEqual(failedMail, {
    ok: false,
    stage: "delivery",
    value: { id: "invite-2" },
  });

  const thrownMail = await persistInviteBeforeMail({
    persist: async () => ({ ok: true as const, value: { id: "invite-3" } }),
    send: async () => {
      throw new Error("network_failure");
    },
  });
  assert.deepEqual(thrownMail, {
    ok: false,
    stage: "delivery",
    value: { id: "invite-3" },
  });
});

test("mail is not attempted when invitation persistence fails", async () => {
  let sendCalled = false;
  const result = await persistInviteBeforeMail({
    persist: async () => ({ ok: false as const }),
    send: async () => {
      sendCalled = true;
      return { ok: true as const };
    },
  });
  assert.deepEqual(result, { ok: false, stage: "persistence" });
  assert.equal(sendCalled, false);
});

test("mail links establish DE or EN before continuing to the token route", () => {
  const de = buildLocaleContinuationPath("/join?token=test", "de");
  const en = buildLocaleContinuationPath("/advisor/invite/test", "en");
  assert.equal(de, "/locale/continue?locale=de&next=%2Fjoin%3Ftoken%3Dtest");
  assert.equal(en, "/locale/continue?locale=en&next=%2Fadvisor%2Finvite%2Ftest");
});

test("invite-flow debug output redacts raw tokens and token-bearing URLs", () => {
  const originalLog = console.log;
  const output: string[] = [];
  console.log = (...values: unknown[]) => output.push(values.join(" "));
  try {
    logInviteFlowDebug("test", {
      token: "raw-secret-token",
      href: "https://cofoundery.local/join?token=raw-secret-token&safe=1",
      nestedHref:
        "/locale/continue?locale=en&next=%2Fadvisor%2Finvite%2Fraw-secret-token",
      nested: { advisorToken: "another-secret" },
    });
  } finally {
    console.log = originalLog;
  }

  const serialized = output.join("\n");
  assert.doesNotMatch(serialized, /raw-secret-token|another-secret/);
  assert.match(serialized, /REDACTED/);
});
