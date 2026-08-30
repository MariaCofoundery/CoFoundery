import "server-only";

import { buildFounderDashboardTasks } from "@/features/dashboard/founderDashboardTasks";
import type { InvitationDashboardRow } from "@/features/reporting/actions";
import { getFounderSetupAdvisorAccess } from "@/features/teams/founderSetupAdvisorAccessData";
import { isFounderSetupItemKey } from "@/features/teams/founderSetupCatalog";
import type { FounderTeamDashboardSummary } from "@/features/teams/founderTeamHomebaseModel";
import { createClient } from "@/lib/supabase/server";
import { getReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";

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

  const [introResult, relationshipResult, setupItemResult, setupAccessResults, readMyMindRoundResult, founderInTheWildRoundResult] =
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
      teamIds.length > 0
        ? supabase.from("collaboration_experience_rounds").select("id, founder_team_id, pack_key, pack_version, created_by_user_id, status, created_at, handoff_ready_at").in("founder_team_id", teamIds).eq("experience_key", "read_my_mind").in("status", ["forming", "active"])
        : Promise.resolve({ data: [], error: null }),
      teamIds.length > 0
        ? supabase.from("collaboration_experience_rounds").select("id, founder_team_id, status, created_at").in("founder_team_id", teamIds).eq("experience_key", "founder_in_the_wild").eq("status", "active")
        : Promise.resolve({ data: [], error: null }),
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

  const readMyMindRounds = readMyMindRoundResult.error ? [] : ((readMyMindRoundResult.data ?? []) as Array<{ id: string; founder_team_id: string; pack_key: string; pack_version: number; created_by_user_id: string; status: string; created_at: string; handoff_ready_at: string | null }>);
  const readMyMindRoundIds = readMyMindRounds.map((round) => round.id);
  const founderInTheWildRounds = founderInTheWildRoundResult.error ? [] : ((founderInTheWildRoundResult.data ?? []) as Array<{ id: string; founder_team_id: string; status: string; created_at: string }>);
  const [advisorResult, confirmationResult, commitmentLabResult, readMyMindParticipantResult, readMyMindOwnResponseResult, readMyMindPromptResult, readMyMindReceiptResult, readMyMindStateResults, founderInTheWildStateResults, founderInTheWildRoundStateResults] = await Promise.all([
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
    readMyMindRoundIds.length > 0
      ? supabase.from("collaboration_experience_round_participants").select("round_id, founder_user_id, state").in("round_id", readMyMindRoundIds).eq("founder_user_id", currentUserId)
      : Promise.resolve({ data: [], error: null }),
    readMyMindRoundIds.length > 0
      ? supabase.from("collaboration_experience_responses").select("round_id, respondent_user_id, response_type").in("round_id", readMyMindRoundIds).eq("respondent_user_id", currentUserId)
      : Promise.resolve({ data: [], error: null }),
    readMyMindRoundIds.length > 0
      ? supabase.from("collaboration_experience_round_prompts").select("id, round_id, position").in("round_id", readMyMindRoundIds)
      : Promise.resolve({ data: [], error: null }),
    readMyMindRoundIds.length > 0
      ? supabase.from("collaboration_experience_reveal_receipts").select("round_id, round_prompt_id, participant_user_id").in("round_id", readMyMindRoundIds).eq("participant_user_id", currentUserId)
      : Promise.resolve({ data: [], error: null }),
    Promise.all(readMyMindRoundIds.map(async (roundId) => ({ roundId, result: await supabase.rpc("get_collaboration_round_state", { p_round_id: roundId }) }))),
    Promise.all(founderInTheWildRounds.map(async (round) => ({ roundId: round.id, result: await supabase.rpc("get_founder_in_the_wild_handoff_state", { p_round_id: round.id }) }))),
    Promise.all(founderInTheWildRounds.map(async (round) => ({ roundId: round.id, result: await supabase.rpc("get_founder_in_the_wild_round_state", { p_round_id: round.id }) }))),
  ]);

  const commitmentLabs = commitmentLabResult.error
    ? []
    : ((commitmentLabResult.data ?? []) as Array<{
        relationship_id: string;
        updated_at: string;
      }>);
  const commitmentCompletionResults = await Promise.all(
    commitmentLabs.map(async (lab) => ({
      relationshipId: lab.relationship_id,
      result: await supabase.rpc("is_commitment_lab_complete", {
        p_relationship_id: lab.relationship_id,
      }),
    }))
  );

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
    commitmentLabs: commitmentLabs.map((lab) => ({
          relationshipId: lab.relationship_id,
          updatedAt: lab.updated_at,
          completed: Boolean(
            commitmentCompletionResults.find(
              (entry) => entry.relationshipId === lab.relationship_id
            )?.result.data
          ),
        })),
    readMyMindRounds: readMyMindRounds.map((round) => {
      const team = teamById.get(round.founder_team_id);
      const participant = readMyMindParticipantResult.error ? null : ((readMyMindParticipantResult.data ?? []) as Array<{ round_id: string; founder_user_id: string; state: string }>).find((entry) => entry.round_id === round.id);
      const ownResponseCount = readMyMindOwnResponseResult.error ? 0 : ((readMyMindOwnResponseResult.data ?? []) as Array<{ round_id: string }>).filter((entry) => entry.round_id === round.id).length;
      const prompts = readMyMindPromptResult.error ? [] : ((readMyMindPromptResult.data ?? []) as Array<{ id: string; round_id: string; position: number }>).filter((entry) => entry.round_id === round.id);
      const ownReceiptPromptIds = new Set(readMyMindReceiptResult.error ? [] : ((readMyMindReceiptResult.data ?? []) as Array<{ round_id: string; round_prompt_id: string }>).filter((entry) => entry.round_id === round.id).map((entry) => entry.round_prompt_id));
      const nextRevealPosition = prompts.filter((prompt) => !ownReceiptPromptIds.has(prompt.id)).sort((left, right) => left.position - right.position)[0]?.position ?? null;
      const stateResult = readMyMindStateResults.find((entry) => entry.roundId === round.id)?.result;
      const state = stateResult && !stateResult.error ? (Array.isArray(stateResult.data) ? stateResult.data[0] : stateResult.data) as { answer_phase_complete?: boolean } | null : null;
      const pack = getReadMyMindPack(round.pack_key, round.pack_version);
      const expectedOwnResponses = pack?.prompts.reduce((count, prompt) => count + 2 + (prompt.needMode === "required" ? 1 : 0), 0) ?? Number.POSITIVE_INFINITY;
      const creator = team?.members.find((member) => member.userId === round.created_by_user_id);
      return {
        id: round.id,
        teamId: round.founder_team_id,
        teamLabel: team?.name ?? team?.members.map((member) => member.displayName).filter(Boolean).join(" + ") ?? null,
        creatorLabel: creator?.displayName ?? null,
        handoffReady: round.handoff_ready_at !== null,
        status: round.status,
        ownParticipantState: participant?.state ?? "unavailable",
        ownAnswerComplete: ownResponseCount === expectedOwnResponses,
        wholeAnswerComplete: Boolean(state?.answer_phase_complete),
        ownRevealComplete: prompts.length > 0 && ownReceiptPromptIds.size === prompts.length,
        nextRevealPosition,
        supportedTwoFounderTeam: team?.members.length === 2,
        createdAt: round.created_at,
      };
    }),
    founderInTheWildRounds: founderInTheWildRounds.map((round) => {
      const team = teamById.get(round.founder_team_id);
      const stateResult = founderInTheWildStateResults.find((entry) => entry.roundId === round.id)?.result;
      const rawState = stateResult && !stateResult.error
        ? (Array.isArray(stateResult.data) ? stateResult.data[0] : stateResult.data)
        : null;
      const state = rawState as { own_started?: boolean; own_complete?: boolean; partner_complete?: boolean } | null;
      const roundStateResult = founderInTheWildRoundStateResults.find((entry) => entry.roundId === round.id)?.result;
      const rawRoundState = roundStateResult && !roundStateResult.error
        ? (Array.isArray(roundStateResult.data) ? roundStateResult.data[0] : roundStateResult.data)
        : null;
      const roundState = rawRoundState as { own_reveal_count?: number } | null;
      const partner = team?.members.find((member) => member.userId !== currentUserId);
      return {
        id: round.id,
        teamId: round.founder_team_id,
        teamLabel: team?.name ?? team?.members.map((member) => member.displayName).filter(Boolean).join(" + ") ?? null,
        partnerLabel: partner?.displayName ?? null,
        status: round.status,
        ownStarted: Boolean(state?.own_started),
        ownAnswerComplete: Boolean(state?.own_complete),
        partnerAnswerComplete: Boolean(state?.partner_complete),
        wholeAnswerComplete: Boolean(state?.own_complete && state?.partner_complete),
        ownRevealComplete: Number(roundState?.own_reveal_count ?? 0) >= 5,
        supportedTwoFounderTeam: team?.members.length === 2,
        createdAt: round.created_at,
      };
    }),
  });
}
