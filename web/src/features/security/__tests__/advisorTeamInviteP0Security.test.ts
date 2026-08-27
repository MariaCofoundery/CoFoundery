import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const migrationUrl = new URL(
  "../../../../../supabase/migrations/20260827120000_harden_advisor_team_invite_tokens.sql",
  import.meta.url
);
const inviteData = readFileSync(
  new URL("../../dashboard/advisorTeamInviteData.ts", import.meta.url),
  "utf8"
);

test("advisor-team finalization cannot reactivate a revoked relationship advisor", () => {
  assert.match(
    inviteData,
    /\.select\("id, status, revoked_at"\)[\s\S]*must never undo a founder revoke/
  );
  assert.match(inviteData, /return "revoked"/);
  assert.match(inviteData, /advisorLinkResult === "linked"/);
});

test("database makes a relationship-advisor revoke terminal", () => {
  assert.equal(existsSync(migrationUrl), true, "P0 hardening migration is missing");
  const migration = readFileSync(migrationUrl, "utf8");
  assert.match(migration, /relationship_advisor_revoked_terminal/);
  assert.match(migration, /old\.status = 'revoked' or old\.revoked_at is not null/);
  assert.match(migration, /new\.status <> 'revoked' or new\.revoked_at is null/);
});

test("advisor-team invite tokens are short-lived, RPC-claimed, and invalidated", () => {
  assert.equal(existsSync(migrationUrl), true, "P0 hardening migration is missing");
  const migration = readFileSync(migrationUrl, "utf8");
  assert.match(migration, /add column if not exists expires_at timestamptz/);
  assert.match(migration, /expires_at = created_at \+ interval '14 days'/);
  assert.match(migration, /create or replace function public\.claim_advisor_team_invite_founder/);
  assert.match(migration, /claim_advisor_team_invite_founder\(\s*p_token_hash text\s*\)\s*returns uuid/);
  assert.match(migration, /v_row\.expires_at <= pg_catalog\.now\(\)/);
  assert.match(migration, /founder_a_token_hash = null/);
  assert.match(migration, /founder_b_token_hash = null/);
  assert.match(inviteData, /\.rpc\(\s*"claim_advisor_team_invite_founder"/);
  assert.match(inviteData, /loadAdvisorTeamInviteById\(claimedInviteId, privileged\)/);
  assert.match(inviteData, /\.gt\("expires_at", new Date\(\)\.toISOString\(\)\)/);
  assert.match(inviteData, /founder_a_token_hash: null/);
  assert.match(inviteData, /founder_b_token_hash: null/);
});
