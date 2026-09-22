import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DirectionFacet } from "./directionInterviewGuide";

/**
 * Was jemand über seine Richtung festgehalten hat.
 *
 * NUR BESTÄTIGTE AUSSAGEN - das ist der Grund für die zweite Tabelle. Ein
 * Vorschlag eines Modells ist keine Aussage über einen Menschen, solange der
 * Mensch ihn nicht bestätigt hat. Andere Produktbereiche lesen ausschließlich
 * hier; auf `direction_statement_proposals` haben sie kein Leserecht.
 *
 * ES GIBT KEINE FREIGABESTUFE. Solange es keinen Weg gibt, etwas zu teilen,
 * ist "privat" kein Vorgabewert in einer Spalte, sondern die Abwesenheit
 * jeder anderen Regel: Die Zeilensicherheit lässt nur die eigene Person
 * lesen, und sonst niemanden. Eine Spalte `direction_disclosure`, die niemand
 * liest, wäre ein Versprechen, das nichts einlöst.
 */

export const DIRECTION_CONFIDENCES = ["stated", "one_example", "recurring", "tentative"] as const;
export type DirectionConfidence = (typeof DIRECTION_CONFIDENCES)[number];

export const DIRECTION_ORIGINS = ["own_words", "confirmed_proposal", "edited_proposal"] as const;
export type DirectionOrigin = (typeof DIRECTION_ORIGINS)[number];

export type DirectionStatement = {
  id: string;
  facet: DirectionFacet;
  statement: string;
  confidence: DirectionConfidence;
  origin: DirectionOrigin;
};

export async function getDirectionStatements(client: SupabaseClient): Promise<DirectionStatement[]> {
  const { data, error } = await client
    .from("direction_statements")
    .select("id, facet, statement, confidence, origin")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error || !data) return [];
  return data as DirectionStatement[];
}

/**
 * Nach Facetten gruppiert - in der Reihenfolge der Facettenliste, nicht in
 * der, in der jemand geschrieben hat.
 *
 * Die zweite wäre eine Rangfolge, die niemand gemeint hat.
 */
export function groupStatementsByFacet(
  statements: DirectionStatement[],
  facets: readonly DirectionFacet[]
) {
  return facets
    .map((facet) => ({
      facet,
      statements: statements.filter((statement) => statement.facet === facet),
    }))
    .filter((group) => group.statements.length > 0);
}
