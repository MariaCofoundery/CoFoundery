import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisorScope } from "@/features/advisor/personAccessData";

/**
 * Die Organisation, ihre Menschen - und die Menschen, die sie begleitet.
 *
 * WER WAS SIEHT, entscheidet die Zeilensicherheit und nicht dieser Leser: Die
 * Regeln stehen in der Migration 20261043120000, samt zweier
 * `security definer`-Helfer, die die Rekursion aufloesen. Hier steht nur, was
 * gelesen wird.
 */

export type AdvisorOrg = {
  id: string;
  name: string;
  personSeatLimit: number | null;
  role: "owner" | "advisor" | null;
};

export type OrgMember = {
  userId: string;
  role: "owner" | "advisor";
  status: "active" | "revoked";
};

export type AccompaniedPerson = {
  subjectUserId: string;
  scopes: AdvisorScope[];
  /** Was noch offen ist - die Person hat noch nicht entschieden. */
  pendingScopes: AdvisorScope[];
};

export async function getMyAdvisorOrgs(client: SupabaseClient): Promise<AdvisorOrg[]> {
  const { data: memberships } = await client
    .from("advisor_org_members")
    .select("org_id, role, status")
    .eq("status", "active");

  const rows = (memberships ?? []) as { org_id: string; role: AdvisorOrg["role"]; status: string }[];
  if (rows.length === 0) return [];

  const { data: orgs } = await client
    .from("advisor_orgs")
    .select("id, name, person_seat_limit")
    .in(
      "id",
      rows.map((row) => row.org_id)
    );

  return ((orgs ?? []) as { id: string; name: string; person_seat_limit: number | null }[]).map(
    (org) => ({
      id: org.id,
      name: org.name,
      personSeatLimit: org.person_seat_limit,
      role: rows.find((row) => row.org_id === org.id)?.role ?? null,
    })
  );
}

export async function getOrgMembers(
  client: SupabaseClient,
  orgId: string
): Promise<OrgMember[]> {
  const { data } = await client
    .from("advisor_org_members")
    .select("user_id, role, status")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as { user_id: string; role: OrgMember["role"]; status: OrgMember["status"] }[]).map(
    (row) => ({ userId: row.user_id, role: row.role, status: row.status })
  );
}

/**
 * Die begleiteten Menschen - der "gesammelte Bereich".
 *
 * GEWUENSCHT AM 23.09.2026: "Vielleicht auch in einem gesammelten Bereich, wo
 * die Leute drin sind, dass man mit denen weiterarbeiten kann."
 *
 * ES STEHEN NUR DIE HIER, DIE ZUGESTIMMT HABEN - und daneben, was noch offen
 * ist. Eine Liste, die Angefragte und Begleitete vermischt, laedt dazu ein,
 * eine Anfrage fuer eine Zusage zu halten.
 */
export async function getAccompaniedPeople(
  client: SupabaseClient
): Promise<AccompaniedPerson[]> {
  const { data } = await client
    .from("advisor_person_grants")
    .select("subject_user_id, scope, status")
    .in("status", ["active", "requested"])
    .limit(500);

  const byPerson = new Map<string, AccompaniedPerson>();
  for (const row of (data ?? []) as {
    subject_user_id: string;
    scope: AdvisorScope;
    status: string;
  }[]) {
    const entry = byPerson.get(row.subject_user_id) ?? {
      subjectUserId: row.subject_user_id,
      scopes: [],
      pendingScopes: [],
    };
    if (row.status === "active") entry.scopes.push(row.scope);
    else entry.pendingScopes.push(row.scope);
    byPerson.set(row.subject_user_id, entry);
  }

  // Wer zugestimmt hat, steht oben - dort ist etwas zu tun.
  return [...byPerson.values()].sort((a, b) => b.scopes.length - a.scopes.length);
}
