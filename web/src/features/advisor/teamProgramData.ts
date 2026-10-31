import { buildAdvisorConfirmedFounderSetup, type AdvisorConfirmedFounderSetupItem, type AdvisorConfirmedFounderSetupRow } from "@/features/teams/founderSetupAdvisorAccessModel";
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
  batch: string | null;
  category: string | null;
  isAlumni: boolean;
  soloConfirmed: boolean;
  includesSetup: boolean;
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
  soloConfirmed: boolean;
  includesSetup: boolean;
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
    batch: (row.batch as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    isAlumni: row.is_alumni === true,
    soloConfirmed: row.solo_confirmed === true,
    includesSetup: row.includes_setup === true,
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
    soloConfirmed: row.solo_confirmed === true,
    includesSetup: row.includes_setup === true,
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

export type ProgramMilestone = {
  milestoneId: string;
  title: string;
  dueOn: string | null;
  targetCount: number | null;
  doneCount: number;
};

export type MilestoneDeadline = {
  programId: string;
  teamName: string | null;
  title: string;
  dueOn: string;
  targetCount: number | null;
  doneCount: number;
};

export async function listProgramMilestones(client: SupabaseClient, programId: string): Promise<ProgramMilestone[]> {
  const { data } = await client.rpc("list_team_program_milestones", { p_program_id: programId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    milestoneId: row.milestone_id as string,
    title: row.title as string,
    dueOn: (row.due_on as string | null) ?? null,
    targetCount: row.target_count === null || row.target_count === undefined ? null : Number(row.target_count),
    doneCount: Number(row.done_count ?? 0),
  }));
}

export async function getOrgMilestoneDeadlines(client: SupabaseClient, orgId: string): Promise<MilestoneDeadline[]> {
  const { data } = await client.rpc("get_org_milestone_deadlines", { p_org_id: orgId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    programId: row.program_id as string,
    teamName: (row.team_name as string | null) ?? null,
    title: row.milestone_title as string,
    dueOn: row.due_on as string,
    targetCount: row.target_count === null || row.target_count === undefined ? null : Number(row.target_count),
    doneCount: Number(row.done_count ?? 0),
  }));
}

export type ProgramUpdate = { updateId: string; submittedAt: string; answers: { q: string; a: string }[] };

export async function getProgramUpdateQuestions(client: SupabaseClient, programId: string): Promise<string[]> {
  const { data } = await client.rpc("list_program_update_questions", { p_program_id: programId });
  return ((data ?? []) as { question: string }[]).map((row) => row.question);
}

export async function listProgramUpdates(client: SupabaseClient, programId: string): Promise<ProgramUpdate[]> {
  const { data } = await client.rpc("list_program_updates", { p_program_id: programId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    updateId: row.update_id as string,
    submittedAt: row.submitted_at as string,
    answers: Array.isArray(row.answers) ? (row.answers as { q: string; a: string }[]) : [],
  }));
}

export async function getProgramUpdateDue(client: SupabaseClient, programId: string): Promise<string | null> {
  const { data } = await client.rpc("get_program_update_due", { p_program_id: programId });
  return typeof data === "string" ? data : null;
}

export type ProgramProfile = {
  companyName: string | null;
  founders: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export async function getProgramProfile(client: SupabaseClient, programId: string): Promise<ProgramProfile | null> {
  const { data } = await client.rpc("get_team_program_profile", { p_program_id: programId });
  const row = ((data ?? []) as Record<string, string | null>[])[0];
  if (!row) return null;
  return {
    companyName: row.company_name ?? null,
    founders: row.founders ?? null,
    address: row.address ?? null,
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
  };
}

export type ProgramAccess = { programId: string; teamReview: "active" | "requested" | "none"; founderSetup: "active" | "requested" | "none" };

export async function getProgramAccess(client: SupabaseClient, orgId: string): Promise<ProgramAccess[]> {
  const { data } = await client.rpc("get_program_access_for_me", { p_org_id: orgId });
  return ((data ?? []) as Record<string, string>[]).map((row) => ({
    programId: row.program_id,
    teamReview: row.team_review === "active" ? "active" : row.team_review === "requested" ? "requested" : "none",
    founderSetup: row.founder_setup === "active" ? "active" : row.founder_setup === "requested" ? "requested" : "none",
  }));
}

export type TeamProgramCode = {
  codeId: string;
  label: string | null;
  code: string;
  uses: number;
  maxUses: number;
  accounts: number;
  expiresAt: string;
  status: "active" | "revoked" | "expired";
};

export async function listTeamProgramCodes(client: SupabaseClient, orgId: string): Promise<TeamProgramCode[]> {
  const { data } = await client.rpc("list_team_program_codes", { p_org_id: orgId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    codeId: row.code_id as string,
    label: (row.label as string | null) ?? null,
    code: row.code as string,
    uses: Number(row.uses ?? 0),
    maxUses: Number(row.max_uses ?? 0),
    accounts: Number(row.accounts ?? 0),
    expiresAt: row.expires_at as string,
    status: row.status === "revoked" ? "revoked" : row.status === "expired" ? "expired" : "active",
  }));
}

