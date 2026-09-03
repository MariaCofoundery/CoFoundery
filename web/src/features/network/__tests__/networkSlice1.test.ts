import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveProductEntryPath } from "@/features/auth/productEntry";
import { coFounderBridgeHref, NETWORK_CATEGORIES, NETWORK_ROLES } from "@/features/network/networkTypes";
import { listingPublishable, parseNetworkListing, parseNetworkProfile, profilePublishable } from "@/features/network/networkValidation";
import { normalizeProfileRoles } from "@/features/profile/profileRoles";

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
}

test("Network categories deliberately exclude co-founder listings", () => {
  assert.deepEqual(NETWORK_CATEGORIES, ["expertise", "cooperation", "investment", "sparring", "succession"]);
  assert.ok(!NETWORK_CATEGORIES.includes("cofounder" as never));
});

test("listing input is bounded and supports seeking and offering", () => {
  for (const direction of ["seeking", "offering"]) {
    const form = new FormData(); form.set("direction", direction); form.set("category", "expertise");
    form.set("title", "A concrete short listing"); form.set("summary", "A concrete summary with enough useful context for another member.");
    form.set("topics", Array.from({ length: 12 }, (_, i) => `Topic ${i}`).join(","));
    const parsed = parseNetworkListing(form);
    assert.equal(parsed.direction, direction); assert.equal(parsed.topics.length, 8); assert.ok(listingPublishable(parsed));
  }
});

test("profile reuse remains a draft and publication requires concrete fields", () => {
  const form = new FormData(); form.set("display_name", "Ada"); form.set("headline", "Product expert");
  form.set("bio", "I support early teams with product discovery."); form.append("network_roles", NETWORK_ROLES[2]);
  assert.ok(profilePublishable(parseNetworkProfile(form)));
  const action = readFileSync("src/features/network/networkActions.ts", "utf8");
  assert.match(action, /status: "draft", published_at: null/); assert.doesNotMatch(action, /linkedin_url/);
});

test("home layout and empty state support low-liquidity counts without ranking", () => {
  const page = readFileSync("src/app/(product)/network/page.tsx", "utf8");
  const data = readFileSync("src/features/network/networkData.ts", "utf8");
  for (const count of [0, 1, 3, 10, 21]) assert.ok(count === 0 ? page.includes("empty.title") : page.includes("listings.map"));
  assert.match(data, /order\("published_at"/); assert.doesNotMatch(page, /score|popularity|best match|infinite/i);
});

test("co-founder selection bridges to Discovery and never reaches the listing editor", () => {
  const page = readFileSync("src/app/(product)/network/listings/new/page.tsx", "utf8");
  assert.match(page, /params\.category === "cofounder"/);
  assert.match(page, /coFounderBridgeHref\(hasProfileRole\(baseProfile\?\.roles, "founder"\)\)/);
  assert.equal(coFounderBridgeHref(true), "/discovery");
  assert.equal(coFounderBridgeHref(false), "/welcome?next=%2Fdiscovery");
});

test("product entry keeps Founder, Advisor, Network-only, and unsupported access separate", () => {
  const founder = { hasFounder: true, hasAdvisor: false, hasNetwork: true, coreProfileComplete: true };
  const both = { ...founder, hasAdvisor: true };
  const advisor = { ...founder, hasFounder: false, hasAdvisor: true };
  const networkOnly = { ...founder, hasFounder: false };
  const unsupported = { ...networkOnly, hasNetwork: false };

  assert.equal(resolveProductEntryPath("/dashboard", founder, "/welcome"), "/dashboard");
  assert.equal(resolveProductEntryPath("/dashboard", both, "/welcome"), "/dashboard");
  assert.equal(resolveProductEntryPath("/dashboard", advisor, "/welcome"), "/advisor/dashboard");
  assert.equal(resolveProductEntryPath("/dashboard", networkOnly, "/welcome"), "/network");
  assert.equal(resolveProductEntryPath("/network/my", networkOnly, "/welcome"), "/network/my");
  assert.equal(resolveProductEntryPath("/dashboard", unsupported, "/welcome"), "/start");
});

test("missing technical roles never normalize to Founder", () => {
  assert.deepEqual(normalizeProfileRoles([]), []);
  assert.deepEqual(normalizeProfileRoles(null), []);
  assert.deepEqual(normalizeProfileRoles(["business_angel"]), []);
});

test("owner lifecycle and dashboard integration are present", () => {
  const my = readFileSync("src/app/(product)/network/my/page.tsx", "utf8");
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  for (const action of ["publish", "pause", "complete", "renew"]) assert.match(my, new RegExp(action));
  assert.match(dashboard, /networkCounts\.seeking \+ networkCounts\.offering > 0/);
});

test("German and English Network messages have exact key parity", () => {
  const de = JSON.parse(readFileSync("messages/de/network.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/network.json", "utf8"));
  assert.deepEqual(keys(de).sort(), keys(en).sort());
});

test("migration is member-only and keeps private domains outside projections", () => {
  const sql = readFileSync("../supabase/migrations/20260903180000_create_network_v01_slice1.sql", "utf8");
  assert.match(sql, /revoke all on public\.network_memberships, public\.network_profiles, public\.network_listings from anon/);
  assert.match(sql, /expires_at > now\(\)/);
  assert.match(sql, /references public\.network_memberships\(user_id\) on delete cascade/);
  assert.match(sql, /create table public\.network_memberships/);
  assert.match(sql, /revoke insert, update, delete on public\.network_memberships from authenticated/);
  assert.doesNotMatch(sql, /network_roles[^;]+is_network_member/i);
  assert.doesNotMatch(sql, /linkedin_url|private_email/);
});

test("product shell and Founder dashboard enforce capability separation", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  assert.match(shell, /isNetworkOnly = hasNetwork && !hasFounder && !hasAdvisor/);
  assert.match(shell, /\{hasFounder \?/);
  assert.match(dashboard, /if \(!roleViews\.hasFounder\)/);
  assert.match(dashboard, /hasNetwork === true \? "\/network" : "\/start"/);
});

test("Network-only account deletion is not yet exposed through the current product entry", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  const networkProfile = readFileSync("src/app/(product)/network/profile/page.tsx", "utf8");
  assert.match(shell, /\{!networkOnly \? <Link/);
  assert.match(dashboard, /<DeleteAccountSection \/>/);
  assert.doesNotMatch(networkProfile, /DeleteAccountSection|deleteCurrentUserAccountAction/);
});
