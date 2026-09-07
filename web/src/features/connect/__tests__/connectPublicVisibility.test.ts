import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
    "src/app/(public-connect)/connect/p/[publicSlug]/page.tsx",
    "src/app/(public-connect)/connect/l/[publicSlug]/page.tsx",
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

test("public pages never show an image at all", () => {
  // Produktentscheidung vom 07.09.2026. Ein Gesicht auf einer indexierbaren
  // Seite ermoeglicht Rueckwaerts-Bildsuche und laesst sich nach der
  // Indexierung nicht zurueckholen; der Gegenwert war aesthetisch. Damit
  // entfaellt die Ebene komplett statt weiter reguliert zu werden.
  const removal = source(
    "../supabase/migrations/20260907200000_remove_public_photo_delivery.sql"
  );
  assert.match(removal, /drop function if exists public\.resolve_public_network_photo/);
  assert.match(removal, /drop column if exists photo_visibility/);
  // Praezise auf die Spaltendeklaration, nicht auf die Erwaehnung im Kommentar.
  assert.doesNotMatch(removal, /photo_available boolean/);
  assert.doesNotMatch(removal, /photo_avatar_id text,\s*photo_path text/);

  // Die Projektionen tragen kein Bildfeld mehr, und die Seiten rendern Initialen.
  for (const page of [
    "src/app/(public-connect)/connect/p/[publicSlug]/page.tsx",
    "src/app/(public-connect)/connect/l/[publicSlug]/page.tsx",
  ]) {
    const body = source(page);
    assert.match(body, /src=\{null\}/, `${page} muss immer Initialen zeigen`);
    assert.doesNotMatch(body, /photo_available|publicConnectPhotoUrl/);
  }

  // Der privilegierte service_role-Pfad fuer anonyme Aufrufe ist weg.
  assert.equal(
    existsSync("src/app/api/connect/public-photos/[entityType]/[publicSlug]/route.ts"),
    false,
    "die oeffentliche Fotoroute darf nicht mehr existieren"
  );

  // Innerhalb CoFoundery bleibt das Bild: diese Route haengt an der
  // Mitgliedschaft, nicht an einer Fotoerlaubnis.
  assert.equal(existsSync("src/app/api/connect/photos/[userId]/route.ts"), true);
});

test("visibility UI requires explicit first-public confirmation in profile and listing forms", () => {
  const field = source("src/features/connect/ConnectVisibilityField.tsx");
  const actions = source("src/features/connect/connectActions.ts");
  assert.match(field, /confirm_public_visibility/);
  assert.match(field, /required/);
  assert.match(actions, /currentProfile\.data\?\.visibility !== "public"/);
  assert.match(actions, /currentListing\.data\?\.visibility !== "public"/);
  assert.match(actions, /public_confirmation/);
});

test("public listing handoff reuses authenticated contact flow and respects owner and block state", () => {
  const page = source("src/app/(public-connect)/connect/l/[publicSlug]/page.tsx");
  assert.match(page, /is_network_member/);
  assert.match(page, /getConnectBlockState/);
  assert.match(page, /\/connect\/listings\/\$\{internal\.id\}\/contact/);
  assert.match(page, /own \?/);
  assert.match(page, /blocked \?/);
  assert.match(page, /\/login\?next=/);
  assert.match(page, /\/start\?intent=connect&next=/);
});

test("public profile exposes only public listings and no free-profile contact", () => {
  const page = source("src/app/(public-connect)/connect/p/[publicSlug]/page.tsx");
  assert.match(page, /getPublicConnectProfileListings/);
  assert.doesNotMatch(page, /request_network_contact|\/contact`/);
});

test("sitemap is dynamically derived only from the public projection", () => {
  const sitemap = source("src/app/sitemap.ts");
  assert.match(sitemap, /list_public_network_sitemap/);
  assert.match(sitemap, /dynamic = "force-dynamic"/);
  assert.match(sitemap, /revalidate = 0/);
  assert.doesNotMatch(sitemap, /from\("network_profiles"\)|from\("network_listings"\)/);

  // The projection builds the public paths in SQL, so the Connect rename needed
  // its own migration; a stale network path here would emit dead sitemap URLs.
  const renamed = source("../supabase/migrations/20260906120000_rename_public_network_paths_to_connect.sql");
  assert.match(renamed, /'\/connect\/p\/' \|\| profile\.public_slug/);
  assert.match(renamed, /'\/connect\/l\/' \|\| listing\.public_slug/);
  assert.doesNotMatch(renamed, /'\/network\/[pl]\//);
});

test("public routes do not render member ProductShell navigation", () => {
  const chrome = source("src/features/navigation/productChromePath.ts");
  assert.match(chrome, /pathname\.startsWith\("\/connect\/p\/"\)/);
  assert.match(chrome, /pathname\.startsWith\("\/connect\/l\/"\)/);
});

test("German and English public visibility copy remain key-parallel and explain indexing", () => {
  const de = JSON.parse(source("messages/de/connect.json"));
  const en = JSON.parse(source("messages/en/connect.json"));
  assert.deepEqual(Object.keys(de.visibility).sort(), Object.keys(en.visibility).sort());
  assert.deepEqual(Object.keys(de.public).sort(), Object.keys(en.public).sort());
  assert.match(de.visibility.profilePublicHint, /Suchmaschinen/);
  assert.match(en.visibility.profilePublicHint, /search engines/);
});
