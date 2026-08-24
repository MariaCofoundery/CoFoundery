import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFounderConnectionsReadModel,
  type FounderConnectionInvitationRow,
} from "@/features/connections/founderConnectionsModel";
import type { DiscoveryIntroRequestWithProfile } from "@/features/discovery/discoveryIntroTypes";
import type { FounderTeamDashboardSummary } from "@/features/teams/founderTeamHomebaseModel";
import { isProductChromePath } from "@/features/navigation/productChromePath";

const currentUserId = "00000000-0000-0000-0000-000000000001";
const teammateId = "00000000-0000-0000-0000-000000000002";
const thirdFounderId = "00000000-0000-0000-0000-000000000003";
const potentialFounderId = "00000000-0000-0000-0000-000000000004";
const strangerId = "00000000-0000-0000-0000-000000000005";

function team(memberIds = [currentUserId, teammateId]): FounderTeamDashboardSummary {
  return {
    id: "10000000-0000-0000-0000-000000000001",
    name: null,
    teamContext: memberIds.length === 3 ? "existing_team" : "pre_founder",
    members: memberIds.map((userId, index) => ({
      userId,
      displayName: ["Alex", "Sam", "Jo"][index] ?? null,
      avatarId: index === 0 ? "avatar-1" : null,
      avatarUrl: index === 1 ? "avatars/sam/profile.webp" : null,
      createdAt: `2026-08-2${index}T10:00:00.000Z`,
    })),
  };
}

function intro(overrides: Partial<DiscoveryIntroRequestWithProfile> = {}): DiscoveryIntroRequestWithProfile {
  return {
    id: "20000000-0000-0000-0000-000000000001",
    requesterUserId: currentUserId,
    recipientUserId: potentialFounderId,
    status: "pending",
    message: null,
    responseMessage: null,
    createdAt: "2026-08-23T10:00:00.000Z",
    updatedAt: "2026-08-23T10:00:00.000Z",
    respondedAt: null,
    canceledAt: null,
    profile: null,
    ...overrides,
  };
}

function invitation(
  overrides: Partial<FounderConnectionInvitationRow> = {}
): FounderConnectionInvitationRow {
  return {
    id: "30000000-0000-0000-0000-000000000001",
    direction: "sent",
    inviterUserId: currentUserId,
    inviteeUserId: potentialFounderId,
    teamContext: "pre_founder",
    status: "opened",
    label: "Taylor",
    counterpartName: "Taylor",
    createdAt: "2026-08-24T10:00:00.000Z",
    expiresAt: "2026-09-07T10:00:00.000Z",
    ...overrides,
  };
}

test("connections only expose the current founder's teams and active potential connections", () => {
  const ownTeam = team([currentUserId, teammateId, thirdFounderId]);
  const foreignTeam = team([strangerId, potentialFounderId]);
  const model = buildFounderConnectionsReadModel({
    currentUserId,
    teams: [ownTeam, foreignTeam],
    receivedIntros: [
      intro({
        id: "incoming",
        requesterUserId: potentialFounderId,
        recipientUserId: currentUserId,
      }),
      intro({ id: "foreign", requesterUserId: potentialFounderId, recipientUserId: strangerId }),
      intro({ id: "declined", status: "declined" }),
    ],
    sentIntros: [intro({ id: "outgoing" })],
    invitations: [
      invitation({ status: "accepted" }),
      invitation({ id: "revoked", status: "revoked" }),
      invitation({
        id: "foreign-invite",
        inviterUserId: strangerId,
        inviteeUserId: potentialFounderId,
        direction: "incoming",
      }),
    ],
    now: new Date("2026-08-24T12:00:00.000Z"),
  });

  assert.deepEqual(model.teams.map((entry) => entry.id), [ownTeam.id]);
  assert.deepEqual(
    model.potentialConnections.map((entry) => entry.id),
    ["30000000-0000-0000-0000-000000000001"]
  );
  assert.equal(model.potentialConnections[0]?.state, "alignment_in_progress");
});

