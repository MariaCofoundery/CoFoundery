"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  CHECK_IN_LIMITS,
  checkInHref,
  isCheckInAnswer,
  isCheckInInterval,
  type CheckInItem,
} from "@/features/checkIn/checkInModel";

export type CheckInActionResult = { ok: true; id?: string; status?: string } | { ok: false; error: string };

const KNOWN_ERRORS = [
  "team_check_in_already_open", "team_check_in_no_topics", "team_check_in_not_editable",
  "team_check_in_already_submitted", "team_check_in_input_invalid", "team_check_in_phase_locked",
  "team_check_in_retro_already_offered",
];
const errorKey = (message: string | undefined) => KNOWN_ERRORS.find((key) => message?.includes(key)) ?? "team_check_in_unavailable";
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

async function authenticated() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

function refresh(teamId: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(checkInHref(teamId));
}

async function call(teamId: string, rpc: string, args: Record<string, unknown>): Promise<CheckInActionResult> {
  const auth = await authenticated();
  if (!auth) return { ok: false, error: "team_check_in_unavailable" };
  const { data, error } = await auth.supabase.rpc(rpc, args);
  if (error) return { ok: false, error: errorKey(error.message) };
  refresh(teamId);
  return { ok: true, id: typeof data === "string" && data.length === 36 ? data : undefined, status: typeof data === "string" && data.length !== 36 ? data : undefined };
}

export async function setCheckInIntervalAction(teamId: string, days: number): Promise<CheckInActionResult> {
  const interval = isCheckInInterval(days);
  if (!interval) return { ok: false, error: "team_check_in_input_invalid" };
  return call(teamId, "set_team_check_in_interval", { p_team_id: teamId, p_days: interval });
}

export async function startCheckInAction(teamId: string): Promise<CheckInActionResult> {
  return call(teamId, "start_team_check_in", { p_team_id: teamId });
}
export async function skipCheckInAction(teamId: string): Promise<CheckInActionResult> {
  return call(teamId, "skip_team_check_in", { p_team_id: teamId });
}

export async function setCheckInTopicIncludedAction(teamId: string, topicId: string, included: boolean): Promise<CheckInActionResult> {
  return call(teamId, "set_team_check_in_topic_included", { p_topic_id: topicId, p_included: Boolean(included) });
}

export async function addCheckInTopicAction(teamId: string, checkInId: string, topic: string): Promise<CheckInActionResult> {
  return call(teamId, "add_team_check_in_topic", { p_check_in_id: checkInId, p_text: text(topic, CHECK_IN_LIMITS.customTopic) });
}

export async function submitCheckInAction(
  teamId: string,
  checkInId: string,
  answers: Array<{ topicId: string; answer: string; note: string }>
): Promise<CheckInActionResult> {
  const clean = (Array.isArray(answers) ? answers : []).map((entry) => ({
    topic_id: text(entry?.topicId, 64),
    answer: isCheckInAnswer(entry?.answer),
    note: text(entry?.note, CHECK_IN_LIMITS.note),
  }));
  if (clean.some((entry) => !entry.answer)) return { ok: false, error: "team_check_in_input_invalid" };
  return call(teamId, "submit_team_check_in", { p_check_in_id: checkInId, p_answers: clean });
}

const cleanItems = (items: CheckInItem[]) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({ t: text(item?.t, CHECK_IN_LIMITS.retroQuestion), on: Boolean(item?.on) }))
    .filter((item) => item.t !== "")
    .slice(0, CHECK_IN_LIMITS.items);

export async function offerRetroAction(teamId: string, checkInId: string, questions: CheckInItem[]): Promise<CheckInActionResult> {
  return call(teamId, "offer_team_check_in_retro", { p_check_in_id: checkInId, p_questions: cleanItems(questions) });
}

export async function respondRetroAction(teamId: string, checkInId: string, join: boolean): Promise<CheckInActionResult> {
  return call(teamId, "respond_team_check_in_retro", { p_check_in_id: checkInId, p_in: Boolean(join) });
}

export async function submitRetroAction(teamId: string, checkInId: string, answers: Array<{ q: string; a: string }>): Promise<CheckInActionResult> {
  return call(teamId, "submit_team_check_in_retro", {
    p_check_in_id: checkInId,
    p_answers: (Array.isArray(answers) ? answers : []).slice(0, CHECK_IN_LIMITS.items).map((entry) => ({
      q: text(entry?.q, CHECK_IN_LIMITS.retroQuestion),
      a: text(entry?.a, CHECK_IN_LIMITS.retroAnswer),
    })),
  });
}
