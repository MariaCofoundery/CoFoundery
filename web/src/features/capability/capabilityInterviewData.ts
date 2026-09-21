import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  INTERVIEW_QUESTIONS,
  findInterviewQuestion,
  interviewProgress,
  nextCatalogueQuestion,
} from "./capabilityInterviewGuide";
import { buildInterviewSummary, type SummarySource } from "./capabilityInterviewSummary";

/**
 * Das laufende Gespräch.
 *
 * WAS "DIE AKTUELLE FRAGE" IST, und das ist die eine Entscheidung in dieser
 * Datei: die Frage mit der HOECHSTEN Nummer - nicht die erste unbeantwortete.
 *
 * Der Unterschied wird wichtig, weil automatisch gespeichert wird (Marias
 * Vorgabe vom 21.09.2026: "es soll automatisch gespeichert sein, falls was
 * abstuerzt"). Sobald genug Text da ist, steht die Antwort in der Datenbank -
 * die Frage gilt damit als beantwortet, obwohl der Mensch noch tippt. Waere
 * "die erste unbeantwortete" die aktuelle, wuerde das Gespraech beim
 * Zwischenspeichern von selbst weiterspringen.
 *
 * Weitergegangen wird deshalb nur durch eine Handlung: Es entsteht eine neue
 * Frage. Bis dahin bleibt man, wo man ist, und darf beliebig oft umschreiben.
 */

export type InterviewTurn = {
  id: string;
  sortOrder: number;
  source: "catalogue" | "model";
  /** Bei Katalogfragen der Schluessel fuer den Sprachbundle, sonst 'model'. */
  questionId: string;
  /** Nur bei Modellfragen - der Satz, der wirklich gestellt wurde. */
  questionText: string | null;
  answer: string | null;
  answeredAt: string | null;
};

export type InterviewState = {
  sessionId: string;
  startedAt: string;
  turns: InterviewTurn[];
  /** Die Frage, an der gerade gearbeitet wird. Null gibt es nicht: Eine Sitzung ohne Frage waere ein leerer Bildschirm. */
  current: InterviewTurn | null;
  /** Die naechste Katalogfrage, falls es eine gibt - sonst ist der Leitfaden durch. */
  nextQuestionId: string | null;
  progress: { answered: number; total: number; hasEnough: boolean };
};

type TurnRow = {
  id: string;
  sort_order: number;
  question_source: string;
  question_id: string;
  question_text: string | null;
  answer: string | null;
  answered_at: string | null;
};

function toTurn(row: TurnRow): InterviewTurn {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    source: row.question_source === "model" ? "model" : "catalogue",
    questionId: row.question_id,
    questionText: row.question_text,
    answer: row.answer,
    answeredAt: row.answered_at,
  };
}

export async function getActiveInterview(client: SupabaseClient): Promise<InterviewState | null> {
  const { data: session, error } = await client
    .from("capability_interview_sessions")
    .select("id, started_at")
    .eq("status", "active")
    .maybeSingle();

  // Kein aktives Gespraech ist ein gueltiger Zustand, kein Fehler: Dann steht
  // der Einstieg mit der Anleitung.
  if (error || !session) return null;

  const { data: turnRows } = await client
    .from("capability_interview_turns")
    .select("id, sort_order, question_source, question_id, question_text, answer, answered_at")
    .eq("session_id", session.id)
    .order("sort_order", { ascending: true });

  const turns = ((turnRows ?? []) as TurnRow[]).map(toTurn);

  // Nur Katalogfragen zaehlen fuer den Fortschritt: Eine Nachfrage des Modells
  // ist eine Vertiefung, keine der acht Stationen.
  const answeredCatalogueIds = turns
    .filter((turn) => turn.source === "catalogue" && turn.answer !== null)
    .map((turn) => turn.questionId);

  const askedCatalogueIds = turns
    .filter((turn) => turn.source === "catalogue")
    .map((turn) => turn.questionId);

  return {
    sessionId: session.id as string,
    startedAt: session.started_at as string,
    turns,
    current: turns.length > 0 ? turns[turns.length - 1] : null,
    nextQuestionId: nextCatalogueQuestion(askedCatalogueIds)?.id ?? null,
    progress: interviewProgress(answeredCatalogueIds),
  };
}

/**
 * Die abgeschlossenen Gespräche - für den Blick zurück.
 *
 * Ohne diese Liste waere ein abgeschlossenes Gespraech verschwunden, und die
 * Zusage "du kannst es spaeter vom Modell vertiefen lassen" haette keinen Ort.
 */
