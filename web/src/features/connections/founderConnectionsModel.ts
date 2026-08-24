import type { DiscoveryIntroRequestWithProfile } from "@/features/discovery/discoveryIntroTypes";
import type { FounderTeamDashboardSummary } from "@/features/teams/founderTeamHomebaseModel";

export type FounderConnectionInvitationRow = {
  id: string;
  direction: "incoming" | "sent";
  inviterUserId: string;
  inviteeUserId: string | null;
  teamContext: "pre_founder" | "existing_team";
  status: "sent" | "opened" | "accepted" | "expired" | "revoked";
  label: string | null;
  counterpartName: string | null;
  createdAt: string;
  expiresAt: string;
};

export type PotentialFounderConnection = {
  id: string;
  source: "intro" | "invitation";
  direction: "incoming" | "sent";
  counterpartUserId: string | null;
  counterpartName: string | null;
  teamContext: "pre_founder" | "existing_team";
  state: "request_pending" | "intro_accepted" | "alignment_in_progress";
  href: string;
  createdAt: string;
};

export type FounderConnectionsReadModel = {
  teams: FounderTeamDashboardSummary[];
  potentialConnections: PotentialFounderConnection[];
};

function teamCounterpartIds(
  teams: FounderTeamDashboardSummary[],
  currentUserId: string
) {
  return new Set(
    teams.flatMap((team) =>
      team.members
        .filter((member) => member.userId !== currentUserId)
        .map((member) => member.userId)
    )
  );
}

function introCounterpart(
  request: DiscoveryIntroRequestWithProfile,
  currentUserId: string
) {
  if (request.requesterUserId === currentUserId) {
    return { direction: "sent" as const, userId: request.recipientUserId };
  }
  if (request.recipientUserId === currentUserId) {
    return { direction: "incoming" as const, userId: request.requesterUserId };
  }
  return null;
}

function invitationCounterpart(
  invitation: FounderConnectionInvitationRow,
  currentUserId: string
) {
  if (invitation.direction === "sent" && invitation.inviterUserId === currentUserId) {
    return invitation.inviteeUserId;
  }
  if (
    invitation.direction === "incoming" &&
    (!invitation.inviteeUserId || invitation.inviteeUserId === currentUserId)
  ) {
    return invitation.inviterUserId;
  }
  return null;
}

export function buildFounderConnectionsReadModel(params: {
  currentUserId: string;
  teams: FounderTeamDashboardSummary[];
  receivedIntros: DiscoveryIntroRequestWithProfile[];
  sentIntros: DiscoveryIntroRequestWithProfile[];
  invitations: FounderConnectionInvitationRow[];
  now?: Date;
}): FounderConnectionsReadModel {
  const teams = params.teams.filter((team) =>
    team.members.some((member) => member.userId === params.currentUserId)
  );
  const establishedCounterparts = teamCounterpartIds(teams, params.currentUserId);
  const now = (params.now ?? new Date()).getTime();

  const invitations = params.invitations
    .map((invitation) => ({
      invitation,
      counterpartUserId: invitationCounterpart(invitation, params.currentUserId),
    }))
    .filter(({ invitation, counterpartUserId }) => {
      if (counterpartUserId && establishedCounterparts.has(counterpartUserId)) return false;
      if (invitation.status === "expired" || invitation.status === "revoked") return false;
      if (
        invitation.status !== "accepted" &&
        Number.isFinite(Date.parse(invitation.expiresAt)) &&
        Date.parse(invitation.expiresAt) <= now
      ) {
        return false;
      }
      return counterpartUserId !== null || invitation.direction === "sent";
    })
    .sort((left, right) => right.invitation.createdAt.localeCompare(left.invitation.createdAt));

  const latestInvitationByCounterpart = new Map<string, (typeof invitations)[number]>();
  const invitationsWithoutKnownCounterpart: typeof invitations = [];
  for (const entry of invitations) {
    if (!entry.counterpartUserId) {
      invitationsWithoutKnownCounterpart.push(entry);
      continue;
    }
    if (!latestInvitationByCounterpart.has(entry.counterpartUserId)) {
      latestInvitationByCounterpart.set(entry.counterpartUserId, entry);
    }
  }
  const visibleInvitations = [
    ...latestInvitationByCounterpart.values(),
    ...invitationsWithoutKnownCounterpart,
  ];
  const invitationCounterparts = new Set(latestInvitationByCounterpart.keys());

  const intros = [...params.receivedIntros, ...params.sentIntros]
    .filter((request, index, rows) => rows.findIndex((row) => row.id === request.id) === index)
    .map((request) => ({ request, counterpart: introCounterpart(request, params.currentUserId) }))
    .filter(({ request, counterpart }) => {
      if (!counterpart) return false;
      if (request.status !== "pending" && request.status !== "accepted") return false;
      if (establishedCounterparts.has(counterpart.userId)) return false;
      return !invitationCounterparts.has(counterpart.userId);
    });

  const potentialConnections: PotentialFounderConnection[] = [
    ...intros.map(({ request, counterpart }) => ({
      id: request.id,
      source: "intro" as const,
      direction: counterpart!.direction,
      counterpartUserId: counterpart!.userId,
      counterpartName: request.profile?.displayName ?? null,
      teamContext: "pre_founder" as const,
      state: request.status === "accepted" ? ("intro_accepted" as const) : ("request_pending" as const),
      href:
        request.status === "accepted"
          ? `/discovery/intros/${encodeURIComponent(request.id)}/matching`
          : "/discovery/intros",
      createdAt: request.createdAt,
    })),
    ...visibleInvitations.map(({ invitation, counterpartUserId }) => ({
      id: invitation.id,
      source: "invitation" as const,
      direction: invitation.direction,
      counterpartUserId,
      counterpartName: invitation.counterpartName ?? invitation.label,
      teamContext: invitation.teamContext,
      state:
        invitation.status === "accepted"
          ? ("alignment_in_progress" as const)
          : ("request_pending" as const),
      href:
        invitation.direction === "incoming"
          ? `/invite/${encodeURIComponent(invitation.id)}/resume`
          : `/dashboard?invitationId=${encodeURIComponent(invitation.id)}`,
      createdAt: invitation.createdAt,
    })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return { teams, potentialConnections };
}
