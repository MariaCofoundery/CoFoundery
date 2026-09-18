import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Was in den Export gehoert.
 *
 * Jede Zeile ist eine Tabelle und die Spalte, in der die Person steht. Alles
 * wird mit dem NORMALEN Client der Person gelesen, nicht mit dem
 * Service-Role-Schluessel. Das ist die eigentliche Konstruktion hier:
 *
 *   Die Zeilensicherheit beantwortet die Frage "was gehoert dieser Person"
 *   bereits an jeder Tabelle, und zwar schon heute und geprueft. Ein Export
 *   mit privilegiertem Zugriff muesste dieselbe Frage ein zweites Mal
 *   beantworten - und jede Abweichung waere eine Datenpanne.
 *
 * Die Spalte steht trotzdem dabei: Ohne sie kaemen bei Tabellen mit zwei
 * Beteiligten - Gespraeche, Kontaktanfragen - auch die Zeilen der anderen
 * Person mit, weil RLS sie ihr zu Recht zeigt.
 */
const EXPORTED_TABLES = [
  { table: "person_core", column: "user_id" },
  { table: "profiles", column: "user_id" },
  { table: "research_consent_preferences", column: "user_id" },
  { table: "notification_opt_outs", column: "user_id" },

  { table: "assessments", column: "user_id" },
  { table: "person_capability_entries", column: "user_id" },

  { table: "founder_discovery_profiles", column: "user_id" },
  { table: "founder_search_preferences", column: "user_id" },
  { table: "saved_searches", column: "user_id" },

  { table: "network_profiles", column: "user_id" },
  { table: "network_listings", column: "owner_user_id" },
  { table: "network_ventures", column: "owner_user_id" },
  { table: "network_problems", column: "author_user_id" },
  { table: "network_problem_approaches", column: "author_user_id" },
  { table: "network_messages", column: "sender_user_id" },
] as const;

export type AccountExport = {
  exportiertAm: string;
  hinweis: string;
  daten: Record<string, unknown[]>;
  nichtEnthalten: { tabelle: string; grund: string }[];
};

const HINWEIS =
  "Dieser Export enthaelt, was unter deinem Konto gespeichert ist. Nachrichten anderer Menschen sind nicht dabei - auch nicht in Gespraechen, an denen du beteiligt warst: Sie gehoeren der Person, die sie geschrieben hat. Belege aus deiner Faehigkeitsaufstellung sind ebenfalls nicht enthalten.";

/**
 * Sammelt die Daten einer Person.
 *
 * Schlaegt eine einzelne Tabelle fehl - weil sie umbenannt wurde oder die
 * Spalte anders heisst -, bricht der Export NICHT ab. Er nennt die Tabelle
 * stattdessen unter `nichtEnthalten`. Ein Export, der wegen einer Tabelle gar
 * nicht entsteht, hilft niemandem; einer, der stillschweigend weniger
 * enthaelt, ist schlimmer.
 */
export async function buildAccountExport(
  client: SupabaseClient,
  userId: string
): Promise<AccountExport> {
  const daten: Record<string, unknown[]> = {};
  const nichtEnthalten: { tabelle: string; grund: string }[] = [];

  for (const { table, column } of EXPORTED_TABLES) {
    const { data, error } = await client.from(table).select("*").eq(column, userId);
    if (error) {
      nichtEnthalten.push({ tabelle: table, grund: error.message });
      continue;
    }
    daten[table] = data ?? [];
  }

  return {
    exportiertAm: new Date().toISOString(),
    hinweis: HINWEIS,
    daten,
    nichtEnthalten,
  };
}

export const ACCOUNT_EXPORT_TABLES = EXPORTED_TABLES;
