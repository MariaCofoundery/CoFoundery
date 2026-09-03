import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("Network photos use an explicit private projection and never imply public publication", () => {
  const migration = source("../supabase/migrations/20260904120000_create_network_safety_photo_foundation.sql");
  assert.match(migration, /'network-profile-images',[\s\S]*false/);
  assert.match(migration, /photo_visibility text not null default 'platform_only'/);
  assert.match(migration, /photo_visibility in \('platform_only', 'public_allowed'\)/);
  assert.match(migration, /public_allowed never publishes a profile, listing, or object/);
  assert.match(migration, /network_profile_images_member_read[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /network_profile_images[^\n]*public_read|for select to (public|anon)/);
});

test("only the neutral avatar library is explicitly reusable from the public Founder avatar contract", () => {
  const actions = source("src/features/network/networkActions.ts");
  const field = source("src/features/network/NetworkPhotoField.tsx");
  assert.match(field, /photo_choice/);
  assert.match(field, /choice === "existing"/);
  assert.match(actions, /normalizeAvatarId\(base\?\.avatar_id\)/);
  assert.doesNotMatch(actions, /storage\.from\("avatars"\)\.download|profile_copy/);
  assert.match(actions, /NETWORK_PHOTO_BUCKET/);
  assert.doesNotMatch(actions, /update[\s\S]{0,80}profiles[\s\S]{0,80}avatar_url/);
});

test("photo removal and replacement clean only owner Network objects", () => {
  const actions = source("src/features/network/networkActions.ts");
  assert.match(actions, /photoChoice === "none"/);
  assert.match(actions, /oldPath !== nextPath/);
  assert.match(actions, /oldPath\.startsWith\(`\$\{user\.id\}\//);
  assert.match(actions, /storage\.from\(NETWORK_PHOTO_BUCKET\)\.remove/);
});

test("authenticated photo delivery is proxied and fails closed", () => {
  const route = source("src/app/api/network/photos/[userId]/route.ts");
  assert.match(route, /client\.auth\.getUser/);
  assert.match(route, /is_network_member/);
  assert.match(route, /status: 401/);
  assert.match(route, /status: 403/);
  assert.match(route, /Cache-Control": "private/);
  assert.doesNotMatch(route, /getPublicUrl|createSignedUrl/);
});

test("Network identity photos appear without dominating listings, contacts, or chat", () => {
  assert.match(source("src/features/network/NetworkListingCard.tsx"), /<NetworkAvatar/);
  assert.match(source("src/app/(product)/network/listings/[listingId]/page.tsx"), /<NetworkAvatar/);
  assert.match(source("src/app/(product)/network/contacts/page.tsx"), /<NetworkAvatar/);
  assert.match(source("src/app/(product)/network/messages/[conversationId]/page.tsx"), /<NetworkAvatar/);
});

test("block is symmetric at RPC boundaries and keeps history while stopping writes", () => {
  const migration = source("../supabase/migrations/20260904120000_create_network_safety_photo_foundation.sql");
  assert.match(migration, /create table public\.network_blocks/);
  assert.match(migration, /blocker_user_id <> blocked_user_id/);
  assert.match(migration, /request_network_contact[\s\S]*is_network_interaction_blocked/);
  assert.match(migration, /send_network_message[\s\S]*network_message_interaction_blocked/);
  assert.doesNotMatch(migration.match(/create or replace function public\.block_network_user[\s\S]*?create or replace function public\.unblock_network_user/)?.[0] ?? "", /delete from public\.network_messages/);
});

test("safety UI confirms block, supports unblock, and hides composer when blocked", () => {
  const safety = source("src/features/network/NetworkSafetyActions.tsx");
  const chat = source("src/app/(product)/network/messages/[conversationId]/page.tsx");
  const listing = source("src/app/(product)/network/listings/[listingId]/page.tsx");
  assert.match(safety, /window\.confirm/);
  assert.match(safety, /unblockNetworkUserAction/);
  assert.match(chat, /blockState\.interaction_blocked/);
  assert.match(listing, /blockState\?\.interaction_blocked/);
});

test("reports are confidential, structured, non-sanctioning records", () => {
  const migration = source("../supabase/migrations/20260904120000_create_network_safety_photo_foundation.sql");
  assert.match(migration, /category in \('spam', 'harassment', 'misleading', 'other'\)/);
  assert.match(migration, /revoke all on public\.network_blocks, public\.network_reports from public, anon, authenticated/);
  assert.match(migration, /reports never alter permissions automatically/);
  assert.doesNotMatch(migration, /trust_score|auto.?suspend|auto.?ban/i);
});

test("German and English photo and safety copy remain key-parallel", () => {
  const de = JSON.parse(source("messages/de/network.json"));
  const en = JSON.parse(source("messages/en/network.json"));
  assert.deepEqual(Object.keys(de.profile.photo).sort(), Object.keys(en.profile.photo).sort());
  assert.deepEqual(Object.keys(de.safety).sort(), Object.keys(en.safety).sort());
  assert.match(de.profile.photo.publicAllowedHint, /erst.*ausdrücklich öffentlich veröffentlichst/i);
  assert.match(en.profile.photo.publicAllowedHint, /only if.*explicitly publish/i);
});

test("account deletion cleans both physical image prefixes before DB/auth deletion", () => {
  const deletion = source("src/features/account/deleteFounderAccount.ts");
  assert.match(deletion, /deleteOwnedImageObjects\(privileged, "avatars", userId\)/);
  assert.match(deletion, /deleteOwnedImageObjects\(privileged, "network-profile-images", userId\)/);
  assert.match(deletion, /avatarCleanup \|\| !networkPhotoCleanup/);
});
