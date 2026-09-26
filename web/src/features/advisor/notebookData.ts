import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisorFollowUp, AdvisorPrivateNote } from "@/features/reporting/advisorWorkspaceData";

/**
 * Die Handakte - jetzt auch zu einzelnen Menschen und zu gemeinsamen
 * Auswertungen.
 *
 * DIESELBEN TABELLEN wie im Beziehungsmodell
 * (`features/reporting/advisorWorkspaceData.ts`). Es gibt bewusst keine
 * zweiten: Eine Notiz ist eine Notiz, und zwei Speicher für dieselbe Sache
 * laufen auseinander. Was sich geändert hat, ist nur der Anker (Migration
 * 20261049120000).
 *
 * BEWUSST DER NORMALE ANGEMELDETE ZUGANG, kein privilegierter Client. Die
 * Regel ist so einfach, dass die Datenbank sie selbst hält: Es gehört der
 * Person, die es geschrieben hat. Ein Fehler in diesem Modul kann fremde
 * Notizen nicht herausgeben, weil die Anfrage sie nie zu sehen bekommt - und
 * das gilt auch für Advisors derselben Organisation.
 */

export type NoteAnchor =
  | { kind: "subject"; id: string }
  | { kind: "review"; id: string };

/** Welche Spalte den Anker trägt. Eine Stelle, nicht drei. */
export function anchorColumn(anchor: NoteAnchor): "subject_user_id" | "review_id" {
  return anchor.kind === "subject" ? "subject_user_id" : "review_id";
}

export async function getAdvisorNoteFor(
  client: SupabaseClient,
  anchor: NoteAnchor
): Promise<AdvisorPrivateNote> {
  const { data, error } = await client
    .from("advisor_private_notes")
    .select("body, updated_at")
    .eq(anchorColumn(anchor), anchor.id)
    .maybeSingle();

  // Leer ist der normale Anfangszustand, kein Fehlerfall.
  if (error || !data) return { body: "", updatedAt: null };
  const row = data as { body: string | null; updated_at: string | null };
  return { body: row.body ?? "", updatedAt: row.updated_at };
}

export async function getAdvisorFollowUpFor(
  client: SupabaseClient,
  anchor: NoteAnchor
): Promise<AdvisorFollowUp | null> {
  const { data, error } = await client
    .from("advisor_follow_ups")
    .select("due_on, note, completed_at")
    .eq(anchorColumn(anchor), anchor.id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { due_on: string; note: string | null; completed_at: string | null };
  return { dueOn: row.due_on, note: row.note ?? "", completedAt: row.completed_at };
}