export async function getTeamProgramCodeOptions(client: SupabaseClient, code: string): Promise<TeamProgramInviteOption[]> {
  const { data } = await client.rpc("get_team_program_code_options", { p_code: code });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    orgName: row.org_name as string,
    teamId: row.team_id as string,
    teamName: (row.team_name as string | null) ?? null,
    memberCount: Number(row.member_count ?? 0),
  }));
}

export type ProgramBranding = { slug: string; orgName: string; hasLogo: boolean; accent: string | null; accentB: string | null };

/** Logo und Farben der Organisation hinter einem Code - nur, was ihre oeffentliche Seite ohnehin zeigt. */
export async function getProgramBrandingForCode(client: SupabaseClient, code: string): Promise<ProgramBranding | null> {
  const { data } = await client.rpc("get_program_branding_for_code", { p_code: code });
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) return null;
  return {
    slug: row.slug as string,
    orgName: row.org_name as string,
    hasLogo: row.has_logo === true,
    accent: (row.accent as string | null) ?? null,
    accentB: (row.accent_b as string | null) ?? null,
  };
}

/** Das bestaetigte Founder Setup eines Programm-Teams - nur, wenn das Programm es einschliesst und aktiv ist. */
export async function getProgramConfirmedSetup(client: SupabaseClient, programId: string): Promise<AdvisorConfirmedFounderSetupItem[]> {
  const { data, error } = await client.rpc("get_program_confirmed_setup", { p_program_id: programId });
  if (error || !Array.isArray(data)) return [];
  return buildAdvisorConfirmedFounderSetup(data as AdvisorConfirmedFounderSetupRow[]);
}

export type ProgramEvent = {
  eventId: string;
  title: string;
  kind: "education" | "internal" | "external";
  startsAt: string;
  location: string | null;
  notes: string | null;
  todos: string | null;
};
export type MyProgramEvent = ProgramEvent & { programId: string; orgName: string; myStatus: "present" | "absent" | "excused" | null };
export type EventAttendanceRow = { programId: string; teamName: string | null; status: "present" | "absent" | "excused" | null };

const eventOf = (row: Record<string, unknown>): ProgramEvent => ({
  eventId: row.event_id as string,
  title: row.title as string,
  kind: row.kind === "internal" ? "internal" : row.kind === "external" ? "external" : "education",
  startsAt: row.starts_at as string,
  location: (row.location as string | null) ?? null,
  notes: (row.notes as string | null) ?? null,
  todos: (row.todos as string | null) ?? null,
});
const statusOf = (value: unknown) => (value === "present" || value === "absent" || value === "excused" ? value : null);

export async function listProgramEvents(client: SupabaseClient, orgId: string): Promise<ProgramEvent[]> {
  const { data } = await client.rpc("list_program_events", { p_org_id: orgId });
  return ((data ?? []) as Record<string, unknown>[]).map(eventOf);
}

export async function getEventAttendance(client: SupabaseClient, eventId: string): Promise<EventAttendanceRow[]> {
  const { data } = await client.rpc("get_event_attendance", { p_event_id: eventId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    programId: row.program_id as string,
    teamName: (row.team_name as string | null) ?? null,
    status: statusOf(row.status),
  }));
}

export async function getMyProgramEvents(client: SupabaseClient): Promise<MyProgramEvent[]> {
  const { data } = await client.rpc("get_my_program_events");
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    ...eventOf(row),
    programId: row.program_id as string,
    orgName: row.org_name as string,
    myStatus: statusOf(row.my_status),
  }));
}

