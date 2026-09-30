import "server-only";

import { CURRENT_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient } from "@/lib/supabase/server";

/**
 * Welche Fassung gilt für eine Einladung — und für die Person, die einlädt.
 *
 * ---------------------------------------------------------------------------
 * DIE EINLADENDE PERSON ENTSCHEIDET
 * ---------------------------------------------------------------------------
 *
 * Wer eingeladen wird, soll am Ende etwas Gemeinsames mit der einladenden
 * Person haben — und etwas Gemeinsames entsteht nur zwischen zwei Menschen,
 * die denselben Bogen ausgefüllt haben. Wer mit der bisherigen Fassung
 * einlädt, schickt deshalb auch die andere Person dorthin.
 *
 * Bis zum 30.09.2026 führte jede Einladung in die bisherige Fassung, auch
 * zwischen zwei Menschen, die beide gerade erst angekommen waren.
 */
export type Fassung = "previous" | "align";

/**
 * Arbeitet diese Person (noch) mit der bisherigen Fassung?
 *
 * ANGEFANGEN ZÄHLT, NICHT NUR ABGEGEBEN. Wer mitten im alten Bogen steckt,
 * hat dort etwas liegen, das zu einem gemeinsamen Report führen soll.
 *
 * Nur über sich selbst: Fremde `assessments`-Zeilen liest hier niemand.
 */
export async function worksWithPrevious(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", userId)
    .eq("instrument_id", CURRENT_INSTRUMENT_ID)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * Wohin diese Einladung führt.
 *
 * IM ZWEIFEL IN DIE BISHERIGE FASSUNG. Geht die Auskunft schief, ist der
 * Status quo die schonendere Antwort: Sie führt dorthin, wo die Einladung
 * bisher immer hinführte, statt ein Paar auf zwei Fassungen zu verteilen.
 */
export async function versionOfInvitation(invitationId: string): Promise<Fassung> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("invitation_uses_previous_version", {
      p_invitation: invitationId,
      p_instrument: CURRENT_INSTRUMENT_ID,
    });
    if (error || data === null || data === undefined) return "previous";
    return data === true ? "previous" : "align";
  } catch {
    return "previous";
  }
}
