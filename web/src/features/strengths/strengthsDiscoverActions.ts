"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { STRENGTHS_INTERVIEW } from "@/features/interviews/interviewKinds";
import { createClient } from "@/lib/supabase/server";
import {
  canSkipScene,
  checkScene,
  cleanIntroNotes,
  cleanSceneSelection,
  DISCOVER_GUIDE_VERSION,
  DISCOVER_MAX_LENGTH,
  DISCOVER_MIN_LENGTH,
  isSceneWhen,
  isValidSceneSelection,
  ROUND_THREE,
  type DiscoverTurn,
} from "@/features/strengths/strengthsDiscoverGuide";
import { getActiveStrengthsInterview, type StrengthsInterviewState } from "@/features/strengths/strengthsInterviewData";

/**
 * Die Handlungen von „Stärken entdecken“ (Fassung 3).
 *
 * Alles läuft über die Tabellen des Stärken-Gesprächs; die Auswertung (`request_strength_proposals`)
 * bleibt, wie sie war. Der Stand der Person ergibt sich aus den Fragen des Gesprächs
 * (`discoverPhase`) - es gibt keinen eigenen Zähler, der von den Antworten abweichen könnte.
 *
 * Jede Handlung prüft zuerst, dass es ein offenes Gespräch der Fassung 3 gibt und dass die Frage,
 * auf die sich die Handlung bezieht, gerade wirklich dran ist. Etwas anderes ist kein Fehler,
 * sondern ein veralteter Tab: Die Person landet leise wieder dort, wo es weitergeht.
 */

const PATH = "/profile/strengths-interview";

