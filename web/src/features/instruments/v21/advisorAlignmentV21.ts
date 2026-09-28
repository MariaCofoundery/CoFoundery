import "server-only";

import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { readAll, type ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import { getItemsV21 } from "@/features/instruments/v21/registryV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import { createClient } from "@/lib/supabase/server";

/**
 * Was ein Advisor von der neuen Fassung sieht.
 *
 * ---------------------------------------------------------------------------
 * DIE FUNKTION ENTSCHEIDET NICHTS
 * ---------------------------------------------------------------------------
 *
 * Sie fragt die Datenbank und zeigt, was zurückkommt. Ob etwas zurückkommt,
 * entscheiden die Policies: `alignment_share_is_effective` verlangt eine
 * Antwort-Freigabe UND - falls eine Advisor-Beziehung besteht - dass diese
 * aktiv ist. Ausgeblendete Fragen kommen gar nicht erst mit.
 *
 * Eine Funktion, die erst alles lädt und dann entscheidet, was sie anzeigt,
 * hätte die Daten bereits geholt. Ein Fehler in der Anzeige wäre dann eine
 * Offenlegung.
 *
 * ---------------------------------------------------------------------------
 * ZWEI SCHLÜSSEL, NICHT EINER
 * ---------------------------------------------------------------------------
 *
 * Eine aktive Advisor-Beziehung allein öffnet hier nichts. Wer eine Beratung
 * zulässt, hat damit nicht den Satz „ich brauche ab März mindestens 2400 Euro
 * im Monat“ offengelegt - dafür braucht es die ausdrückliche Freigabe der
 * Antworten, und die kann jederzeit einzeln zurückgezogen werden.
 */

export type AdvisorAlignmentV21 = {
  sections: { section: string; entries: ReadoutEntry[] }[];
  /**
   * Wie viele Fragen hier zu sehen sind, von wie vielen insgesamt.
   *
   * ABSICHTLICH NICHT „zurückgehalten“. Von hier aus sieht „nicht freigegeben“
   * genauso aus wie „nicht beantwortet“, und der Unterschied ist groß. Eine
   * Zahl, die beides „zurückgehalten“ nennt, behauptet etwas über eine
   * Entscheidung, die vielleicht nie getroffen wurde.
   *
   * Dass etwas fehlt, gehört trotzdem dazu - sonst liest sich ein Teilbild
   * wie ein ganzes.
   */
  visible: { count: number; of: number };
  submittedAt: string | null;
};

export async function getAdvisorAlignmentV21(
  subjectUserId: string,
): Promise<AdvisorAlignmentV21 | null> {
  try {
    const supabase = await createClient();

    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, submitted_at")
      .eq("user_id", subjectUserId)
      .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
      .not("submitted_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assessment) return null;

    const { data: rows } = await supabase
      .from("alignment_answers")
      .select("block_id, value, missing_code")
      .eq("assessment_id", assessment.id);

    // Kommt nichts zurueck, gibt es keine Freigabe - und dann gibt es hier
    // auch keinen Abschnitt. Kein leerer Block, kein Schloss-Symbol: Ein
    // leerer Block wuerde aus einer fehlenden Freigabe eine Aussage ueber den
    // Menschen machen, ein Schloss waere eine Aufforderung, danach zu fragen.
    if (!rows || rows.length === 0) return null;

    const answers = Object.fromEntries(
      rows.map((row) => [
        row.block_id,
        (row.missing_code
          ? { blockId: row.block_id, missingCode: row.missing_code }
          : { blockId: row.block_id, value: row.value }) as AlignmentAnswerV21,
      ]),
    );

    return {
      sections: readAll(answers),
      // NUR DIE ZAHL, NIE DIE LISTE. Welche Fragen fehlen, ist selbst eine
      // Auskunft - wer sieht, dass ausgerechnet die persoenlichen Grenzen
      // fehlen, weiss mehr, als freigegeben wurde.
      visible: { count: rows.length, of: getItemsV21().length },
      submittedAt: assessment.submitted_at,
    };
  } catch {
    return null;
  }
}
