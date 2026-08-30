import "server-only";

import { buildReadMyMindPromptReveal, buildReadMyMindRoundReadModel, type ReadMyMindAssignmentRow, type ReadMyMindConversationMarkerRow, type ReadMyMindOwnReceiptRow, type ReadMyMindOwnResponseRow, type ReadMyMindParticipantRow, type ReadMyMindPromptReveal, type ReadMyMindRevealResponseRow, type ReadMyMindRoundPromptRow, type ReadMyMindRoundReadModel, type ReadMyMindRoundRow, type ReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindModel";
import { getFounderTeamDashboardSummaries } from "@/features/teams/founderTeamHomebaseData";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ReadMyMindHomebaseState =
  | { kind: "unsupported"; completedRound: ReadMyMindRoundReadModel | null }
  | { kind: "start" }
  | { kind: "forming_creator_continue" | "forming_creator_waiting" | "forming_partner_waiting" | "forming_invitation" | "active_continue" | "active_waiting" | "reveal_ready" | "reveal_waiting"; round: ReadMyMindRoundReadModel; rounds: ReadMyMindRoundReadModel[]; waitingOnYouCount: number; waitingOnPartnerCount: number }
  | { kind: "completed"; round: ReadMyMindRoundReadModel; rounds: []; waitingOnYouCount: 0; waitingOnPartnerCount: 0 };

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
  const supabase = client ?? (await createClient());
  const roundResult = await supabase
    .from("collaboration_experience_rounds")
    .select("id, founder_team_id, pack_key, pack_version, created_by_user_id, status, created_at, handoff_ready_at, handoff_email_claimed_at, completed_at, abandoned_at")
    .eq("id", roundId)
    .eq("founder_team_id", team.id)
    .eq("experience_key", "read_my_mind")
    .maybeSingle();
  if (roundResult.error || !roundResult.data) return null;

  const [participantsResult, promptsResult, assignmentsResult, responsesResult, receiptsResult, markersResult, stateResult] =
    await Promise.all([
      supabase.from("collaboration_experience_round_participants").select("round_id, founder_user_id, position, state, joined_at").eq("round_id", roundId),
      supabase.from("collaboration_experience_round_prompts").select("id, round_id, prompt_key, prompt_version, position").eq("round_id", roundId).order("position"),
      supabase.from("collaboration_experience_prompt_assignments").select("id, round_id, round_prompt_id, target_user_id").eq("round_id", roundId),
      supabase.from("collaboration_experience_responses").select("id, round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys, locked_at").eq("round_id", roundId).eq("respondent_user_id", currentUserId),
      supabase.from("collaboration_experience_reveal_receipts").select("round_id, round_prompt_id, participant_user_id, opened_at").eq("round_id", roundId).eq("participant_user_id", currentUserId),
      supabase.from("collaboration_experience_conversation_markers").select("round_id, round_prompt_id, participant_user_id, created_at").eq("round_id", roundId),
      supabase.rpc("get_collaboration_round_state", { p_round_id: roundId }),
    ]);
  if (participantsResult.error || promptsResult.error || assignmentsResult.error || responsesResult.error || receiptsResult.error || markersResult.error || stateResult.error) return null;
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
    ownReceipts: (receiptsResult.data ?? []) as ReadMyMindOwnReceiptRow[],
    conversationMarkers: (markersResult.data ?? []) as ReadMyMindConversationMarkerRow[],
  });
}

export async function getOpenedReadMyMindPromptReveal(params: {
  team: ReadMyMindTeamContext;
  roundId: string;
  position: number;
  currentUserId: string;
  client?: SupabaseClient;
}): Promise<{ round: ReadMyMindRoundReadModel; reveal: ReadMyMindPromptReveal } | null> {
  const supabase = params.client ?? (await createClient());
  const round = await getReadMyMindRound(params.team, params.roundId, params.currentUserId, supabase);
  const prompt = round?.prompts.find((entry) => entry.position === params.position);
  if (!round || !prompt || !round.wholeRoundAnswerComplete || !round.openedPromptPositions.includes(params.position) || !["active", "completed"].includes(round.status)) return null;
  const revealResult = await supabase.rpc("get_collaboration_prompt_reveal", { p_round_prompt_id: prompt.roundPromptId });
  if (revealResult.error) return null;
  const reveal = buildReadMyMindPromptReveal({ round, currentUserId: params.currentUserId, rows: (revealResult.data ?? []) as ReadMyMindRevealResponseRow[], position: params.position });
  return reveal ? { round, reveal } : null;
}

