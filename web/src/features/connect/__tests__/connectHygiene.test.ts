import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { beforeEach, test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getConnectHighlights } from "@/features/connect/connectHighlightData";
import robots from "@/app/robots";

type Row = Record<string, unknown>;
function highlightClient(rows: Record<string, Row[]>, eligible: string[], fail = false) {
  const requested: string[] = [];
  return { requested, client: {
    from(table: string) {
      let data = [...(rows[table] ?? [])];
      const builder = {
        select() { return builder; },
        eq(key: string, value: unknown) { data = data.filter((row) => row[key] === value); return builder; },
        gt(key: string, value: string) { data = data.filter((row) => String(row[key]) > value); return builder; },
        in(key: string, values: unknown[]) { data = data.filter((row) => values.includes(row[key])); return builder; },
        order() { return builder; },
        limit(n: number) { data = data.slice(0, n); return builder; },
        then(resolve: (result: { data: Row[] }) => unknown) { return Promise.resolve(resolve({ data })); },
      };
      return builder;
    },
    async rpc(name: string, args: { p_user_ids: string[] }) {
      assert.equal(name, "get_connect_highlight_owners"); requested.push(...args.p_user_ids);
      return { data: eligible.map((user_id) => ({ user_id, display_name: user_id })), error: fail ? {} : null };
    },
  } as unknown as SupabaseClient };
}
const highlightRows = () => ({
  network_profiles: [{ user_id: "owner", status: "active", display_name: "Owner", headline: "Hello" }],
  network_listings: ["offering", "seeking"].map((direction) => ({ id: direction, owner_user_id: "owner", title: direction, summary: "Details", status: "active", expires_at: "2099-01-01", direction })),
  network_ventures: [{ id: "venture", owner_user_id: "owner", status: "active", name: "Venture", what_it_does: "Details" }],
});
test("every current highlight kind uses the same authorized owner", async () => {
  const { client } = highlightClient(highlightRows(), ["owner"]);
  assert.deepEqual((await getConnectHighlights(client, "viewer", 10)).map((x) => x.kind).sort(), ["offering", "person", "seeking", "venture"]);
});
for (const reason of ["suggestable=false", "outgoing block", "incoming block", "paused owner", "suspended owner"]) {
  test(`DB refusal (${reason}) excludes all owner objects from highlights`, async () => {
    const { client } = highlightClient(highlightRows(), []);
    assert.deepEqual(await getConnectHighlights(client, "viewer", 10), []);
  });
}
test("failed authorization query fails closed", async () => {
  const { client } = highlightClient(highlightRows(), ["owner"], true);
  assert.deepEqual(await getConnectHighlights(client, "viewer", 10), []);
});
test("inactive or expired highlight objects never reach selection", async () => {
  const rows = highlightRows(); rows.network_profiles[0].status = "paused";
  rows.network_listings[0].status = "draft"; rows.network_listings[1].expires_at = "2000-01-01";
  rows.network_ventures[0].status = "hidden";
  assert.deepEqual(await getConnectHighlights(highlightClient(rows, ["owner"]).client, "viewer", 10), []);
});
test("listing owners outside newest profile window are explicitly authorized", async () => {
  const rows = highlightRows();
  rows.network_profiles = [...Array.from({ length: 30 }, (_, i) => ({ user_id: `recent-${i}`, status: "active", display_name: "Recent", headline: "Hello" })), ...rows.network_profiles];
  const { client, requested } = highlightClient(rows, ["owner"]);
  const results = await getConnectHighlights(client, "viewer", 10);
  assert.ok(requested.includes("owner"));
  assert.equal(results.length, 3); assert.ok(results.every((row) => row.person?.user_id === "owner"));
});

