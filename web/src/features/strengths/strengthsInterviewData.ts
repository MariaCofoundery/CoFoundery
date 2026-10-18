import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { STRENGTHS_INTERVIEW } from "@/features/interviews/interviewKinds";
import {
  nextStrengthsQuestion,
  strengthsProgress,
} from "@/features/strengths/strengthsInterviewGuide";

/**
 * Was gerade läuft - für das Stärken-Interview.
 *
 * DIESELBEN TABELLEN WIE CAPABILITY UND DIRECTION, unterschieden durch
 * `kind = 'strengths'`. Eigene Abfragen, wie bei Direction: Geteilt ist das
 * Antwortfeld, nicht die Zustandsmaschine.
 *
 * KEIN LESER OHNE `kind` - sonst wären bei zwei offenen Gesprächen beide
 * füreinander unsichtbar (`interviewKinds.ts`).
 */

export type StrengthsTurn = {
  id: string;
  sortOrder: number;
  questionId: string;
  answer: string | null;
};

export type StrengthsInterviewState = {
  sessionId: string;
  turns: StrengthsTurn[];
  current: StrengthsTurn | null;
  nextQuestionId: string | null;
  progress: ReturnType<typeof strengthsProgress>;
};

type TurnRow = { id: string; sort_order: number; question_id: string; answer: string | null };

const toTurn = (row: TurnRow): StrengthsTurn => ({
  id: row.id,
  sortOrder: row.sort_order,
  questionId: row.question_id,
  answer: row.answer,
});

async function turnsOf(client: SupabaseClient, sessionId: string) {
  const { data } = await client
    .from("capability_interview_turns")
    .select("id, sort_order, question_id, answer")
    .eq("session_id", sessionId)
    .eq("kind", STRENGTHS_INTERVIEW)
    .order("sort_order", { ascending: true });
  return ((data ?? []) as TurnRow[]).map(toTurn);
}

export async function getActiveStrengthsInterview(
  client: SupabaseClient
): Promise<StrengthsInterviewState | null> {
  const { data: session, error } = await client
    .from("capability_interview_sessions")
    .select("id")
    .eq("status", "active")
    .eq("kind", STRENGTHS_INTERVIEW)
    .maybeSingle();
  if (error || !session) return null;

  const turns = await turnsOf(client, session.id as string);
  // Die letzte gestellte Frage, nicht die erste unbeantwortete: Das
  // Zwischenspeichern setzt die Antwort, während die Person noch schreibt.
  const current = turns.length > 0 ? turns[turns.length - 1]! : null;
  const askedIds = turns.map((turn) => turn.questionId);
  const answeredIds = turns.filter((turn) => turn.answer !== null).map((turn) => turn.questionId);

  return {
    sessionId: session.id as string,
    turns,
    current,
    nextQuestionId: nextStrengthsQuestion(askedIds)?.id ?? null,
    progress: strengthsProgress(answeredIds, askedIds),
  };
}

export type ProposalJobState = "none" | "open" | "done" | "failed";

export type CompletedStrengthsInterview = {
  sessionId: string;
  completedAt: string;
  answers: StrengthsTurn[];
  job: ProposalJobState;
};

/** Das zuletzt abgeschlossene Gespräch - mit seinen Antworten und dem Stand der Auswertung. */
export async function getLatestCompletedStrengthsInterview(
  client: SupabaseClient
): Promise<CompletedStrengthsInterview | null> {
  const { data: session } = await client
    .from("capability_interview_sessions")
    .select("id, completed_at")
    .eq("status", "completed")
    .eq("kind", STRENGTHS_INTERVIEW)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) return null;

  const sessionId = session.id as string;
  const [turns, { data: jobs }] = await Promise.all([
    turnsOf(client, sessionId),
    client
      .from("ai_jobs")
      .select("status")
      .eq("job_type", "strength_proposal")
      .eq("source_table", "capability_interview_sessions")
      .eq("source_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const status = ((jobs ?? []) as { status: string }[])[0]?.status;
  const job: ProposalJobState = !status
    ? "none"
    : status === "pending" || status === "running"
      ? "open"
      : status === "failed"
        ? "failed"
        : "done";

  return {
    sessionId,
    completedAt: session.completed_at as string,
    answers: turns.filter((turn) => turn.answer !== null),
    job,
  };
}

/** Wie viele Vorschläge aus diesem Gespräch schon entschieden sind. */
export async function countDecidedStrengthProposals(client: SupabaseClient, sessionId: string) {
  const { count } = await client
    .from("person_strength_proposals")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .neq("status", "pending");
  return count ?? 0;
}
