import type { InvitationDashboardRow } from "@/features/reporting/actions";
import type {
  FounderTeamContext,
  FounderTeamDashboardSummary,
  FounderTeamMemberSummary,
} from "@/features/teams/founderTeamHomebaseModel";

export type FounderDashboardConnectionStatus =
  | { type: "setup_confirmed"; count: number }
  | { type: "setup_in_progress" }
  | { type: "alignment_report"; relationshipId: string; personLabel: string | null }
  | { type: "commitment_lab"; relationshipId: string; personLabel: string | null }
  | { type: "relationship_advisor"; relationshipId: string; personLabel: string | null }
  | { type: "connection_pending" }
  | { type: "alignment_in_progress" };

export type FounderDashboardTeamCard = {
  kind: "team";
  id: string;
  href: string;
  name: string | null;
  teamContext: FounderTeamContext;
  members: FounderTeamMemberSummary[];
  relationshipIds: string[];
  statuses: FounderDashboardConnectionStatus[];
};

export type FounderDashboardConnectionCard = {
  kind: "connection";
  id: string;
  href: string;
  counterpartName: string | null;
  teamContext: FounderTeamContext;
  relationshipId: string | null;
  statuses: FounderDashboardConnectionStatus[];
};

export type FounderDashboardConnections = {
  teams: FounderDashboardTeamCard[];
  connections: FounderDashboardConnectionCard[];
};

export type FounderDashboardRelationshipSignal = {
  id: string;
  userAId: string;
  userBId: string;
  teamId: string | null;
  createdAt: string;
};

export type FounderDashboardArtifactSignals = {
  relationships: FounderDashboardRelationshipSignal[];
  reports: Array<{ relationshipId: string; invitationId: string; createdAt: string }>;
  commitmentLabs: Array<{ relationshipId: string; updatedAt: string }>;
  relationshipAdvisors: Array<{ relationshipId: string; status: string }>;
  setupItems: Array<{
    teamId: string;
    workStatus: string;
    currentConfirmedRevisionId: string | null;
  }>;
  counterpartNames: Map<string, string>;
};

function counterpartId(relationship: FounderDashboardRelationshipSignal, currentUserId: string) {
  return relationship.userAId === currentUserId ? relationship.userBId : relationship.userAId;
}

function matchingInvitation(
  invitations: InvitationDashboardRow[],
  relationship: FounderDashboardRelationshipSignal,
  currentUserId: string
) {
  const otherUserId = counterpartId(relationship, currentUserId);
  return invitations.find((invitation) => {
    const inviteeId = invitation.inviteeUserId;
    return (
      invitation.status === "accepted" &&
      ((invitation.inviterUserId === currentUserId && inviteeId === otherUserId) ||
        (invitation.inviterUserId === otherUserId && inviteeId === currentUserId))
    );
  });
}

function invitationCounterpartName(invitation: InvitationDashboardRow) {
  return invitation.direction === "incoming"
    ? invitation.inviterDisplayName?.trim() || null
    : invitation.label?.trim() || null;
}

function pairStatusCandidates(params: {
  relationship: FounderDashboardRelationshipSignal;
  currentUserId: string;
  personLabel: string | null;
  signals: FounderDashboardArtifactSignals;
}): FounderDashboardConnectionStatus[] {
  const relationshipId = params.relationship.id;
  const statuses: FounderDashboardConnectionStatus[] = [];
  if (params.signals.reports.some((report) => report.relationshipId === relationshipId)) {
    statuses.push({ type: "alignment_report", relationshipId, personLabel: params.personLabel });
  }
  if (params.signals.commitmentLabs.some((lab) => lab.relationshipId === relationshipId)) {
    statuses.push({ type: "commitment_lab", relationshipId, personLabel: params.personLabel });
  }
  if (
    params.signals.relationshipAdvisors.some(
      (advisor) => advisor.relationshipId === relationshipId && advisor.status === "linked"
    )
  ) {
    statuses.push({ type: "relationship_advisor", relationshipId, personLabel: params.personLabel });
  }
  return statuses;
}

const PAIR_STATUS_PRIORITY: Record<
  Extract<FounderDashboardConnectionStatus["type"], "alignment_report" | "commitment_lab" | "relationship_advisor">,
  number
> = {
  alignment_report: 0,
  commitment_lab: 1,
  relationship_advisor: 2,
};

function setupStatus(
  teamId: string,
  setupItems: FounderDashboardArtifactSignals["setupItems"]
): FounderDashboardConnectionStatus | null {
  const teamItems = setupItems.filter((item) => item.teamId === teamId);
  const confirmedCount = teamItems.filter((item) => item.currentConfirmedRevisionId).length;
  if (confirmedCount > 0) return { type: "setup_confirmed", count: confirmedCount };
  return teamItems.some((item) => item.workStatus === "discussing")
    ? { type: "setup_in_progress" }
    : null;
}

