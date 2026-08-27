import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

test("advisor team invite delivery and resend remain narrow server-side contracts", () => {
  const migration = read("../supabase/migrations/20260828120000_advisor_invitation_ux_reliability.sql");
  const actions = read("src/features/dashboard/advisorTeamInviteActions.ts");
  assert.match(migration, /founder_a_send_status[\s\S]*founder_b_send_status/);
  assert.match(migration, /record_advisor_team_invite_delivery/);
  assert.match(migration, /rotate_advisor_team_invite_founder_token/);
  assert.match(migration, /create_advisor_team_invite_reliable/);
  assert.match(migration, /expires_at > pg_catalog\.now\(\)/);
  assert.match(migration, /founder_a_user_id is null/);
  assert.match(migration, /founder_b_user_id is null/);
  assert.doesNotMatch(actions, /\.from\("advisor_team_invites"\)\s*\.update/);
  assert.match(actions, /p_error_code: params\.status === "failed" \? "delivery_failed" : null/);
});

test("advisor invite UX exposes pairwise copy and current founder tasks", () => {
  const advisorDe = read("messages/de/advisor.json");
  const advisorEn = read("messages/en/advisor.json");
  const teamPage = read("src/app/(product)/teams/[teamId]/page.tsx");
  const founderPanel = read("src/features/teams/FounderRelationshipAdvisorPanel.tsx");
  const workbook = read("src/features/reporting/FounderAlignmentWorkbookClient.tsx");
  assert.match(advisorDe, /Zwei Founder einladen/);
  assert.match(advisorEn, /Invite two founders/);
  assert.match(founderPanel, /proposeRelationshipAdvisorFromTeamAction/);
  assert.match(founderPanel, /approveRelationshipAdvisorFromTeamAction/);
  assert.match(founderPanel, /sendRelationshipAdvisorInviteFromTeamAction/);
  assert.match(founderPanel, /revokeRelationshipAdvisorFromTeamAction/);
  assert.match(teamPage, /pendingSetupAdvisorTask/);
  assert.match(teamPage, /advisor-setup-access/);
  assert.match(workbook, /advisor\.manageInConnection/);
  assert.match(workbook, /isAdvisorSectionExpanded && !deepDiveHandoffState\?\.teamId/);
});
