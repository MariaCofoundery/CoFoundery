import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const migration = () => source("../supabase/migrations/20260904140000_create_network_public_visibility_v01.sql");

test("profile and listing publication are independent and private by default", () => {
  const sql = migration();
  assert.match(sql, /network_profiles[\s\S]*visibility text not null default 'members_only'/);
  assert.match(sql, /network_listings[\s\S]*visibility text not null default 'members_only'/);
  assert.match(sql, /case when profile\.visibility = 'public' then profile\.public_slug else null end/);
  assert.doesNotMatch(sql, /update public\.network_(profiles|listings)[\s\S]{0,80}visibility = 'public'/);
});

test("anonymous access uses narrow RPC projections rather than table policies", () => {
  const sql = migration();
  assert.match(sql, /get_public_network_profile/);
  assert.match(sql, /get_public_network_listing/);
  assert.match(sql, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(sql, /create policy[\s\S]{0,80}to anon/);
  assert.doesNotMatch(sql.match(/get_public_network_profile[\s\S]*?\$\$;/)?.[0] ?? "", /select profile\.\*/);
  assert.doesNotMatch(sql.match(/get_public_network_listing[\s\S]*?\$\$;/)?.[0] ?? "", /select listing\.\*/);
});

test("public pages are fail-closed, indexable only when found, and uncached", () => {
  for (const path of [
    "src/app/(public-network)/network/p/[publicSlug]/page.tsx",
    "src/app/(public-network)/network/l/[publicSlug]/page.tsx",
  ]) {
    const page = source(path);
    assert.match(page, /dynamic = "force-dynamic"/);
    assert.match(page, /revalidate = 0/);
    assert.match(page, /notFound\(\)/);
    assert.match(page, /robots: \{ index: true, follow: true \}/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    assert.match(page, /alternates: \{ canonical \}/);
  }
});

test("photo delivery requires entity publication plus public_allowed and remains server-only", () => {
  const sql = migration();
  const route = source("src/app/api/network/public-photos/[entityType]/[publicSlug]/route.ts");
  assert.match(sql, /profile\.photo_visibility = 'public_allowed'/);
  assert.match(sql, /listing\.visibility = 'public'/);
  assert.match(sql, /profile\.visibility = 'public'/);
  assert.match(sql, /public_network_photo_service_required/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /Cache-Control": "no-store/);
  assert.doesNotMatch(route, /getPublicUrl|createSignedUrl/);
});

test("visibility UI requires explicit first-public confirmation in profile and listing forms", () => {
  const field = source("src/features/network/NetworkVisibilityField.tsx");
  const actions = source("src/features/network/networkActions.ts");
  assert.match(field, /confirm_public_visibility/);
  assert.match(field, /required/);
  assert.match(actions, /currentProfile\.data\?\.visibility !== "public"/);
  assert.match(actions, /currentListing\.data\?\.visibility !== "public"/);
  assert.match(actions, /public_confirmation/);
});

test("public listing handoff reuses authenticated contact flow and respects owner and block state", () => {
  const page = source("src/app/(public-network)/network/l/[publicSlug]/page.tsx");
  assert.match(page, /is_network_member/);
  assert.match(page, /getNetworkBlockState/);
  assert.match(page, /\/network\/listings\/\$\{internal\.id\}\/contact/);
  assert.match(page, /own \?/);
  assert.match(page, /blocked \?/);
  assert.match(page, /\/login\?next=/);
  assert.match(page, /\/start\?intent=network&next=/);
});

test("public profile exposes only public listings and no free-profile contact", () => {
  const page = source("src/app/(public-network)/network/p/[publicSlug]/page.tsx");
  assert.match(page, /getPublicNetworkProfileListings/);
  assert.doesNotMatch(page, /request_network_contact|\/contact`/);
});

test("sitemap is dynamically derived only from the public projection", () => {
  const sitemap = source("src/app/sitemap.ts");
  assert.match(sitemap, /list_public_network_sitemap/);
  assert.match(sitemap, /dynamic = "force-dynamic"/);
  assert.match(sitemap, /revalidate = 0/);
  assert.doesNotMatch(sitemap, /from\("network_profiles"\)|from\("network_listings"\)/);
});

test("public routes do not render member ProductShell navigation", () => {
  const chrome = source("src/features/navigation/productChromePath.ts");
  assert.match(chrome, /pathname\.startsWith\("\/network\/p\/"\)/);
  assert.match(chrome, /pathname\.startsWith\("\/network\/l\/"\)/);
});

test("German and English public visibility copy remain key-parallel and explain indexing", () => {
  const de = JSON.parse(source("messages/de/network.json"));
  const en = JSON.parse(source("messages/en/network.json"));
  assert.deepEqual(Object.keys(de.visibility).sort(), Object.keys(en.visibility).sort());
  assert.deepEqual(Object.keys(de.public).sort(), Object.keys(en.public).sort());
  assert.match(de.visibility.profilePublicHint, /Suchmaschinen/);
  assert.match(en.visibility.profilePublicHint, /search engines/);
});
