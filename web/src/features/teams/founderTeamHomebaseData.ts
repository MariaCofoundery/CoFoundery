import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildFounderTeamDashboardSummaries,
  buildFounderTeamHomebaseReadModel,
  type ClassicReportRow,
  type DisplayNameRow,
  type FounderTeamDashboardSummary,
  type FounderTeamHomebase,
  type FounderTeamMemberRow,
  type FounderTeamRow,
  type MatchingReportRow,
  type MatchingWorkspaceAgreementRow,
  type MatchingWorkspaceRow,
  type RelationshipAdvisorRow,
  type RelationshipRow,
  type WorkbookRow,
} from "@/features/teams/founderTeamHomebaseModel";

export { buildFounderTeamHomebaseReadModel } from "@/features/teams/founderTeamHomebaseModel";
export type {
  FounderTeamDashboardSummary,
  FounderTeamHomebase,
} from "@/features/teams/founderTeamHomebaseModel";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from" | "rpc">;

async function loadMemberPresentations(
  client: SupabaseLikeClient,
  teams: Array<{ teamId: string; userIds: string[] }>
) {
  const userIds = [...new Set(teams.flatMap((team) => team.userIds))];
  if (userIds.length === 0) {
    return { profileNames: [] as DisplayNameRow[], discoveryNames: [] as DisplayNameRow[] };
  }

  const [presentationResults, profileResult, discoveryResult] = await Promise.all([
    Promise.all(
      teams.map(({ teamId }) =>
        client.rpc("get_founder_team_member_presentations", { p_team_id: teamId })
      )
    ),
    client
      .from("profiles")
      .select("user_id, display_name, avatar_id, avatar_url")
      .in("user_id", userIds),
    client
      .from("founder_discovery_profiles")
      .select("user_id, display_name")
      .in("user_id", userIds),
  ]);

  const projectedProfiles = presentationResults.flatMap((result) =>
    result.error ? [] : ((result.data ?? []) as DisplayNameRow[])
  );

  return {
    // The direct query remains as a backwards-compatible self-profile fallback while the
    // additive RPC migration rolls out. Existing profiles RLS limits it to the current user.
    profileNames: [
      ...((profileResult.data ?? []) as DisplayNameRow[]),
      ...projectedProfiles,
    ],
    discoveryNames: (discoveryResult.data ?? []) as DisplayNameRow[],
  };
}

