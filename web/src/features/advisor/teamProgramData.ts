import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Team <-> Programm (Migration 20270117120000). Gelesen wird nur ueber die
 * Funktionen der Datenbank: Sie entscheiden, wer was sieht.
 */

export type OrgTeamProgram = {
  programId: string;
  teamId: string;
  teamName: string | null;
  status: "invited" | "active";
  isActive: boolean;
  memberCount: number;
  approvedCount: number;
  contactUserIds: string[];
  isContact: boolean;
};

export type TeamProgramInvite = {
  inviteId: string;
  label: string | null;
  status: "open" | "used" | "revoked";
  createdAt: string;
  expiresAt: string;
};

export type MyTeamProgram = {
  programId: string;
  teamId: string;
  orgName: string;
  status: "invited" | "active";
  isActive: boolean;
  iApproved: boolean;
  memberCount: number;
  approvedCount: number;
  contactNames: string[];
  adminNames: string[];
};

export type TeamProgramInviteOption = {
  orgName: string;
  teamId: string;
  teamName: string | null;
  memberCount: number;
};

export async function getOrgTeamPrograms(client: SupabaseClient, orgId: string): Promise<OrgTeamProgram[]> {
  const { data } = await client.rpc("get_org_team_programs", { p_org_id: orgId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    programId: row.program_id as string,
    teamId: row.team_id as string,
    teamName: (row.team_name as string | null) ?? null,
    status: row.status === "active" ? "active" : "invited",
    isActive: row.is_active === true,
    memberCount: Number(row.member_count ?? 0),
    approvedCount: Number(row.approved_count ?? 0),
    contactUserIds: (row.contact_user_ids as string[] | null) ?? [],
    isContact: row.is_contact === true,
  }));
}

export async function listTeamProgramInvites(client: SupabaseClient, orgId: string): Promise<TeamProgramInvite[]> {
  const { data } = await client.rpc("list_team_program_invites", { p_org_id: orgId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    inviteId: row.invite_id as string,
    label: (row.label as string | null) ?? null,
    status: row.status as TeamProgramInvite["status"],
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  }));
}

export async function getMyTeamPrograms(client: SupabaseClient): Promise<MyTeamProgram[]> {
  const { data } = await client.rpc("get_my_team_programs");
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    programId: row.program_id as string,
    teamId: row.team_id as string,
    orgName: row.org_name as string,
    status: row.status === "active" ? "active" : "invited",
    isActive: row.is_active === true,
    iApproved: row.i_approved === true,
    memberCount: Number(row.member_count ?? 0),
    approvedCount: Number(row.approved_count ?? 0),
    contactNames: ((row.contact_names as string[] | null) ?? []).filter((name) => name.length > 0),
    adminNames: ((row.admin_names as string[] | null) ?? []).filter((name) => name.length > 0),
  }));
}

export async function getTeamProgramInviteOptions(
  client: SupabaseClient,
  tokenHash: string,
): Promise<TeamProgramInviteOption[]> {
  const { data } = await client.rpc("get_team_program_invite_options", { p_token_hash: tokenHash });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    orgName: row.org_name as string,
    teamId: row.team_id as string,
    teamName: (row.team_name as string | null) ?? null,
    memberCount: Number(row.member_count ?? 0),
  }));
}
