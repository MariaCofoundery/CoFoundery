import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  configureResearchConsentState,
  getOrCreateResearchFlowId,
} from "@/features/research/client";

function createSessionStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } as Storage;
}

test("browser storage contains no analytics flow without research consent", () => {
  const sessionStorage = createSessionStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage },
  });

  configureResearchConsentState("declined");
  assert.equal(getOrCreateResearchFlowId("assessment:test"), null);
  assert.equal(sessionStorage.length, 0);

  configureResearchConsentState("accepted");
  assert.ok(getOrCreateResearchFlowId("assessment:test"));
  assert.equal(sessionStorage.length, 1);
  assert.match(sessionStorage.key(0) ?? "", /^research_flow_v1:/);

  configureResearchConsentState("declined");
  assert.equal(sessionStorage.length, 0);
  Reflect.deleteProperty(globalThis, "window");
});

test("tracking client creates no product analytics identifier and gates research data on accepted consent", () => {
  const client = readFileSync("src/features/research/client.ts", "utf8");
  assert.match(client, /researchConsentState === "accepted"/);
  assert.match(client, /delete consentedPayload\.choiceValue/);
  assert.match(client, /delete consentedPayload\.invitationId/);
  assert.match(client, /delete consentedPayload\.assessmentId/);
  assert.match(client, /delete consentedPayload\.teamContext/);
  assert.doesNotMatch(client, /product_flow_v1|ProductAnalyticsFlowId|productFlowId/);
  assert.match(client, /RESEARCH_FLOW_PREFIX = "research_flow_v1:"/);
  assert.match(client, /state !== "accepted"[\s\S]*removeItem/);
});

test("server derives identity from auth and uses strict product and research projections", () => {
  const route = readFileSync("src/app/api/research/track/route.ts", "utf8");
  const server = readFileSync("src/features/research/server.ts", "utf8");
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /userId: user\.id/);
  assert.doesNotMatch(route, /body\.userId/);
  assert.match(server, /preference\?\.state !== "accepted"/);
  assert.match(server, /properties: choiceValue != null \? \{ choiceValue \} : \{\}/);
  assert.doesNotMatch(server, /\.\.\.\(payload\.properties/);
  assert.match(server, /from\("product_analytics_events"\)\.insert\(productPayload\)/);
  assert.doesNotMatch(server, /productFlowId|flow_hash: productFlow/);
});

test("migration removes direct client research writes and constrains free-form properties", () => {
  const migration = readFileSync("../supabase/migrations/20260830160000_separate_product_analytics_and_research_consent.sql", "utf8");
  assert.match(migration, /revoke insert on table public\.research_events from authenticated/);
  assert.match(migration, /new\.properties - 'choiceValue'/);
  assert.match(migration, /research_consent_version = 'research_consent_v1'/);
  assert.match(migration, /preference\.state = 'accepted'/);
  assert.match(migration, /delete from public\.research_events/);
  assert.match(migration, /disabled_pending_explicit_research_consent_contract/);
  assert.doesNotMatch(migration, /grant select on public\.research_events_analytics_v1 to authenticated/);
  assert.doesNotMatch(migration, /product_analytics_events\(flow_hash|flow_hash text/);
});

test("research consent copy is complete and voluntary in DE and EN", () => {
  const de = JSON.parse(readFileSync("messages/de/researchConsent.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/researchConsent.json", "utf8"));
  assert.deepEqual(Object.keys(de.notice), Object.keys(en.notice));
  assert.deepEqual(Object.keys(de.settings), Object.keys(en.settings));
  assert.match(de.notice.body, /freiwillig/);
  assert.match(en.notice.body, /voluntary/);
  assert.equal(de.notice.decline, "Nein, danke");
  assert.equal(en.notice.decline, "No, thanks");
});
