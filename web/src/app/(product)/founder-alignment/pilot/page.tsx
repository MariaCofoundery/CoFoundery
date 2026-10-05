import { redirect } from "next/navigation";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der Fragebogen v2.1 - archiviert.
 *
 * Phase 10 - Cutover: Hier lag die Testfassung v2.1 zum Ausfuellen. Sie ist
 * archiviert, und die Datenbank haelt neue Zeilen dafuer nicht auf - also
 * darf auch keine Seite mehr dazu einladen.
 *
 * - Wer v2.1 schon begonnen oder abgegeben hat, kommt an seine Antworten
 *   (HISTORICAL_READ_ONLY, /founder-alignment/pilot/report).
 * - Alle anderen landen im aktuellen Arbeitsprofil (REDIRECT_TO_CURRENT).
 *
 * Der Fragebogen-Baustein der Testfassung bleibt im Code, weil die neuen
 * Boegen seine Eingabefelder und Antwortpruefung mitbenutzen.
 */
export default async function AlignmentV21Page() {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) redirect(`/login?next=${encodeURIComponent("/founder-alignment/pilot")}`);

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("module", "base")
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
    .limit(1)
    .maybeSingle();

  redirect(assessment ? "/founder-alignment/pilot/report" : CURRENT_WORKSTYLE_HREF);
}
