import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const accountSource = readFileSync(
  path.join(root, "src/features/account/deleteFounderAccount.ts"),
  "utf8"
);
const actionSource = readFileSync(
  path.join(root, "src/features/account/actions.ts"),
  "utf8"
);
const migration = readFileSync(
  path.join(
    root,
    "../supabase/migrations/20260830180000_harden_account_deletion_current_modules.sql"
  ),
  "utf8"
);

test("account deletion removes only the founder avatar prefix before the atomic RPC", () => {
  assert.match(accountSource, /deleteOwnedImageObjects\(privileged, "avatars", userId\)/u);
  assert.match(accountSource, /deleteOwnedImageObjects\(privileged, "network-profile-images", userId\)/u);
  assert.match(accountSource, /\.map\(\(object\) => `\$\{userId\}\/\$\{object\.name\}`\)/u);
  assert.match(accountSource, /networkPhotoCleanup[\s\S]*delete_founder_account_data/u);
  assert.doesNotMatch(accountSource, /console\.error\([^\n]*userId/u);
});

test("the action reports success only after the cleanup contract succeeds", () => {
  assert.match(actionSource, /const deleteResult = await deleteFounderAccount\(user\.id\)/u);
  assert.match(actionSource, /if \(!deleteResult\.ok\)[\s\S]*return \{ ok: false/u);
  assert.match(actionSource, /if \(!deleteResult\.ok\)[\s\S]*redirect\("\/\?status=account_deleted"\)/u);
});

test("newer shared snapshots survive without false authorship and authored free text cascades", () => {
  assert.match(migration, /updated_by_user_id[\s\S]*on delete set null/u);
  assert.match(migration, /proposed_by_user_id[\s\S]*on delete set null/u);
  assert.match(migration, /founder_team_setup_discussion_entries[\s\S]*on delete cascade/u);
  assert.match(migration, /commitment_lab_discussion_entries[\s\S]*on delete cascade/u);
  assert.match(migration, /created_by_user_id[\s\S]*on delete set null/u);
  assert.match(migration, /delete from public\.event_participants/u);
  assert.match(migration, /delete from public\.advisor_team_invites/u);
  assert.match(migration, /delete from public\.relationship_advisors/u);
  assert.match(
    migration,
    /delete from public\.founder_teams team[\s\S]*not exists \([\s\S]*from public\.founder_team_members/u
  );
});
