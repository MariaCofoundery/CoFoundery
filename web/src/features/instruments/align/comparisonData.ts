import "server-only";

import { registryOf, type AssessmentScope } from "@/features/instruments/align/registries";
import { INSTRUMENT_OF } from "@/features/instruments/align/reportData";
import { readableItems } from "@/features/instruments/align/questionnaireData";
import { readAnswer, type ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import {
  compareV21,
  agendaV21,
  type ItemComparison,
  type AgendaEntry,
} from "@/features/instruments/v21/comparisonV21";
import { expectationGapsV21, type ExpectationResult } from "@/features/instruments/v21/expectationsV21";
import { buildCards, type ConversationCard } from "@/features/instruments/align/conversationCards";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import { displayNameOf } from "@/features/instruments/displayName";
import { createClient } from "@/lib/supabase/server";

/**
 * Zwei Menschen nebeneinander - je Bogen getrennt.
 *
 * ---------------------------------------------------------------------------
 * WARUM GETRENNT UND NICHT IN EINER LISTE
 * ---------------------------------------------------------------------------
 *
 * Zwei Menschen können beim Arbeitsprofil nebeneinanderstehen und zum Vorhaben
 * noch gar nichts gesagt haben. Beides in eine Liste zu werfen hieße, eine
 * Lücke im einen als Aussage im anderen zu lesen: „16 von 52 beantwortet“
 * sähe nach Halbherzigkeit aus, wo jemand einfach das Profil fertig hat und
 * das Vorhaben noch nicht.
 *
 * Und die Gültigkeit ist eine andere. Ein Arbeitsprofil von vor einem Jahr ist
 * nicht dasselbe wie eine Zusage von vor einem Jahr.
 */

export type ScopeComparison = {
  scope: AssessmentScope;
  sections: { section: string; items: ItemComparison[] }[];
  agenda: AgendaEntry[];
  /** Nur beim Vorhaben: was zugesagt ist gegen das, was erwartet wird. */
  expectations: ExpectationResult | null;
  /** Hat überhaupt jemand geantwortet? Sonst ist ein leerer Vergleich irreführend. */
  hasAnything: boolean;
  /** Die Gesprächskarten zu diesem Bogen - aus einer geprüften Sammlung. */
  cards: ConversationCard[];
  /**
   * Wie die beiden in Sätzen heißen.
   *
   * Steht hier, damit Karten und Bild dieselben Namen benutzen. Zweimal
   * nachzuschlagen ginge auch - bis eine Seite „Ben“ sagt und die andere
   * „Die andere Person“, und niemand weiß, ob das zwei Leute sind.
   */
  names: { a: string; b: string };
};

type Side = Record<string, ReadoutEntry>;

async function readSide(
  userId: string,
  scope: AssessmentScope,
  ventureId: string | null,
): Promise<{ entries: Side; marked: string[] }> {
  const supabase = await createClient();

  const suche = supabase
    .from("assessments")
    .select("id")
    .eq("user_id", userId)
    .eq("instrument_id", INSTRUMENT_OF[scope])
    .not("submitted_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: assessment } = ventureId
    ? await suche.eq("venture_id", ventureId).maybeSingle()
    : await suche.maybeSingle();

  if (!assessment) return { entries: {}, marked: [] };

  const { data: rows } = await supabase
    .from("alignment_answers")
    .select("block_id, value, missing_code, marked_for_discussion")
    .eq("assessment_id", assessment.id);

  const nachId = new Map(readableItems(scope).map((item) => [item.itemId, item]));
  const entries: Side = {};

  for (const row of rows ?? []) {
    const item = nachId.get(row.block_id);
    // Eine Antwort, die zu diesem Bogen nicht gehoert, wird uebersprungen und
    // nicht geraten. Sie kann aus einer anderen Fassung stammen.
    if (!item) continue;
    const answer = (row.missing_code
      ? { blockId: row.block_id, missingCode: row.missing_code }
      : { blockId: row.block_id, value: row.value }) as AlignmentAnswerV21;
    const entry = readAnswer(answer, [], item);
    if (entry) entries[row.block_id] = entry;
  }

  return {
    entries,
    marked: (rows ?? []).filter((row) => row.marked_for_discussion).map((row) => row.block_id),
  };
}

export async function buildScopeComparison(
  scope: AssessmentScope,
  mine: string,
  theirs: string,
  ventureId: string | null,
): Promise<ScopeComparison> {
  const a = await readSide(mine, scope, ventureId);
  const b = await readSide(theirs, scope, ventureId);

  const bogen = { items: readableItems(scope), sections: registryOf(scope).sections };
  const sections = compareV21(a.entries, b.entries, bogen);

  const marked = [...a.marked, ...b.marked];

  const names = {
    a: await displayNameOf(mine, "Du"),
    b: await displayNameOf(theirs, "Die andere Person"),
  };

  return {
    scope,
    sections,
    names,
    cards: buildCards({
      comparison: sections,
      markedItemIds: marked,
      nameA: names.a,
      nameB: names.b,
    }),
    agenda: agendaV21(sections, marked),
    expectations:
      scope === "venture_alignment"
        ? expectationGapsV21({
            a: { offer: a.entries.R01 ?? null, expectations: a.entries.R02 ?? null },
            b: { offer: b.entries.R01 ?? null, expectations: b.entries.R02 ?? null },
          })
        : null,
    hasAnything:
      Object.keys(a.entries).length > 0 || Object.keys(b.entries).length > 0,
  };
}
