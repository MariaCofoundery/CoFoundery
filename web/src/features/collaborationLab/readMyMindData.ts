import "server-only";

import { buildReadMyMindRoundReadModel, type ReadMyMindAssignmentRow, type ReadMyMindOwnResponseRow, type ReadMyMindParticipantRow, type ReadMyMindRoundPromptRow, type ReadMyMindRoundReadModel, type ReadMyMindRoundRow, type ReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindModel";
import { getFounderTeamDashboardSummaries } from "@/features/teams/founderTeamHomebaseData";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ReadMyMindHomebaseState =
  | { kind: "unsupported" }
  | { kind: "start" }
  | { kind: "forming_waiting" | "forming_invitation" | "active_continue" | "active_waiting" | "ready" | "completed"; round: ReadMyMindRoundReadModel };

export async function getReadMyMindTeamContext(
  teamId: string,
  currentUserId: string,
  client?: SupabaseClient
): Promise<ReadMyMindTeamContext | null> {
  const teams = await getFounderTeamDashboardSummaries(currentUserId, client);
  const team = teams.find((entry) => entry.id === teamId);
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    members: team.members.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
      avatarId: member.avatarId,
      avatarUrl: member.avatarUrl,
    })),
  };
}

export async function getReadMyMindRound(
  team: ReadMyMindTeamContext,
  roundId: string,
  currentUserId: string,
  client?: SupabaseClient
): Promise<ReadMyMindRoundReadModel | null> {
  if (team.members.length !== 2) return null;
  const supabase = client ?? (await createClient());
  const roundResult = await supabase
    .from("collaboration_experience_rounds")
    .select("id, founder_team_id, pack_key, pack_version, created_by_user_id, status, created_at, completed_at, abandoned_at")
    .eq("id", roundId)
    .eq("founder_team_id", team.id)
    .maybeSingle();
  if (roundResult.error || !roundResult.data) return null;

  const [participantsResult, promptsResult, assignmentsResult, responsesResult, stateResult] =
    await Promise.all([
      supabase.from("collaboration_experience_round_participants").select("round_id, founder_user_id, position, state, joined_at").eq("round_id", roundId),
      supabase.from("collaboration_experience_round_prompts").select("id, round_id, prompt_key, prompt_version, position").eq("round_id", roundId).order("position"),
      supabase.from("collaboration_experience_prompt_assignments").select("id, round_id, round_prompt_id, target_user_id").eq("round_id", roundId),
      supabase.from("collaboration_experience_responses").select("id, round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys, locked_at").eq("round_id", roundId).eq("respondent_user_id", currentUserId),
      supabase.rpc("get_collaboration_round_state", { p_round_id: roundId }),
    ]);
  if (participantsResult.error || promptsResult.error || assignmentsResult.error || responsesResult.error || stateResult.error) return null;
  const state = Array.isArray(stateResult.data) ? stateResult.data[0] : stateResult.data;

  return buildReadMyMindRoundReadModel({
    currentUserId,
    team,
    round: roundResult.data as ReadMyMindRoundRow,
    participants: (participantsResult.data ?? []) as ReadMyMindParticipantRow[],
    roundPrompts: (promptsResult.data ?? []) as ReadMyMindRoundPromptRow[],
    assignments: (assignmentsResult.data ?? []) as ReadMyMindAssignmentRow[],
    ownResponses: (responsesResult.data ?? []) as ReadMyMindOwnResponseRow[],
    wholeRoundAnswerComplete: Boolean((state as { answer_phase_complete?: boolean } | null)?.answer_phase_complete),
  });
}

export async function getReadMyMindHomebaseState(
  team: ReadMyMindTeamContext,
  currentUserId: string,
  client?: SupabaseClient
): Promise<ReadMyMindHomebaseState> {
  if (team.members.length !== 2) return { kind: "unsupported" };
  const supabase = client ?? (await createClient());
  const openResult = await supabase
    .from("collaboration_experience_rounds")
    .select("id")
    .eq("founder_team_id", team.id)
    .in("status", ["forming", "active"])
    .limit(1)
    .maybeSingle();
  if (!openResult.error && openResult.data) {
    const round = await getReadMyMindRound(team, openResult.data.id as string, currentUserId, supabase);
    if (round) {
      if (round.status === "forming") return { kind: round.ownParticipantState === "pending" ? "forming_invitation" : "forming_waiting", round };
      if (round.wholeRoundAnswerComplete) return { kind: "ready", round };
      return { kind: round.ownAnswerComplete ? "active_waiting" : "active_continue", round };
    }
  }
  const completedResult = await supabase
    .from("collaboration_experience_rounds")
    .select("id")
    .eq("founder_team_id", team.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!completedResult.error && completedResult.data) {
    const round = await getReadMyMindRound(team, completedResult.data.id as string, currentUserId, supabase);
    if (round) return { kind: "completed", round };
  }
  return { kind: "start" };
}

export async function findOpenReadMyMindRoundId(
  team: ReadMyMindTeamContext,
  client?: SupabaseClient
) {
  const supabase = client ?? (await createClient());
  const result = await supabase.from("collaboration_experience_rounds").select("id").eq("founder_team_id", team.id).in("status", ["forming", "active"]).limit(1).maybeSingle();
  return result.error ? null : ((result.data?.id as string | undefined) ?? null);
}
