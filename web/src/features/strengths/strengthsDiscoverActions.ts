"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
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
  cleanSceneThemes,
  isValidSceneSelection,
  sceneThemed,
  ROUND_THREE,
  STORY_MAX_LENGTH,
  type DiscoverTurn,
} from "@/features/strengths/strengthsDiscoverGuide";
import { evidenceLevelFor, isStrengthTheme } from "@/features/strengths/strengthThemes";
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
  state.turns.map((turn) => ({ questionId: turn.questionId, answered: turn.answer !== null, skipped: turn.skipped, themed: sceneThemed(turn) }));

async function activeV3(client: Client) {
  const state = await getActiveStrengthsInterview(client);
  return state && state.guideVersion >= DISCOVER_GUIDE_VERSION ? state : null;
}

/**
 * Beendet ein Gespräch, OHNE die Person irgendwohin zu schicken. Das ist die Hälfte von `complete`, die auch
 * gebraucht wird, wenn danach etwas anderes geschehen soll (ein neues Gespräch beginnen).
 */
async function closeSession(client: Client, sessionId: string): Promise<boolean> {
  const { error } = await client
    .from("capability_interview_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("kind", STRENGTHS_INTERVIEW);
  if (error) return false;
  revalidatePath("/profile");
  revalidatePath("/align");
  return true;
}

/** Ein Gespräch abschließen und die Person zu den Ergebnissen schicken. Kehrt nie zurück. */
async function complete(client: Client, sessionId: string): Promise<never> {
  if (!(await closeSession(client, sessionId))) back("complete");
  return onward("completed");
}

/** Nach dem Intro: das Gespräch anlegen - oder bei einem offenen dort weitermachen. */
export async function startDiscoverAction(formData: FormData) {
  const { client, userId } = await requireUser();
  const open = await getActiveStrengthsInterview(client);
  if (open && open.guideVersion >= DISCOVER_GUIDE_VERSION) onward();
  // Ein offenes Gespraech der frueheren Fassung wird beendet (seine Antworten bleiben), damit ein neues beginnen kann.
  //
  // FEHLER VOM 25.11.2026: Hier stand `await complete(...)`, und `complete` leitet zu den Ergebnissen weiter. Die
  // Weiterleitung beendet die Handlung - das neue Gespraech wurde nie angelegt, und wer nach dem Intro auf "Weiter"
  // tippte, landete auf der Ergebnisseite ("Auswertung") statt bei den Szenen. Erst beim zweiten "Weiter" ging es.
  // Darum wird hier nur beendet (`closeSession`), ohne Weiterleitung.
  if (open && !(await closeSession(client, open.sessionId))) back("start");

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

/**
 * Ein weiteres Stichwort zum Gespräch ergänzen, während man die Szenen durchgeht (25.11.2026). Gedacht für den Fall, dass am
 * Anfang keine oder zu wenige festgehalten wurden. Kehrt ohne Weiterleitung zurück: Die Szene bleibt offen, die Seite
 * aktualisiert sich nur. Doppelte, leere und zu viele Stichworte filtert `cleanIntroNotes` wie beim Start.
 */
export async function addIntroNoteAction(note: string): Promise<{ ok: boolean }> {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state) return { ok: false };
  const next = cleanIntroNotes([...state.introNotes, String(note ?? "")]);
  if (next.length === state.introNotes.length) return { ok: true };
  const { error } = await client
    .from("capability_interview_sessions")
    .update({ intro_notes: next })
    .eq("id", state.sessionId)
    .eq("kind", STRENGTHS_INTERVIEW);
  if (error) return { ok: false };
  revalidatePath(PATH);
  return { ok: true };
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

  // Seit dem 25.11.2026 ein Text je Szene (`story`); die drei Teile gibt es nur noch für alte Formulare.
  const checked = formData.has("story")
    ? checkScene({ story: String(formData.get("story") ?? "").slice(0, STORY_MAX_LENGTH + 1) })
    : checkScene({
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

/**
 * Nach dem Schreiben einer Szene: die Themen dazu festhalten (höchstens zwei, auch keines ist erlaubt). Sie stehen neben dem
 * Text der Szene in `answer_parts`. Die Person wählt sie selbst; nichts wird aus ihrem Text berechnet.
 */
export async function saveSceneThemesAction(formData: FormData) {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state) onward();
  const turn = currentSceneTurn(state, String(formData.get("turnId") ?? ""));
  if (!turn || turn.answer === null || turn.parts.story === undefined) onward();

  const themes = cleanSceneThemes(formData.getAll("theme").map(String));
  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer_parts: { story: turn.parts.story, themes } })
    .eq("id", turn.id)
    .eq("kind", STRENGTHS_INTERVIEW);
  if (error) back("save");
  onward();
}

/** Zum Text der Szene zurück: die Themen werden wieder offen, der Text bleibt. */
export async function reopenSceneAction(formData: FormData) {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state) onward();
  const turn = currentSceneTurn(state, String(formData.get("turnId") ?? ""));
  if (!turn || turn.answer === null) onward();
  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer: null, answered_at: null, answer_parts: { story: turn.parts.story ?? "" } })
    .eq("id", turn.id)
    .eq("kind", STRENGTHS_INTERVIEW);
  if (error) back("save");
  onward();
}

