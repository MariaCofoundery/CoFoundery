import "server-only";

import {
  buildFounderDashboardConnections,
  type FounderDashboardRelationshipSignal,
} from "@/features/dashboard/founderDashboardConnections";
import type { InvitationDashboardRow } from "@/features/reporting/actions";
import type { FounderTeamDashboardSummary } from "@/features/teams/founderTeamHomebaseModel";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type RelationshipRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  founder_team_id: string | null;
  created_at: string;
};

export async function getFounderDashboardConnectionsV2(params: {
  currentUserId: string;
  teams: FounderTeamDashboardSummary[];
  invitations: InvitationDashboardRow[];
  client?: SupabaseClient;
}) {
  const currentUserId = params.currentUserId.trim();
  if (!currentUserId) return { teams: [], connections: [] };
  const supabase = params.client ?? (await createClient());

  const relationshipResult = await supabase
    .from("relationships")
    .select("id, user_a_id, user_b_id, founder_team_id, created_at")
    .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false });
  if (relationshipResult.error) throw new Error("dashboard_relationships_unavailable");

  const relationships = ((relationshipResult.data ?? []) as RelationshipRow[])
    .filter((relationship) =>
      relationship.user_a_id === currentUserId || relationship.user_b_id === currentUserId
    )
    .map<FounderDashboardRelationshipSignal>((relationship) => ({
      id: relationship.id,
      userAId: relationship.user_a_id,
      userBId: relationship.user_b_id,
      teamId: relationship.founder_team_id,
      createdAt: relationship.created_at,
    }));
  const relationshipIds = relationships.map((relationship) => relationship.id);
  const counterpartIds = relationships.map((relationship) =>
    relationship.userAId === currentUserId ? relationship.userBId : relationship.userAId
  );
  const teamIds = params.teams.map((team) => team.id);

  const [reportResult, labResult, advisorResult, setupResult, nameResult] = await Promise.all([
    relationshipIds.length
      ? supabase
          .from("report_runs")
          .select("relationship_id, invitation_id, created_at")
          .in("relationship_id", relationshipIds)
          .eq("status", "completed")
      : Promise.resolve({ data: [], error: null }),
    relationshipIds.length
      ? supabase
          .from("commitment_labs")
          .select("relationship_id, updated_at")
          .in("relationship_id", relationshipIds)
      : Promise.resolve({ data: [], error: null }),
    relationshipIds.length
      ? supabase
          .from("relationship_advisors")
          .select("relationship_id, status")
          .in("relationship_id", relationshipIds)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length
      ? supabase
          .from("founder_team_setup_items")
          .select("team_id, work_status, current_confirmed_revision_id")
          .in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    counterpartIds.length
      ? supabase
          .from("founder_discovery_profiles")
          .select("user_id, display_name")
          .in("user_id", counterpartIds)
          .eq("status", "active")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (reportResult.error || labResult.error || advisorResult.error || setupResult.error) {
    throw new Error("dashboard_connection_statuses_unavailable");
  }

  const counterpartNames = new Map(
    nameResult.error
      ? []
      : ((nameResult.data ?? []) as Array<{ user_id: string; display_name: string | null }>)
          .flatMap((row) => row.display_name?.trim() ? [[row.user_id, row.display_name.trim()] as const] : [])
  );

  return buildFounderDashboardConnections({
    currentUserId,
    teams: params.teams,
    invitations: params.invitations,
    signals: {
      relationships,
      reports: ((reportResult.data ?? []) as Array<{
        relationship_id: string;
        invitation_id: string;
        created_at: string;
      }>).map((report) => ({
        relationshipId: report.relationship_id,
        invitationId: report.invitation_id,
        createdAt: report.created_at,
      })),
      commitmentLabs: ((labResult.data ?? []) as Array<{
        relationship_id: string;
        updated_at: string;
      }>).map((lab) => ({ relationshipId: lab.relationship_id, updatedAt: lab.updated_at })),
      relationshipAdvisors: ((advisorResult.data ?? []) as Array<{
        relationship_id: string;
        status: string;
      }>).map((advisor) => ({
        relationshipId: advisor.relationship_id,
        status: advisor.status,
      })),
      setupItems: ((setupResult.data ?? []) as Array<{
        team_id: string;
        work_status: string;
        current_confirmed_revision_id: string | null;
      }>).map((item) => ({
        teamId: item.team_id,
        workStatus: item.work_status,
        currentConfirmedRevisionId: item.current_confirmed_revision_id,
      })),
      counterpartNames,
    },
  });
}