test("an exact team membership prevents duplicate established connections", () => {
  const model = buildFounderConnectionsReadModel({
    currentUserId,
    teams: [team()],
    receivedIntros: [],
    sentIntros: [intro({ recipientUserId: teammateId })],
    invitations: [invitation({ inviteeUserId: teammateId })],
  });

  assert.equal(model.teams.length, 1);
  assert.equal(model.potentialConnections.length, 0);
});

test("connections keep legacy invitation and discovery resume routes without merging unknown identities", () => {
  const model = buildFounderConnectionsReadModel({
    currentUserId,
    teams: [],
    receivedIntros: [
      intro({
        id: "accepted-intro",
        requesterUserId: strangerId,
        recipientUserId: currentUserId,
        status: "accepted",
      }),
    ],
    sentIntros: [],
    invitations: [
      invitation({
        id: "email-bound-invite",
        direction: "incoming",
        inviterUserId: potentialFounderId,
        inviteeUserId: null,
      }),
    ],
  });

  assert.equal(model.potentialConnections.length, 2);
  assert.ok(
    model.potentialConnections.some(
      (entry) => entry.href === "/invite/email-bound-invite/resume"
    )
  );
  assert.ok(
    model.potentialConnections.some(
      (entry) => entry.href === "/discovery/intros/accepted-intro/matching"
    )
  );
});

test("global and contextual navigation use the new DE/EN information architecture", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  const teamNavigation = readFileSync("src/features/teams/FounderTeamNavigation.tsx", "utf8");
  const homebase = readFileSync("src/app/(product)/teams/[teamId]/page.tsx", "utf8");
  const deNavigation = JSON.parse(readFileSync("messages/de/navigation.json", "utf8"));
  const enNavigation = JSON.parse(readFileSync("messages/en/navigation.json", "utf8"));
  const deTeams = JSON.parse(readFileSync("messages/de/teams.json", "utf8"));
  const enTeams = JSON.parse(readFileSync("messages/en/teams.json", "utf8"));

  assert.equal(deNavigation.connections, "Verbindungen");
  assert.equal(enNavigation.connections, "Connections");
  assert.equal(deNavigation.discovery, "Co-Founder finden");
  assert.match(shell, /href="\/connections"/);
  assert.doesNotMatch(shell, /<NavigationContextMenu/);
  assert.equal(isProductChromePath("/connections"), true);

  for (const key of ["overview", "setup", "alignment"] as const) {
    assert.equal(typeof deTeams.teamNavigation[key], "string");
    assert.equal(typeof enTeams.teamNavigation[key], "string");
  }
  assert.doesNotMatch(teamNavigation, /Gespräche|Check-ins|Conversations/);
  assert.match(teamNavigation, /#team-alignment/);
  assert.match(homebase, /id="team-alignment"/);
});

test("connections page names pre-founder and existing-team contexts without exposing emails", () => {
  const page = readFileSync("src/app/(product)/connections/page.tsx", "utf8");
  const data = readFileSync("src/features/connections/founderConnectionsData.ts", "utf8");
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8"));

  assert.equal(de.connections.contexts.preFounder, "Gemeinsame Gründung prüfen");
  assert.equal(de.connections.contexts.existingTeam, "Bestehendes Founder-Team");
  assert.equal(en.connections.contexts.existingTeam, "Existing founder team");
  assert.match(page, /getFounderConnections\(user\.id, user\.email, supabase\)/);
  assert.match(page, /avatarId=\{team\.members\[index\]\?\.avatarId\}/);
  assert.match(page, /imageUrl=\{team\.members\[index\]\?\.avatarUrl\}/);
  assert.equal(de.connections.avatarAlt, "Profil von {name}");
  assert.equal(en.connections.avatarAlt, "Profile for {name}");
  assert.doesNotMatch(page, /inviteeEmail|inviterEmail|connection\.email|team\.email/);
  assert.doesNotMatch(data, /createPrivilegedClient|service_role/);
});
