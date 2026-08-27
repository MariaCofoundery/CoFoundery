import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFounderTeamDashboardSummaries,
  buildFounderTeamHomebaseReadModel,
  type FounderTeamHomebaseRows,
} from "@/features/teams/founderTeamHomebaseModel";

const teamId = "team-1";
const aliceId = "alice";
const bobId = "bob";
const caraId = "cara";

function emptyRows(overrides: Partial<FounderTeamHomebaseRows> = {}): FounderTeamHomebaseRows {
  return {
    team: {
      id: teamId,
      name: null,
      team_context: "pre_founder",
      created_at: "2026-08-01T10:00:00.000Z",
    },
    members: [
      { team_id: teamId, user_id: aliceId, created_at: "2026-08-01T10:00:00.000Z" },
      { team_id: teamId, user_id: bobId, created_at: "2026-08-01T10:01:00.000Z" },
    ],
    relationships: [],
    classicReports: [],
    workbooks: [],
    matchingWorkspaces: [],
    matchingReports: [],
    matchingWorkspaceAgreements: [],
    advisors: [],
    profileNames: [
      {
        user_id: aliceId,
        display_name: "Alice",
        avatar_id: "avatar-1",
        avatar_url: null,
      },
      {
        user_id: bobId,
        display_name: "Bob",
        avatar_id: null,
        avatar_url: "avatars/bob/profile.webp",
      },
    ],
    discoveryNames: [{ user_id: bobId, display_name: "Bob" }],
    ...overrides,
  };
}

test("homebase requires an existing team and current-user membership", () => {
  assert.equal(
    buildFounderTeamHomebaseReadModel({
      currentUserId: aliceId,
      teamId,
      rows: emptyRows({ team: null }),
    }),
    null
  );
  assert.equal(
    buildFounderTeamHomebaseReadModel({
      currentUserId: "stranger",
      teamId,
      rows: emptyRows(),
    }),
    null
  );
});

test("two-founder team without artifacts remains a valid quiet homebase", () => {
  const homebase = buildFounderTeamHomebaseReadModel({
    currentUserId: aliceId,
    teamId,
    rows: emptyRows(),
  });

  assert.ok(homebase);
  assert.equal(homebase.members.length, 2);
  assert.deepEqual(
    homebase.members.map((member) => member.displayName),
    ["Alice", "Bob"]
  );
  assert.deepEqual(
    homebase.members.map(({ avatarId, avatarUrl }) => ({ avatarId, avatarUrl })),
    [
      { avatarId: "avatar-1", avatarUrl: null },
      { avatarId: null, avatarUrl: "avatars/bob/profile.webp" },
    ]
  );
  assert.deepEqual(homebase.alignment, []);
  assert.deepEqual(homebase.agreements, []);
  assert.deepEqual(homebase.advisors, []);
});

test("an unapproved workbook draft is not presented as a shared agreement", () => {
  const homebase = buildFounderTeamHomebaseReadModel({
    currentUserId: aliceId,
    teamId,
    rows: emptyRows({
      relationships: [
        {
          id: "rel-ab",
          user_a_id: aliceId,
          user_b_id: bobId,
          founder_team_id: teamId,
          created_at: "2026-08-02T10:00:00.000Z",
        },
      ],
      classicReports: [
        {
          id: "report-ab",
          relationship_id: "rel-ab",
          invitation_id: "invite-ab",
          created_at: "2026-08-03T10:00:00.000Z",
          payload: {},
        },
      ],
      workbooks: [
        {
          invitation_id: "invite-ab",
          updated_at: "2026-08-04T10:00:00.000Z",
          payload: {
            steps: {
              vision_direction: {
                agreement: "Draft only",
                founderAApproved: true,
                founderBApproved: false,
              },
            },
          },
        },
      ],
    }),
  });

  assert.ok(homebase);
  assert.equal(homebase.alignment[0]?.workbook?.exists, true);
  assert.deepEqual(homebase.agreements, []);
});