export async function getFounderTeamHomebase(
  teamId: string,
  currentUserId: string,
  client?: SupabaseLikeClient
): Promise<FounderTeamHomebase | null> {
  const supabase = client ?? (await createClient());
  const normalizedTeamId = teamId.trim();
  if (!normalizedTeamId || !currentUserId.trim()) return null;

  const [teamResult, memberResult] = await Promise.all([
    supabase
      .from("founder_teams")
      .select("id, name, team_context, created_at")
      .eq("id", normalizedTeamId)
      .maybeSingle(),
    supabase
      .from("founder_team_members")
      .select("team_id, user_id, created_at")
      .eq("team_id", normalizedTeamId)
      .order("created_at", { ascending: true }),
  ]);

  if (teamResult.error || memberResult.error || !teamResult.data) return null;
  const members = (memberResult.data ?? []) as FounderTeamMemberRow[];
  if (!members.some((member) => member.user_id === currentUserId)) return null;

  const relationshipResult = await supabase
    .from("relationships")
    .select("id, user_a_id, user_b_id, founder_team_id, created_at")
    .eq("founder_team_id", normalizedTeamId)
    .order("created_at", { ascending: false });
  if (relationshipResult.error) throw new Error("founder_team_relationships_unavailable");

  const relationships = ((relationshipResult.data ?? []) as RelationshipRow[]).filter(
    (relationship) =>
      relationship.founder_team_id === normalizedTeamId &&
      (relationship.user_a_id === currentUserId || relationship.user_b_id === currentUserId)
  );
  const relationshipIds = relationships.map((relationship) => relationship.id);
  const memberIds = members.map((member) => member.user_id);
  const namesPromise = loadMemberPresentations(supabase, [
    { teamId: normalizedTeamId, userIds: memberIds },
  ]);

  if (relationshipIds.length === 0) {
    const names = await namesPromise;
    return buildFounderTeamHomebaseReadModel({
      currentUserId,
      teamId: normalizedTeamId,
      rows: {
        team: teamResult.data as FounderTeamRow,
        members,
        relationships,
        classicReports: [],
        workbooks: [],
        matchingWorkspaces: [],
        matchingReports: [],
        matchingWorkspaceAgreements: [],
        advisors: [],
        ...names,
      },
    });
  }

  const [reportResult, workspaceResult, advisorResult, names] = await Promise.all([
    supabase
      .from("report_runs")
      .select("id, relationship_id, invitation_id, payload, created_at")
      .in("relationship_id", relationshipIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("matching_workspaces")
      .select("id, matching_session_id, relationship_id, updated_at, created_at")
      .in("relationship_id", relationshipIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("relationship_advisors")
      .select("id, relationship_id, advisor_name, founder_a_approved, founder_b_approved, linked_at, status")
      .in("relationship_id", relationshipIds),
    namesPromise,
  ]);
  if (reportResult.error || workspaceResult.error || advisorResult.error) {
    throw new Error("founder_team_artifacts_unavailable");
  }

  const classicReports = (reportResult.data ?? []) as ClassicReportRow[];
  const matchingWorkspaces = (workspaceResult.data ?? []) as MatchingWorkspaceRow[];
  const invitationIds = [...new Set(classicReports.map((report) => report.invitation_id))];
  const workspaceIds = [...new Set(matchingWorkspaces.map((workspace) => workspace.id))];
  const matchingSessionIds = [
    ...new Set(matchingWorkspaces.map((workspace) => workspace.matching_session_id)),
  ];

  const [workbookResult, matchingReportResult, agreementResult] = await Promise.all([
    invitationIds.length > 0
      ? supabase
          .from("founder_alignment_workbooks")
          .select("invitation_id, payload, updated_at")
          .in("invitation_id", invitationIds)
      : Promise.resolve({ data: [], error: null }),
    matchingSessionIds.length > 0
      ? supabase
          .from("matching_report_runs")
          .select("matching_session_id, payload, created_at")
          .in("matching_session_id", matchingSessionIds)
      : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0
      ? supabase
          .from("matching_workspace_agreements")
          .select("matching_workspace_id, relationship_id, sections, updated_at")
          .in("matching_workspace_id", workspaceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (workbookResult.error || matchingReportResult.error || agreementResult.error) {
    throw new Error("founder_team_artifacts_unavailable");
  }

  return buildFounderTeamHomebaseReadModel({
    currentUserId,
    teamId: normalizedTeamId,
    rows: {
      team: teamResult.data as FounderTeamRow,
      members,
      relationships,
      classicReports,
      workbooks: (workbookResult.data ?? []) as WorkbookRow[],
      matchingWorkspaces,
      matchingReports: (matchingReportResult.data ?? []) as MatchingReportRow[],
      matchingWorkspaceAgreements: (agreementResult.data ?? []) as MatchingWorkspaceAgreementRow[],
      advisors: (advisorResult.data ?? []) as RelationshipAdvisorRow[],
      ...names,
    },
  });
}

export async function getFounderTeamDashboardSummaries(
  currentUserId: string,
  client?: SupabaseLikeClient
): Promise<FounderTeamDashboardSummary[]> {
  const supabase = client ?? (await createClient());
  const membershipResult = await supabase
    .from("founder_team_members")
    .select("team_id, user_id, created_at")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });
  if (membershipResult.error) throw new Error("founder_teams_unavailable");

  const ownMemberships = (membershipResult.data ?? []) as FounderTeamMemberRow[];
  const teamIds = [...new Set(ownMemberships.map((member) => member.team_id))];
  if (teamIds.length === 0) return [];

  const [teamResult, allMembersResult] = await Promise.all([
    supabase
      .from("founder_teams")
      .select("id, name, team_context, created_at")
      .in("id", teamIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("founder_team_members")
      .select("team_id, user_id, created_at")
      .in("team_id", teamIds)
      .order("created_at", { ascending: true }),
  ]);
  if (teamResult.error || allMembersResult.error) throw new Error("founder_teams_unavailable");

  const teams = (teamResult.data ?? []) as FounderTeamRow[];
  const allMembers = (allMembersResult.data ?? []) as FounderTeamMemberRow[];
  const names = await loadMemberPresentations(
    supabase,
    teams.map((team) => ({
      teamId: team.id,
      userIds: allMembers
        .filter((member) => member.team_id === team.id)
        .map((member) => member.user_id),
    }))
  );
  return buildFounderTeamDashboardSummaries({
    currentUserId,
    teams,
    members: allMembers,
    ...names,
  });
}
