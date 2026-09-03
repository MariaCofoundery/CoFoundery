import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveProductEntryPath } from "@/features/auth/productEntry";
import { categorySupportsRemoteMode, coFounderBridgeHref, NETWORK_CATEGORIES, NETWORK_GEOGRAPHIC_SCOPES, NETWORK_ROLES } from "@/features/network/networkTypes";
import { formatNetworkContentTimeframe, normalizeNetworkLocations } from "@/features/network/networkPresentation";
import { NetworkValidationError, listingPublishable, parseCommaSeparatedList, parseNetworkListing, parseNetworkProfile, profilePublishable } from "@/features/network/networkValidation";
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
    form.set("topics", Array.from({ length: 8 }, (_, i) => `Topic ${i}`).join(","));
    const parsed = parseNetworkListing(form);
    assert.equal(parsed.direction, direction); assert.equal(parsed.topics.length, 8); assert.ok(listingPublishable(parsed));
  }
});

test("Network home preserves seeking and offering intent through the create flow", () => {
  const home = readFileSync("src/app/(product)/network/page.tsx", "utf8");
  const create = readFileSync("src/app/(product)/network/listings/new/page.tsx", "utf8");
  assert.match(home, /new\?direction=seeking/); assert.match(home, /new\?direction=offering/);
  assert.match(create, /isOneOf\(NETWORK_DIRECTIONS, params\.direction\)/);
  assert.match(create, /direction=\$\{direction \|\| "seeking"\}/);
  assert.match(readFileSync("src/features/network/NetworkListingForm.tsx", "utf8"), /name="direction"/);
});

test("locations trim and deduplicate without silently exceeding the maximum", () => {
  assert.deepEqual(parseCommaSeparatedList(" Berlin ", 3, "too_many_locations"), ["Berlin"]);
  assert.deepEqual(parseCommaSeparatedList("Berlin, Brandenburg, berlin, , Hamburg", 3, "too_many_locations"), ["Berlin", "Brandenburg", "Hamburg"]);
  assert.throws(() => parseCommaSeparatedList("Berlin,Hamburg,Köln,München", 3, "too_many_locations"), (error) => error instanceof NetworkValidationError && error.code === "too_many_locations");
});

test("geographic scope and category-aware fields remain explicit", () => {
  for (const scope of NETWORK_GEOGRAPHIC_SCOPES) {
    const form = new FormData(); form.set("direction", "seeking"); form.set("category", "investment"); form.set("geographic_scope", scope); form.set("remote_mode", "remote");
    const parsed = parseNetworkListing(form); assert.equal(parsed.geographic_scope, scope); assert.equal(parsed.remote_mode, null);
  }
  assert.equal(categorySupportsRemoteMode("expertise"), true); assert.equal(categorySupportsRemoteMode("cooperation"), true); assert.equal(categorySupportsRemoteMode("sparring"), true);
  assert.equal(categorySupportsRemoteMode("investment"), false); assert.equal(categorySupportsRemoteMode("succession"), false);
});

test("content dates validate independently from listing expiry and format without false precision", () => {
  const valid = new FormData(); valid.set("direction", "offering"); valid.set("category", "sparring"); valid.set("starts_on", "2026-10-01"); valid.set("ends_on", "2026-12-31");
  assert.ok(listingPublishable({ ...parseNetworkListing(valid), title: "Valid title", summary: "A sufficiently complete summary." }));
  const invalid = new FormData(); invalid.set("direction", "offering"); invalid.set("category", "sparring"); invalid.set("starts_on", "2026-12-01"); invalid.set("ends_on", "2026-10-01");
  assert.equal(listingPublishable({ ...parseNetworkListing(invalid), title: "Valid title", summary: "A sufficiently complete summary." }), false);
  assert.equal(formatNetworkContentTimeframe("2026-10-01", null, "de", { from: "Ab", until: "Bis" }), "Ab Oktober 2026");
  assert.equal(formatNetworkContentTimeframe(null, "2026-12-31", "en", { from: "From", until: "Until" }), "Until December 2026");
  assert.equal(formatNetworkContentTimeframe("2026-10-01", "2026-12-31", "de", { from: "Ab", until: "Bis" }), "Oktober–Dezember 2026");
  assert.equal(formatNetworkContentTimeframe(null, null, "de", { from: "Ab", until: "Bis" }), null);
});

test("Network actions have pending and success feedback without duplicate submit", () => {
  const submit = readFileSync("src/features/network/NetworkSubmitButton.tsx", "utf8");
  const lifecycle = readFileSync("src/features/network/NetworkLifecycleForm.tsx", "utf8");
  const profile = readFileSync("src/app/(product)/network/profile/page.tsx", "utf8");
  assert.match(submit, /useFormStatus/); assert.match(submit, /disabled=\{pending\}/); assert.match(submit, /pendingLabel/);
  for (const intent of ["pause", "complete", "publish", "renew"]) assert.match(lifecycle, new RegExp(intent));
  assert.match(profile, /pending\.reuse/); assert.match(profile, /pending\.publish/); assert.match(profile, /success\.profile/);
});

