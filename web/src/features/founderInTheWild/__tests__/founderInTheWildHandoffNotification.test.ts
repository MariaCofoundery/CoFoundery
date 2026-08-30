import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFounderInTheWildHandoffEmailPayload, sendFounderInTheWildHandoffEmail } from "@/lib/email/sendFounderInTheWildHandoffEmail";

const actionSource = readFileSync(new URL("../founderInTheWildActions.ts", import.meta.url), "utf8");
const migrationSource = readFileSync(new URL("../../../../../supabase/migrations/20260830220000_add_founder_in_the_wild_handoff_notification.sql", import.meta.url), "utf8");

test("handoff is claimed only after response locking and never on round creation", () => {
  const start = actionSource.slice(actionSource.indexOf("export async function startFounderInTheWildRoundAction"), actionSource.indexOf("export async function lockFounderInTheWildScenarioAction"));
  const lock = actionSource.slice(actionSource.indexOf("export async function lockFounderInTheWildScenarioAction"), actionSource.indexOf("export async function openFounderInTheWildRevealAction"));
  assert.doesNotMatch(start, /claim_founder_in_the_wild_handoff_email|sendFounderInTheWildHandoffEmail/);
  assert.ok(lock.indexOf("lock_founder_in_the_wild_response") < lock.indexOf("claimAndSendHandoff"));
  assert.match(migrationSource, /handoff_email_claimed_at is null/);
  assert.match(migrationSource, /for update/);
  assert.match(migrationSource, /partner\.founder_user_id|v_recipient_id/);
  assert.doesNotMatch(migrationSource, /choice_keys[\s\S]*returns table \(recipient_user_id/);
});

test("DE and EN mail contains only handoff context and the direct round link", () => {
  for (const locale of ["de", "en"] as const) {
    const payload = buildFounderInTheWildHandoffEmailPayload({
      recipientEmail: "recipient@example.com",
      founderName: "Maria",
      roundUrl: "https://cofoundery.de/teams/team-1/collaboration-lab/founder-in-the-wild/round-1",
      locale,
    });
    assert.equal(payload.subject, locale === "de" ? "Founder in the Wild: Du bist dran" : "Founder in the Wild: You’re up");
    assert.match(payload.text, /Maria/);
    assert.match(payload.text, /founder-in-the-wild\/round-1/);
    assert.doesNotMatch(payload.text, /move|matters|need|choice|score|report|marker/i);
  }
});

test("provider failure is best effort and returns only a technical error", async () => {
  const previousFetch = globalThis.fetch;
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "mail@example.com";
  globalThis.fetch = (async () => new Response("unavailable", { status: 503 })) as typeof fetch;
  try {
    assert.deepEqual(await sendFounderInTheWildHandoffEmail({
      recipientEmail: "recipient@example.com",
      founderName: "Maria",
      roundUrl: "https://cofoundery.de/round",
      locale: "de",
    }), { ok: false, error: "resend_request_failed:503" });
    assert.match(actionSource, /send_handoff_email/);
    assert.doesNotMatch(actionSource, /console\.error\([^\n]*(?:recipientEmail|user\.id|roundId)/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = previousFrom;
  }
});

test("one successful claim path sends one transactional message to one recipient", async () => {
  const previousFetch = globalThis.fetch;
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  const requests: string[] = [];
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "mail@example.com";
  globalThis.fetch = (async (_input, init) => {
    requests.push(String(init?.body ?? ""));
    return Response.json({ id: "fitw-mail-1" });
  }) as typeof fetch;
  try {
    assert.deepEqual(await sendFounderInTheWildHandoffEmail({
      recipientEmail: "recipient@example.com",
      founderName: "Maria",
      roundUrl: "https://cofoundery.de/teams/team-1/collaboration-lab/founder-in-the-wild/round-1",
      locale: "de",
    }), { ok: true, id: "fitw-mail-1" });
    assert.equal(requests.length, 1);
    const request = JSON.parse(requests[0] ?? "{}") as { to?: string[]; subject?: string; text?: string };
    assert.deepEqual(request.to, ["recipient@example.com"]);
    assert.equal(request.subject, "Founder in the Wild: Du bist dran");
    assert.doesNotMatch(request.text ?? "", /move|matters|need|choice|score|report|marker/i);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = previousFrom;
  }
});
