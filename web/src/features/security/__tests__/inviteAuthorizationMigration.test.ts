import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath = new URL(
  "../../../../../supabase/migrations/20260823120000_harden_auth_invite_authorization.sql",
  import.meta.url
);
const migration = readFileSync(migrationPath, "utf8");
const reportingActions = readFileSync(
  new URL("../../reporting/actions.ts", import.meta.url),
  "utf8"
);

test("founder acceptance is email-bound and keeps accepted ownership immutable", () => {
  assert.match(migration, /auth\.jwt\(\)\s*->>\s*'email'/);
  assert.match(migration, /lower\(btrim\(v_inv\.invitee_email\)\)\s*<>\s*v_user_email/);
  assert.match(
    migration,
    /v_inv\.status\s*=\s*'accepted'[\s\S]*v_inv\.invitee_user_id\s+is\s+distinct\s+from\s+v_uid/
  );
  assert.match(migration, /on conflict \(user_low, user_high\)\s+do nothing/);
  assert.match(
    migration,
    /where id = v_inv\.id[\s\S]*status in \('sent', 'opened'\)[\s\S]*invitee_user_id is null/
  );
});

test("client invitation writes cannot assign acceptance or identity fields", () => {
  assert.match(migration, /trg_invitations_enforce_client_security/);
  assert.match(migration, /new\.invitee_user_id is distinct from old\.invitee_user_id/);
  assert.match(migration, /to_jsonb\(new\)\s*->\s*'relationship_id'/);
  assert.match(migration, /new\.accepted_at is distinct from old\.accepted_at/);
  assert.match(migration, /status in \('sent', 'opened'\)/);
});

test("advisor rows are founder-managed and keep relationship identity immutable", () => {
  assert.match(migration, /block_unbound_legacy_advisor_claim/);
  assert.match(migration, /legacy_advisor_invitation_requires_reinvite/);
  assert.match(migration, /drop policy if exists relationship_advisors_insert_allowed/);
  assert.match(migration, /create policy relationship_advisors_insert_founders/);
  assert.match(migration, /drop policy if exists relationship_advisors_update_allowed/);
  assert.match(migration, /create policy relationship_advisors_update_founders/);
  assert.match(migration, /new\.relationship_id is distinct from old\.relationship_id/);
  assert.match(migration, /new\.advisor_user_id is distinct from old\.advisor_user_id/);
  assert.match(migration, /current_user = 'service_role'/);
  assert.match(migration, /advisor_invitation_email_mismatch/);
  assert.match(migration, /advisor_claim_email_matches/);
  assert.match(migration, /security definer[\s\S]*from auth\.users u/);
  assert.match(
    migration,
    /revoke all on function public\.advisor_claim_email_matches\(uuid, text\)[\s\S]*from public, anon, authenticated, service_role/
  );
});

test("finalization keeps a stable public entry point for participants and service maintenance", () => {
  assert.match(
    migration,
    /rename to finalize_invitation_if_ready_unchecked_20260823/
  );
  assert.match(migration, /if v_uid is null then[\s\S]*raise exception 'not_authenticated'/);
  assert.match(
    migration,
    /v_uid is distinct from v_inv\.inviter_user_id[\s\S]*v_uid is distinct from v_inv\.invitee_user_id/
  );
  assert.match(migration, /raise exception 'forbidden'/);
  assert.match(
    migration,
    /revoke all on function public\.finalize_invitation_if_ready_unchecked_20260823\(uuid, jsonb\)/
  );
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.finalize_invitation_if_ready_unchecked_20260823\(uuid, jsonb\)\s+to service_role/
  );
  assert.match(
    migration,
    /if v_auth_role = 'service_role' then[\s\S]*finalize_invitation_if_ready_unchecked_20260823/
  );
  assert.match(
    migration,
    /grant execute on function public\.finalize_invitation_if_ready\(uuid, jsonb\)\s+to authenticated, service_role/
  );
});

test("application finalization remains compatible before and after the migration", () => {
  assert.match(
    reportingActions,
    /\.rpc\(\s*"finalize_invitation_if_ready"/
  );
  assert.doesNotMatch(reportingActions, /finalize_invitation_if_ready_unchecked_20260823/);
  assert.doesNotMatch(reportingActions, /usePrivilegedFinalize/);
});