test("every Network editing context has deterministic back navigation", () => {
  const paths = ["profile/page.tsx", "my/page.tsx", "listings/new/page.tsx", "listings/[listingId]/edit/page.tsx", "listings/[listingId]/page.tsx"];
  for (const path of paths) assert.match(readFileSync(`src/app/(product)/network/${path}`, "utf8"), /navigation\.(overview|network|myListings)/);
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

test("initial Network render accepts membership without an owner Network profile and zero listings", () => {
  const page = readFileSync("src/app/(product)/network/page.tsx", "utf8");
  const data = readFileSync("src/features/network/networkData.ts", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(data, /return \(data \?\? \[\]\) as NetworkListing\[\]/);
  assert.match(page, /listings\.length \?/);
  assert.match(page, /empty\.title/);
  assert.doesNotMatch(page, /getOwnNetworkProfile/);
  assert.match(layout, /network_profiles"\)\.select\("display_name"\).*\.maybeSingle\(\)/);
  assert.match(layout, /\.catch\(\(\) => null\)/);
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
  const lifecycle = readFileSync("src/features/network/NetworkLifecycleForm.tsx", "utf8");
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  assert.match(my, /NetworkLifecycleForm/);
  for (const action of ["publish", "pause", "complete", "renew"]) assert.match(lifecycle, new RegExp(action));
  assert.match(dashboard, /networkCounts\.seeking \+ networkCounts\.offering > 0/);
});

test("German and English Network messages have exact key parity", () => {
  const de = JSON.parse(readFileSync("messages/de/network.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/network.json", "utf8"));
  assert.deepEqual(keys(de).sort(), keys(en).sort());
  assert.match(de.form.topicsHint, /B2B Sales.*Product Strategy.*Software Development.*Fundraising/);
  assert.match(en.form.industriesHint, /HealthTech.*SaaS.*ClimateTech.*Future of Work/);
  assert.equal(de.form.industries, "Branchen & Themen"); assert.equal(en.form.industries, "Industries & topics");
  assert.match(de.form.locationsHint, /Komma/); assert.match(en.form.locationsHint, /commas/);
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

test("migration history matches Production and the repair is additive and lossless", () => {
  const historical = readFileSync("../supabase/migrations/20260903180000_create_network_v01_slice1.sql", "utf8");
  const repair = readFileSync("../supabase/migrations/20260903190000_repair_network_v01_listing_schema_drift.sql", "utf8");
  assert.equal(createHash("sha256").update(historical).digest("hex"), "0168c80783cde05bdbfefebfd41edde5f8d6f52fe6440aae9e08f1f5796d24fd");
  assert.match(repair, /add column if not exists locations text\[\]/);
  assert.match(repair, /array\[btrim\(location_region\)\]/);
  assert.match(repair, /category in \('investment', 'succession'\)/);
  assert.match(repair, /category not in \('expertise', 'cooperation', 'investment'\)/);
  assert.doesNotMatch(repair, /drop column|set starts_on =|set ends_on =/i);
});

test("legacy-shaped listing locations cannot crash card or detail rendering", () => {
  assert.deepEqual(normalizeNetworkLocations(undefined), []);
  assert.deepEqual(normalizeNetworkLocations(null), []);
  assert.deepEqual(normalizeNetworkLocations(["Berlin"]), ["Berlin"]);
  for (const path of ["src/features/network/NetworkListingCard.tsx", "src/app/(product)/network/listings/[listingId]/page.tsx"]) {
    const renderSource = readFileSync(path, "utf8");
    assert.match(renderSource, /normalizeNetworkLocations\(listing\.locations\)/);
    assert.doesNotMatch(renderSource, /listing\.locations\.length/);
  }
});

test("product shell and Founder dashboard enforce capability separation", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  assert.match(shell, /isNetworkOnly = hasNetwork && !hasFounder && !hasAdvisor/);
  assert.match(shell, /\{hasFounder \?/);
  assert.match(dashboard, /if \(!roleViews\.hasFounder\)/);
  assert.match(dashboard, /hasNetwork === true \? "\/network" : "\/start"/);
});

test("Network-only account deletion is exposed through shared Account settings", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  const account = readFileSync("src/app/(product)/account/page.tsx", "utf8");
  assert.match(shell, /href="\/account"/);
  assert.match(account, /<DeleteAccountSection \/>/);
});