// Exercise the actual publishing notification flow, mocking only DB/recipient
// and mail boundaries. No external email request can be made by this suite.
type ResolveResult = { url: string; shortCircuit?: boolean };
const registerHooks = (nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => ResolveResult): ResolveResult }): { deregister(): void } }).registerHooks;
const state = { claim: true, allowed: true, error: false, wanted: true, revokeAtRecipient: false, wrongRecipient: false, events: [] as string[], mails: [] as Row[] };
const testGlobal = globalThis as typeof globalThis & { __hygieneMailState?: typeof state };
testGlobal.__hygieneMailState = state;
const overrides: Record<string, string> = {
  "@/lib/email/notificationRecipient": `export async function getNotificationRecipient() { const s=globalThis.__hygieneMailState; s.events.push('recipient'); if(s.revokeAtRecipient)s.allowed=false; return {email:'test@example.invalid',locale:'de'}; }`,
  "@/lib/email/sendSavedSearchEmail": `export async function sendSavedSearchEmail(payload) { const s=globalThis.__hygieneMailState; s.events.push('mail'); s.mails.push(payload); return {ok:true}; }`,
};
const hooks = registerHooks({ resolve(specifier, context, next) {
  return overrides[specifier] ? { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(overrides[specifier])}` } : next(specifier, context);
} });
const { notifySavedSearchMatches } = await import("@/features/connect/savedSearchNotifications");
hooks.deregister();
beforeEach(() => Object.assign(state, { claim: true, allowed: true, error: false, wanted: true, revokeAtRecipient: false, wrongRecipient: false, events: [], mails: [] }));
const mailClient = {
  from() { const b = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: { capability_disclosure: "private" } }) }; return b; },
  async rpc(name: string) {
    if (name === "list_saved_searches_for_matching") return { data: [{ id: "search", user_id: "reader", query: "podcast", topics: [], industries: [], locations: [], geographic_scope: null, remote_mode: null, capability_area_ids: [], connect_direction: null, connect_category: null, include_listings: true, include_problems: true }] };
    if (name === "claim_saved_search_hit") { state.events.push("claim"); return { data: state.claim }; }
    if (name === "wants_email_notification") return { data: state.wanted };
    assert.equal(name, "get_connect_saved_search_delivery"); state.events.push("authorize");
    return { data: state.allowed ? [{ recipient_user_id: state.wrongRecipient ? "other" : "reader", title: "Current DB title", path: "/connect/listings/current" }] : [], error: state.error ? {} : null };
  },
} as unknown as SupabaseClient;
const subject = { kind: "listing" as const, id: "listing", ownerUserId: "owner", title: "Old podcast title", summary: "podcast", topics: [], industries: [], locations: [], geographicScope: null, remoteMode: null, direction: "offering", category: "expertise" };
test("authorized match claims once, reauthorizes after recipient lookup and sends current DB title", async () => {
  await notifySavedSearchMatches(mailClient, subject);
  assert.deepEqual(state.events, ["claim", "recipient", "authorize", "mail"]);
  assert.equal(state.mails[0].title, "Current DB title"); assert.ok(String(state.mails[0].url).endsWith("/connect/listings/current"));
});
for (const reason of ["blocked", "suspended", "paused", "removed"]) {
  test(`revocation after claim (${reason}) prevents mail`, async () => {
    state.revokeAtRecipient = true; await notifySavedSearchMatches(mailClient, subject);
    assert.deepEqual(state.events, ["claim", "recipient", "authorize"]); assert.equal(state.mails.length, 0);
  });
}
for (const failure of ["claim", "authorization-error", "wrong-recipient", "opt-out"]) {
  test(`${failure} does not send mail`, async () => {
    state.claim = failure !== "claim"; state.error = failure === "authorization-error"; state.wrongRecipient = failure === "wrong-recipient"; state.wanted = failure !== "opt-out";
    await notifySavedSearchMatches(mailClient, subject); assert.equal(state.mails.length, 0);
  });
}

test("member CONNECT routes inherit noindex while public slug routes remain indexable", () => {
  const layout = readFileSync("src/app/(product)/connect/layout.tsx", "utf8");
  assert.match(layout, /index: false, follow: false/);
  for (const route of ["p", "l", "pr"]) {
    const source = readFileSync(`src/app/(public-connect)/connect/${route}/[publicSlug]/page.tsx`, "utf8");
    assert.match(source, /index: true, follow: true/);
  }
  for (const file of readdirSync("src/app/(product)/connect", { recursive: true }).map(String).filter((x) => x.endsWith("page.tsx"))) {
    assert.doesNotMatch(readFileSync(`src/app/(product)/connect/${file}`, "utf8"), /index: true/);
  }
  const rules = robots().rules as { disallow: string[]; allow: string[] };
  for (const section of ["problems", "people", "ventures", "searches", "suggestions", "contacts", "profile", "my"]) assert.ok(rules.disallow.includes(`/connect/${section}`));
  assert.ok(!rules.disallow.includes("/connect"));
  for (const path of ["/connect/p/", "/connect/l/", "/connect/pr/"]) {
    assert.ok(rules.allow.includes(path)); assert.ok(!rules.disallow.some((rule) => path.startsWith(rule)));
  }
});
