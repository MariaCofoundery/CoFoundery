import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ENTRY_TYPES,
  parseWorkspaceEntry,
  safeSourceUrl,
  workspaceId,
} from "@/features/connect/workspaces/model";
import { canCreateAccountFromPath } from "@/features/auth/betaAccess";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import {
  sendProblemWorkspaceInviteEmail,
  problemWorkspaceInviteMessage,
} from "@/lib/email/sendProblemWorkspaceInviteEmail";
import robots from "@/app/robots";

test("entry parser ignores client authorship, owner and workspace claims", () => {
  const form = new FormData();
  form.set("author_user_id", "foreign");
  form.set("workspace_id", "foreign");
  form.set("role", "owner");
  form.set("type", "observation");
  form.set("content", "  Observation  ");
  form.set("source_url", "https://example.invalid/");
  form.set("source_label", "  Interview  ");
  assert.deepEqual(parseWorkspaceEntry(form), {
    p_type: "observation",
    p_content: "Observation",
    p_source_url: "https://example.invalid/",
    p_source_label: "Interview",
  });
  form.set("type", "assumption");
  assert.equal(parseWorkspaceEntry(form).p_source_url, null);
  assert.equal(parseWorkspaceEntry(form).p_source_label, null);
});
test("only safe http/https source links render; never credentials or script URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.invalid",
    "https://user:secret@example.invalid",
    "not a url",
    "https://example.invalid:bad",
  ])
    assert.equal(safeSourceUrl(url), null);
  assert.equal(
    safeSourceUrl("https://example.invalid/context?q=1"),
    "https://example.invalid/context?q=1",
  );
  assert.equal(
    safeSourceUrl("http://example.invalid"),
    "http://example.invalid/",
  );
  assert.equal(safeSourceUrl(null), null);
});
test("all five entry types and role/lifecycle text exist in DE/EN", () => {
  const de = JSON.parse(
      readFileSync("messages/de/problemWorkspace.json", "utf8"),
    ),
    en = JSON.parse(readFileSync("messages/en/problemWorkspace.json", "utf8"));
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
  assert.equal(ENTRY_TYPES.length, 5);
  for (const messages of [de, en]) {
    for (const type of ENTRY_TYPES) {
      assert.ok(messages.types[type]);
      assert.ok(messages.hints[type]);
    }
    for (const key of [
      "owner",
      "viewer",
      "contributor",
      "archiveHelp",
      "inviteHelp",
      "privacy",
      "removeCheck",
    ])
      assert.ok(messages[key]);
  }
});
test("workspace invitation enables signup only on exact token route and preserves guest return", async () => {
  const invite = "/connect/workspaces/invite/" + "a".repeat(48),
    id = "76000000-0000-4000-8000-000000000001";
  assert.equal(workspaceId(id), true);
  assert.equal(workspaceId("../secret"), false);
  assert.equal(canCreateAccountFromPath(invite), true);
  for (const path of [
    "/connect/workspaces",
    "/connect/workspaces/new",
    "/connect/workspaces/" + id,
    invite + "/extra",
    "//other.invalid" + invite,
  ])
    assert.equal(canCreateAccountFromPath(path), false);
  const client = {
    auth: {
      getUser: async () => {
        throw Error("unrelated onboarding");
      },
    },
    from: () => {
      throw Error("unrelated profile read");
    },
    rpc: async () => ({ data: null, error: null }),
  };
  for (const path of [
    invite,
    "/connect/workspaces",
    "/connect/workspaces/" + id,
  ])
    assert.equal(await resolvePostAuthRedirectPath(client, path), path);
});
test("private workspace paths are disallowed without blocking public CONNECT paths", () => {
  const rule = robots().rules;
  assert.ok(!Array.isArray(rule));
  if (!Array.isArray(rule)) {
    assert.ok(rule.disallow?.includes("/connect/workspaces"));
    assert.ok(rule.disallow?.includes("/connect"));
  }
});
test("invite email has generic purpose and token link, no private workspace title or entry data", () => {
  for (const locale of ["de", "en"]) {
    const m = problemWorkspaceInviteMessage(
      "https://example.invalid/invite/token",
      locale,
    );
    assert.match(m.text, /https:\/\/example.invalid\/invite\/token/);
    assert.deepEqual(Object.keys(m).sort(), ["subject", "text"]);
    assert.doesNotMatch(m.text, /source_url|author_user_id|PRIVATE_CONTENT/);
  }
});
test("Resend is mocked; missing config and provider failure do not throw", async () => {
  const old = { ...process.env },
    fetchBefore = globalThis.fetch;
  let calls = 0;
  try {
    delete process.env.RESEND_API_KEY;
    globalThis.fetch = async () => {
      calls++;
      return new Response("{}", { status: 200 });
    };
    assert.equal(
      await sendProblemWorkspaceInviteEmail(
        "local@example.invalid",
        "https://example.invalid/invite",
        "de",
      ),
      false,
    );
    assert.equal(calls, 0);
    process.env.RESEND_API_KEY = "mock";
    process.env.RESEND_FROM_EMAIL = "sender@example.invalid";
    assert.equal(
      await sendProblemWorkspaceInviteEmail(
        "local@example.invalid",
        "https://example.invalid/invite",
        "en",
      ),
      true,
    );
    assert.equal(calls, 1);
    globalThis.fetch = async () =>
      new Response("private provider error", { status: 500 });
    assert.equal(
      await sendProblemWorkspaceInviteEmail(
        "local@example.invalid",
        "https://example.invalid/invite",
        "de",
      ),
      false,
    );
    globalThis.fetch = async () => {
      throw Error("private provider detail");
    };
    assert.equal(
      await sendProblemWorkspaceInviteEmail(
        "local@example.invalid",
        "https://example.invalid/invite",
        "de",
      ),
      false,
    );
  } finally {
    globalThis.fetch = fetchBefore;
    for (const key of Object.keys(process.env))
      if (!(key in old)) delete process.env[key];
    Object.assign(process.env, old);
  }
});
