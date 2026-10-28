import type { SupabaseClient } from "@supabase/supabase-js";

export type FinancingAlignmentView = {
  /** Die offene Runde, sonst null. */
  open: { id: string; startedAt: string; submittedUserIds: string[] } | null;
  /** Die letzte abgeschlossene Runde mit allen Antworten (nur sichtbar, wenn alle abgegeben haben). */
  lastClosed: {
    id: string;
    closedAt: string | null;
    answers: Array<{ userId: string; question: string; answer: string }>;
  } | null;
};

/**
 * Runden des Erwartungsabgleichs eines Teams. Ob jemand Antworten sehen darf, entscheidet die
 * Zeilensicherheit in der Datenbank; hier wird nur gelesen. Fehlt die Tabelle noch oder schlaegt
 * die Abfrage fehl, gibt es keine Runden.
 */
export async function getFinancingAlignment(teamId: string, client: SupabaseClient): Promise<FinancingAlignmentView> {
  const empty: FinancingAlignmentView = { open: null, lastClosed: null };
  const { data: rounds, error } = await client
    .from("team_financing_alignments")
    .select("id, status, started_at, closed_at")
    .eq("team_id", teamId)
    .order("started_at", { ascending: false })
    .limit(5);
  if (error || !rounds?.length) return empty;
  const open = rounds.find((round) => round.status === "open") ?? null;
  const closed = rounds.find((round) => round.status === "closed") ?? null;

  const view: FinancingAlignmentView = { open: null, lastClosed: null };
  if (open) {
    const { data: submissions } = await client
      .from("team_financing_alignment_submissions")
      .select("user_id")
      .eq("alignment_id", open.id);
    view.open = {
      id: String(open.id),
      startedAt: String(open.started_at),
      submittedUserIds: (submissions ?? []).map((row) => String(row.user_id)),
    };
  }
  if (closed) {
    const { data: answers } = await client
      .from("team_financing_alignment_answers")
      .select("user_id, question_key, answer")
      .eq("alignment_id", closed.id);
    view.lastClosed = {
      id: String(closed.id),
      closedAt: typeof closed.closed_at === "string" ? closed.closed_at : null,
      answers: (answers ?? []).map((row) => ({ userId: String(row.user_id), question: String(row.question_key), answer: String(row.answer) })),
    };
  }
  return view;
}
