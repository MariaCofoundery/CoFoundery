import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { projectVisibleSavedDiscoveryCandidates } from "@/features/discovery/discoverySavedProjection";
import type { FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import de from "../../../../messages/de/discovery.json" with { type: "json" };
import en from "../../../../messages/en/discovery.json" with { type: "json" };

function profile(id: string, displayName: string): FounderDiscoveryProfile {
  return {
    id,
    userId: `user-${id}`,
    status: "active",
    displayName,
    headline: "Founder",
    bio: "",
    ownRoles: ["tech"],
    seekingRoles: ["product"],
    expertise: [],
    industries: [],
    locationLabel: null,
    locationRegion: null,
    remoteMode: "remote",
    availabilityHoursPerWeek: 20,
    commitmentLevel: "part_time",
    ventureStage: "exploring_ideas",
    ventureGoal: "explore",
    publishedAt: "2026-09-01T00:00:00Z",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
}

test("saved projection preserves newest-first save order and omits invisible profiles", () => {
  const projected = projectVisibleSavedDiscoveryCandidates(
    [
      { saved_profile_id: "new", created_at: "2026-09-03T12:00:00Z" },
      { saved_profile_id: "hidden", created_at: "2026-09-02T12:00:00Z" },
      { saved_profile_id: "old", created_at: "2026-09-01T12:00:00Z" },
    ],
    [profile("old", "Older"), profile("new", "Newer")]
  );
  assert.deepEqual(projected.map(({ candidate }) => candidate.profile.id), ["new", "old"]);
  assert.deepEqual(projected.map(({ savedAt }) => savedAt), [
    "2026-09-03T12:00:00Z",
    "2026-09-01T12:00:00Z",
  ]);
});

test("result cards, profile detail, and Saved view share one save action", () => {
  const card = readFileSync("src/features/discovery/FounderDiscoveryCard.tsx", "utf8");
  const detail = readFileSync("src/app/(product)/discovery/[profileId]/page.tsx", "utf8");
  const savedPage = readFileSync("src/app/(product)/discovery/saved/page.tsx", "utf8");
  assert.match(card, /FounderDiscoverySaveButton/);
  assert.match(detail, /FounderDiscoverySaveButton/);
  assert.match(savedPage, /FounderDiscoveryCard/);
  assert.match(savedPage, /getOwnSavedDiscoveryCandidates/);
  assert.match(savedPage, /hasFounderDiscoveryAccess/);
});

test("save actions are idempotent and introduce no notification or analytics side effect", () => {
  const data = readFileSync("src/features/discovery/discoverySavesData.ts", "utf8");
  const actions = readFileSync("src/features/discovery/discoverySaveActions.ts", "utf8");
  assert.match(data, /ignoreDuplicates: true/);
  assert.match(data, /\.delete\(\)[\s\S]*owner_user_id[\s\S]*saved_profile_id/);
  assert.doesNotMatch(`${data}\n${actions}`, /sendEmail|resend|trackProduct|notification|dashboardTask/i);
});

test("DE and EN expose neutral Save, Saved, and empty-state copy", () => {
  assert.equal(de.common.saveProfile, "Merken");
  assert.equal(de.common.savedProfile, "Gemerkt");
  assert.equal(en.common.saveProfile, "Save");
  assert.equal(en.common.savedProfile, "Saved");
  assert.equal(de.saved.emptyTitle, "Noch nichts gemerkt");
  assert.equal(en.saved.emptyTitle, "Nothing saved yet");
});

test("migration keeps saves private and provides both account-deletion cascades", () => {
  const migration = readFileSync("../supabase/migrations/20260903120000_create_founder_discovery_saves.sql", "utf8");
  assert.match(migration, /primary key \(owner_user_id, saved_profile_id\)/);
  assert.match(migration, /references public\.profiles\(user_id\) on delete cascade/);
  assert.match(migration, /references public\.founder_discovery_profiles\(id\) on delete cascade/);
  assert.match(migration, /owner_user_id = auth\.uid\(\)/);
  assert.match(migration, /is_current_user_discovery_founder/);
  const tableDefinition = migration.slice(
    migration.indexOf("create table public.founder_discovery_saves"),
    migration.indexOf("create index founder_discovery_saves_owner_created_idx")
  );
  assert.doesNotMatch(tableDefinition, /score|rank|note|label|folder/i);
});
