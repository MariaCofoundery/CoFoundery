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
  // Welche Mitteilungen der Plattform diese Person gesehen oder weggeklickt hat.
  { table: "announcement_receipts", column: "user_id" },

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
  // "Das bringe ich ein" (seit 20270309120000): nur der eigene Beitrag.
  { table: "relationship_test_project_contributions", column: "user_id" },
  // Check-in: eigene Antworten, Abgaben und Rueckblick. Die der anderen gehoeren ihnen.
  { table: "team_check_in_answers", column: "user_id" },
  { table: "team_check_in_submissions", column: "user_id" },
  { table: "team_check_in_retro_invites", column: "user_id" },
  { table: "team_check_in_retro_answers", column: "user_id" },
  // Austritt: nur die eigene Wahl zur Frage "Wie geht es weiter?".
  { table: "team_departure_choices", column: "user_id" },
  // Finanzierungs-Wegweiser: nur "wer hat einen Status zuletzt gesetzt".
  { table: "team_financing_items", column: "updated_by_user_id" },
  { table: "team_financing_notes", column: "updated_by_user_id" },
  // Erwartungsabgleich: die eigenen Antworten und Abgaben.
  { table: "team_financing_alignment_answers", column: "user_id" },
  { table: "team_financing_alignment_submissions", column: "user_id" },
  { table: "founder_team_setup_discussion_entries", column: "author_user_id" },
  // Teamraum einer Organisation (seit 20270312120000): angelegte Aufgaben, eigene Kommentare und die
  // eigene Angabe unter "Wer macht was". Lesbar, solange die Mitgliedschaft aktiv ist.
  { table: "advisor_org_tasks", column: "created_by_user_id" },
  { table: "advisor_org_task_comments", column: "author_user_id" },
  { table: "advisor_org_member_presence", column: "user_id" },
  { table: "advisor_org_pages", column: "created_by_user_id" },
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

  // Fruehere Fassungen (seit 03.11.2026 im Export): eigene Zeilen, solange sie
  // gespeichert sind. Umstiegsentscheidungen, eigene Matching-Eingaben, und als
  // Advisor die eigenen Zugaenge zu Paaren. (matching_session_participants fehlt
  // bewusst: Ihre Leseregel verweist auf sich selbst und bricht jeden direkten
  // Lesezugriff mit "infinite recursion" ab.)
  { table: "instrument_transitions", column: "user_id" },
  { table: "invitation_matching_inputs", column: "user_id" },
  { table: "relationship_advisors", column: "advisor_user_id" },
  { table: "founder_alignment_workbook_advisors", column: "advisor_user_id" },
] as const;

/**
 * Tabellen mit zwei Beteiligten in zwei Spalten (Einladungen: wer einlud, wer
 * eingeladen wurde; Beziehungen: die beiden Personen). Gelesen werden nur Zeilen,
 * in denen die Person selbst steht - in einer der beiden Spalten.
 */
const PAIR_TABLES = [
  { table: "invitations", columns: ["inviter_user_id", "invitee_user_id"] },
  { table: "relationships", columns: ["user_a_id", "user_b_id"] },
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
  // Die Antworten des frueheren v1-Fragebogens und der Antwortverlauf je Frage.
  { table: "assessment_answers", column: "assessment_id", parent: "assessments" },
  { table: "alignment_item_views", column: "assessment_id", parent: "assessments" },
  // Wer zu den eigenen Beziehungen als Advisor eingetragen ist ("wer es sieht").
  { table: "relationship_advisors", column: "relationship_id", parent: "relationships" },
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
  // Programm: die eigenen Zustimmungen und Eintraege.
  "team_program_consents",
  "team_program_updates",
  "team_program_milestones",
  "team_program_profiles",
  // Liefert die Funktion seit 20270214120000; fehlte bis 03.11.2026 in dieser Liste.
  "team_program_org_data",
  // Stempel der Check-in-Erinnerung (nur "es wurde erinnert", kein Inhalt). Die
  // Tabelle ist fuer Konten geschlossen; direkt gelesen stand hier "permission denied".
  "team_check_in_reminders",
  // Die eigenen Zusagen zu Programm-Veranstaltungen (seit 20270307120000).
  "team_program_event_rsvps",
] as const;

export type AccountExport = {
  exportiertAm: string;
  hinweis: string;
  daten: Record<string, unknown[]>;
  nichtEnthalten: { tabelle: string; grund: string }[];
};

const HINWEIS =
  "Dieser Export enthaelt, was unter deinem Konto gespeichert ist. Nachrichten anderer Menschen sind nicht dabei - auch nicht in Gespraechen, an denen du beteiligt warst: Sie gehoeren der Person, die sie geschrieben hat. Deine Belege aus der Faehigkeitsaufstellung sind dabei - ausser dir bekommt sie niemand zu sehen. Gemeinsame Dokumente aus frueheren Fassungen (Workbooks, Paarberichte, Matching-Raeume) enthalten auch Angaben einer anderen Person und sind deshalb nicht dabei; du kannst sie in der App weiter ansehen.";

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

  for (const { table, columns } of PAIR_TABLES) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .or(columns.map((column) => `${column}.eq.${userId}`).join(","));
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
      daten[table] = daten[table] ?? [];
      continue;
    }
    const { data, error } = await client.from(table).select("*").in(column, ids);
    if (error) {
      nichtEnthalten.push({ tabelle: table, grund: error.message });
      continue;
    }
    // Steht die Tabelle schon aus einer anderen Richtung im Export (z. B.
    // relationship_advisors als Advisor), kommen die Zeilen dazu, ohne doppelt.
    const seen = new Set((daten[table] ?? []).map((row) => JSON.stringify(row)));
    daten[table] = [...(daten[table] ?? []), ...(data ?? []).filter((row) => !seen.has(JSON.stringify(row)))];
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
export const ACCOUNT_EXPORT_PAIR_TABLES = PAIR_TABLES;
