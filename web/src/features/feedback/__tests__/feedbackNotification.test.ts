import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { afterEach, beforeEach, mock, test } from "node:test";
import { PRODUCT_NAME } from "@/features/brand";
import { buildFeedbackNotificationPayload } from "@/lib/email/sendFeedbackNotification";
import { sanitizeProductFeedbackSubmission, type ProductFeedbackSubmissionInput } from "@/features/feedback/productFeedback";

// Use the existing Node loader/mocking pattern; execute the real server action
// and mail helper, replacing only Supabase and the external HTTP boundary.
type ResolveResult = { url: string; shortCircuit?: boolean };
const registerHooks = (nodeModule as unknown as {
  registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => ResolveResult): ResolveResult }): { deregister(): void };
}).registerHooks;
const state = { authenticated: true, insertError: false, rows: [] as Record<string, unknown>[], events: [] as string[] };
const client = {
  auth: { getUser: async () => ({ data: { user: state.authenticated ? { id: "existing-user-id", email: "unused@example.invalid" } : null } }) },
  from(table: string) {
    assert.equal(table, "product_feedback");
    return { async insert(row: Record<string, unknown>) {
      state.events.push("insert");
      if (state.insertError) return { error: { message: "failed" } };
      state.rows.push(row);
      return { error: null };
    } };
  },
};
const testGlobal = globalThis as typeof globalThis & { __feedbackTestClient?: typeof client };
testGlobal.__feedbackTestClient = client;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/lib/supabase/server") {
      return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent("export const createClient = async () => globalThis.__feedbackTestClient;")}` };
    }
    return next(specifier, context);
  },
});
const { submitProductFeedbackAction } = await import("@/features/feedback/actions");
hooks.deregister();

const input: ProductFeedbackSubmissionInput = {
  source: "workbook", invitationId: "existing-invitation-id",
  q1Value: "  Hilfreich & klar  ", q2Value: "<script>kein HTML</script>\nZweite Zeile",
  q3Value: "Mehr Beispiele", q4Choice: "anderes", q4OtherText: "  Eigener Wunsch  ", q5Text: "Danke!",
};
const envKeys = ["FEEDBACK_NOTIFICATION_EMAIL", "RESEND_API_KEY", "RESEND_FROM_EMAIL", "RESEND_FROM_NAME", "RESEND_REPLY_TO_EMAIL"] as const;
let previousEnv: Array<string | undefined>;
let requests: Array<{ url: string; init?: RequestInit }>;

beforeEach(() => {
  previousEnv = envKeys.map((key) => process.env[key]);
  process.env.FEEDBACK_NOTIFICATION_EMAIL = "operator@example.invalid";
  process.env.RESEND_API_KEY = "test-only";
  process.env.RESEND_FROM_EMAIL = "sender@example.invalid";
  process.env.RESEND_FROM_NAME = "Test Brand";
  process.env.RESEND_REPLY_TO_EMAIL = "reply@example.invalid";
  state.authenticated = true;
  state.insertError = false;
  state.rows = [];
  state.events = [];
  requests = [];
  mock.method(console, "warn", () => {});
  mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    state.events.push("mail");
    requests.push({ url: String(url), init });
    return Response.json({ id: "mock-mail" });
  });
});
afterEach(() => {
  envKeys.forEach((key, i) => { if (previousEnv[i] === undefined) delete process.env[key]; else process.env[key] = previousEnv[i]; });
  mock.restoreAll();
});

test("successful insert precedes the notification and preserves sanitized context", async () => {
  assert.deepEqual(await submitProductFeedbackAction(input), { ok: true });
  assert.deepEqual(state.events, ["insert", "mail"]);
  assert.equal(state.rows.length, 1);
  assert.equal(state.rows[0].q1_value, "Hilfreich & klar");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.ok(requests[0].init?.signal instanceof AbortSignal);
  const body = JSON.parse(String(requests[0].init?.body));
  assert.deepEqual(body.to, ["operator@example.invalid"]);
  assert.equal(body.from, "Test Brand <sender@example.invalid>");
  assert.equal(body.reply_to, "reply@example.invalid");
  assert.equal(body.subject, `Neues Feedback zu ${PRODUCT_NAME}`);
  for (const text of ["Hilfreich & klar", input.q2Value, input.q3Value, "Eigener Wunsch", "Danke!", "Workbook (workbook)", "existing-invitation-id", "Nutzer: existing-user-id", "Gewünschte Unterstützung: anderes"]) assert.ok(body.text.includes(text), text);
  assert.equal(body.html, undefined);
  assert.doesNotMatch(JSON.stringify(body), /unused@example|user_agent|ip_address|https?:\/\//);
});

test("failed insert keeps the existing error and sends no mail", async () => {
  state.insertError = true;
  assert.deepEqual(await submitProductFeedbackAction(input), { ok: false, reason: "insert_failed" });
  assert.deepEqual(state.events, ["insert"]);
  assert.equal(state.rows.length, 0);
  assert.equal(requests.length, 0);
});

for (const failure of ["http", "network", "timeout"] as const) {
  test(`${failure} mail failure preserves the saved feedback and normal success`, async () => {
    const warning = mock.method(console, "warn", () => {});
    mock.method(globalThis, "fetch", async () => {
      if (failure === "http") return new Response(input.q2Value, { status: 503 });
      if (failure === "timeout") throw new DOMException(input.q2Value, "TimeoutError");
      throw new Error(input.q2Value);
    });
    assert.deepEqual(await submitProductFeedbackAction(input), { ok: true });
    assert.equal(state.rows.length, 1);
    assert.equal(state.rows[0].q2_value, input.q2Value);
    assert.deepEqual(warning.mock.calls[0].arguments, ["[feedback] notification_not_sent", failure === "http" ? "resend_request_failed" : "resend_unavailable"]);
  });
}

for (const missing of [undefined, "   "]) {
  test(`missing/blank recipient (${JSON.stringify(missing)}) skips mail but saves feedback`, async () => {
    if (missing === undefined) delete process.env.FEEDBACK_NOTIFICATION_EMAIL;
    else process.env.FEEDBACK_NOTIFICATION_EMAIL = missing;
    const warning = mock.method(console, "warn", () => {});
    assert.deepEqual(await submitProductFeedbackAction(input), { ok: true });
    assert.equal(state.rows.length, 1);
    assert.equal(requests.length, 0);
    assert.deepEqual(warning.mock.calls[0].arguments, ["[feedback] notification_not_sent", "missing_feedback_notification_email"]);
  });
}

test("unexpected mail setup exceptions cannot turn a saved insert into failure", async () => {
  mock.method(AbortSignal, "timeout", () => { throw new Error("sensitive details"); });
  assert.deepEqual(await submitProductFeedbackAction(input), { ok: true });
  assert.equal(state.rows.length, 1);
});

test("unauthenticated submissions remain rejected; anonymous payload never invents identity", async () => {
  state.authenticated = false;
  assert.deepEqual(await submitProductFeedbackAction(input), { ok: false, reason: "not_authenticated" });
  assert.equal(state.rows.length, 0);
  assert.equal(requests.length, 0);
  const sanitized = sanitizeProductFeedbackSubmission({ ...input, source: "nav", invitationId: null, q4Choice: null, q5Text: null });
  assert.ok(sanitized.ok);
  const payload = buildFeedbackNotificationPayload({ ...sanitized.value, userId: null });
  assert.match(payload.text, /Nutzer: anonym/);
  assert.match(payload.text, /Navigation \(nav\)/);
  assert.doesNotMatch(payload.text, /existing-user|Invitation-ID|Gewünschte Unterstützung/);
});

test("invalid submissions retain their existing behavior without insert or mail", async () => {
  assert.deepEqual(await submitProductFeedbackAction({ ...input, q1Value: " " }), { ok: false, reason: "invalid_input" });
  assert.deepEqual(state.events, []);
});
