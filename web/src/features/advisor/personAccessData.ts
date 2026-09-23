import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wer darf mich sehen - und was.
 *
 * DIE PERSON MUSS DAS SEHEN KÖNNEN, sonst ist die Einwilligung eine einmalige
 * Unterschrift statt einer Entscheidung, die man zurücknehmen kann. Deshalb
 * lesen beide Seiten dieselbe Zeile: die Person, um die es geht, und der
 * Advisor.
 */

export const ADVISOR_SCOPES = [
  "base",
  "alignment_report",
  "capability",
  "capability_depth",
  "strengths",
  "direction",
] as const;
export type AdvisorScope = (typeof ADVISOR_SCOPES)[number];

export type PersonAccessGrant = {
  id: string;
  advisorUserId: string;
  scope: AdvisorScope;
  status: "requested" | "active" | "declined" | "revoked";
  requestNote: string | null;
  approvedAt: string | null;
};

/**
 * Was gerade gilt und was gefragt wurde - abgelehnte und widerrufene bleiben
 * weg.
 *
 * Nicht, weil sie unwichtig wären, sondern weil diese Liste eine Entscheidung
 * verlangt: Wer hier steht, ist entweder zu beantworten oder zurückzunehmen.
 * Eine Liste mit allem Vergangenen wäre ein Archiv, und darin übersieht man
 * die offene Anfrage.
 */
export async function getPersonAccessGrants(
  client: SupabaseClient
): Promise<PersonAccessGrant[]> {
  const { data, error } = await client
    .from("advisor_person_grants")
    .select("id, advisor_user_id, scope, status, request_note, approved_at")
    .in("status", ["requested", "active"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (error || !data) return [];

  return (
    data as {
      id: string;
      advisor_user_id: string;
      scope: AdvisorScope;
      status: PersonAccessGrant["status"];
      request_note: string | null;
      approved_at: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    advisorUserId: row.advisor_user_id,
    scope: row.scope,
    status: row.status,
    requestNote: row.request_note,
    approvedAt: row.approved_at,
  }));
}
