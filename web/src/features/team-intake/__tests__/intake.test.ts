import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseIntakeForm,
  commonKeys,
  pairKeys,
  ORIGINS,
  FORMATIONS,
  OPEN_TOPICS,
  validId,
} from "@/features/team-intake/model";
import {
  sendTeamIntakeInviteEmail,
  teamIntakeInviteMessage,
} from "@/lib/email/sendTeamIntakeInviteEmail";
const a = "75000000-0000-4000-8000-000000000002";
const b = "75000000-0000-4000-8000-000000000003";
const c = "75000000-0000-4000-8000-000000000004";

test("Form parser derives directed targets from server roster, never client authorship", () => {
  const f = new FormData();
  f.set("author_user_id", b);
  f.set("target_user_id", a);
  f.set(`pair.${b}.appreciation`, " Concrete work ");
  f.set(`pair.${a}.appreciation`, "self");
  f.set(`pair.${b}.worked`, "no");
  f.set("common.score", "87");
  f.set("private_note", " Private ");
  f.set("private_requested", "on");
  const result = parseIntakeForm(f, "selection", [b, c]);
  assert.deepEqual(
    result.pairs.map((p) => p.target_user_id),
    [b, c],
  );
  assert.equal(result.pairs[0].data.appreciation, "Concrete work");
  assert.equal(result.pairs[0].data.worked, false);
  assert.equal(result.shared.score, undefined);
  assert.equal(result.private_note, "Private");
  assert.equal(result.private_requested, true);
  assert.equal("author_user_id" in result, false);
});
test("Selection and Development share facts, retain separate reflections", () => {
  const f = new FormData();
  f.set("common.formation", "joined");
  f.set("common.motivation", "Selection only");
  f.set("common.works_well", "Development only");
  f.append("common.open_topics", "roles");
  f.append("common.open_topics", "time");
  const s = parseIntakeForm(f, "selection", [b]);
  const d = parseIntakeForm(f, "development", [b]);
  assert.equal(s.shared.formation, d.shared.formation);
  assert.equal(s.shared.works_well, undefined);
  assert.equal(d.shared.motivation, undefined);
  assert.deepEqual(s.shared.open_topics, ["roles", "time"]);
  assert.equal(d.shared.open_topics, undefined);
  assert.equal(d.pairs[0].data.worked, undefined);
});
test("DE/EN include every field and choice in both short directed forms", () => {
  const de = JSON.parse(readFileSync("messages/de/intake.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/intake.json", "utf8"));
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
  for (const messages of [de, en]) {
    for (const mode of ["selection", "development"] as const)
      for (const key of [...commonKeys(mode), ...pairKeys(mode)])
        assert.ok(messages.fields[key], key);
    for (const origin of ORIGINS) assert.ok(messages.origins[origin]);
    for (const formation of FORMATIONS)
      assert.ok(messages.formations[formation]);
    for (const topic of OPEN_TOPICS) assert.ok(messages.topics[topic]);
    assert.ok(messages.release);
    assert.ok(messages.privateHelp);
    assert.ok(messages.confirmCheck);
  }
});
test("UUID validation rejects malformed route and foreign-context payloads", () => {
  assert.equal(validId(a), true);
  assert.equal(validId("../report"), false);
  assert.equal(validId(a + "/other"), false);
});
test("Invite delivery uses existing Resend settings and no response or error logging", async () => {
  const previous = { ...process.env };
  const fetchBefore = globalThis.fetch;
  let calls = 0;
  const bodies: Record<string, unknown>[] = [];
  try {
    delete process.env.RESEND_API_KEY;
    globalThis.fetch = async () => {
      calls++;
      throw new Error("never external");
    };
    assert.equal(
      await sendTeamIntakeInviteEmail(
        "local@example.invalid",
        "https://example.invalid/invite/token",
        "de",
      ),
      false,
    );
    assert.equal(calls, 0);
    process.env.RESEND_API_KEY = "mock-only";
    process.env.RESEND_FROM_EMAIL = "sender@example.invalid";
    process.env.RESEND_REPLY_TO_EMAIL = "reply@example.invalid";
    globalThis.fetch = async (_url, init) => {
      calls++;
      bodies.push(JSON.parse(String(init?.body)));
      return new Response("{}", { status: 200 });
    };
    assert.equal(
      await sendTeamIntakeInviteEmail(
        "local@example.invalid",
        "https://example.invalid/invite/token",
        "en",
      ),
      true,
    );
    assert.equal(bodies[0].reply_to, "reply@example.invalid");
    assert.deepEqual(bodies[0].to, ["local@example.invalid"]);
    globalThis.fetch = async () =>
      new Response("provider detail", { status: 500 });
    assert.equal(
      await sendTeamIntakeInviteEmail(
        "local@example.invalid",
        "https://example.invalid/invite/token",
        "de",
      ),
      false,
    );
    globalThis.fetch = async () => {
      throw new Error("sensitive provider text");
    };
    assert.equal(
      await sendTeamIntakeInviteEmail(
        "local@example.invalid",
        "https://example.invalid/invite/token",
        "de",
      ),
      false,
    );
  } finally {
    globalThis.fetch = fetchBefore;
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
test("Generic invitation contains only link and purpose, in DE/EN", () => {
  for (const locale of ["de", "en"]) {
    const message = teamIntakeInviteMessage(
      "https://example.invalid/invite/token",
      locale,
    );
    assert.match(message.text, /https:\/\/example.invalid\/invite\/token/);
    assert.equal(Object.keys(message).length, 2);
    assert.doesNotMatch(message.text, /PRIVATE_|score|appreciation/i);
  }
});

// Intake participation does not require unrelated personal assessment onboarding.
test("new-account invitation and post-login return preserve intake context", async () => {
  const { canCreateAccountFromPath } =
    await import("@/features/auth/betaAccess");
  const { resolvePostAuthRedirectPath } =
    await import("@/features/auth/postAuthRedirect");
  const invite = "/team-intake/invite/" + "a".repeat(48);
  assert.equal(canCreateAccountFromPath(invite), true);
  for (const path of [
    "/team-intake",
    "/team-intake/" + a,
    "/team-intake/invite/invalid",
    "//evil.invalid" + invite,
  ])
    assert.equal(canCreateAccountFromPath(path), false);
  const noReads = {
    auth: {
      getUser: async () => {
        throw Error("unrelated onboarding read");
      },
    },
    from: () => {
      throw Error("unrelated profile read");
    },
    rpc: async () => ({ data: null, error: null }),
  };
  for (const path of [invite, "/team-intake", "/team-intake/" + a])
    assert.equal(await resolvePostAuthRedirectPath(noReads, path), path);
});
