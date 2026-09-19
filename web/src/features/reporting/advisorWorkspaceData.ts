import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Was der Advisor selbst produziert - Notizen und Wiedervorlage.
 *
 * BEWUSST DER NORMALE ANGEMELDETE ZUGANG, kein privilegierter Client.
 *
 * Der restliche Advisor-Bereich liest ueber den Service-Role-Zugang und prueft
 * die Freigabe in TypeScript - er muss, weil "beide Founder haben zugestimmt"
 * sich nicht in eine Policy schreiben laesst, ohne die Freigabelogik zu
 * verdoppeln. Hier ist die Regel dagegen so einfach, dass die Datenbank sie
 * selbst haelt: Es gehoert der Person, die es geschrieben hat.
 *
 * Das ist kein Detail. Es heisst: Ein Fehler in diesem Modul kann fremde
 * Notizen nicht herausgeben, weil die Anfrage sie nie zu sehen bekommt.
 */

export type AdvisorPrivateNote = {
  body: string;
  updatedAt: string | null;
};

export type AdvisorFollowUp = {
  dueOn: string;
  note: string;
  completedAt: string | null;
};

export async function getAdvisorPrivateNote(
  client: SupabaseClient,
  relationshipId: string
): Promise<AdvisorPrivateNote> {
  const { data, error } = await client
    .from("advisor_private_notes")
    .select("body, updated_at")
    .eq("relationship_id", relationshipId)
    .maybeSingle();

  // Leer ist der normale Anfangszustand, kein Fehlerfall.
  if (error || !data) return { body: "", updatedAt: null };
  const row = data as { body: string | null; updated_at: string | null };
  return { body: row.body ?? "", updatedAt: row.updated_at };
}

export async function getAdvisorFollowUp(
  client: SupabaseClient,
  relationshipId: string
): Promise<AdvisorFollowUp | null> {
  const { data, error } = await client
    .from("advisor_follow_ups")
    .select("due_on, note, completed_at")
    .eq("relationship_id", relationshipId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { due_on: string; note: string | null; completed_at: string | null };
  return { dueOn: row.due_on, note: row.note ?? "", completedAt: row.completed_at };
}

/**
 * Alle offenen Wiedervorlagen dieser Person, die faellig sind oder es bald
 * werden. Fuer die Uebersicht - damit die Verabredung nicht nur in einem Team
 * liegt, in das man zufaellig hineinschaut.
 */
export async function listDueAdvisorFollowUps(
  client: SupabaseClient,
  withinDays = 7
): Promise<{ relationshipId: string; dueOn: string; note: string }[]> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);

  const { data, error } = await client
    .from("advisor_follow_ups")
    .select("relationship_id, due_on, note")
    .is("completed_at", null)
    .lte("due_on", horizon.toISOString().slice(0, 10))
    .order("due_on", { ascending: true });

  if (error || !Array.isArray(data)) return [];
  return (data as { relationship_id: string; due_on: string; note: string | null }[]).map((row) => ({
    relationshipId: row.relationship_id,
    dueOn: row.due_on,
    note: row.note ?? "",
  }));
}
