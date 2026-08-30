import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildReadMyMindStartedEmailPayload, sendReadMyMindStartedEmail } from "@/lib/email/sendReadMyMindStartedEmail";

const recipientSource = readFileSync(new URL("../readMyMindNotificationRecipient.ts", import.meta.url), "utf8");
const actionSource = readFileSync(new URL("../readMyMindActions.ts", import.meta.url), "utf8");
const foundationSource = readFileSync(new URL("../../../../../supabase/migrations/20260828160000_create_read_my_mind_foundation.sql", import.meta.url), "utf8");
const sequentialSource = readFileSync(new URL("../../../../../supabase/migrations/20260828220000_add_read_my_mind_sequential_handoff.sql", import.meta.url), "utf8");
const multiPackSource = readFileSync(new URL("../../../../../supabase/migrations/20260829120000_add_read_my_mind_multi_pack_flow.sql", import.meta.url), "utf8");

test("recipient email lookup is narrow, server-only, and never enters the action response", () => {
  assert.match(recipientSource, /^import "server-only";/);
  assert.match(recipientSource, /auth\.admin\.getUserById\(userId\)/);
  assert.doesNotMatch(recipientSource, /listUsers|inviteUserByEmail|createUser|updateUserById/);
  assert.match(actionSource, /participant\.founder_user_id !== params\.creatorUserId/);
  assert.match(actionSource, /participant\.state === "pending"/);
  assert.match(actionSource, /recipients\.length !== 1/);
  assert.doesNotMatch(actionSource, /formData\.get\(["'](?:recipient|email|userId|recipientName)/);
  assert.doesNotMatch(actionSource, /return\s+\{[^}]*recipientEmail\s*:/);
});

test("handoff notification is manual and persistently batch-claimed after creator completion", () => {
  const startAction = actionSource.slice(actionSource.indexOf("export async function startReadMyMindRoundAction"), actionSource.indexOf("async function mutateRound"));
  const lockAction = actionSource.slice(actionSource.indexOf("export async function lockReadMyMindPromptAction"), actionSource.indexOf("export async function openReadMyMindRevealAction"));
  const claimPosition = actionSource.indexOf('rpc("claim_collaboration_team_handoff_emails"');
  const sendPosition = actionSource.indexOf("await sendTeamHandoffNotification");
  assert.doesNotMatch(startAction, /sendTeamHandoffNotification|sendReadMyMindStartedEmail/);
  assert.doesNotMatch(lockAction, /claim_collaboration|sendTeamHandoffNotification|sendReadMyMindStartedEmail/);
  assert.ok(claimPosition >= 0 && sendPosition > claimPosition);
  assert.match(sequentialSource, /handoff_email_claimed_at is null/);
  assert.match(multiPackSource, /claim_collaboration_team_handoff_emails/);
  assert.match(multiPackSource, /handoff_email_claimed_at is null/);
  assert.match(multiPackSource, /collaboration_experience_one_open_round_per_team_pack_idx/);
  assert.match(foundationSource, /create unique index collaboration_experience_one_open_round_per_team_idx/);
});

test("delivery failure is best effort and does not expose the recipient", async () => {
  const previousFetch = globalThis.fetch;
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  const calls: Array<{ url: string; body: string }> = [];
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "mail@example.com";
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body ?? "") });
    return new Response("unavailable", { status: 503 });
  }) as typeof fetch;

  try {
    const result = await sendReadMyMindStartedEmail({
      recipientEmail: "ben@example.com",
      roundUrl: "https://cofoundery.de/teams/team-1/collaboration-lab/read-my-mind/round-1",
      creatorName: "Anna",
      packTitles: ["Easy Start"],
      locale: "de",
    });
    assert.deepEqual(result, { ok: false, error: "resend_request_failed:503" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://api.resend.com/emails");
    assert.match(calls[0]?.body ?? "", /ben@example\.com/);
    assert.match(actionSource, /try \{[\s\S]*await sendTeamHandoffNotification[\s\S]*\} catch \{/);
    assert.doesNotMatch(actionSource, /console\.error\([^\n]*recipientEmail/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousFrom;
  }
});

test("one successful notification call sends exactly one email to the pending founder", async () => {
  const previousFetch = globalThis.fetch;
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  const bodies: string[] = [];
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "mail@example.com";
  globalThis.fetch = (async (_input, init) => {
    bodies.push(String(init?.body ?? ""));
    return Response.json({ id: "mail-1" });
  }) as typeof fetch;

  try {
    const result = await sendReadMyMindStartedEmail({
      recipientEmail: "ben@example.com",
      roundUrl: "https://cofoundery.de/teams/team-1/collaboration-lab/read-my-mind/round-1",
      creatorName: "Anna",
      packTitles: ["Easy Start"],
      locale: "en",
    });
    assert.deepEqual(result, { ok: true, id: "mail-1" });
    assert.equal(bodies.length, 1);
    const request = JSON.parse(bodies[0] ?? "{}") as { to?: string[]; subject?: string; html?: string };
    assert.deepEqual(request.to, ["ben@example.com"]);
    assert.doesNotMatch(JSON.stringify(request), /anna@example\.com/i);
    assert.match(request.subject ?? "", /Anna started Read My Mind/);
    assert.match(request.html ?? "", /teams\/team-1\/collaboration-lab\/read-my-mind\/round-1/);
    assert.match(request.html ?? "", /already completed their part/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousFrom;
  }
});

test("DE and EN handoff mail say the creator is finished without private answers", () => {
  for (const locale of ["de", "en"] as const) {
    const payload = buildReadMyMindStartedEmailPayload({
      recipientEmail: "ben@example.com",
      roundUrl: "https://cofoundery.de/teams/team-1/collaboration-lab/read-my-mind/round-1",
      creatorName: "Anna",
      packTitles: ["Easy Start"],
      locale,
    });
    assert.match(payload.subject, /Anna/);
    assert.match(payload.text, locale === "de" ? /eigenen Teil[\s\S]*abgeschlossen/ : /completed their part/);
    assert.doesNotMatch(payload.text, /choice_|Self Answer|Guess Answer|Need Answer/i);
  }
});

test("normal founder authorization and the two-founder guard precede the privileged lookup", () => {
  const teamLoadPosition = actionSource.indexOf("getReadMyMindTeamContext(teamId, auth.user.id, auth.supabase)");
  const twoFounderGuardPosition = actionSource.indexOf("team.members.length !== 2");
  const createPosition = actionSource.indexOf('rpc("create_collaboration_experience_round"');
  const lookupPosition = actionSource.lastIndexOf("getReadMyMindNotificationRecipientEmail(");
  assert.ok(teamLoadPosition >= 0 && twoFounderGuardPosition > teamLoadPosition && createPosition > twoFounderGuardPosition);
  assert.ok(lookupPosition >= 0);
  assert.match(actionSource, /\.in\("round_id", roundIds\)/);
});