/** Aus den Szenen eines laufenden Gesprächs: in wie vielen verschiedenen Szenen ein Thema gewählt wurde. */
function scenesWithTheme(state: StrengthsInterviewState, theme: string) {
  return state.turns.filter((turn) => turn.answer !== null && turn.themes?.some((value) => value === theme));
}

/**
 * Ein Thema ins eigene Stärkenbild übernehmen - unverändert oder umgeschrieben. Wie belegt es ist, rechnet der Server aus
 * den Szenen (nicht aus dem, was das Formular schickt): drei Szenen deutlich, zwei „zeigt sich“, eine Hinweis.
 */
export async function confirmThemeStrengthAction(formData: FormData) {
  const { client, userId } = await requireUser();
  const state = await activeV3(client);
  if (!state || state.phase.phase !== "interim") onward();

  const theme = String(formData.get("theme") ?? "");
  if (!isStrengthTheme(theme)) onward();
  const scenes = scenesWithTheme(state, theme);
  if (scenes.length === 0) onward();

  const t = await getTranslations("strengths");
  const proposed = t(`themes.items.${theme}.shows`);
  const typed = String(formData.get("statement") ?? "").replace(/\s+/g, " ").trim();
  const statement = typed || proposed;
  if (statement.length < 3 || statement.length > 200) back("short");
  const label = t(`themes.items.${theme}.name`);

  const { data: existing } = await client.from("person_strengths").select("id").eq("user_id", userId).eq("theme", theme).limit(1);
  if (existing && existing.length > 0) onward();

  const { error } = await client.from("person_strengths").insert({
    user_id: userId,
    statement,
    label,
    origin: statement === proposed ? "confirmed_proposal" : "edited_proposal",
    theme,
    evidence_level: evidenceLevelFor(scenes.length),
    source_turn_id: scenes[0]!.id,
  });
  if (error) back("save");
  revalidatePath("/profile");
  revalidatePath("/me/profile");
  onward();
}

/** Ein Thema aus dem Stärkenbild nehmen: es wird bei allen Szenen abgewählt. Ins Profil kommt nichts. */
export async function dismissThemeAction(formData: FormData) {
  const { client } = await requireUser();
  const state = await activeV3(client);
  if (!state || state.phase.phase !== "interim") onward();
  const theme = String(formData.get("theme") ?? "");
  if (!isStrengthTheme(theme)) onward();

  for (const turn of scenesWithTheme(state, theme)) {
    const { error } = await client
      .from("capability_interview_turns")
      .update({ answer_parts: { story: turn.parts.story ?? "", themes: (turn.themes ?? []).filter((value) => value !== theme) } })
      .eq("id", turn.id)
      .eq("kind", STRENGTHS_INTERVIEW);
    if (error) back("save");
  }
  onward();
}