function back(error: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?error=${encodeURIComponent(error)}`);
}

function onward(notice?: string): never {
  revalidatePath(PATH);
  redirect(notice ? `${PATH}?notice=${notice}` : PATH);
}

async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);
  return { client, userId: user.id };
}

type Client = Awaited<ReturnType<typeof createClient>>;

const toDiscoverTurns = (state: StrengthsInterviewState): DiscoverTurn[] =>
  state.turns.map((turn) => ({ questionId: turn.questionId, answered: turn.answer !== null, skipped: turn.skipped }));

async function activeV3(client: Client) {
  const state = await getActiveStrengthsInterview(client);
  return state && state.guideVersion >= DISCOVER_GUIDE_VERSION ? state : null;
}

async function complete(client: Client, sessionId: string): Promise<never> {
  const { error } = await client
    .from("capability_interview_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("kind", STRENGTHS_INTERVIEW);
  if (error) back("complete");
  revalidatePath("/profile");
  revalidatePath("/align");
  return onward("completed");
}

/** Nach dem Intro: das Gespräch anlegen - oder bei einem offenen dort weitermachen. */
export async function startDiscoverAction(formData: FormData) {
  const { client, userId } = await requireUser();
  if (await getActiveStrengthsInterview(client)) onward();

  let notes: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("notes") ?? "[]"));
    notes = cleanIntroNotes(Array.isArray(parsed) ? parsed : []);
  } catch {
    notes = [];
  }

  const { error } = await client
    .from("capability_interview_sessions")
    .insert({ user_id: userId, kind: STRENGTHS_INTERVIEW, guide_version: DISCOVER_GUIDE_VERSION, intro_notes: notes });
  if (error) back("start");
  onward();
}

/** Die Szenen wählen: fünf oder sechs, in der Reihenfolge der Person. */
export async function pickScenesAction(formData: FormData) {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state || state.turns.length > 0) onward();

  const ids = cleanSceneSelection(formData.getAll("scene").map(String));
  if (!isValidSceneSelection(ids)) back("scenes");

  const { error } = await client.from("capability_interview_turns").insert(
    ids.map((id, index) => ({
      session_id: state.sessionId,
      kind: STRENGTHS_INTERVIEW,
      sort_order: index + 1,
      question_source: "catalogue",
      question_id: id,
    })),
  );
  if (error) back("save");
  onward();
}

function currentSceneTurn(state: StrengthsInterviewState, turnId: string) {
  return state.phase.phase === "scene" && state.turns[state.phase.index]?.id === turnId ? state.turns[state.phase.index] : null;
}

/** Eine Szene festhalten: die drei Teile und wann es war. Dann weiter oder pausieren. */
export async function saveSceneAction(formData: FormData) {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state) onward();
  const turn = currentSceneTurn(state, String(formData.get("turnId") ?? ""));
  if (!turn) onward();

  const checked = checkScene({
    situation: String(formData.get("situation") ?? ""),
    action: String(formData.get("action") ?? ""),
    outcome: String(formData.get("outcome") ?? ""),
  });
  if (!checked.ok) back(checked.reason);

  const when = String(formData.get("when") ?? "");
  const { error } = await client
    .from("capability_interview_turns")
    .update({
      answer: checked.answer,
      answered_at: new Date().toISOString(),
      answer_parts: checked.parts,
      happened_when: isSceneWhen(when) ? when : null,
    })
    .eq("id", turn.id)
    .eq("kind", STRENGTHS_INTERVIEW);
  if (error) back("save");

  onward(String(formData.get("mode")) === "pause" ? "paused" : undefined);
}

/** Eine Szene überspringen - nur, solange danach noch fünf beantwortbar bleiben. */
export async function skipSceneAction(formData: FormData) {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state) onward();
  const turn = currentSceneTurn(state, String(formData.get("turnId") ?? ""));
  if (!turn) onward();
  if (!canSkipScene(toDiscoverTurns(state))) back("too_few_scenes");

  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer_parts: { skipped: true } })
    .eq("id", turn.id)
    .eq("kind", STRENGTHS_INTERVIEW)
    .is("answer", null);
  if (error) back("save");
  onward();
}

/** Nach dem Zwischenstand: die dritte Runde beginnen. */
export async function startRoundThreeAction() {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state || state.phase.phase !== "interim") onward();

  const start = state.turns.reduce((max, turn) => Math.max(max, turn.sortOrder), 0);
  const { error } = await client.from("capability_interview_turns").insert(
    ROUND_THREE.map((question, index) => ({
      session_id: state.sessionId,
      kind: STRENGTHS_INTERVIEW,
      sort_order: start + index + 1,
      question_source: "catalogue",
      question_id: question.id,
    })),
  );
  if (error) back("save");
  onward();
}

/** Nach dem Zwischenstand abschließen, ohne die dritte Runde. Die fünf Szenen sind dann sichergestellt. */
export async function finishWithoutRoundThreeAction() {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state || state.phase.phase !== "interim") onward();
  return complete(client, state.sessionId);
}

function currentRoundThreeTurn(state: StrengthsInterviewState, turnId: string) {
  return state.phase.phase === "round3" && state.turns[state.phase.index]?.id === turnId ? state.turns[state.phase.index] : null;
}

/** Zwischenspeichern in der dritten Runde: als Entwurf, nicht als Antwort - sonst rückte die Frage von selbst weiter. */
export async function autosaveRoundThreeDraftAction(input: { turnId: string; answer: string }): Promise<{ saved: boolean }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return { saved: false };
  const answer = input.answer.trim();
  if (answer.length < DISCOVER_MIN_LENGTH || answer.length > DISCOVER_MAX_LENGTH) return { saved: false };

  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer_parts: { draft: answer } })
    .eq("id", input.turnId)
    .eq("kind", STRENGTHS_INTERVIEW)
    .is("answer", null);
  return { saved: !error };
}

async function afterRoundThree(client: Client, sessionId: string) {
  const state = await activeV3(client);
  if (state && state.phase.phase === "finish") await complete(client, sessionId);
  onward();
}

/** Eine Antwort der dritten Runde festhalten - dann weiter, pausieren oder (nach der letzten) abschließen. */
export async function saveRoundThreeAnswerAction(formData: FormData) {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state) onward();
  const turn = currentRoundThreeTurn(state, String(formData.get("turnId") ?? ""));
  if (!turn) onward();

  const answer = String(formData.get("answer") ?? "").trim();
  const mode = String(formData.get("mode") ?? "next");
  if (answer.length > 0) {
    if (answer.length < DISCOVER_MIN_LENGTH) back("short");
    if (answer.length > DISCOVER_MAX_LENGTH) back("long");
    const { error } = await client
      .from("capability_interview_turns")
      .update({ answer, answered_at: new Date().toISOString(), answer_parts: null })
      .eq("id", turn.id)
      .eq("kind", STRENGTHS_INTERVIEW);
    if (error) back("save");
  }
  if (mode === "pause") onward("paused");
  return afterRoundThree(client, state.sessionId);
}

export async function skipRoundThreeAction(formData: FormData) {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state) onward();
  const turn = currentRoundThreeTurn(state, String(formData.get("turnId") ?? ""));
  if (!turn) onward();

  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer_parts: { skipped: true } })
    .eq("id", turn.id)
    .eq("kind", STRENGTHS_INTERVIEW)
    .is("answer", null);
  if (error) back("save");
  return afterRoundThree(client, state.sessionId);
}
