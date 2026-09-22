"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DIRECTION_INTERVIEW } from "@/features/interviews/interviewKinds";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveDirectionInterview,
  type DirectionInterviewState,
} from "./directionInterviewData";
import {
  DIRECTION_MAX_LENGTH,
  DIRECTION_MIN_ANSWERS,
  DIRECTION_MIN_LENGTH,
  nextDirectionQuestion,
} from "@/features/direction/directionInterviewGuide";

/**
 * Die Handlungen des Direction-Gesprächs.
 *
 * SCHRITT S2: Das Interview läuft vollständig OHNE Modell. Es gibt noch keine
 * Vorschläge und keine Interpretation - das ist Schritt S3 und S4, und die
 * Oberfläche behauptet nichts anderes.
 *
 * DIE GRENZEN SIND DIE DER DATENBANK: 10 bis 2000 Zeichen je Antwort, dieselbe
 * Spanne wie beim Capability-Interview (`capability_interview_turns`). Sie
 * stehen hier als Konstanten, damit die Absicht im Code lesbar ist - die
 * Zusage selbst steht als Constraint an der Tabelle.
 */

const PATH = "/profile/direction";

/**
 * `never` ist die Wahrheit: `redirect()` wirft. Ohne diesen Rückgabetyp hält
 * TypeScript den Code danach für erreichbar und verlangt Prüfungen, die nie
 * greifen.
 */
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

/**
 * Wenn die Frage nicht mehr die aktuelle ist.
 *
 * DREI FÄLLE, DREI ANTWORTEN - und nur einer davon ist ein Fehler:
 *
 *   Das Gespräch ist abgeschlossen: dann ist alles in Ordnung, und die Person
 *   landet auf dem Rückblick.
 *   Die Frage ist schon beantwortet: zwei Fenster, oder das
 *   Zwischenspeichern war schneller. Still weitergehen.
 *   Sonst: veraltet, und das darf man sagen.
 *
 * Der Grund für diese Unterscheidung: Am 21.09.2026 erschien beim
 * Capability-Interview eine Meldung "die Frage ist veraltet", ohne dass jemand
 * etwas falsch gemacht hatte - ein Doppelklick genügte.
 */
function continueQuietly(state: DirectionInterviewState | null, turnId: string): never {
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

/** Anfangen - oder bei einem offenen Gespräch dort weitermachen. */
export async function startDirectionInterviewAction() {
  const { client, userId } = await requireUser();

  const existing = await getActiveDirectionInterview(client);
  if (existing) {
    // Es läuft schon. Eine Sitzung ohne Frage (abgebrochen zwischen zwei
    // Anweisungen) bekommt sie hier nachgeholt.
    if (!existing.current) {
      const first = nextDirectionQuestion([]);
      if (first) {
        await client.from("capability_interview_turns").insert({
          session_id: existing.sessionId,
          kind: DIRECTION_INTERVIEW,
          sort_order: 1,
          question_source: "catalogue",
          question_id: first.id,
        });
      }
    }
    revalidatePath(PATH);
    redirect(PATH);
  }

  const { data: session, error } = await client
    .from("capability_interview_sessions")
    .insert({ user_id: userId, kind: DIRECTION_INTERVIEW })
    .select("id")
    .single();
  if (error || !session) back("start");

  const first = nextDirectionQuestion([]);
  if (first) {
    const { error: turnError } = await client.from("capability_interview_turns").insert({
      session_id: session.id,
      kind: DIRECTION_INTERVIEW,
      sort_order: 1,
      question_source: "catalogue",
      question_id: first.id,
    });
    if (turnError) back("start");
  }

  revalidatePath(PATH);
  redirect(PATH);
}

/**
 * Das Zwischenspeichern.
 *
 * STILL UND OHNE WEITERLEITUNG: Es läuft während des Schreibens. Eine
 * Fehlermeldung mitten im Satz wäre eine Unterbrechung für etwas, das die
 * Person nicht ausgelöst hat; deshalb meldet es nur, ob es angekommen ist.
 */
export async function autosaveDirectionAnswerAction(input: {
  turnId: string;
  answer: string;
}): Promise<{ saved: boolean }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return { saved: false };

  const answer = input.answer.trim();
  if (answer.length < DIRECTION_MIN_LENGTH || answer.length > DIRECTION_MAX_LENGTH) {
    return { saved: false };
  }

  // Die Zeilensicherheit prüft, dass die Frage zu einer eigenen Sitzung
  // gehört - eine fremde Kennung trifft auf keine Zeile.
  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", input.turnId)
    .eq("kind", DIRECTION_INTERVIEW);

  return { saved: !error };
}

