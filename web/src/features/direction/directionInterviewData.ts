import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DIRECTION_INTERVIEW } from "@/features/interviews/interviewKinds";
import {
  directionProgress,
  nextDirectionQuestion,
} from "@/features/direction/directionInterviewGuide";

/**
 * Was gerade läuft - für das Direction-Interview.
 *
 * DIESELBEN TABELLEN WIE BEIM CAPABILITY-INTERVIEW, unterschieden durch
 * `kind` (Migration 20261035120000). Die Abfragen sind eigene und nicht
 * geteilte: Die Zustandsmaschine unterscheidet sich - Direction hat keine
 * Evidenz und keinen Einordnungsschritt - und ein gemeinsamer Leser wäre eine
 * Abstraktion mit zwei Sonderfällen. Geteilt ist, was wirklich dasselbe ist:
 * das Antwortfeld mit dem zweischichtigen Speichern.
 *
 * KEIN LESER OHNE `kind`. Ohne den Filter holt `maybeSingle()` bei zwei
 * offenen Gesprächen einen Fehler, und der wird als "kein Gespräch" gelesen -
 * beide Interviews wären damit füreinander unsichtbar. Begründung in
 * `interviewKinds.ts`.
 */

export type DirectionTurn = {
  id: string;
  sortOrder: number;
  /** `catalogue` oder `model` - Modellfragen kommen erst mit Schritt S6. */
  source: "catalogue" | "model";
  questionId: string;
  questionText: string | null;
  answer: string | null;
  answeredAt: string | null;
};

export type DirectionInterviewState = {
  sessionId: string;
  startedAt: string;
  turns: DirectionTurn[];
  /** Die Frage, bei der man steht. */
  current: DirectionTurn | null;
  nextQuestionId: string | null;
  progress: ReturnType<typeof directionProgress>;
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

function toTurn(row: TurnRow): DirectionTurn {
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

export async function getActiveDirectionInterview(
  client: SupabaseClient
): Promise<DirectionInterviewState | null> {
  const { data: session, error } = await client
    .from("capability_interview_sessions")
    .select("id, started_at")
    .eq("status", "active")
    .eq("kind", DIRECTION_INTERVIEW)
    .maybeSingle();

  // Kein laufendes Gespräch ist ein gültiger Zustand: Dann steht der Einstieg
  // mit der Anleitung.
  if (error || !session) return null;

  const { data: turnRows } = await client
    .from("capability_interview_turns")
    .select("id, sort_order, question_source, question_id, question_text, answer, answered_at")
    .eq("session_id", session.id)
    .order("sort_order", { ascending: true });

  const turns = ((turnRows ?? []) as TurnRow[]).map(toTurn);

  // NICHT die erste unbeantwortete, sondern die letzte gestellte: Das
  // Zwischenspeichern setzt `answered_at`, während die Person noch schreibt -
  // die erste unbeantwortete wäre dann eine, die längst beantwortet ist.
  const current = turns.length > 0 ? turns[turns.length - 1]! : null;

  const catalogueTurns = turns.filter((turn) => turn.source === "catalogue");
  const askedIds = catalogueTurns.map((turn) => turn.questionId);
  const answeredIds = catalogueTurns
    .filter((turn) => turn.answer !== null)
    .map((turn) => turn.questionId);

  return {
    sessionId: session.id as string,
    startedAt: session.started_at as string,
    turns,
    current,
    nextQuestionId: nextDirectionQuestion(askedIds)?.id ?? null,
    progress: directionProgress(answeredIds, askedIds),
  };
}

/**
 * Die abgeschlossenen Gespräche.
 *
 * Für den Blick zurück: Ohne diese Liste wäre ein abgeschlossenes Gespräch
 * verschwunden - und mit ihm die Antworten, aus denen später die
 * Interpretation entsteht (Schritt S3).
 */
export async function getCompletedDirectionInterviews(client: SupabaseClient) {
  const { data } = await client
    .from("capability_interview_sessions")
    .select("id, started_at, completed_at")
    .eq("status", "completed")
    .eq("kind", DIRECTION_INTERVIEW)
    .order("completed_at", { ascending: false })
    .limit(10);

  return (data ?? []) as { id: string; started_at: string; completed_at: string }[];
}

/**
 * Alle beantworteten Fragen, über alle Gespräche hinweg.
 *
 * DAS IST DER BLICK ZURÜCK, und in Schritt S2 ist er das Ergebnis: Ohne
 * Modell gibt es noch keine Interpretation, aber die eigenen Geschichten
 * nebeneinander zu lesen ist selbst schon etwas wert - und es ist das, was die
 * Person bestätigen wird, sobald der Vorschlagsschritt steht.
 */
export async function getDirectionAnswers(client: SupabaseClient) {
  const { data } = await client
    .from("capability_interview_turns")
    .select("id, sort_order, question_source, question_id, question_text, answer, answered_at")
    .eq("kind", DIRECTION_INTERVIEW)
    .not("answer", "is", null)
    .order("answered_at", { ascending: true })
    .limit(100);

  return ((data ?? []) as TurnRow[]).map(toTurn);
}
