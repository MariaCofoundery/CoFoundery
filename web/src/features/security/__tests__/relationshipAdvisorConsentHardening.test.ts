import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../../supabase/migrations/20260825130000_harden_relationship_advisor_consent.sql",
    import.meta.url
  ),
  "utf8"
);
const workbookActions = readFileSync(
  new URL("../../reporting/founderAlignmentWorkbookActions.ts", import.meta.url),
  "utf8"
);
const advisorTeamInviteActions = readFileSync(
  new URL("../../dashboard/advisorTeamInviteActions.ts", import.meta.url),
  "utf8"
);
const advisorAccess = readFileSync(
  new URL("../../reporting/relationshipAdvisorAccess.ts", import.meta.url),
  "utf8"
);
const advisorContext = readFileSync(
  new URL("../../reporting/advisorTeamContext.ts", import.meta.url),
  "utf8"
);
const workbookData = readFileSync(
  new URL("../../reporting/founderAlignmentWorkbookData.ts", import.meta.url),
  "utf8"
);
const advisorReportData = readFileSync(
  new URL("../../reporting/advisorReportPageData.ts", import.meta.url),
  "utf8"
);
const advisorTeamInviteData = readFileSync(
  new URL("../../dashboard/advisorTeamInviteData.ts", import.meta.url),
  "utf8"
);
const workbookClient = readFileSync(
  new URL("../../reporting/FounderAlignmentWorkbookClient.tsx", import.meta.url),
  "utf8"
);
const deMessages = JSON.parse(
  readFileSync(new URL("../../../../messages/de/workbook.json", import.meta.url), "utf8")
);
const enMessages = JSON.parse(
  readFileSync(new URL("../../../../messages/en/workbook.json", import.meta.url), "utf8")
);

test("relationship advisor writes are RPC-only and each founder can approve only their own slot", () => {
  assert.match(migration, /revoke insert, update, delete on table public\.relationship_advisors from authenticated/);
  assert.match(migration, /create or replace function public\.propose_relationship_advisor/);
  assert.match(migration, /create or replace function public\.approve_relationship_advisor/);
  assert.match(migration, /v_is_founder_a := v_uid = v_invitation\.inviter_user_id/);
  assert.match(migration, /founder_a_approved = case when v_is_founder_a then true else founder_a_approved end/);
  assert.match(migration, /founder_b_approved = case when not v_is_founder_a then true else founder_b_approved end/);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/);
  assert.doesNotMatch(workbookActions, /\.from\("relationship_advisors"\)\s*\.insert/);
});

test("invite issue and general revoke own all server-managed relationship advisor fields", () => {
  assert.match(migration, /create or replace function public\.issue_relationship_advisor_invite/);
  assert.match(migration, /invite_token_hash = p_invite_token_hash/);
  assert.match(migration, /invite_expires_at = pg_catalog\.now\(\) \+ interval '14 days'/);
  assert.match(migration, /create or replace function public\.revoke_relationship_advisor/);
  assert.match(migration, /status = 'revoked'/);
  assert.match(migration, /invite_token_hash = null/);
  assert.match(workbookActions, /\.rpc\("issue_relationship_advisor_invite"/);
  assert.match(workbookActions, /\.rpc\("revoke_relationship_advisor"/);
});

test("revoked advisors fail the shared report and workbook authorization predicate", () => {
  assert.match(advisorAccess, /\.eq\("founder_a_approved", true\)/);
  assert.match(advisorAccess, /\.eq\("founder_b_approved", true\)/);
  assert.match(advisorAccess, /\.is\("revoked_at", null\)/);
  assert.match(advisorAccess, /\.in\("status", \["approved", "invited", "linked"\]\)/);
  assert.doesNotMatch(advisorAccess, /\.in\("status", \[[^\]]*"revoked"/);
  assert.match(advisorAccess, /An explicit founder revoke always wins over historical compatibility sync/);
  assert.match(advisorContext, /hasRelationshipAdvisorRecord/);
  assert.match(workbookData, /canUseLegacyAdvisorFallback[\s\S]*hasRelationshipAdvisorRecord !== true/);
  assert.match(workbookActions, /!advisorRelationshipContext\.hasRelationshipAdvisorRecord/);
  assert.match(advisorReportData, /!hasAccess && !relationshipResolution\.hasRelationshipAdvisorRecord/);
  assert.match(advisorTeamInviteData, /must never undo a founder revoke/);
});

test("advisor-owned team invites use narrow create and pending-revoke RPCs", () => {
  assert.match(migration, /revoke insert, update, delete on table public\.advisor_team_invites from authenticated/);
  assert.match(migration, /create or replace function public\.create_advisor_team_invite/);
  assert.match(migration, /create or replace function public\.revoke_pending_advisor_team_invite/);
  assert.match(advisorTeamInviteActions, /\.rpc\(\s*"create_advisor_team_invite_reliable"/);
  assert.match(advisorTeamInviteActions, /\.rpc\("revoke_pending_advisor_team_invite"/);
  assert.doesNotMatch(advisorTeamInviteActions, /\.from\("advisor_team_invites"\)\s*\.update/);
  assert.doesNotMatch(advisorTeamInviteActions, /\.from\("advisor_team_invites"\)\s*\.insert/);
});

test("founders receive a minimal bilingual revoke control with confirmation", () => {
  assert.match(workbookClient, /window\.confirm\(wt\("advisor\.revokeConfirm"\)\)/);
  assert.match(workbookClient, /revokeFounderAlignmentAdvisorAccess/);
  assert.equal(deMessages.advisor.revokeAccess, "Advisor-Zugriff widerrufen");
  assert.equal(enMessages.advisor.revokeAccess, "Revoke advisor access");
  assert.match(deMessages.advisor.revokeDescription, /Founder Setup/);
  assert.match(enMessages.advisor.revokeDescription, /Founder Setup/);
});