export async function getCompletedInterviews(client: SupabaseClient) {
  const { data } = await client
    .from("capability_interview_sessions")
    .select("id, started_at, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  return (data ?? []) as { id: string; started_at: string; completed_at: string }[];
}

/**
 * Was zu einer Frage angezeigt wird.
 *
 * Bei einer Katalogfrage kommt der Text aus dem Sprachbundle - der Verlauf
 * speichert ihn bewusst nicht (zwei Quellen fuer denselben Satz laufen
 * auseinander). Bei einer Modellfrage steht er im Verlauf, weil es ihn sonst
 * nirgends gaebe.
 */
export function interviewQuestionMeta(turn: InterviewTurn) {
  if (turn.source === "model") {
    return { question: null, text: turn.questionText, index: null };
  }
  const question = findInterviewQuestion(turn.questionId);
  return {
    question,
    text: null,
    index: question ? INTERVIEW_QUESTIONS.indexOf(question) + 1 : null,
  };
}

/**
 * Die Antworten, die noch nicht eingeordnet sind.
 *
 * ÜBER ALLE GESPRÄCHE HINWEG, nicht nur das laufende: Wer zwei Gespraeche
 * gefuehrt und keines eingeordnet hat, soll nicht im ersten stecken bleiben.
 * Aelteste zuerst - in der Reihenfolge, in der sie erzaehlt wurden.
 *
 * `evidence_id is null` IST DAS MERKMAL. Kein eigener Zustand, kein zweites
 * Feld: Eine Antwort ist eingeordnet, wenn ein Beleg daran haengt - und genau
 * das ist die Sache selbst, nicht ihre Buchhaltung.
 */
export async function getUnsortedInterviewAnswers(client: SupabaseClient) {
  const { data } = await client
    .from("capability_interview_turns")
    .select(
      "id, sort_order, question_source, question_id, question_text, answer, answered_at, session_id"
    )
    .not("answer", "is", null)
    .is("evidence_id", null)
    .order("answered_at", { ascending: true })
    .limit(50);

  return ((data ?? []) as (TurnRow & { session_id: string })[]).map((row) => ({
    ...toTurn(row),
    sessionId: row.session_id,
  }));
}

/**
 * Die Antworten, die schon eingeordnet sind.
 *
 * WOZU: Damit man es NOCHMAL tun kann. Am 21.09.2026 kam heraus, dass die
 * Erkennung fuer die Verhaltensbereiche gar keine Begriffe hatte - wer sein
 * Gespraech vorher eingeordnet hat, bekam deshalb nur Fachliches vorgeschlagen.
 * Die Erzaehlungen liegen aber noch da; es waere absurd, sie neu erzaehlen zu
 * lassen, weil unsere Begriffsliste besser geworden ist.
 *
 * Und das wird wieder vorkommen: Jede Verbesserung der Erkennung macht alte
 * Einordnungen ein Stueck schlechter als moegliche neue.
 */
export async function getSortedInterviewAnswers(client: SupabaseClient) {
  const { data } = await client
    .from("capability_interview_turns")
    .select(
      "id, sort_order, question_source, question_id, question_text, answer, answered_at, evidence_id"
    )
    .not("answer", "is", null)
    .not("evidence_id", "is", null)
    .order("answered_at", { ascending: true })
    .limit(50);

  return ((data ?? []) as (TurnRow & { evidence_id: string })[]).map((row) => ({
    ...toTurn(row),
    evidenceId: row.evidence_id,
  }));
}

/**
 * Der Blick zurück auf alle Gespräche.
 *
 * ZWEI ABFRAGEN, und die Bereiche kommen aus `capability_interview_turn_areas`
 * und nicht über den Beleg: Der Beleg hängt nur am FÜHRENDEN Bereich einer
 * Antwort (die Erzählung dreimal zu speichern wäre dieselbe Geschichte dreimal
 * im Profil), und der Blick zurück braucht alle bestätigten - sonst übersieht
 * "was mehrfach vorkam" jeden zweiten und dritten Bereich, und das ist genau
 * die Aussage, um die es hier geht.
 *
 * Kein verschachteltes Embed: Das scheitert still, wenn ein Fremdschlüssel
 * nicht auf die erwartete Tabelle zeigt - am 21.09.2026 schon einmal passiert
 * (`person_user_id` zeigt auf `auth.users`), und TypeScript sieht es nicht.
 */
export async function getInterviewSummary(client: SupabaseClient) {
  const { data: turnRows } = await client
    .from("capability_interview_turns")
    .select("id, question_id, answer, evidence_id")
    .order("answered_at", { ascending: true })
    .limit(200);

  const turns = (turnRows ?? []) as {
    id: string;
    question_id: string;
    answer: string | null;
    evidence_id: string | null;
  }[];

  const areasByTurn = new Map<string, string[]>();
  if (turns.length > 0) {
    const { data } = await client
      .from("capability_interview_turn_areas")
      .select("turn_id, area_id")
      .in(
        "turn_id",
        turns.map((turn) => turn.id)
      );
    for (const row of (data ?? []) as { turn_id: string; area_id: string }[]) {
      areasByTurn.set(row.turn_id, [...(areasByTurn.get(row.turn_id) ?? []), row.area_id]);
    }
  }

  const sources: SummarySource[] = turns.map((turn) => ({
    questionId: turn.question_id,
    answered: turn.answer !== null,
    sorted: turn.evidence_id !== null,
    areaIds: areasByTurn.get(turn.id) ?? [],
  }));

  return buildInterviewSummary(sources);
}
