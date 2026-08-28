"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";
import { getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { isValidReadMyMindSelection } from "@/features/collaborationLab/readMyMindModel";
import { createClient } from "@/lib/supabase/server";

function entryHref(teamId: string, result?: string) {
  const href = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`;
  return result ? `${href}?result=${encodeURIComponent(result)}` : href;
}

function roundHref(teamId: string, roundId: string, result?: string) {
  const href = `${entryHref(teamId)}/${encodeURIComponent(roundId)}`;
  return result ? `${href}?result=${encodeURIComponent(result)}` : href;
}

function revealHref(teamId: string, roundId: string, position?: number, result?: string) {
  const href = `${roundHref(teamId, roundId)}/reveal${position === undefined ? "" : `/${position}`}`;
  return result ? `${href}?result=${encodeURIComponent(result)}` : href;
}

async function authenticated() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

function refresh(teamId: string, roundId?: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(entryHref(teamId));
  if (roundId) revalidatePath(roundHref(teamId, roundId));
  if (roundId) revalidatePath(revealHref(teamId, roundId));
}

export async function startReadMyMindRoundAction(teamId: string, formData: FormData) {
  const auth = await authenticated();
  if (!auth) redirect(`/login?next=${encodeURIComponent(entryHref(teamId))}`);
  const team = await getReadMyMindTeamContext(teamId, auth.user.id, auth.supabase);
  if (!team || team.members.length !== 2) redirect(entryHref(teamId, "unavailable"));
  const packKey = String(formData.get("packKey") ?? "");
  const packVersion = Number(formData.get("packVersion"));
  if (!getReadMyMindPack(packKey, packVersion)) redirect(entryHref(teamId, "invalid"));
  const { data, error } = await auth.supabase.rpc("create_collaboration_experience_round", {
    p_founder_team_id: teamId,
    p_pack_key: packKey,
    p_pack_version: packVersion,
  });
  if (error || typeof data !== "string") redirect(entryHref(teamId, "changed"));
  refresh(teamId, data);
  redirect(roundHref(teamId, data));
}

async function mutateRound(
  teamId: string,
  roundId: string,
  rpc: "join_collaboration_experience_round" | "decline_collaboration_experience_round" | "abandon_collaboration_experience_round"
) {
  const auth = await authenticated();
  if (!auth) redirect(`/login?next=${encodeURIComponent(roundHref(teamId, roundId))}`);
  const team = await getReadMyMindTeamContext(teamId, auth.user.id, auth.supabase);
  if (!team || team.members.length !== 2) redirect(entryHref(teamId, "unavailable"));
  const round = await getReadMyMindRound(team, roundId, auth.user.id, auth.supabase);
  if (!round) redirect(entryHref(teamId, "unavailable"));
  const { error } = await auth.supabase.rpc(rpc, { p_round_id: roundId });
  if (error) redirect(roundHref(teamId, roundId, "changed"));
  refresh(teamId, roundId);
  redirect(roundHref(teamId, roundId));
}

export async function joinReadMyMindRoundAction(teamId: string, roundId: string) {
  return mutateRound(teamId, roundId, "join_collaboration_experience_round");
}

export async function declineReadMyMindRoundAction(teamId: string, roundId: string) {
  return mutateRound(teamId, roundId, "decline_collaboration_experience_round");
}

export async function abandonReadMyMindRoundAction(teamId: string, roundId: string) {
  return mutateRound(teamId, roundId, "abandon_collaboration_experience_round");
}

export async function lockReadMyMindPromptAction(
  teamId: string,
  roundId: string,
  roundPromptId: string,
  formData: FormData
) {
  const auth = await authenticated();
  if (!auth) redirect(`/login?next=${encodeURIComponent(roundHref(teamId, roundId))}`);
  const team = await getReadMyMindTeamContext(teamId, auth.user.id, auth.supabase);
  if (!team || team.members.length !== 2) redirect(entryHref(teamId, "unavailable"));
  const round = await getReadMyMindRound(team, roundId, auth.user.id, auth.supabase);
  const prompt = round?.prompts.find((entry) => entry.roundPromptId === roundPromptId);
  if (!round || round.status !== "active" || round.ownParticipantState !== "joined" || !prompt) {
    redirect(roundHref(teamId, roundId, "changed"));
  }

  const slots = [prompt.self, prompt.guess, ...(prompt.need ? [prompt.need] : [])];
  for (const slot of slots) {
    if (slot.lockedAt) continue;
    const choices = formData.getAll(slot.responseType).filter((entry): entry is string => typeof entry === "string");
    if (!isValidReadMyMindSelection(slot.contract, choices)) {
      redirect(roundHref(teamId, roundId, "invalid"));
    }
  }
  for (const slot of slots) {
    if (slot.lockedAt) continue;
    const choices = formData.getAll(slot.responseType).filter((entry): entry is string => typeof entry === "string");
    const { error } = await auth.supabase.rpc("lock_collaboration_response", {
      p_prompt_assignment_id: slot.assignmentId,
      p_response_type: slot.responseType,
      p_choice_keys: choices,
    });
    if (error) {
      const result = error.message.includes("is_locked") ? "locked" : "changed";
      refresh(teamId, roundId);
      redirect(roundHref(teamId, roundId, result));
    }
  }
  refresh(teamId, roundId);
  redirect(roundHref(teamId, roundId));
}

export async function openReadMyMindRevealAction(
  teamId: string,
  roundId: string,
  position: number
) {
  const auth = await authenticated();
  if (!auth) redirect(`/login?next=${encodeURIComponent(revealHref(teamId, roundId, position))}`);
  const team = await getReadMyMindTeamContext(teamId, auth.user.id, auth.supabase);
  if (!team) redirect(entryHref(teamId, "unavailable"));
  const round = await getReadMyMindRound(team, roundId, auth.user.id, auth.supabase);
  const prompt = round?.prompts.find((entry) => entry.position === position);
  if (!round || !prompt || !round.wholeRoundAnswerComplete || !["active", "completed"].includes(round.status)) {
    redirect(revealHref(teamId, roundId, undefined, "answers-incomplete"));
  }
  const { error } = await auth.supabase.rpc("get_collaboration_prompt_reveal", {
    p_round_prompt_id: prompt.roundPromptId,
  });
  if (error) redirect(revealHref(teamId, roundId, undefined, "answers-incomplete"));
  refresh(teamId, roundId);
  revalidatePath(revealHref(teamId, roundId, position));
  redirect(revealHref(teamId, roundId, position));
}

export async function completeReadMyMindRoundAction(teamId: string, roundId: string) {
  const auth = await authenticated();
  if (!auth) redirect(`/login?next=${encodeURIComponent(revealHref(teamId, roundId))}`);
  const team = await getReadMyMindTeamContext(teamId, auth.user.id, auth.supabase);
  if (!team) redirect(entryHref(teamId, "unavailable"));
  const round = await getReadMyMindRound(team, roundId, auth.user.id, auth.supabase);
  if (!round || !round.wholeRoundAnswerComplete || !["active", "completed"].includes(round.status)) {
    redirect(revealHref(teamId, roundId, undefined, "answers-incomplete"));
  }
  const { error } = await auth.supabase.rpc("complete_collaboration_experience_round", {
    p_round_id: roundId,
  });
  if (error) {
    const result = error.message.includes("reveals_incomplete") ? "waiting" : "changed";
    redirect(revealHref(teamId, roundId, undefined, result));
  }
  refresh(teamId, roundId);
  redirect(revealHref(teamId, roundId, undefined, "completed"));
}
