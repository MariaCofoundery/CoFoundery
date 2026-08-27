import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFounderDashboardConnections,
  type FounderDashboardArtifactSignals,
} from "@/features/dashboard/founderDashboardConnections";
import type { InvitationDashboardRow } from "@/features/reporting/actions";
import type { FounderTeamDashboardSummary } from "@/features/teams/founderTeamHomebaseModel";

const alice = "alice";
const bob = "bob";
const cara = "cara";
const teamId = "team-abc";

function team(overrides: Partial<FounderTeamDashboardSummary> = {}): FounderTeamDashboardSummary {
  return {
    id: teamId,
    name: "North Star",
    teamContext: "existing_team",
    members: [alice, bob, cara].map((userId, index) => ({
      userId,
      displayName: ["Alice", "Bob", "Cara"][index] ?? null,
      avatarId: index === 0 ? "avatar-alice" : null,
      avatarUrl: null,
      createdAt: `2026-08-0${index + 1}T10:00:00.000Z`,
    })),
    ...overrides,
  };
}

function signals(
  overrides: Partial<FounderDashboardArtifactSignals> = {}
): FounderDashboardArtifactSignals {
  return {
    relationships: [],
    reports: [],
    commitmentLabs: [],
    relationshipAdvisors: [],
    setupItems: [],
    counterpartNames: new Map(),
    ...overrides,
  };
}

function invitation(overrides: Partial<InvitationDashboardRow> = {}): InvitationDashboardRow {
  return {
    id: "invite-ab",
    direction: "incoming",
    inviterUserId: bob,
    inviteeUserId: alice,
    inviteeEmail: "alice@example.com",
    teamContext: "pre_founder",
    status: "sent",
    label: null,
    inviterDisplayName: "Bob",
    inviterEmail: "bob@example.com",
    requiredModules: ["base"],
    isReportReady: false,
    isReadyForMatching: false,
    inviterBaseStarted: false,
    inviterBaseSubmitted: false,
    inviterValuesSubmitted: false,
    inviteeBaseStarted: false,
    inviteeBaseSubmitted: false,
    inviteeValuesSubmitted: false,
    createdAt: "2026-08-20T10:00:00.000Z",
    expiresAt: "2026-09-03T10:00:00.000Z",
    ...overrides,
  };
}

test("own three-founder team keeps only the current founder's pairwise contexts", () => {
  const overview = buildFounderDashboardConnections({
    currentUserId: alice,
    teams: [team(), team({ id: "foreign", members: [{ ...team().members[1]!, userId: "stranger" }] })],
    invitations: [],
    signals: signals({
      relationships: [
        { id: "rel-ab", userAId: alice, userBId: bob, teamId, createdAt: "2026-08-03" },
        { id: "rel-ac", userAId: alice, userBId: cara, teamId, createdAt: "2026-08-04" },
        { id: "rel-bc", userAId: bob, userBId: cara, teamId, createdAt: "2026-08-05" },
      ],
      reports: [
        { relationshipId: "rel-ab", invitationId: "invite-ab", createdAt: "2026-08-06" },
        { relationshipId: "rel-bc", invitationId: "invite-bc", createdAt: "2026-08-07" },
      ],
      commitmentLabs: [
        { relationshipId: "rel-ac", updatedAt: "2026-08-08" },
        { relationshipId: "rel-bc", updatedAt: "2026-08-09" },
      ],
      relationshipAdvisors: [
        { relationshipId: "rel-ab", status: "linked" },
        { relationshipId: "rel-bc", status: "linked" },
      ],
      setupItems: [
        { teamId, workStatus: "open", currentConfirmedRevisionId: "revision-1" },
        { teamId, workStatus: "open", currentConfirmedRevisionId: "revision-2" },
      ],
    }),
  });

  assert.equal(overview.teams.length, 1);
  assert.deepEqual(overview.teams[0]?.relationshipIds, ["rel-ab", "rel-ac"]);
  assert.deepEqual(overview.teams[0]?.statuses, [
    { type: "setup_confirmed", count: 2 },
    { type: "alignment_report", relationshipId: "rel-ab", personLabel: "Bob" },
    { type: "commitment_lab", relationshipId: "rel-ac", personLabel: "Cara" },
  ]);
  assert.equal(JSON.stringify(overview).includes("rel-bc"), false);
  assert.equal("score" in overview.teams[0]!, false);
});

test("Founder Setup remains factual without a denominator or manufactured progress", () => {
  const empty = buildFounderDashboardConnections({
    currentUserId: alice,
    teams: [team({ members: team().members.slice(0, 2) })],
    invitations: [],
    signals: signals(),
  });
  assert.deepEqual(empty.teams[0]?.statuses, []);

  const discussing = buildFounderDashboardConnections({
    currentUserId: alice,
    teams: [team({ members: team().members.slice(0, 2) })],
    invitations: [],
    signals: signals({
      setupItems: [{ teamId, workStatus: "discussing", currentConfirmedRevisionId: null }],
    }),
  });
  assert.deepEqual(discussing.teams[0]?.statuses, [{ type: "setup_in_progress" }]);
  assert.doesNotMatch(JSON.stringify(discussing), /(?:\d+\s*\/\s*18)|percent|readiness/i);
});

