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
  { table: "capability_interview_sessions", column: "user_id" },
  { table: "person_strengths", column: "user_id" },
  { table: "direction_statements", column: "user_id" },
  { table: "person_resources", column: "user_id" },
  { table: "person_alignment_snapshots", column: "user_id" },
  { table: "person_section_marks", column: "user_id" },
  { table: "commitment_lab_founder_entries", column: "user_id" },
  // Testprojekt: eigene Zeilen. Antworten der anderen Person gehoeren ihr und sind nicht dabei.
  { table: "relationship_test_projects", column: "created_by_user_id" },
  { table: "relationship_test_project_agreements", column: "user_id" },
  { table: "relationship_test_project_responses", column: "user_id" },
  // Check-in: eigene Antworten, Abgaben und Rueckblick. Die der anderen gehoeren ihnen.
  { table: "team_check_in_answers", column: "user_id" },
  { table: "team_check_in_submissions", column: "user_id" },
  { table: "team_check_in_retro_invites", column: "user_id" },
  { table: "team_check_in_retro_answers", column: "user_id" },
  // Stempel der Check-in-Erinnerung: nur "es wurde erinnert", kein Inhalt.
  { table: "team_check_in_reminders", column: "user_id" },
  // Austritt: nur die eigene Wahl zur Frage "Wie geht es weiter?".
  { table: "team_departure_choices", column: "user_id" },
  // Finanzierungs-Wegweiser: nur "wer hat einen Status zuletzt gesetzt".
  { table: "team_financing_items", column: "updated_by_user_id" },
  { table: "team_financing_notes", column: "updated_by_user_id" },
  { table: "founder_team_setup_discussion_entries", column: "author_user_id" },
  { table: "founder_team_members", column: "user_id" },
  // Was die Person freigegeben hat: wer es sieht, ist Teil der Auskunft.
  { table: "assessment_team_shares", column: "owner_user_id" },
  { table: "team_shares", column: "owner_user_id" },
  { table: "advisor_person_grants", column: "subject_user_id" },

  { table: "founder_discovery_profiles", column: "user_id" },
  { table: "founder_search_preferences", column: "user_id" },
  { table: "saved_searches", column: "user_id" },
  { table: "founder_discovery_saves", column: "owner_user_id" },
  { table: "discovery_intro_requests", column: "requester_user_id" },

  { table: "network_profiles", column: "user_id" },
  { table: "network_listings", column: "owner_user_id" },
  { table: "network_ventures", column: "owner_user_id" },
  { table: "network_problems", column: "author_user_id" },
  { table: "network_problem_approaches", column: "author_user_id" },
  { table: "network_contact_requests", column: "sender_user_id" },
  { table: "network_problem_interests", column: "user_id" },
  { table: "network_problem_confirmations", column: "user_id" },
  { table: "connect_suggestions", column: "recipient_user_id" },
  { table: "in_app_notices", column: "recipient_user_id" },
  { table: "product_feedback", column: "user_id" },
] as const;

/**
 * Tabellen, die keine Personenspalte tragen, sondern an einer Elterntabelle der
 * Person haengen: die Antworten an `assessments`, die Belege an den
 * Faehigkeitseintraegen, die Interview-Runden an den Interview-Sitzungen. Ohne
 * sie waeren genau die Inhalte nicht im Export, die jemand am ehesten wiederhaben
 * will. Gelesen wird wieder mit dem Client der Person; die Eltern-IDs stammen
 * aus deren eigenen Zeilen.
 */
const CHILD_TABLES = [
  { table: "alignment_answers", column: "assessment_id", parent: "assessments" },
  { table: "person_capability_evidence", column: "entry_id", parent: "person_capability_entries" },
  { table: "capability_interview_turns", column: "session_id", parent: "capability_interview_sessions" },
] as const;

/**
 * Vier Bereiche, die normale Konten nicht direkt lesen duerfen: die eigenen gesendeten Nachrichten, die eigenen
 * Sperren, die eigenen Sitzungen der Arbeitsweise-Befragung und die eigenen Forschungsantworten. Sie kommen ueber
 * `export_my_restricted_data` - eine schmale Funktion, die nur Zeilen der aufrufenden Person liefert. Vorher stand
 * hier im Export "permission denied", und die Daten fehlten (Art. 15 und 20 DSGVO).
 */
export const ACCOUNT_EXPORT_RESTRICTED_TABLES = [
  "network_messages",
  "network_blocks",
  "workstyle_pretest_sessions",
  "workstyle_research_responses",
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

  for (const { table, column, parent } of CHILD_TABLES) {
    const parents = (daten[parent] ?? []) as { id?: string }[];
    const ids = parents.map((row) => row.id).filter((id): id is string => typeof id === "string");
    if (ids.length === 0) {
      daten[table] = [];
      continue;
    }
    const { data, error } = await client.from(table).select("*").in(column, ids);
    if (error) {
      nichtEnthalten.push({ tabelle: table, grund: error.message });
      continue;
    }
    daten[table] = data ?? [];
  }

  const restricted = await client.rpc("export_my_restricted_data");
  if (restricted.error || !restricted.data || typeof restricted.data !== "object") {
    for (const table of ACCOUNT_EXPORT_RESTRICTED_TABLES) {
      nichtEnthalten.push({ tabelle: table, grund: restricted.error?.message ?? "no_data" });
    }
  } else {
    const rows = restricted.data as Record<string, unknown>;
    for (const table of ACCOUNT_EXPORT_RESTRICTED_TABLES) {
      daten[table] = Array.isArray(rows[table]) ? (rows[table] as unknown[]) : [];
    }
  }

  return {
    exportiertAm: new Date().toISOString(),
    hinweis: HINWEIS,
    daten,
    nichtEnthalten,
  };
}

export const ACCOUNT_EXPORT_TABLES = EXPORTED_TABLES;
export const ACCOUNT_EXPORT_CHILD_TABLES = CHILD_TABLES;