test("three-founder homebase aggregates only authorized pair artifacts without a team score", () => {
  const rows = emptyRows({
    team: {
      id: teamId,
      name: "North Star",
      team_context: "existing_team",
      created_at: "2026-08-01T10:00:00.000Z",
    },
    members: [
      { team_id: teamId, user_id: aliceId, created_at: "2026-08-01T10:00:00.000Z" },
      { team_id: teamId, user_id: bobId, created_at: "2026-08-01T10:01:00.000Z" },
      { team_id: teamId, user_id: caraId, created_at: "2026-08-01T10:02:00.000Z" },
    ],
    relationships: [
      {
        id: "rel-ab",
        user_a_id: aliceId,
        user_b_id: bobId,
        founder_team_id: teamId,
        created_at: "2026-08-02T10:00:00.000Z",
      },
      {
        id: "rel-ac",
        user_a_id: aliceId,
        user_b_id: caraId,
        founder_team_id: teamId,
        created_at: "2026-08-03T10:00:00.000Z",
      },
      {
        id: "rel-bc",
        user_a_id: bobId,
        user_b_id: caraId,
        founder_team_id: teamId,
        created_at: "2026-08-04T10:00:00.000Z",
      },
      {
        id: "rel-foreign",
        user_a_id: aliceId,
        user_b_id: "outsider",
        founder_team_id: "other-team",
        created_at: "2026-08-05T10:00:00.000Z",
      },
    ],
    classicReports: [
      {
        id: "report-ab",
        relationship_id: "rel-ab",
        invitation_id: "invite-ab",
        created_at: "2026-08-06T10:00:00.000Z",
        payload: {
          report: {
            participantAId: aliceId,
            participantAName: "Alice",
            participantBId: bobId,
            participantBName: "Bob",
          },
        },
      },
      {
        id: "report-foreign",
        relationship_id: "rel-foreign",
        invitation_id: "invite-foreign",
        created_at: "2026-08-06T10:00:00.000Z",
        payload: {},
      },
    ],
    workbooks: [
      {
        invitation_id: "invite-ab",
        updated_at: "2026-08-07T10:00:00.000Z",
        payload: {
          steps: {
            vision_direction: {
              agreement: "We review this monthly.",
              founderAApproved: true,
              founderBApproved: true,
            },
          },
        },
      },
    ],
    matchingWorkspaces: [
      {
        id: "workspace-ac",
        matching_session_id: "session-ac",
        relationship_id: "rel-ac",
        created_at: "2026-08-08T10:00:00.000Z",
        updated_at: "2026-08-09T10:00:00.000Z",
      },
    ],
    matchingReports: [
      {
        matching_session_id: "session-ac",
        created_at: "2026-08-08T10:00:00.000Z",
        payload: {
          report: {
            participantAId: aliceId,
            participantAName: "Alice",
            participantBId: caraId,
            participantBName: "Cara",
          },
        },
      },
    ],
    matchingWorkspaceAgreements: [
      {
        matching_workspace_id: "workspace-ac",
        relationship_id: "rel-ac",
        updated_at: "2026-08-10T10:00:00.000Z",
        sections: { roles: { agreement: "Alice leads product.", notes: "", updatedAt: null } },
      },
    ],
    advisors: [
      { id: "advisor-ac", relationship_id: "rel-ac", status: "linked" },
      { id: "advisor-revoked", relationship_id: "rel-ab", status: "revoked" },
      { id: "advisor-foreign", relationship_id: "rel-foreign", status: "linked" },
    ],
    discoveryNames: [
      { user_id: bobId, display_name: "Bob" },
      { user_id: caraId, display_name: "Cara" },
    ],
  });

  const homebase = buildFounderTeamHomebaseReadModel({
    currentUserId: aliceId,
    teamId,
    rows,
  });

  assert.ok(homebase);
  assert.equal(homebase.name, "North Star");
  assert.equal(homebase.teamContext, "existing_team");
  assert.equal(homebase.members.length, 3);
  assert.deepEqual(
    homebase.alignment.map((entry) => entry.relationshipId),
    ["rel-ab", "rel-ac"]
  );
  assert.equal(homebase.alignment[0]?.workbook?.exists, true);
  assert.equal(homebase.alignment[1]?.matchingWorkspace?.href, "/workspaces/workspace-ac");
  assert.equal(
    homebase.alignment[1]?.matchingReport?.href,
    "/matching/session-ac/report"
  );
  assert.deepEqual(
    homebase.agreements.map((agreement) => agreement.source).sort(),
    ["matching_workspace", "workbook"]
  );
  assert.deepEqual(homebase.advisors.map((advisor) => advisor.id), ["advisor-ac", "advisor-revoked"]);
  assert.equal(homebase.advisors[1]?.status, "revoked");
  assert.equal("score" in homebase, false);
});