test("report, Commitment Lab and Advisor states are relationship-bound and neutral", () => {
  const overview = buildFounderDashboardConnections({
    currentUserId: alice,
    teams: [team({ members: team().members.slice(0, 2) })],
    invitations: [],
    signals: signals({
      relationships: [{ id: "rel-ab", userAId: alice, userBId: bob, teamId, createdAt: "2026-08-03" }],
      reports: [{ relationshipId: "rel-ab", invitationId: "invite-ab", createdAt: "2026-08-04" }],
      commitmentLabs: [{ relationshipId: "rel-ab", updatedAt: "2026-08-05" }],
      relationshipAdvisors: [
        { relationshipId: "rel-ab", status: "linked" },
        { relationshipId: "rel-ab", status: "revoked" },
        { relationshipId: "rel-ab", status: "pending" },
      ],
    }),
  });
  assert.deepEqual(overview.teams[0]?.statuses.map((status) => status.type), [
    "alignment_report",
    "commitment_lab",
    "relationship_advisor",
  ]);
  assert.equal(overview.teams[0]?.statuses.length, 3);

  const pendingOnly = buildFounderDashboardConnections({
    currentUserId: alice,
    teams: [team({ members: team().members.slice(0, 2) })],
    invitations: [],
    signals: signals({
      relationships: [{ id: "rel-ab", userAId: alice, userBId: bob, teamId, createdAt: "2026-08-03" }],
      relationshipAdvisors: [
        { relationshipId: "rel-ab", status: "pending" },
        { relationshipId: "rel-ab", status: "revoked" },
      ],
    }),
  });
  assert.deepEqual(pendingOnly.teams[0]?.statuses, []);
});

test("a potential connection stays separate from an established team", () => {
  const overview = buildFounderDashboardConnections({
    currentUserId: alice,
    teams: [],
    invitations: [invitation()],
    signals: signals(),
    now: new Date("2026-08-27T10:00:00.000Z"),
  });
  assert.equal(overview.teams.length, 0);
  assert.deepEqual(overview.connections[0], {
    kind: "connection",
    id: "invitation:invite-ab",
    href: "/connections",
    counterpartName: "Bob",
    teamContext: "pre_founder",
    relationshipId: null,
    statuses: [{ type: "connection_pending" }],
  });
});

test("an unteamed relationship exposes only its own existing artifacts", () => {
  const overview = buildFounderDashboardConnections({
    currentUserId: alice,
    teams: [],
    invitations: [invitation({ status: "accepted" })],
    signals: signals({
      relationships: [
        { id: "rel-ab", userAId: alice, userBId: bob, teamId: null, createdAt: "2026-08-03" },
        { id: "rel-bc", userAId: bob, userBId: cara, teamId: null, createdAt: "2026-08-04" },
      ],
      reports: [
        { relationshipId: "rel-ab", invitationId: "invite-ab", createdAt: "2026-08-05" },
        { relationshipId: "rel-bc", invitationId: "invite-bc", createdAt: "2026-08-06" },
      ],
      counterpartNames: new Map([[bob, "Bob"]]),
    }),
  });
  assert.equal(overview.connections.length, 1);
  assert.equal(overview.connections[0]?.relationshipId, "rel-ab");
  assert.deepEqual(overview.connections[0]?.statuses.map((status) => status.type), [
    "alignment_report",
  ]);
  assert.equal(JSON.stringify(overview).includes("rel-bc"), false);
});

test("dashboard V2 projection is batched, RLS-bound, and payload-free", () => {
  const source = readFileSync("src/features/dashboard/founderDashboardConnectionData.ts", "utf8");
  assert.match(source, /relationships/);
  assert.match(source, /report_runs/);
  assert.match(source, /commitment_labs/);
  assert.match(source, /founder_team_setup_items/);
  assert.match(source, /relationship_advisors/);
  assert.doesNotMatch(source, /createPrivilegedClient|service_role/);
  assert.doesNotMatch(source, /payload|working_note|shared_reflection|scenario_answers|assessment_answers/);
  assert.doesNotMatch(source, /founder_alignment_workbooks|openPoints|workspaceV2/);
});

test("cards keep status and action semantics separate and retain legacy entry points", () => {
  const component = readFileSync("src/features/dashboard/DashboardConnectionCards.tsx", "utf8");
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  const legacyWorkbook = readFileSync(
    "src/app/(product)/founder-alignment/workbook/page.tsx",
    "utf8"
  );
  assert.match(component, /team\.href/);
  assert.match(component, /connection\.href/);
  assert.doesNotMatch(component, /action required|Aktion erforderlich|Workbook|Readiness|Compatibility|%/i);
  assert.match(dashboard, /id="dashboard-block-connections"/);
  assert.match(dashboard, /href="\/connections"/);
  assert.match(dashboard, /href="\/invite\/new"/);
  assert.match(dashboard, /readyReports\.map/);
  assert.ok(legacyWorkbook.length > 0);
});

test("DE and EN card copy are parallel, factual, and contain no completion framing", () => {
  const de = JSON.parse(readFileSync("messages/de/dashboard.json", "utf8")) as {
    team: { cards: Record<string, unknown> };
  };
  const en = JSON.parse(readFileSync("messages/en/dashboard.json", "utf8")) as {
    team: { cards: Record<string, unknown> };
  };
  assert.deepEqual(Object.keys(de.team.cards), Object.keys(en.team.cards));
  const copy = JSON.stringify({ de: de.team.cards, en: en.team.cards });
  assert.match(copy, /Bestehendes Founder-Team/);
  assert.match(copy, /Existing founder team/);
  assert.match(copy, /Alignment Report vorhanden/);
  assert.match(copy, /Commitment Lab begonnen/);
  assert.doesNotMatch(copy, /Team Readiness|Compatibility %|von 18|of 18|Team abgeschlossen/);
});
