"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseFinancingAlignmentAnswers } from "@/features/financing/financingAlignmentModel";
import { FINANCING_NOTE_MAX, isFinancingItemKey, isFinancingQuestionKey, isFinancingStatus } from "@/features/financing/financingModel";

/**
 * Setzt den Status eines Punktes. Die Regel (aktuelles Mitglied, gueltiger Punkt und Status)
 * steht in `set_team_financing_item`; hier wird nur weitergereicht.
 */
export async function setFinancingStatusAction(teamId: string, itemKey: string, status: string): Promise<{ ok: boolean }> {
  if (!isFinancingItemKey(itemKey) || !isFinancingStatus(status)) return { ok: false };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await client.rpc("set_team_financing_item", { p_team_id: teamId, p_item_key: itemKey, p_status: status });
  if (error) return { ok: false };
  revalidatePath(`/teams/${teamId}/finanzierung`);
  return { ok: true };
}

/** Speichert die Teamnotiz zu einer Frage. Leer loescht sie. Die Regeln stehen in `set_team_financing_note`. */
export async function setFinancingNoteAction(teamId: string, questionKey: string, note: string): Promise<{ ok: boolean }> {
  if (!isFinancingQuestionKey(questionKey) || typeof note !== "string" || note.length > FINANCING_NOTE_MAX) return { ok: false };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await client.rpc("set_team_financing_note", { p_team_id: teamId, p_question_key: questionKey, p_note: note });
  if (error) return { ok: false };
  revalidatePath(`/teams/${teamId}/finanzierung`);
  return { ok: true };
}

/** Startet eine neue Runde des Erwartungsabgleichs. Die Regeln (Mitglied, zwei Personen, nur eine offene) stehen in der Datenbank. */
export async function startFinancingAlignmentAction(teamId: string): Promise<{ ok: boolean }> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await client.rpc("start_financing_alignment", { p_team_id: teamId });
  if (error) return { ok: false };
  revalidatePath(`/teams/${teamId}/finanzierung`);
  return { ok: true };
}

/** Gibt die eigenen Antworten ab. Vollstaendig und einmal; sind alle da, schliesst die Datenbank die Runde. */
export async function submitFinancingAlignmentAction(teamId: string, alignmentId: string, answers: unknown): Promise<{ ok: boolean }> {
  const parsed = parseFinancingAlignmentAnswers(answers);
  if (!parsed) return { ok: false };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await client.rpc("submit_financing_alignment", { p_alignment_id: alignmentId, p_answers: parsed });
  if (error) return { ok: false };
  revalidatePath(`/teams/${teamId}/finanzierung`);
  return { ok: true };
}
