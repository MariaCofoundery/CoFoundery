"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isFounderInTheWildChoice } from "./founderInTheWildContent";
import { getFounderInTheWildRound, getFounderInTheWildTeam } from "./founderInTheWildData";
import { logFounderInTheWildServerError } from "./founderInTheWildDiagnostics";
import { founderInTheWildEntryHref, founderInTheWildRevealHref, founderInTheWildRoundHref } from "./founderInTheWildRoutes";
import { createClient } from "@/lib/supabase/server";

const entryHref = founderInTheWildEntryHref;
const roundHref = founderInTheWildRoundHref;
const revealHref = founderInTheWildRevealHref;

async function auth(next: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

function refresh(teamId: string, roundId?: string) {
  revalidatePath(`/teams/${teamId}`); revalidatePath(entryHref(teamId));
  if (roundId) { revalidatePath(roundHref(teamId, roundId)); revalidatePath(revealHref(teamId, roundId)); }
}

export async function startFounderInTheWildRoundAction(teamId: string) {
  const { supabase, user } = await auth(entryHref(teamId));
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
  if (!team || team.members.length !== 2) redirect(`${entryHref(teamId)}?result=unavailable`);
  const result = await supabase.rpc("create_founder_in_the_wild_round", { p_founder_team_id: teamId, p_pack_key: "under_pressure_v1", p_pack_version: 1 });
  if (result.error) {
    logFounderInTheWildServerError("create_round", result.error);
    redirect(`${entryHref(teamId)}?result=changed`);
  }
  if (typeof result.data !== "string") {
    logFounderInTheWildServerError("create_round_return_contract");
    redirect(`${entryHref(teamId)}?result=changed`);
  }
  const round = await getFounderInTheWildRound(team, result.data, user.id, supabase);
  if (!round) redirect(`${entryHref(teamId)}?result=changed`);
  refresh(teamId, round.id); redirect(roundHref(teamId, round.id));
}

export async function lockFounderInTheWildScenarioAction(teamId: string, roundId: string, roundPromptId: string, formData: FormData) {
  const { supabase, user } = await auth(roundHref(teamId, roundId));
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
  const round = team ? await getFounderInTheWildRound(team, roundId, user.id, supabase) : null;
  const prompt = round?.prompts.find((entry) => entry.roundPromptId === roundPromptId);
  if (!round || !prompt || round.status !== "active") redirect(`${entryHref(teamId)}?result=changed`);
  for (const responseType of ["move", "matters", "need"] as const) {
    const keys = formData.getAll(responseType).filter((value): value is string => typeof value === "string");
    if (!isFounderInTheWildChoice(responseType, prompt.content, keys)) redirect(`${roundHref(teamId, roundId)}?result=invalid`);
    const slot = prompt[responseType];
    if (slot.lockedAt) continue;
    const result = await supabase.rpc("lock_founder_in_the_wild_response", { p_prompt_assignment_id: slot.assignmentId, p_response_type: responseType, p_choice_keys: keys });
    if (result.error) redirect(`${roundHref(teamId, roundId)}?result=changed`);
  }
  refresh(teamId, roundId); redirect(roundHref(teamId, roundId));
}

export async function openFounderInTheWildRevealAction(teamId: string, roundId: string, position: number) {
  const { supabase, user } = await auth(revealHref(teamId, roundId, position));
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
  const round = team ? await getFounderInTheWildRound(team, roundId, user.id, supabase) : null;
  const prompt = round?.prompts.find((entry) => entry.position === position);
  if (!round?.wholeRoundAnswerComplete || !prompt) redirect(roundHref(teamId, roundId));
  const result = await supabase.rpc("get_founder_in_the_wild_prompt_reveal", { p_round_prompt_id: prompt.roundPromptId });
  if (result.error) redirect(roundHref(teamId, roundId));
  refresh(teamId, roundId); redirect(revealHref(teamId, roundId, position));
}

export async function completeFounderInTheWildRoundAction(teamId: string, roundId: string) {
  const { supabase } = await auth(revealHref(teamId, roundId));
  const result = await supabase.rpc("complete_founder_in_the_wild_round", { p_round_id: roundId });
  refresh(teamId, roundId); redirect(`${revealHref(teamId, roundId)}?result=${result.error ? "waiting" : "completed"}`);
}

async function endRound(teamId: string, roundId: string, action: "discard" | "decline") {
  const { supabase, user } = await auth(roundHref(teamId, roundId));
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
  const round = team ? await getFounderInTheWildRound(team, roundId, user.id, supabase) : null;
  if (!round || (action === "discard" ? !round.canDiscard : !round.canDecline)) redirect(`${roundHref(teamId, roundId)}?result=changed`);
  const result = await supabase.rpc("end_founder_in_the_wild_round", { p_round_id: roundId, p_action: action });
  if (result.error) redirect(`${roundHref(teamId, roundId)}?result=changed`);
  refresh(teamId, roundId); redirect(`${entryHref(teamId)}?result=${action === "discard" ? "discarded" : "declined"}`);
}

export async function discardFounderInTheWildRoundAction(teamId: string, roundId: string) { return endRound(teamId, roundId, "discard"); }
export async function declineFounderInTheWildRoundAction(teamId: string, roundId: string) { return endRound(teamId, roundId, "decline"); }

async function marker(teamId: string, roundId: string, position: number, roundPromptId: string, rpc: "mark_collaboration_prompt_for_conversation" | "unmark_collaboration_prompt_for_conversation") {
  const { supabase } = await auth(revealHref(teamId, roundId, position));
  await supabase.rpc(rpc, { p_round_prompt_id: roundPromptId });
  refresh(teamId, roundId); redirect(`${revealHref(teamId, roundId, position)}#conversation-marker`);
}

export async function markFounderInTheWildConversationAction(teamId: string, roundId: string, position: number, roundPromptId: string) { return marker(teamId, roundId, position, roundPromptId, "mark_collaboration_prompt_for_conversation"); }
export async function unmarkFounderInTheWildConversationAction(teamId: string, roundId: string, position: number, roundPromptId: string) { return marker(teamId, roundId, position, roundPromptId, "unmark_collaboration_prompt_for_conversation"); }
