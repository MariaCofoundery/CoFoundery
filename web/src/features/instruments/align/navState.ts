import "server-only";

import { INSTRUMENT_OF } from "@/features/instruments/align/reportData";
import { findVentures } from "@/features/instruments/align/ventureResolution";
import type { AlignNavState } from "@/features/instruments/align/AlignNav";
import { createClient } from "@/lib/supabase/server";

/**
 * Was die Leiste wissen muss - und nicht mehr.
 *
 * Eine Abfrage für beide Bögen. `getAlignDashboardState` könnte dasselbe
 * liefern, zählt aber Antworten, sucht Verbindungen und liest den Umstieg -
 * auf jeder Seite eine Navigationsleiste zu zeichnen, die nebenbei das halbe
 * Dashboard lädt, wäre der falsche Preis für drei Reiter.
 *
 * SIE LEGT NICHTS AN. `findVentures` und nicht `resolveVenture`: Letzteres
 * erzeugt ein Vorhaben, wenn keins da ist - eine Leiste darf nichts entstehen
 * lassen.
 */
export async function getAlignNavState(userId: string): Promise<AlignNavState> {
  try {
    const supabase = await createClient();

    const { data: rows } = await supabase
      .from("assessments")
      .select("instrument_id, venture_id, submitted_at")
      .eq("user_id", userId)
      .in("instrument_id", [
        INSTRUMENT_OF.founder_profile,
        INSTRUMENT_OF.venture_alignment,
      ]);

    const ventures = await findVentures(userId);
    // Bei mehreren fragt die Seite ohnehin - dann traegt die Leiste keine
    // Vorauswahl, statt eine zu raten.
    const ventureId = ventures.length === 1 ? ventures[0].id : null;

    return {
      profileSubmitted: (rows ?? []).some(
        (row) => row.instrument_id === INSTRUMENT_OF.founder_profile && row.submitted_at,
      ),
      ventureSubmitted: (rows ?? []).some(
        (row) =>
          row.instrument_id === INSTRUMENT_OF.venture_alignment &&
          row.submitted_at &&
          (ventureId === null || row.venture_id === ventureId),
      ),
      ventureId,
    };
  } catch {
    // Ohne Leiste ist eine Seite unbequem; ohne Seite ist sie weg.
    return { profileSubmitted: false, ventureSubmitted: false, ventureId: null };
  }
}
