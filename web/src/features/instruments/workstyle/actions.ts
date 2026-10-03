"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseWorkstyleAnswer } from "@/features/instruments/workstyle/answers";
import { assertWorkstylePretestReady, WORKSTYLE_PRETEST_V1 } from "@/features/instruments/workstyle/registry";
import { getMyWorkstylePretest, type ResearchContext, type ResearchFeedback } from "@/features/instruments/workstyle/data";
import consentText from "../../../../docs/founder-workstyle-research-consent-v1.json";

const root = "/research/workstyle-pretest";
const failure = { ok: false as const, error: "Das konnte nicht gespeichert werden. Bitte lade deinen Stand neu und versuche es noch einmal." };

export async function startWorkstylePretest(consent: boolean, context: ResearchContext, newAssessment = false) {
  if (consent !== true) return { ok: false as const, error: "Bitte willige zuerst ausdrücklich in den Research-Pretest ein." };
  assertWorkstylePretestReady();
  const client = await createClient();
  const { data, error } = await client.rpc("start_workstyle_pretest", {
    p_consent_version: consentText.consent_version, p_context: context, p_new: newAssessment,
  });
  if (error) return failure;
  revalidatePath(root);
  return { ok: true as const, session: data as NonNullable<Awaited<ReturnType<typeof getMyWorkstylePretest>>> };
}

export async function saveWorkstyleAnswer(assessmentId: string, itemKey: string, input: unknown, responseTimeMs: number) {
  const session = await getMyWorkstylePretest();
  if (!session || session.assessment_id !== assessmentId || session.withdrawn_at || session.completed_at) return failure;
  const item = WORKSTYLE_PRETEST_V1.items.find(candidate => candidate.item_key === itemKey);
  if (!item) return failure;
  let answer;
  try {
    answer = parseWorkstyleAnswer({ item_key: itemKey, item_version: item.item_version, assessment_version: session.assessment_version }, session.form, input);
  } catch { return failure; }
  const client = await createClient();
  const { error } = await client.rpc("save_workstyle_pretest_answer", {
    p_assessment_id: session.assessment_id, p_item_key: answer.item_key, p_item_version: answer.item_version,
    p_response_value: answer.response_value, p_missing_reason: answer.missing_reason,
    p_response_time_ms: Number.isFinite(responseTimeMs) ? Math.min(86400000, Math.max(0, Math.round(responseTimeMs))) : null,
  });
  if (error) return failure;
  return { ok: true as const, answer };
}

export async function completeWorkstylePretest(assessmentId: string) {
  const session = await getMyWorkstylePretest();
  if (!session || session.assessment_id !== assessmentId || session.withdrawn_at) return failure;
  const client = await createClient();
  const { error } = await client.rpc("complete_workstyle_pretest", { p_assessment_id: session.assessment_id });
  if (error) return failure;
  revalidatePath(root);
  return { ok: true as const, session: (await getMyWorkstylePretest())! };
}

export async function saveWorkstyleFeedback(assessmentId: string, feedback: ResearchFeedback) {
  const session = await getMyWorkstylePretest();
  if (!session || session.assessment_id !== assessmentId || session.withdrawn_at || !session.completed_at) return failure;
  const client = await createClient();
  const { error } = await client.rpc("save_workstyle_feedback", { p_assessment_id: session.assessment_id, p_feedback: feedback });
  if (error) return failure;
  revalidatePath(root);
  return { ok: true as const };
}

export async function withdrawWorkstyleResearch() {
  const client = await createClient();
  const { error } = await client.rpc("withdraw_workstyle_research");
  if (error) return failure;
  revalidatePath(root);
  revalidatePath("/account");
  return { ok: true as const };
}
