"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseWorkstyleAnswer, parseWorkstyleV3Answer } from "@/features/instruments/workstyle/answers";
import { assertWorkstylePretestReady, workstyleRegistryFor } from "@/features/instruments/workstyle/registry";
import { getMyWorkstylePretest, type ResearchContext, type ResearchFeedback } from "@/features/instruments/workstyle/data";
import { CURRENT_WORKSTYLE_VERSION } from "@/features/instruments/workstyle/current";
import consentText from "../../../../docs/founder-workstyle-research-consent-v1.json";
import consentV2 from "../../../../docs/founder-workstyle-research-consent-v2.json";
import consentV3 from "../../../../docs/founder-workstyle-research-consent-v3.json";

const root = "/research/workstyle-pretest";
const failure = { ok: false as const, error: "Das konnte nicht gespeichert werden. Bitte lade deinen Stand neu und versuche es noch einmal." };

export async function startWorkstylePretest(consent: boolean, context: ResearchContext, newAssessment = false, version = "8.5a-v1") {
  if (consent !== true) return { ok: false as const, error: "Bitte willige zuerst ausdrücklich in den Research-Pretest ein." };
  assertWorkstylePretestReady(version);
  // Phase 10 - Cutover: Fruehere Fassungen (8.5a-v1/-v2) werden nicht neu
  // begonnen. Wer dort schon eine Teilnahme hat, behaelt sie.
  if (version !== CURRENT_WORKSTYLE_VERSION && (newAssessment || !(await getMyWorkstylePretest(version))))
    return { ok: false as const, error: "Diese Fassung wird nicht mehr neu begonnen. Bitte nutze die aktuelle Fassung." };
  const client = await createClient();
  const { data, error } = await client.rpc("start_workstyle_pretest", {
    p_consent_version: (version === "8.5a-v3" ? consentV3 : version === "8.5a-v2" ? consentV2 : consentText).consent_version, p_context: context, p_new: newAssessment,
  });
  if (error) return failure;
  revalidatePath(root);
  return { ok: true as const, session: data as NonNullable<Awaited<ReturnType<typeof getMyWorkstylePretest>>> };
}

/** Phase 11.6: Arbeitsprofil starten oder fortsetzen - ohne Forschungseinwilligung. */
export async function startWorkstyleProduct(newAssessment = false) {
  const client = await createClient();
  const { data, error } = await client.rpc("start_workstyle_product", { p_new: newAssessment });
  if (error) return failure;
  revalidatePath(root);
  return { ok: true as const, session: data as NonNullable<Awaited<ReturnType<typeof getMyWorkstylePretest>>> };
}

/** Phase 11.6: freiwillige Forschung - nur mit ausdruecklicher Einwilligung, nach dem Arbeitsprofil. */
export async function startWorkstyleResearch(consent: boolean, context: ResearchContext) {
  if (consent !== true) return { ok: false as const, error: "Bitte willige zuerst ausdrücklich in die Forschung ein." };
  const client = await createClient();
  const { data, error } = await client.rpc("start_workstyle_research", { p_consent_version: consentV3.consent_version, p_context: context });
  if (error) return failure;
  revalidatePath(root);
  revalidatePath("/me/profile/workstyle");
  return { ok: true as const, session: data as NonNullable<Awaited<ReturnType<typeof getMyWorkstylePretest>>> };
}

export async function saveWorkstyleAnswer(assessmentId: string, itemKey: string, input: unknown, responseTimeMs: number, version = "8.5a-v1") {
  const session = await getMyWorkstylePretest(version);
  if (!session || session.assessment_id !== assessmentId || session.withdrawn_at || session.completed_at) return failure;
  const item = workstyleRegistryFor(session.assessment_version).items.find(candidate => candidate.item_key === itemKey);
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

export async function completeWorkstylePretest(assessmentId: string, version = "8.5a-v1") {
  const session = await getMyWorkstylePretest(version);
  if (!session || session.assessment_id !== assessmentId || session.withdrawn_at) return failure;
  const client = await createClient();
  const { error } = await client.rpc("complete_workstyle_pretest", { p_assessment_id: session.assessment_id });
  if (error) return failure;
  revalidatePath(root);
  return { ok: true as const, session: (await getMyWorkstylePretest(version))! };
}

export async function saveWorkstyleFeedback(assessmentId: string, feedback: ResearchFeedback, version = "8.5a-v1") {
  const session = await getMyWorkstylePretest(version);
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
  revalidatePath("/me/profile/workstyle");
  return { ok: true as const };
}

export async function setWorkstylePosition(assessmentId: string, position: number) {
  const client = await createClient();
  const { error } = await client.rpc("set_workstyle_pretest_position", { p_assessment_id: assessmentId, p_position: position });
  return error ? failure : { ok: true as const };
}

export async function finishWorkstyleV2(assessmentId: string, input: unknown, responseTimeMs: number) {
  const session = await getMyWorkstylePretest("8.5a-v2");
  if (!session || session.assessment_id !== assessmentId || session.withdrawn_at) return failure;
  const item = workstyleRegistryFor("8.5a-v2").items.find(item => item.item_key === "EXP-05")!;
  let answer;
  try {
    answer = parseWorkstyleAnswer({ assessment_version: "8.5a-v2", item_key: item.item_key, item_version: item.item_version }, null, input);
  } catch { return failure; }
  const client = await createClient();
  const { data, error } = await client.rpc("finish_workstyle_pretest_v2", {
    p_assessment_id: assessmentId, p_item_version: answer.item_version,
    p_response_value: answer.response_value, p_missing_reason: answer.missing_reason,
    p_response_time_ms: Number.isFinite(responseTimeMs) ? Math.min(86400000, Math.max(0, Math.round(responseTimeMs))) : null,
  });
  if (error) return failure;
  revalidatePath(root);
  return { ok: true as const, session: { ...session, completed_at: (data as { completed_at: string }).completed_at,
    answers: [...session.answers.filter(a => a.item_key !== answer.item_key), answer] } };
}

export async function saveWorkstyleV3(assessmentId: string, itemKey: string, input: unknown, responseTimeMs: number, finalize = false) {
  const session = await getMyWorkstylePretest("8.5a-v3");
  if (!session || session.assessment_id !== assessmentId || session.withdrawn_at) return failure;
  let answer;
  try {
    answer = parseWorkstyleV3Answer(itemKey, workstyleRegistryFor("8.5a-v3").pool_version, input);
  } catch { return failure; }
  const client = await createClient();
  const { data, error } = await client.rpc("save_workstyle_pretest_v3", {
    p_assessment_id: assessmentId, p_item_key: answer.item_key, p_item_version: answer.item_version,
    p_response_value: answer.response_value, p_response_option: answer.response_option, p_missing_reason: answer.missing_reason,
    p_rendered_order: answer.rendered_order, p_finalize: finalize,
    p_response_time_ms: Number.isFinite(responseTimeMs) ? Math.min(86400000, Math.max(0, Math.round(responseTimeMs))) : null,
  });
  if (error) return failure;
  const saved = data as { submitted_at: string | null; completed_at: string | null; answer: typeof session.answers[number] };
  if (finalize || saved.submitted_at !== session.submitted_at || saved.completed_at !== session.completed_at) {
    revalidatePath(root);
    revalidatePath("/me/profile/workstyle");
  }
  return { ok: true as const, answer: saved.answer, submitted_at: saved.submitted_at, completed_at: saved.completed_at };
}