export async function getReadMyMindHomebaseState(
  team: ReadMyMindTeamContext,
  currentUserId: string,
  client?: SupabaseClient
): Promise<ReadMyMindHomebaseState> {
  const supabase = client ?? (await createClient());
  if (team.members.length !== 2) {
    const completedResult = await supabase
      .from("collaboration_experience_rounds")
      .select("id")
      .eq("founder_team_id", team.id)
      .eq("experience_key", "read_my_mind")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const completedRound = !completedResult.error && completedResult.data
      ? await getReadMyMindRound(team, completedResult.data.id as string, currentUserId, supabase)
      : null;
    return { kind: "unsupported", completedRound };
  }
  const rounds = await getOpenReadMyMindRounds(team, currentUserId, supabase);
  if (rounds.length > 0) {
    const waitingOnYou = rounds.filter((round) => round.status === "forming" && round.ownParticipantState === "pending" && round.handoffReadyAt !== null);
    const waitingOnPartner = rounds.filter((round) => round.status === "forming" && round.ownParticipantState === "joined" && round.handoffReadyAt !== null);
    const classify = (round: ReadMyMindRoundReadModel): Exclude<ReadMyMindHomebaseState, { kind: "start" | "unsupported" | "completed" }>["kind"] => {
      if (round.status === "forming") {
        if (round.ownParticipantState === "pending") return round.handoffReadyAt ? "forming_invitation" : "forming_partner_waiting";
        return round.handoffReadyAt ? "forming_creator_waiting" : "forming_creator_continue";
      }
      if (round.wholeRoundAnswerComplete) return round.ownRevealComplete ? "reveal_waiting" : "reveal_ready";
      return round.ownAnswerComplete ? "active_waiting" : "active_continue";
    };
    const priority = ["forming_invitation", "forming_creator_continue", "active_continue", "reveal_ready", "reveal_waiting", "active_waiting", "forming_creator_waiting", "forming_partner_waiting"] as const;
    const round = [...rounds].sort((left, right) => priority.indexOf(classify(left)) - priority.indexOf(classify(right)) || right.createdAt.localeCompare(left.createdAt))[0]!;
    return { kind: classify(round), round, rounds, waitingOnYouCount: waitingOnYou.length, waitingOnPartnerCount: waitingOnPartner.length };
  }
  const completedResult = await supabase
    .from("collaboration_experience_rounds")
    .select("id")
    .eq("founder_team_id", team.id)
    .eq("experience_key", "read_my_mind")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!completedResult.error && completedResult.data) {
    const round = await getReadMyMindRound(team, completedResult.data.id as string, currentUserId, supabase);
    if (round) return { kind: "completed", round, rounds: [], waitingOnYouCount: 0, waitingOnPartnerCount: 0 };
  }
  return { kind: "start" };
}

export async function findOpenReadMyMindRoundId(
  team: ReadMyMindTeamContext,
  client?: SupabaseClient
) {
  const supabase = client ?? (await createClient());
  const result = await supabase.from("collaboration_experience_rounds").select("id").eq("founder_team_id", team.id).eq("experience_key", "read_my_mind").in("status", ["forming", "active"]).limit(1).maybeSingle();
  return result.error ? null : ((result.data?.id as string | undefined) ?? null);
}

export async function getOpenReadMyMindRounds(
  team: ReadMyMindTeamContext,
  currentUserId: string,
  client?: SupabaseClient
) {
  const supabase = client ?? (await createClient());
  const result = await supabase
    .from("collaboration_experience_rounds")
    .select("id")
    .eq("founder_team_id", team.id)
    .eq("experience_key", "read_my_mind")
    .in("status", ["forming", "active"])
    .order("created_at", { ascending: true });
  if (result.error) return [];
  const rounds = await Promise.all(
    (result.data ?? []).map((row) => getReadMyMindRound(team, row.id as string, currentUserId, supabase))
  );
  return rounds.filter((round): round is ReadMyMindRoundReadModel => round !== null);
}
