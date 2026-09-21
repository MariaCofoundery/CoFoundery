"use server";

import { revalidatePath } from "next/cache";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Bestaetigen oder verwerfen.
 *
 * NICHTS GILT, BEVOR EIN MENSCH ZUGESTIMMT HAT - das ist die ganze Funktion
 * dieser Datei. Ein Vorschlag liegt als 'pending' da und wird durch genau eine
 * dieser beiden Handlungen entschieden.
 *
 * VERWORFEN HEISST NICHT GELOESCHT: Die Zeile bleibt mit `status = 'rejected'`
 * stehen, damit derselbe Vorschlag bei der naechsten Veroeffentlichung nicht
 * wiederkommt (die Eindeutigkeit in `insert_ai_resource_proposal` haengt
 * daran). Wer ihn endgueltig los sein will, loescht ihn - dafuer gibt es die
 * delete-Policy.
 *
 * Die Zeilensicherheit begrenzt beides auf die eigenen Zeilen; ein geratene
 * Kennung trifft nichts.
 */

async function decide(proposalId: string, status: "confirmed" | "rejected") {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("person_resources")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", proposalId)
    // Ausdruecklich, obwohl die Policy dasselbe tut: Eine Abfrage, deren
    // Begrenzung nur aus der Zeilensicherheit kommt, liest sich beim naechsten
    // Mal wie ein Fehler.
    .eq("user_id", user.id)
    .eq("status", "pending");

  revalidatePath("/connect/profile");
}

export async function confirmResourceProposalAction(proposalId: string): Promise<void> {
  await decide(proposalId, "confirmed");
}

export async function rejectResourceProposalAction(proposalId: string): Promise<void> {
  await decide(proposalId, "rejected");
}
