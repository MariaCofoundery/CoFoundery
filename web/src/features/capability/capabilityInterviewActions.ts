"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { getActiveInterview } from "./capabilityInterviewData";
import { nextCatalogueQuestion } from "./capabilityInterviewGuide";
import { NARRATIVE_MAX_LENGTH, NARRATIVE_MIN_LENGTH } from "./capabilityTypes";

/**
 * Das Gespräch führen.
 *
 * DREI ZUSAGEN AUS MARIAS VORGABE VOM 21.09.2026 - "es soll automatisch
 * gespeichert sein, falls was abstuerzt bzw man auch speichern kann falls man
 * nicht alles auf einmal beantworten will":
 *
 *   1. AUTOMATISCH. `autosaveInterviewAnswerAction` schreibt still mit,
 *      waehrend jemand tippt. Sie leitet nicht weiter, gibt keine Meldung und
 *      laesst nichts scheitern - ein fehlgeschlagener Zwischenstand darf nicht
 *      den Text wegnehmen, den jemand gerade schreibt.
 *
 *   2. AUF WUNSCH. Derselbe Weg, nur mit Rueckmeldung und Verlassen der Seite.
 *
 *   3. FORTSETZEN. Die Sitzung bleibt `active`, bis jemand sie abschliesst.
 *      Wer wiederkommt, steht bei derselben Frage mit demselben Text.
 *
 * WEITERGEGANGEN WIRD NUR DURCH EINE HANDLUNG. Das automatische Speichern
 * setzt `answered_at` - waere "die erste unbeantwortete Frage" die aktuelle,
 * wuerde das Gespraech beim Zwischenspeichern von selbst weiterspringen. Die
 * aktuelle Frage ist deshalb die mit der hoechsten Nummer, und eine neue
 * entsteht nur, wenn jemand "Weiter" oder "Ueberspringen" drueckt.
 */

const PATH = "/profile/interview";

