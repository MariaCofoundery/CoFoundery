import "server-only";

import { buildFounderDashboardTasks } from "@/features/dashboard/founderDashboardTasks";
import type { InvitationDashboardRow } from "@/features/reporting/actions";
import { getFounderSetupAdvisorAccess } from "@/features/teams/founderSetupAdvisorAccessData";
import { isFounderSetupItemKey } from "@/features/teams/founderSetupCatalog";
import type { FounderTeamDashboardSummary } from "@/features/teams/founderTeamHomebaseModel";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type RelationshipRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  founder_team_id: string | null;
};

type RelationshipAdvisorRow = {
  id: string;
  relationship_id: string;
  status: string;
  founder_a_approved: boolean;
  founder_b_approved: boolean;
  updated_at: string;
};

type SetupItemRow = {
  id: string;
  team_id: string;
  item_key: string;
  work_status: string;
  pending_revision_id: string | null;
  updated_at: string;
};

export async function getFounderDashboardTasks(params: {
  currentUserId: string;
  invitations: InvitationDashboardRow[];
  founderAlignmentStarted: boolean;
  founderAlignmentSubmitted: boolean;
  valuesStarted: boolean;
  valuesSubmitted: boolean;
  teams: FounderTeamDashboardSummary[];
  client?: SupabaseClient;
}) {
  const currentUserId = params.currentUserId.trim();
  if (!currentUserId) return [];
  const supabase = params.client ?? (await createClient());
  const now = new Date().toISOString();
  const teamIds = params.teams.map((team) => team.id);
  const teamById = new Map(params.teams.map((team) => [team.id, team]));

  const [introResult, relationshipResult, setupItemResult, setupAccessResults] =
    await Promise.all([
      supabase
        .from("discovery_intro_requests")
        .select("id, recipient_user_id, status, updated_at")
        .eq("recipient_user_id", currentUserId)
        .eq("status", "pending")
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("relationships")
        .select("id, user_a_id, user_b_id, founder_team_id")
        .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`),
      teamIds.length > 0
        ? supabase
            .from("founder_team_setup_items")
            .select("id, team_id, item_key, work_status, pending_revision_id, updated_at")
            .in("team_id", teamIds)
        : Promise.resolve({ data: [], error: null }),
      Promise.all(
        params.teams.map(async (team) => ({
          team,
          access: await getFounderSetupAdvisorAccess(team.id, supabase),
        }))
      ),
    ]);

  const relationships = relationshipResult.error
    ? []
    : ((relationshipResult.data ?? []) as RelationshipRow[]);
  const relationshipIds = relationships.map((relationship) => relationship.id);
  const setupItems = setupItemResult.error
    ? []
    : ((setupItemResult.data ?? []) as SetupItemRow[]).filter((item) =>
        isFounderSetupItemKey(item.item_key)
      );
  const pendingRevisionIds = setupItems.flatMap((item) =>
    item.pending_revision_id ? [item.pending_revision_id] : []
  );

  const [advisorResult, confirmationResult, commitmentLabResult] = await Promise.all([
    relationshipIds.length > 0
      ? supabase
          .from("relationship_advisors")
          .select(
            "id, relationship_id, status, founder_a_approved, founder_b_approved, updated_at"
          )
          .in("relationship_id", relationshipIds)
      : Promise.resolve({ data: [], error: null }),
    pendingRevisionIds.length > 0
      ? supabase
          .from("founder_team_setup_confirmations")
          .select("revision_id, user_id")
          .in("revision_id", pendingRevisionIds)
          .eq("user_id", currentUserId)
      : Promise.resolve({ data: [], error: null }),
    relationshipIds.length > 0
      ? supabase
          .from("commitment_labs")
          .select("relationship_id, updated_at")
          .in("relationship_id", relationshipIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const relationshipSignals = relationships.map((relationship) => {
    const team = relationship.founder_team_id
      ? teamById.get(relationship.founder_team_id) ?? null
      : null;
    const otherFounderId =
      relationship.user_a_id === currentUserId
        ? relationship.user_b_id
        : relationship.user_a_id;
    const otherFounder = team?.members.find((member) => member.userId === otherFounderId);
    const teamLabel =
      team?.name ??
      team?.members
        .map((member) => member.displayName)
        .filter((name): name is string => Boolean(name))
        .join(" + ") ??
      null;
    return {
      id: relationship.id,
      userAId: relationship.user_a_id,
      userBId: relationship.user_b_id,
      teamId: relationship.founder_team_id,
      teamLabel: teamLabel || null,
      otherFounderLabel: otherFounder?.displayName ?? null,
    };
  });

  return buildFounderDashboardTasks({
    currentUserId,
    now,
    invitations: params.invitations.map((invitation) => ({
      id: invitation.id,
      direction: invitation.direction,
      status: invitation.status,
      requiredModules: invitation.requiredModules,
      inviteeBaseStarted: invitation.inviteeBaseStarted,
      inviteeBaseSubmitted: invitation.inviteeBaseSubmitted,
      inviteeValuesSubmitted: invitation.inviteeValuesSubmitted,
      isReportReady: invitation.isReportReady,
      inviterLabel:
        invitation.inviterDisplayName?.trim() || invitation.inviterEmail?.trim() || null,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    })),
    personal: {
      founderAlignmentStarted: params.founderAlignmentStarted,
      founderAlignmentSubmitted: params.founderAlignmentSubmitted,
      valuesStarted: params.valuesStarted,
      valuesSubmitted: params.valuesSubmitted,
    },
    discoveryIntros: introResult.error
      ? []
      : ((introResult.data ?? []) as Array<{
          id: string;
          recipient_user_id: string;
          status: string;
          updated_at: string;
        }>).map((intro) => ({
          id: intro.id,
          recipientUserId: intro.recipient_user_id,
          status: intro.status,
          updatedAt: intro.updated_at,
        })),
    relationships: relationshipSignals,
    relationshipAdvisors: advisorResult.error
      ? []
      : ((advisorResult.data ?? []) as RelationshipAdvisorRow[]).map((advisor) => ({
          id: advisor.id,
          relationshipId: advisor.relationship_id,
          status: advisor.status,
          founderAApproved: advisor.founder_a_approved,
          founderBApproved: advisor.founder_b_approved,
          updatedAt: advisor.updated_at,
        })),
    setupAdvisorAccess: setupAccessResults.flatMap(({ team, access }) =>
      access.map((entry) => ({
        grantId: entry.grantId,
        teamId: team.id,
        teamLabel:
          team.name ??
          (team.members
            .map((member) => member.displayName)
            .filter((name): name is string => Boolean(name))
            .join(" + ") || null),
        status: entry.status,
        accessActive: entry.accessActive,
        consentedFounderUserIds: entry.consentedFounderUserIds,
        updatedAt: now,
      }))
    ),
    setupItems: setupItems.flatMap((item) =>
      isFounderSetupItemKey(item.item_key)
        ? [{
            id: item.id,
            teamId: item.team_id,
            teamLabel: teamById.get(item.team_id)?.name ?? null,
            itemKey: item.item_key,
            workStatus: item.work_status,
            pendingRevisionId: item.pending_revision_id,
            updatedAt: item.updated_at,
          }]
        : []
    ),
    setupConfirmations: confirmationResult.error
      ? []
      : ((confirmationResult.data ?? []) as Array<{
          revision_id: string;
          user_id: string;
        }>).map((confirmation) => ({
          revisionId: confirmation.revision_id,
          userId: confirmation.user_id,
        })),
    commitmentLabs: commitmentLabResult.error
      ? []
      : ((commitmentLabResult.data ?? []) as Array<{
          relationship_id: string;
          updated_at: string;
        }>).map((lab) => ({
          relationshipId: lab.relationship_id,
          updatedAt: lab.updated_at,
        })),
  });
}
