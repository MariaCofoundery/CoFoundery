"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { STRENGTHS_INTERVIEW } from "@/features/interviews/interviewKinds";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveStrengthsInterview,
  type StrengthsInterviewState,
} from "@/features/strengths/strengthsInterviewData";
import {
  nextStrengthsQuestion,
  STRENGTHS_MAX_LENGTH,
  STRENGTHS_MIN_ANSWERS,
  STRENGTHS_MIN_LENGTH,
} from "@/features/strengths/strengthsInterviewGuide";

/**
 * Die Handlungen des Stärken-Interviews.
 *
 * DIESELBE MECHANIK WIE DIRECTION (`directionInterviewActions.ts`), andere
 * Art und andere Fragen. Was danach passiert, ist eigen: Keine Einordnung in
 * Bereiche, sondern - auf ausdrückliche Anforderung - eine Auswertung des
 * ganzen Gesprächs (`request_strength_proposals`).
 */

const PATH = "/profile/strengths-interview";

function back(error: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?error=${encodeURIComponent(error)}`);
}

async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);
  return { client, userId: user.id };
}

/** Nicht mehr die aktuelle Frage: abgeschlossen oder schon beantwortet ist kein Fehler. */
function continueQuietly(state: StrengthsInterviewState | null, turnId: string): never {
  if (!state) {
    revalidatePath(PATH);
    redirect(PATH);
  }
  const known = state.turns.find((turn) => turn.id === turnId);
  if (known && known.answer !== null) {
    revalidatePath(PATH);
    redirect(PATH);
  }
  back("stale");
}

async function appendQuestion(
  client: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  turns: StrengthsInterviewState["turns"]
) {
  const next = nextStrengthsQuestion(turns.map((turn) => turn.questionId));
  if (!next) return true;
  const sortOrder = turns.reduce((max, turn) => Math.max(max, turn.sortOrder), 0) + 1;
  const { error } = await client.from("capability_interview_turns").insert({
    session_id: sessionId,
    kind: STRENGTHS_INTERVIEW,
    sort_order: sortOrder,
    question_source: "catalogue",
    question_id: next.id,
  });
  return !error;
}

/** Anfangen - oder bei einem offenen Gespräch dort weitermachen. */
export async function startStrengthsInterviewAction() {
  const { client, userId } = await requireUser();

  const existing = await getActiveStrengthsInterview(client);
  if (existing) {
    if (!existing.current) await appendQuestion(client, existing.sessionId, []);
    revalidatePath(PATH);
    redirect(PATH);
  }

  const { data: session, error } = await client
    .from("capability_interview_sessions")
    .insert({ user_id: userId, kind: STRENGTHS_INTERVIEW })
    .select("id")
    .single();
  if (error || !session) back("start");

  if (!(await appendQuestion(client, session.id as string, []))) back("start");

  revalidatePath(PATH);
  redirect(PATH);
}

/** Still und ohne Weiterleitung - es läuft während des Schreibens. */
export async function autosaveStrengthsAnswerAction(input: {
  turnId: string;
  answer: string;
}): Promise<{ saved: boolean }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return { saved: false };

  const answer = input.answer.trim();
  if (answer.length < STRENGTHS_MIN_LENGTH || answer.length > STRENGTHS_MAX_LENGTH) {
    return { saved: false };
  }

  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", input.turnId)
    .eq("kind", STRENGTHS_INTERVIEW);
  return { saved: !error };
}

async function complete(client: Awaited<ReturnType<typeof createClient>>, sessionId: string) {
  const { error } = await client
    .from("capability_interview_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("kind", STRENGTHS_INTERVIEW);
  if (error) back("complete");
  revalidatePath(PATH);
  revalidatePath("/profile");
  redirect(`${PATH}?notice=completed`);
}

/** Antwort festhalten - dann weiter, pausieren oder abschließen. */
export async function saveStrengthsAnswerAction(formData: FormData) {
  const { client } = await requireUser();

  const turnId = String(formData.get("turnId") ?? "");
  const mode = String(formData.get("mode") ?? "next");
  const answer = String(formData.get("answer") ?? "").trim();

  const state = await getActiveStrengthsInterview(client);
  if (!state || !state.current || state.current.id !== turnId) {
    continueQuietly(state, turnId);
  }

  if (answer.length > 0) {
    if (answer.length < STRENGTHS_MIN_LENGTH) back("short");
    if (answer.length > STRENGTHS_MAX_LENGTH) back("long");

    const { error } = await client
      .from("capability_interview_turns")
      .update({ answer, answered_at: new Date().toISOString() })
      .eq("id", turnId)
      .eq("kind", STRENGTHS_INTERVIEW);
    if (error) back("save");
  }

  if (mode === "pause") {
    revalidatePath(PATH);
    redirect(`${PATH}?notice=paused`);
  }

  if (mode === "complete" || state.nextQuestionId === null) {
    await complete(client, state.sessionId);
  }

  await appendQuestion(client, state.sessionId, state.turns);
  revalidatePath(PATH);
  redirect(PATH);
}

/** Überspringen: Die Frage bleibt mit leerer Antwort im Verlauf. */
export async function skipStrengthsQuestionAction(formData: FormData) {
  const { client } = await requireUser();
  const turnId = String(formData.get("turnId") ?? "");

  const state = await getActiveStrengthsInterview(client);
  if (!state || !state.current || state.current.id !== turnId) {
    continueQuietly(state, turnId);
  }

  // Die letzte Frage übersprungen: Mit genug Antworten ist das Gespräch
  // fertig, sonst bleibt es offen - eine Sackgasse ohne Frage gibt es nicht,
  // der Abschluss steht dann darunter.
  if (state.nextQuestionId === null && state.progress.hasEnough) {
    await complete(client, state.sessionId);
  }

  await appendQuestion(client, state.sessionId, state.turns);
  revalidatePath(PATH);
  redirect(PATH);
}

/** Abschließen, ohne noch etwas zu schreiben - ab drei Antworten. */
export async function completeStrengthsInterviewAction() {
  const { client } = await requireUser();
  const state = await getActiveStrengthsInterview(client);
  if (!state) redirect(PATH);
  if (state.progress.answeredCount < STRENGTHS_MIN_ANSWERS) back("too_few");
  await complete(client, state.sessionId);
}

/**
 * Die Auswertung anfordern - für ein ganzes, abgeschlossenes Gespräch.
 *
 * NUR AUF DIESEN KNOPFDRUCK. Die Datenbank prüft, dass das Gespräch der
 * Person gehört, ein Stärken-Interview ist und abgeschlossen wurde.
 */
export async function requestStrengthProposalsAction(formData: FormData) {
  const { client } = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");

  const { error } = await client.rpc("request_strength_proposals", { p_session_id: sessionId });
  if (error) back("ask");

  revalidatePath(PATH);
  redirect(`${PATH}?notice=reading`);
}
