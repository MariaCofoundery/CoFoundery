import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canAccessAccountSettings } from "@/features/account/accountAccess";

test("shared account access accepts every supported capability and rejects unsupported accounts", () => {
  assert.equal(canAccessAccountSettings({ hasFounder: true, hasAdvisor: false, hasConnect: true }), true);
  assert.equal(canAccessAccountSettings({ hasFounder: false, hasAdvisor: true, hasConnect: true }), true);
  assert.equal(canAccessAccountSettings({ hasFounder: true, hasAdvisor: true, hasConnect: true }), true);
  assert.equal(canAccessAccountSettings({ hasFounder: false, hasAdvisor: false, hasConnect: true }), true);
  assert.equal(canAccessAccountSettings({ hasFounder: false, hasAdvisor: false, hasConnect: false }), false);
});

test("account route is owner-only, uses the shared delete UI, and loads no product data", () => {
  const page = readFileSync("src/app/(product)/account/page.tsx", "utf8");
  assert.match(page, /if \(!user\) redirect\("\/login\?next=\/account"\)/);
  assert.match(page, /canAccessAccountSettings/);
  assert.match(page, /redirect\("\/start"\)/);
  assert.match(page, /<DeleteAccountSection \/>/);
  assert.doesNotMatch(page, /\.from\(|network_listings|assessments|founder_teams|advisor_team/);
});

test("profile menu keeps Connect identity separate and exposes Account for every supported role", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  const profile = readFileSync("src/app/(product)/profile/page.tsx", "utf8");

  // Der Eintrag verzweigt nicht mehr nach Rolle: /profile gilt fuer jeden
  // registrierten Menschen, weil jeder eine person_core-Zeile hat. Das ist
  // eine Vereinfachung gegenueber der frueheren Connect-Sonderbehandlung.
  assert.match(shell, /href="\/profile"/);
  assert.doesNotMatch(shell, /connectOnly \? "\/connect\/profile"/);
  // Connect-only-Nutzer erreichen ihr Connect-Profil weiterhin - von /profile
  // aus, wo Sichtbarkeit und Rollen entschieden werden.
  assert.match(profile, /href="\/connect\/profile"/);
  assert.match(profile, /isConnectMember \?/);

  assert.match(shell, /href="\/account"/);
  assert.doesNotMatch(shell, /!connectOnly \? <Link\s+href="\/account"/);
});

test("Founder dashboard delegates deletion to shared Account settings", () => {
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  assert.match(dashboard, /href="\/account"/);
  assert.doesNotMatch(dashboard, /<DeleteAccountSection/);
});

test("shared action reuses deletion backend, signs out, and returns to the public start page", () => {
  const action = readFileSync("src/features/account/actions.ts", "utf8");
  assert.match(action, /deleteFounderAccount\(user\.id\)/);
  assert.match(action, /supabase\.auth\.signOut\(\)/);
  assert.match(action, /redirect\("\/\?status=account_deleted"\)/);
  assert.doesNotMatch(action, /connect.*delete|deleteConnect/i);
});
