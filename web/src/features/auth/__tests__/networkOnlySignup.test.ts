import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readNetworkSignupToken, readProfileSignupIntent } from "@/features/auth/signupIntent";
import { resolveProductEntryPath } from "@/features/auth/productEntry";

const source = (path: string) => readFileSync(path, "utf8");

test("start offers Founder, Advisor, and Network as distinct bilingual intents", () => {
  const page = source("src/app/(product)/start/page.tsx");
  const de = JSON.parse(source("messages/de/auth.json"));
  const en = JSON.parse(source("messages/en/auth.json"));
  assert.match(page, /\["founder", "advisor", "network"\]/);
  assert.match(page, /name="intent"/);
  assert.match(page, /shouldCreateUser: true/);
  assert.equal(de.start.intents.network.title, "Ich möchte das Network nutzen");
  assert.equal(en.start.intents.network.title, "I want to use the Network");
  assert.deepEqual(Object.keys(de.start.intents), Object.keys(en.start.intents));
});

test("network signup uses a trusted one-time intent that survives every Magic Link callback path", () => {
  const start = source("src/app/(product)/start/page.tsx");
  const migration = source("../supabase/migrations/20260904130000_create_network_only_signup_v01.sql");
  for (const path of [
    "src/app/auth/callback/route.ts",
    "src/app/auth/confirm/route.ts",
    "src/app/auth/landing/route.ts",
  ]) {
    assert.match(source(path), /claimNetworkSignupIntent/);
  }
  assert.match(start, /issueNetworkSignupIntent/);
  assert.match(start, /network_signup_token/);
  assert.match(migration, /grant execute on function public\.claim_network_signup_intent\(uuid, text\)\s+to service_role/);
  assert.match(migration, /revoke all on function public\.claim_network_signup_intent\(uuid, text\)\s+from public, anon, authenticated/);
  assert.match(migration, /on conflict \(user_id\) do nothing/);
  assert.doesNotMatch(migration, /update public\.network_memberships[\s\S]*status = 'active'/);
});

test("signup token and profile intent parsing are narrow and ignore unsafe values", () => {
  const valid = "A".repeat(43);
  assert.equal(readNetworkSignupToken(new URL(`https://test/auth/callback?network_signup_token=${valid}`)), valid);
  assert.equal(readNetworkSignupToken(new URL("https://test/auth/callback?network_signup_token=short")), null);
  assert.equal(readProfileSignupIntent(new URL("https://test/auth/callback?profile_signup_intent=advisor")), "advisor");
  assert.equal(readProfileSignupIntent(new URL("https://test/auth/callback?profile_signup_intent=network")), null);
});

test("product entry separates first-run, ready, suspended, and unsupported Network-only accounts", () => {
  const base = {
    hasFounder: false,
    hasAdvisor: false,
    hasNetwork: true,
    hasNetworkAccount: true,
    networkProfileReady: false,
    coreProfileComplete: false,
  };
  assert.equal(resolveProductEntryPath("/dashboard", base, "/welcome"), "/network/profile");
  assert.equal(resolveProductEntryPath("/dashboard", { ...base, networkProfileReady: true }, "/welcome"), "/network");
  assert.equal(resolveProductEntryPath("/account", base, "/welcome"), "/account");
  assert.equal(resolveProductEntryPath("/dashboard", { ...base, hasNetwork: false }, "/welcome"), "/account");
  assert.equal(resolveProductEntryPath("/dashboard", { ...base, hasNetwork: false, hasNetworkAccount: false }, "/welcome"), "/start");
  assert.equal(resolveProductEntryPath("/dashboard", {
    ...base,
    hasNetwork: false,
    hasNetworkAccount: false,
    profileOnboardingAllowed: true,
  }, "/welcome"), "/welcome");
});

test("existing Founder and Advisor product entry remains unchanged", () => {
  const founder = { hasFounder: true, hasAdvisor: false, hasNetwork: true, coreProfileComplete: true };
  const advisor = { ...founder, hasFounder: false, hasAdvisor: true };
  assert.equal(resolveProductEntryPath("/dashboard", founder, "/welcome"), "/dashboard");
  assert.equal(resolveProductEntryPath("/dashboard", advisor, "/welcome"), "/advisor/dashboard");
});

test("Network-only navigation exposes Network and Account without Founder or Advisor links", () => {
  const shell = source("src/features/navigation/ProductShell.tsx");
  assert.match(shell, /isNetworkOnly = hasNetwork && !hasFounder && !hasAdvisor/);
  assert.match(shell, /const navigationItems: NavigationItem\[\] = isNetworkOnly \? \[\]/);
  assert.match(shell, /\{hasFounder \? <><Link[\s\S]*href="\/discovery"/);
  assert.match(shell, /href="\/account"/);
  assert.match(shell, /isSuspendedNetworkOnly[\s\S]*"\/account"/);
});

test("first Network profile has no implicit base-profile reuse or technical role", () => {
  const page = source("src/app/(product)/network/profile/page.tsx");
  const action = source("src/features/network/networkActions.ts");
  assert.match(page, /!profile && baseProfile/);
  assert.match(page, /NETWORK_ROLES\.map/);
  assert.match(action, /publish && !currentProfile\.data/);
  assert.doesNotMatch(action, /network_roles[\s\S]{0,100}roles:\s*\["founder"\]/);
});

test("co-founder bridge requires the existing explicit Founder setup", () => {
  const types = source("src/features/network/networkTypes.ts");
  assert.match(types, /hasFounderRole \? "\/discovery" : "\/welcome\?next=/);
  const bridge = types.slice(
    types.indexOf("export function coFounderBridgeHref"),
    types.indexOf("export function categorySupportsRemoteMode")
  );
  assert.doesNotMatch(bridge, /insert|upsert|update|rpc/i);
});

test("suspended Network-only accounts keep Account deletion but lose Network routes", () => {
  const account = source("src/app/(product)/account/page.tsx");
  const access = source("src/features/network/networkAccess.ts");
  assert.match(account, /rpc\("has_network_account"\)/);
  assert.match(account, /<DeleteAccountSection \/>/);
  assert.match(access, /rpc\("is_network_member"\)/);
  assert.match(access, /hasNetworkAccount === true \? "\/account" : "\/dashboard"/);
});

test("beta operations runbook defines review ownership without automatic sanctions", () => {
  const runbook = source("../docs/network-beta-operations-runbook.md");
  assert.match(runbook, /BETA OPERATIONS RUNBOOK/);
  assert.match(runbook, /Network Beta Operations/);
  assert.match(runbook, /Werktagen mindestens einmal/);
  assert.match(runbook, /keine automatische Sanktion/);
  assert.match(runbook, /Network Membership suspendieren/);
});