function isOpenPotentialInvitation(invitation: InvitationDashboardRow, now: number) {
  if (invitation.status === "expired" || invitation.status === "revoked") return false;
  if (
    invitation.status !== "accepted" &&
    Number.isFinite(Date.parse(invitation.expiresAt)) &&
    Date.parse(invitation.expiresAt) <= now
  ) {
    return false;
  }
  return invitation.status === "sent" || invitation.status === "opened" || invitation.status === "accepted";
}

export function buildFounderDashboardConnections(params: {
  currentUserId: string;
  teams: FounderTeamDashboardSummary[];
  invitations: InvitationDashboardRow[];
  signals: FounderDashboardArtifactSignals;
  now?: Date;
}): FounderDashboardConnections {
  const ownTeams = params.teams.filter((team) =>
    team.members.some((member) => member.userId === params.currentUserId)
  );
  const ownTeamIds = new Set(ownTeams.map((team) => team.id));
  const ownRelationships = params.signals.relationships.filter(
    (relationship) =>
      relationship.userAId === params.currentUserId || relationship.userBId === params.currentUserId
  );
  const teamRelationships = ownRelationships.filter(
    (relationship) => relationship.teamId && ownTeamIds.has(relationship.teamId)
  );

  const teams = ownTeams.map<FounderDashboardTeamCard>((team) => {
    const relationships = teamRelationships.filter((relationship) => relationship.teamId === team.id);
    const teamStatus = setupStatus(team.id, params.signals.setupItems);
    const pairStatuses = relationships.flatMap((relationship) => {
      const otherId = counterpartId(relationship, params.currentUserId);
      const member = team.members.find((candidate) => candidate.userId === otherId);
      return pairStatusCandidates({
        relationship,
        currentUserId: params.currentUserId,
        personLabel: member?.displayName ?? null,
        signals: params.signals,
      });
    }).sort((left, right) => {
      if (
        (left.type !== "alignment_report" && left.type !== "commitment_lab" && left.type !== "relationship_advisor") ||
        (right.type !== "alignment_report" && right.type !== "commitment_lab" && right.type !== "relationship_advisor")
      ) return 0;
      return PAIR_STATUS_PRIORITY[left.type] - PAIR_STATUS_PRIORITY[right.type];
    });
    return {
      kind: "team",
      id: team.id,
      href: `/teams/${encodeURIComponent(team.id)}`,
      name: team.name,
      teamContext: team.teamContext,
      members: team.members,
      relationshipIds: relationships.map((relationship) => relationship.id),
      statuses: [...(teamStatus ? [teamStatus] : []), ...pairStatuses].slice(0, 3),
    };
  });

  const establishedCounterpartIds = new Set(
    ownTeams.flatMap((team) =>
      team.members
        .filter((member) => member.userId !== params.currentUserId)
        .map((member) => member.userId)
    )
  );
  const unteamedRelationships = ownRelationships.filter(
    (relationship) => !relationship.teamId || !ownTeamIds.has(relationship.teamId)
  );
  const establishedConnections = unteamedRelationships.map<FounderDashboardConnectionCard>(
    (relationship) => {
      const otherId = counterpartId(relationship, params.currentUserId);
      const invitation = matchingInvitation(params.invitations, relationship, params.currentUserId);
      const personLabel =
        params.signals.counterpartNames.get(otherId) ??
        (invitation ? invitationCounterpartName(invitation) : null);
      return {
        kind: "connection",
        id: `relationship:${relationship.id}`,
        href: "/connections",
        counterpartName: personLabel,
        teamContext: invitation?.teamContext ?? "pre_founder",
        relationshipId: relationship.id,
        statuses: pairStatusCandidates({
          relationship,
          currentUserId: params.currentUserId,
          personLabel,
          signals: params.signals,
        }).slice(0, 3),
      };
    }
  );

  const relationshipCounterpartIds = new Set(
    ownRelationships.map((relationship) => counterpartId(relationship, params.currentUserId))
  );
  const seenPotentialKeys = new Set<string>();
  const potentialConnections = [...params.invitations]
    .filter((invitation) => isOpenPotentialInvitation(invitation, (params.now ?? new Date()).getTime()))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .flatMap<FounderDashboardConnectionCard>((invitation) => {
      const otherId =
        invitation.direction === "sent" ? invitation.inviteeUserId : invitation.inviterUserId;
      if (otherId && (establishedCounterpartIds.has(otherId) || relationshipCounterpartIds.has(otherId))) {
        return [];
      }
      const key = otherId ?? `invitation:${invitation.id}`;
      if (seenPotentialKeys.has(key)) return [];
      seenPotentialKeys.add(key);
      return [{
        kind: "connection",
        id: `invitation:${invitation.id}`,
        href: "/connections",
        counterpartName: invitationCounterpartName(invitation),
        teamContext: invitation.teamContext,
        relationshipId: null,
        statuses: [
          { type: invitation.status === "accepted" ? "alignment_in_progress" : "connection_pending" },
        ],
      }];
    });

  return { teams, connections: [...establishedConnections, ...potentialConnections] };
}
