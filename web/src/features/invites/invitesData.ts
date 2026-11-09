import "server-only";
import { type OrgRole, orgRoleOf } from "@/features/advisor/orgRights";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Offene Einladungen an mich (20270328120000, list_my_invites): Organisation und Bitte um Einblick, zugeordnet ueber die
 * bestaetigte Adresse. Die Datenbank zeigt nur, was zu dieser Adresse passt.
 */
export type MyInvite = {
  inviteId: string;
  kind: "org" | "person";
  orgName: string | null;
  inviterName: string | null;
  role: OrgRole | null;
  scopes: string[];
  note: string | null;
  createdAt: string;
  expiresAt: string;
};

export async function listMyInvites(client: SupabaseClient): Promise<MyInvite[]> {
  const { data, error } = await client.rpc("list_my_invites");
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    inviteId: row.invite_id as string,
    kind: row.kind === "person" ? "person" : "org",
    orgName: (row.org_name as string | null) ?? null,
    inviterName: (row.inviter_name as string | null) ?? null,
    role: typeof row.role === "string" ? orgRoleOf(row.role) : null,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  }));
}