test("dashboard summaries include own teams only and keep three members", () => {
  const summaries = buildFounderTeamDashboardSummaries({
    currentUserId: aliceId,
    teams: [
      {
        id: teamId,
        name: null,
        team_context: "pre_founder",
        created_at: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "foreign-team",
        name: "Hidden",
        team_context: "existing_team",
        created_at: "2026-08-01T10:00:00.000Z",
      },
    ],
    members: [
      { team_id: teamId, user_id: aliceId, created_at: "2026-08-01T10:00:00.000Z" },
      { team_id: teamId, user_id: bobId, created_at: "2026-08-01T10:01:00.000Z" },
      { team_id: teamId, user_id: caraId, created_at: "2026-08-01T10:02:00.000Z" },
      {
        team_id: "foreign-team",
        user_id: "stranger",
        created_at: "2026-08-01T10:00:00.000Z",
      },
    ],
    profileNames: [
      {
        user_id: aliceId,
        display_name: "Alice",
        avatar_id: "avatar-1",
        avatar_url: null,
      },
      {
        user_id: bobId,
        display_name: "Bob",
        avatar_id: null,
        avatar_url: "avatars/bob/profile.webp",
      },
      { user_id: caraId, display_name: "Cara", avatar_id: null, avatar_url: null },
    ],
    discoveryNames: [
      { user_id: bobId, display_name: "Bob" },
      { user_id: caraId, display_name: "Cara" },
    ],
  });

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.id, teamId);
  assert.equal(summaries[0]?.members.length, 3);
  assert.equal(summaries[0]?.members[0]?.avatarId, "avatar-1");
  assert.equal(summaries[0]?.members[1]?.avatarUrl, "avatars/bob/profile.webp");
  assert.equal(summaries[0]?.members[2]?.avatarUrl, null);
});

test("team member presentation loading uses only the narrow membership-checked projection", () => {
  const data = readFileSync("src/features/teams/founderTeamHomebaseData.ts", "utf8");
  assert.match(data, /get_founder_team_member_presentations/);
  assert.match(data, /p_team_id: teamId/);
  assert.match(data, /user_id, display_name, avatar_id, avatar_url/);
  assert.doesNotMatch(data, /createPrivilegedClient|service_role/);
  assert.doesNotMatch(data, /select\([^)]*(?:email|focus_skill|intention)/);
});

test("homebase and dashboard system copy stay structurally parallel in DE and EN", () => {
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8")) as Record<string, unknown>;
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8")) as Record<string, unknown>;
  assert.deepEqual(Object.keys(de), Object.keys(en));
  assert.deepEqual(
    Object.keys(de.homebase as Record<string, unknown>),
    Object.keys(en.homebase as Record<string, unknown>)
  );

  const deText = JSON.stringify(de);
  const enText = JSON.stringify(en);
  assert.match(deText, /Unsere Zusammenarbeit/);
  assert.match(enText, /Our collaboration/);
  assert.doesNotMatch(enText, /Unsere|Zusammenarbeit|Vereinbarungen|Öffnen/);

  const page = readFileSync("src/app/(product)/teams/[teamId]/page.tsx", "utf8");
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  const dashboardConnections = readFileSync(
    "src/features/dashboard/founderDashboardConnections.ts",
    "utf8"
  );
  const dashboardCards = readFileSync(
    "src/features/dashboard/DashboardConnectionCards.tsx",
    "utf8"
  );
  assert.match(page, /getFounderTeamHomebase\(teamId, user\.id, supabase\)/);
  assert.match(page, /if \(!team\) notFound\(\)/);
  assert.match(page, /aria-labelledby="team-founders-title"/);
  assert.doesNotMatch(page, /alignmentPercent|compatibilityScore|teamHealth/);
  assert.match(dashboard, /getFounderTeamDashboardSummaries\(user\.id, supabase\)/);
  assert.match(dashboard, /getFounderDashboardConnectionsV2/);
  assert.match(dashboardConnections, /`\/teams\/\$\{encodeURIComponent\(team\.id\)\}`/);
  assert.match(dashboardCards, /href=\{team\.href\}/);
});