/** Faellige Wiedervorlagen der eigenen Notizen an Programm-Teams (RLS: nur die eigenen), bis zu `withinDays` Tage voraus. */
export async function listDueProgramFollowUps(client: SupabaseClient, withinDays = 7): Promise<{ programId: string; dueOn: string }[]> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  const { data, error } = await client
    .from("advisor_follow_ups")
    .select("program_id, due_on")
    .not("program_id", "is", null)
    .is("completed_at", null)
    .lte("due_on", horizon.toISOString().slice(0, 10))
    .order("due_on", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return (data as { program_id: string; due_on: string }[]).map((row) => ({ programId: row.program_id, dueOn: row.due_on }));
}

export type OutcomeCatalogItem = { catalogId: string; defaultKey: string | null; title: string | null; stars: number; active: boolean };
export type ProgramOutcome = {
  catalogId: string;
  defaultKey: string | null;
  title: string | null;
  stars: number;
  outcomeId: string | null;
  achievedOn: string | null;
  note: string | null;
  confirmed: boolean;
};

export async function getOutcomeCatalog(client: SupabaseClient, orgId: string): Promise<OutcomeCatalogItem[]> {
  const { data } = await client.rpc("get_outcome_catalog", { p_org_id: orgId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    catalogId: row.catalog_id as string,
    defaultKey: (row.default_key as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    stars: Number(row.stars ?? 1),
    active: row.active === true,
  }));
}

export async function getProgramOutcomes(client: SupabaseClient, programId: string): Promise<ProgramOutcome[]> {
  const { data } = await client.rpc("get_program_outcomes", { p_program_id: programId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    catalogId: row.catalog_id as string,
    defaultKey: (row.default_key as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    stars: Number(row.stars ?? 1),
    outcomeId: (row.outcome_id as string | null) ?? null,
    achievedOn: (row.achieved_on as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    confirmed: row.confirmed === true,
  }));
}

/** Sterne eines Teams: nur bestaetigte Ergebnisse zaehlen. Je Team, nie ueber Teams hinweg. */
export function countStars(outcomes: ProgramOutcome[]) {
  return outcomes.filter((entry) => entry.outcomeId && entry.confirmed).reduce((sum, entry) => sum + entry.stars, 0);
}

export type OrgReward = { rewardId: string; starsNeeded: number; title: string; description: string | null; active: boolean };
export type ProgramReward = {
  rewardId: string;
  starsNeeded: number;
  title: string;
  description: string | null;
  starsTotal: number;
  unlockedAt: string | null;
  redeemedAt: string | null;
};
export type OutcomeComment = { outcomeId: string; side: "team" | "org"; body: string };
export type CheckIn = { checkInId: string; heldOn: string; summary: string | null; nextOn: string | null };

export async function getOrgRewards(client: SupabaseClient, orgId: string): Promise<OrgReward[]> {
  const { data } = await client.rpc("get_org_rewards", { p_org_id: orgId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    rewardId: row.reward_id as string,
    starsNeeded: Number(row.stars_needed ?? 0),
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    active: row.active === true,
  }));
}

export async function getProgramRewards(client: SupabaseClient, programId: string): Promise<ProgramReward[]> {
  const { data } = await client.rpc("get_program_rewards", { p_program_id: programId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    rewardId: row.reward_id as string,
    starsNeeded: Number(row.stars_needed ?? 0),
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    starsTotal: Number(row.stars_total ?? 0),
    unlockedAt: (row.unlocked_at as string | null) ?? null,
    redeemedAt: (row.redeemed_at as string | null) ?? null,
  }));
}

export async function getOutcomeComments(client: SupabaseClient, programId: string): Promise<OutcomeComment[]> {
  const { data } = await client.rpc("get_outcome_comments", { p_program_id: programId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    outcomeId: row.outcome_id as string,
    side: row.side === "org" ? "org" : "team",
    body: row.body as string,
  }));
}

export async function getCheckIns(client: SupabaseClient, programId: string): Promise<CheckIn[]> {
  const { data } = await client.rpc("get_check_ins", { p_program_id: programId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    checkInId: row.check_in_id as string,
    heldOn: row.held_on as string,
    summary: (row.summary as string | null) ?? null,
    nextOn: (row.next_on as string | null) ?? null,
  }));
}

export async function getSuccessEnabled(client: SupabaseClient, orgId: string): Promise<boolean> {
  const { data } = await client.rpc("get_success_enabled", { p_org_id: orgId });
  return data === true;
}