async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${PATH}`);
  return { client, userId: user.id };
}

// `: never` ist nicht Deko: Ohne die Angabe nimmt TypeScript an, dass es nach
// `back(...)` weitergeht - und dann ist hinter jeder Pruefung alles wieder
// "moeglicherweise null".
function back(error: string): never {
  redirect(`${PATH}?error=${error}`);
}

/**
 * Beginnt ein Gespräch - oder setzt das laufende fort.
 *
 * Idempotent mit Absicht: Ein zweiter Klick auf "Beginnen" (zwei Tabs, ein
 * Doppeltipp) darf keine zweite Sitzung anlegen. Die Datenbank verhindert das
 * ohnehin ueber den Teilindex auf `status = 'active'`; hier wird der Fall
 * freundlich behandelt, statt einen Fehler zu zeigen.
 */
export async function startInterviewAction() {
  const { client, userId } = await requireUser();

  const existing = await getActiveInterview(client);
  if (existing) {
    // Es laeuft schon. Wenn die Sitzung noch keine Frage hat (abgebrochen
    // zwischen zwei Anweisungen), wird sie hier nachgeholt.
    if (!existing.current) {
      const first = nextCatalogueQuestion([]);
      if (first) {
        await client.from("capability_interview_turns").insert({
          session_id: existing.sessionId,
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
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !session) back("start");

  const first = nextCatalogueQuestion([]);
  if (first) {
    const { error: turnError } = await client.from("capability_interview_turns").insert({
      session_id: session.id,
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
 * Schreibt den Zwischenstand. Still.
 *
 * KEINE WEITERLEITUNG UND KEINE MELDUNG: Diese Aktion laeuft, waehrend jemand
 * schreibt. Ein `redirect` wuerde mitten im Satz die Seite wechseln, und eine
 * Fehlermeldung wuerde vom Tippen ablenken - und zwar wegen etwas, das der
 * Browser gleich noch einmal versucht.
 *
 * ZU KURZES WIRD NICHT GESCHRIEBEN. Die Datenbank verlangt (wie beim
 * Textfeld) mindestens zehn Zeichen; drei Buchstaben sind noch kein Satz. Bis
 * dahin haelt der Browser den Text allein - das ist der Grund, warum es beide
 * Ebenen gibt.
 */
export async function autosaveInterviewAnswerAction(input: {
  turnId: string;
  answer: string;
}): Promise<{ saved: boolean }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return { saved: false };

  const answer = input.answer.trim();
  if (answer.length < NARRATIVE_MIN_LENGTH || answer.length > NARRATIVE_MAX_LENGTH) {
    return { saved: false };
  }

  // Die Zeilensicherheit prueft, dass die Frage zu einer eigenen Sitzung
  // gehoert - eine fremde Kennung trifft hier auf keine Zeile.
  const { error } = await client
    .from("capability_interview_turns")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", input.turnId);

  return { saved: !error };
}

/**
 * Antwort festhalten und zur nächsten Frage.
 *
 * `mode` entscheidet, was danach passiert - und beides ist dieselbe
 * Speicherung, damit es nicht zwei Wege gibt, auf denen eine Antwort in die
 * Datenbank kommt:
 *
 *   `next`     - naechste Frage anlegen und dort weitermachen.
 *   `pause`    - speichern und die Seite verlassen. Die Sitzung bleibt offen.
 *   `complete` - speichern und abschliessen. Nur bei der letzten Frage, damit
 *                das Gespraech ein Ende hat und nicht bei derselben Frage
 *                stehen bleibt, zu der es keine naechste mehr gibt.
 */
export async function saveInterviewAnswerAction(formData: FormData) {
  const { client } = await requireUser();

  const turnId = String(formData.get("turnId") ?? "");
  const mode = String(formData.get("mode") ?? "next");
  const answer = String(formData.get("answer") ?? "").trim();

  const state = await getActiveInterview(client);
  if (!state || !state.current || state.current.id !== turnId) back("stale");

  if (answer.length > 0) {
    if (answer.length < NARRATIVE_MIN_LENGTH) back("short");
    if (answer.length > NARRATIVE_MAX_LENGTH) back("long");

    const { error } = await client
      .from("capability_interview_turns")
      .update({ answer, answered_at: new Date().toISOString() })
      .eq("id", turnId);
    if (error) back("save");
  }

  if (mode === "pause") {
    revalidatePath(PATH);
    redirect("/profile?notice=interview_paused");
  }

  if (mode === "complete") {
    const { error } = await client
      .from("capability_interview_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", state.sessionId);
    if (error) back("complete");

    revalidatePath(PATH);
    revalidatePath("/profile");
    redirect("/profile?saved=interview_done");
  }

  await appendNextQuestion(client, state.sessionId);
  revalidatePath(PATH);
  redirect(PATH);
}

/**
 * Überspringen.
 *
 * Eine uebersprungene Frage bleibt im Verlauf stehen - mit leerer Antwort.
 * Sie zu loeschen waere bequemer, wuerde aber dazu fuehren, dass der Leitfaden
 * sie beim naechsten Mal wieder stellt. "Weiss ich nicht" ist eine Antwort,
 * und sie soll nicht dreimal abgefragt werden.
 */
export async function skipInterviewQuestionAction(formData: FormData) {
  const { client } = await requireUser();
  const turnId = String(formData.get("turnId") ?? "");

  const state = await getActiveInterview(client);
  if (!state || !state.current || state.current.id !== turnId) back("stale");

  await appendNextQuestion(client, state.sessionId);
  revalidatePath(PATH);
  redirect(PATH);
}

/**
 * Legt die nächste Frage an.
 *
 * Nach der Reihenfolge des LEITFADENS und nicht nach der des Verlaufs: Wer
 * nach zwei Tagen weitermacht, soll dort weitergehen, wo der Leitfaden
 * weitergeht.
 *
 * Gibt es keine mehr, entsteht keine neue Zeile - die Seite zeigt dann den
 * Abschluss. Kein Platzhalter, keine leere Frage.
 */
async function appendNextQuestion(client: Awaited<ReturnType<typeof createClient>>, sessionId: string) {
  const state = await getActiveInterview(client);
  if (!state) return;

  const asked = state.turns
    .filter((turn) => turn.source === "catalogue")
    .map((turn) => turn.questionId);
  const next = nextCatalogueQuestion(asked);
  if (!next) return;

  const sortOrder = state.turns.reduce((max, turn) => Math.max(max, turn.sortOrder), 0) + 1;
  await client.from("capability_interview_turns").insert({
    session_id: sessionId,
    sort_order: sortOrder,
    question_source: "catalogue",
    question_id: next.id,
  });
}

/**
 * Das Gespräch abschließen.
 *
 * Danach ist die Sitzung zu und eine neue kann beginnen. Die Antworten
 * bleiben - sie werden im naechsten Schritt in Bereiche eingeordnet.
 */
export async function completeInterviewAction() {
  const { client } = await requireUser();

  const state = await getActiveInterview(client);
  if (!state) redirect("/profile");

  const { error } = await client
    .from("capability_interview_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", state.sessionId);
  if (error) back("complete");

  revalidatePath(PATH);
  revalidatePath("/profile");
  redirect("/profile?saved=interview_done");
}
