import "server-only";

import { registryOf, type AssessmentScope } from "@/features/instruments/align/registries";
import { readableItems } from "@/features/instruments/align/questionnaireData";
import { INSTRUMENT_OF } from "@/features/instruments/align/reportData";
import { readAll, type ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import { offeredItemsV22 } from "@/features/instruments/align/registries";
import { createClient } from "@/lib/supabase/server";

/**
 * Was ein Advisor von den beiden Bögen sieht.
 *
 * ---------------------------------------------------------------------------
 * DIE FUNKTION ENTSCHEIDET NICHTS
 * ---------------------------------------------------------------------------
 *
 * Sie fragt die Datenbank und zeigt, was zurückkommt. Ob etwas zurückkommt,
 * entscheiden die Policies: Es braucht eine Antwort-Freigabe UND - falls eine
 * Advisor-Beziehung besteht - dass diese aktiv ist. Ausgeblendete Fragen
 * kommen gar nicht erst mit.
 *
 * ---------------------------------------------------------------------------
 * ZWEI BÖGEN, ZWEI FREIGABEN
 * ---------------------------------------------------------------------------
 *
 * Das Arbeitsprofil freizugeben ist etwas anderes, als die eigenen Zusagen zu
 * einem Vorhaben freizugeben. Deshalb wird jeder Bogen einzeln geholt: Wer nur
 * das Profil geteilt hat, soll beim Vorhaben nichts sehen - und dort auch
 * keinen leeren Kasten, der wie eine Auskunft aussieht.
 */

export type AdvisorScopeView = {
  scope: AssessmentScope;
  label: string;
  validity: string;
  sections: { section: string; entries: ReadoutEntry[] }[];
  /**
   * Wie viele Fragen hier zu sehen sind, von wie vielen.
   *
   * ABSICHTLICH NICHT „zurückgehalten“. Von hier aus sieht „nicht freigegeben“
   * genauso aus wie „nicht beantwortet“, und der Unterschied ist groß. Eine
   * Zahl, die beides „zurückgehalten“ nennt, behauptet etwas über eine
   * Entscheidung, die vielleicht nie getroffen wurde.
   */
  visible: { count: number; of: number };
  ventureName: string | null;
};

async function viewOf(
  subjectUserId: string,
  scope: AssessmentScope,
): Promise<AdvisorScopeView | null> {
  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, venture_id")
    .eq("user_id", subjectUserId)
    .eq("instrument_id", INSTRUMENT_OF[scope])
    .not("submitted_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assessment) return null;

  const { data: rows } = await supabase
    .from("alignment_answers")
    .select("block_id, value, missing_code")
    .eq("assessment_id", assessment.id);

  // Kommt nichts zurueck, gibt es keine Freigabe - und dann gibt es hier auch
  // keinen Abschnitt. Kein leerer Block, kein Schloss-Symbol: Ein leerer Block
  // wuerde aus einer fehlenden Freigabe eine Aussage ueber den Menschen
  // machen, ein Schloss waere eine Aufforderung, danach zu fragen.
  if (!rows || rows.length === 0) return null;

  const answers = Object.fromEntries(
    rows.map((row) => [
      row.block_id,
      (row.missing_code
        ? { blockId: row.block_id, missingCode: row.missing_code }
        : { blockId: row.block_id, value: row.value }) as AlignmentAnswerV21,
    ]),
  );

  let ventureName: string | null = null;
  if (assessment.venture_id) {
    const { data: team } = await supabase
      .from("founder_teams")
      .select("name")
      .eq("id", assessment.venture_id)
      .maybeSingle();
    ventureName = (team?.name as string | null) ?? null;
  }

  return {
    scope,
    label: registryOf(scope).label,
    validity: registryOf(scope).validity,
    sections: readAll(answers, {
      items: readableItems(scope),
      sections: registryOf(scope).sections,
    }),
    visible: { count: rows.length, of: offeredItemsV22(scope).length },
    ventureName,
  };
}

export async function getAdvisorAlignViews(
  subjectUserId: string,
): Promise<AdvisorScopeView[]> {
  try {
    const views = await Promise.all([
      viewOf(subjectUserId, "founder_profile"),
      viewOf(subjectUserId, "venture_alignment"),
    ]);
    return views.filter((view): view is AdvisorScopeView => view !== null);
  } catch {
    // Ein Fehler beim Laden darf die Seite nicht kosten - dann fehlt der
    // Abschnitt, und das ist dasselbe wie "nicht freigegeben".
    return [];
  }
}
