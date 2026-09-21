import "server-only";

import { getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { buildFounderInTheWildReveal, buildFounderInTheWildRound, type FounderInTheWildReveal, type FounderInTheWildRound, type FounderInTheWildTeam } from "./founderInTheWildModel";
import { logFounderInTheWildServerError } from "./founderInTheWildDiagnostics";
import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getFounderInTheWildTeam(teamId: string, userId: string, client?: Client): Promise<FounderInTheWildTeam | null> {
  return getReadMyMindTeamContext(teamId, userId, client);
}

export async function getFounderInTheWildRound(team: FounderInTheWildTeam, roundId: string, userId: string, client?: Client): Promise<FounderInTheWildRound | null> {
  const supabase = client ?? await createClient();
  const round = await supabase.from("collaboration_experience_rounds").select("id,founder_team_id,experience_key,pack_key,pack_version,created_by_user_id,status").eq("id", roundId).eq("founder_team_id", team.id).eq("experience_key", "founder_in_the_wild").maybeSingle();
  if (round.error) {
    logFounderInTheWildServerError("read_round", round.error);
    return null;
  }
  if (!round.data) {
    logFounderInTheWildServerError("read_round_not_visible");
    return null;
  }
  const [participants, prompts, assignments, responses, receipts, markers, state, handoffState] = await Promise.all([
    supabase.from("collaboration_experience_round_participants").select("founder_user_id,state").eq("round_id", roundId),
    supabase.from("collaboration_experience_round_prompts").select("id,prompt_key,position").eq("round_id", roundId).order("position"),
    supabase.from("collaboration_experience_prompt_assignments").select("id,round_prompt_id,target_user_id").eq("round_id", roundId),
    supabase.from("collaboration_experience_responses").select("prompt_assignment_id,respondent_user_id,response_type,choice_keys,locked_at").eq("round_id", roundId).eq("respondent_user_id", userId),
    supabase.from("collaboration_experience_reveal_receipts").select("round_prompt_id").eq("round_id", roundId).eq("participant_user_id", userId),
    supabase.from("collaboration_experience_conversation_markers").select("round_prompt_id,participant_user_id").eq("round_id", roundId),
    supabase.rpc("get_founder_in_the_wild_round_state", { p_round_id: roundId }),
    supabase.rpc("get_founder_in_the_wild_handoff_state", { p_round_id: roundId }),
  ]);
  const reads = [
    ["read_participants", participants],
    ["read_prompts", prompts],
    ["read_assignments", assignments],
    ["read_own_responses", responses],
    ["read_own_receipts", receipts],
    ["read_conversation_markers", markers],
    ["read_round_state", state],
    ["read_handoff_state", handoffState],
  ] as const;
  const failedRead = reads.find(([, result]) => result.error);
  if (failedRead) {
    logFounderInTheWildServerError(failedRead[0], failedRead[1].error);
    return null;
  }
  const stateRow = Array.isArray(state.data) ? state.data[0] : state.data;
  const projectedState = stateRow as { answer_phase_complete?: boolean; can_discard?: boolean; can_decline?: boolean; both_started?: boolean } | null;
  const handoffStateRow = Array.isArray(handoffState.data) ? handoffState.data[0] : handoffState.data;
  const projectedHandoffState = handoffStateRow as { own_started?: boolean; own_complete?: boolean; partner_started?: boolean; partner_complete?: boolean } | null;
  const readModel = buildFounderInTheWildRound({ currentUserId: userId, team, round: round.data, participants: participants.data ?? [], prompts: prompts.data ?? [], assignments: assignments.data ?? [], responses: responses.data ?? [], receipts: receipts.data ?? [], markers: markers.data ?? [], answerPhaseComplete: Boolean(projectedState?.answer_phase_complete), ownStarted: Boolean(projectedHandoffState?.own_started), ownAnswerComplete: Boolean(projectedHandoffState?.own_complete), partnerStarted: Boolean(projectedHandoffState?.partner_started), partnerAnswerComplete: Boolean(projectedHandoffState?.partner_complete), canDiscard: Boolean(projectedState?.can_discard), canDecline: Boolean(projectedState?.can_decline), bothStarted: Boolean(projectedState?.both_started) });
  if (!readModel) logFounderInTheWildServerError("build_round_read_model");
  return readModel;
}

/**
 * Die laufende Runde - egal aus welchem Pack.
 *
 * REPARIERT AM 21.09.2026: Hier stand `.eq("pack_key", "under_pressure_v1")`,
 * ein Rest aus der Zeit, als es nur ein Pack gab. Eine laufende Runde des
 * zweiten Packs war damit unsichtbar: Die Einstiegsseite und die Karte auf der
 * Teamseite zeigten "Starten", obwohl schon eine Runde lief - und das Starten
 * scheiterte dann an der Datenbank, die zu Recht nur eine offene Runde
 * zulaesst. Von aussen sah das aus wie ein Knopf, der ins Nirgendwo fuehrt.
 *
 * Und es wird nach PACK gesucht, nicht nach einer einzigen Runde: Die
 * Datenbank laesst je Team und Pack eine offene Runde zu
 * (`collaboration_experience_one_open_round_per_team_pack_idx`), es koennen
 * also zwei gleichzeitig offen sein. Mit `maybeSingle()` waere das ein Fehler
 * und damit gar keine Runde - schlimmer als der Fehler, den es ersetzt.
 */
export async function findOpenFounderInTheWildRoundsByPack(team: FounderInTheWildTeam, userId: string, client?: Client) {
  const supabase = client ?? await createClient();
  const result = await supabase.from("collaboration_experience_rounds").select("id,pack_key").eq("founder_team_id", team.id).eq("experience_key", "founder_in_the_wild").in("status", ["forming", "active"]).order("created_at", { ascending: false });
  const byPack = new Map<string, FounderInTheWildRound>();
  if (result.error || !result.data) return byPack;
  for (const row of result.data) {
    const packKey = String(row.pack_key);
    if (byPack.has(packKey)) continue;
    const round = await getFounderInTheWildRound(team, String(row.id), userId, supabase);
    if (round) byPack.set(packKey, round);
  }
  return byPack;
}

/** Fuer die Karte auf der Teamseite: die neueste offene Runde, egal welches Pack. */
export async function findOpenFounderInTheWildRound(team: FounderInTheWildTeam, userId: string, client?: Client) {
  const rounds = await findOpenFounderInTheWildRoundsByPack(team, userId, client);
  return rounds.values().next().value ?? null;
}

/**
 * Die letzte abgeschlossene Runde je Pack.
 *
 * GEMELDET AM 21.09.2026: "Das Abschliessen hat nicht richtig funktioniert.
 * Der Button fuehrte ins Nirgendwo." Er tat mehr als nichts - er raeumte alles
 * weg. Gesucht wurde nur nach offenen Runden, also war die Runde nach dem
 * Abschliessen von der Einstiegsseite UND von der Teamseite verschwunden. Das
 * Reveal, das man gerade gelesen hatte, war nur noch ueber die Zurueck-Taste
 * des Browsers erreichbar, und die markierten Gespraechspunkte mit ihm.
 */
export async function findCompletedFounderInTheWildRounds(team: FounderInTheWildTeam, client?: Client) {
  const supabase = client ?? await createClient();
  const result = await supabase
    .from("collaboration_experience_rounds")
    .select("id,pack_key,completed_at")
    .eq("founder_team_id", team.id)
    .eq("experience_key", "founder_in_the_wild")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  if (result.error || !result.data) return new Map<string, { id: string; completedAt: string | null }>();
  // Je Pack die neueste - die Reihenfolge oben sorgt dafuer, dass die erste
  // gewinnt.
  const byPack = new Map<string, { id: string; completedAt: string | null }>();
  for (const row of result.data) {
    const packKey = String(row.pack_key);
    if (!byPack.has(packKey)) {
      byPack.set(packKey, { id: String(row.id), completedAt: row.completed_at as string | null });
    }
  }
  return byPack;
}

export async function getOpenedFounderInTheWildReveal(params: { team: FounderInTheWildTeam; roundId: string; position: number; userId: string; client?: Client }): Promise<{ round: FounderInTheWildRound; reveal: FounderInTheWildReveal } | null> {
  const supabase = params.client ?? await createClient();
  const round = await getFounderInTheWildRound(params.team, params.roundId, params.userId, supabase);
  const prompt = round?.prompts.find((entry) => entry.position === params.position);
  if (!round || !prompt || !round.wholeRoundAnswerComplete || !round.openedPromptPositions.includes(params.position)) return null;
  const result = await supabase.rpc("get_founder_in_the_wild_prompt_reveal", { p_round_prompt_id: prompt.roundPromptId });
  if (result.error) return null;
  const reveal = buildFounderInTheWildReveal(round, params.userId, params.position, result.data ?? []);
  return reveal ? { round, reveal } : null;
}