/**
 * Antwort festhalten - und dann eines von drei Dingen.
 *
 *   `next`     - nächste Frage anlegen und dort weitermachen.
 *   `pause`    - speichern und gehen. Das Gespräch bleibt offen.
 *   `complete` - speichern und abschließen.
 *
 * Es ist DIESELBE Speicherung für alle drei, damit es nicht drei Wege gibt,
 * auf denen eine Antwort in die Datenbank kommt.
 */
export async function saveDirectionAnswerAction(formData: FormData) {
  const { client } = await requireUser();

  const turnId = String(formData.get("turnId") ?? "");
  const mode = String(formData.get("mode") ?? "next");
  const answer = String(formData.get("answer") ?? "").trim();

  const state = await getActiveDirectionInterview(client);
  if (!state || !state.current || state.current.id !== turnId) {
    continueQuietly(state, turnId);
  }

  if (answer.length > 0) {
    if (answer.length < DIRECTION_MIN_LENGTH) back("short");
    if (answer.length > DIRECTION_MAX_LENGTH) back("long");

    const { error } = await client
      .from("capability_interview_turns")
      .update({ answer, answered_at: new Date().toISOString() })
      .eq("id", turnId)
      .eq("kind", DIRECTION_INTERVIEW);
    if (error) back("save");
  }

  if (mode === "pause") {
    revalidatePath(PATH);
    redirect(`${PATH}?notice=paused`);
  }

  if (mode === "complete") {
    const { error } = await client
      .from("capability_interview_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", state.sessionId)
      .eq("kind", DIRECTION_INTERVIEW);
    if (error) back("complete");

    revalidatePath(PATH);
    revalidatePath("/profile");
    redirect(`${PATH}?notice=completed`);
  }

  await appendNextQuestion(client, state);
  revalidatePath(PATH);
  redirect(PATH);
}

/**
 * Überspringen.
 *
 * Die Frage bleibt im Verlauf stehen, mit leerer Antwort. Sie zu löschen wäre
 * bequemer, hätte aber zur Folge, dass der Leitfaden sie beim nächsten Mal
 * wieder stellt. "Dazu fällt mir nichts ein" ist eine Antwort und soll nicht
 * dreimal abgefragt werden.
 */
export async function skipDirectionQuestionAction(formData: FormData) {
  const { client } = await requireUser();
  const turnId = String(formData.get("turnId") ?? "");

  const state = await getActiveDirectionInterview(client);
  if (!state || !state.current || state.current.id !== turnId) {
    continueQuietly(state, turnId);
  }

  await appendNextQuestion(client, state);
  revalidatePath(PATH);
  redirect(PATH);
}

/**
 * Abschließen, ohne noch etwas zu schreiben.
 *
 * Für den Fall, dass genug erzählt ist - vier von sechs reichen. Wer weniger
 * hat, bekommt hier nichts: Ein Muster über mehrere Beispiele hinweg ist der
 * einzige Grund, warum dieses Gespräch mehr ist als eine Frage.
 */
export async function completeDirectionInterviewAction() {
  const { client } = await requireUser();
  const state = await getActiveDirectionInterview(client);
  if (!state) redirect(PATH);
  if (state.progress.answeredCount < DIRECTION_MIN_ANSWERS) back("too_few");

  const { error } = await client
    .from("capability_interview_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", state.sessionId)
    .eq("kind", DIRECTION_INTERVIEW);
  if (error) back("complete");

  revalidatePath(PATH);
  revalidatePath("/profile");
  redirect(`${PATH}?notice=completed`);
}

/** Die nächste Katalogfrage anhängen - oder nichts, wenn keine mehr kommt. */
async function appendNextQuestion(
  client: Awaited<ReturnType<typeof createClient>>,
  state: DirectionInterviewState
) {
  const asked = state.turns
    .filter((turn) => turn.source === "catalogue")
    .map((turn) => turn.questionId);
  const next = nextDirectionQuestion(asked);
  if (!next) return;

  const sortOrder = state.turns.reduce((max, turn) => Math.max(max, turn.sortOrder), 0) + 1;
  await client.from("capability_interview_turns").insert({
    session_id: state.sessionId,
    kind: DIRECTION_INTERVIEW,
    sort_order: sortOrder,
    question_source: "catalogue",
    question_id: next.id,
  });
}
