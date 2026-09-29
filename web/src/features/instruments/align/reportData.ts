import "server-only";

import {
  getItemsV22,
  registryOf,
  type AssessmentScope,
} from "@/features/instruments/align/registries";
import { followUpPairs, readableItems } from "@/features/instruments/align/questionnaireData";
import { readAll, type ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import { orphanedFollowUps } from "@/features/instruments/v21/progressV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import {
  FOUNDER_PROFILE_INSTRUMENT_ID,
  VENTURE_ALIGNMENT_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import { createClient } from "@/lib/supabase/server";

/**
 * Die eigenen Antworten eines Bogens, lesbar.
 *
 * DIE FRAGEN KOMMEN AUS DEM RICHTIGEN BOGEN. Ohne das würde eine Antwort aus
 * dem Venture-Teil unter einer Profilfrage erscheinen - dieselbe Kennung gibt
 * es in beiden Registraturen nicht, aber die Lesbarmachung würde sie in der
 * falschen Reihenfolge einsortieren und Abschnitte erfinden.
 */

export const INSTRUMENT_OF: Record<AssessmentScope, string> = {
  founder_profile: FOUNDER_PROFILE_INSTRUMENT_ID,
  venture_alignment: VENTURE_ALIGNMENT_INSTRUMENT_ID,
};

export type ScopeReport = {
  sections: { section: string; entries: ReadoutEntry[] }[];
  submittedAt: string | null;
  /** Wie viele der Fragen dieses Bogens beantwortet sind. */
  answered: number;
  of: number;
  /**
   * Worüber diese Person sprechen möchte.
   *
   * KEINE AUSSAGE ÜBER DIE ANTWORT. Die Agenda stellt markierte Fragen vor
   * alle anderen, und die Gesprächskarten haben dafür eine eigene Regel: Wer
   * das sagt, hat recht, unabhängig davon, wie nah die Antworten liegen.
   */
  marked: string[];
  /**
   * Was nach einer Änderung ins Leere zeigt.
   *
   * Wer in L01 eine Grenze streicht, lässt eine Antwort auf L02 zurück, die auf
   * nichts mehr zeigt. Sie wird nicht stillschweigend gelöscht - sie wird
   * benannt, damit die Person entscheiden kann.
   */
  orphans: { itemId: string; entryIds: string[] }[];
};

export async function getScopeReport(
  userId: string,
  scope: AssessmentScope,
  ventureId?: string | null,
): Promise<ScopeReport | null> {
  const supabase = await createClient();

  const suche = supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", userId)
    .eq("instrument_id", INSTRUMENT_OF[scope])
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: assessment } = ventureId
    ? await suche.eq("venture_id", ventureId).maybeSingle()
    : await suche.maybeSingle();

  if (!assessment) return null;

  const { data: rows } = await supabase
    .from("alignment_answers")
    .select("block_id, value, missing_code, marked_for_discussion")
    .eq("assessment_id", assessment.id);

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
    sections: readAll(answers, {
      items: readableItems(scope),
      sections: registryOf(scope).sections,
    }),
    submittedAt: (assessment.submitted_at as string | null) ?? null,
    answered: rows.length,
    of: getItemsV22(scope).length,
    marked: rows.filter((row) => row.marked_for_discussion).map((row) => row.block_id),
    orphans: orphanedFollowUps(answers, followUpPairs(scope)),
  };
}
