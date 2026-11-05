import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildFundingReport,
  grantOf,
  requirementOf,
  snapshotReportOf,
  type FundingReport,
  type FundingSnapshot,
  type Grant,
  type ProgressRow,
  type Requirement,
  type RequirementEntry,
} from "@/features/advisor/fundingModel";

/**
 * Foerderauflagen lesen - mit dem normalen Zugang. Lesen duerfen Mitglieder; Nachweise und Zahlen
 * je Team nur fuer Teams, die die Person sieht; festgehaltene Staende nur die Fuehrung
 * (20270314120000). Was hier nicht ankommt, steht auch nicht im Bericht.
 */

export async function listGrants(client: SupabaseClient, orgId: string): Promise<Grant[]> {
  const { data, error } = await client
    .from("advisor_org_grants")
    .select("id, org_id, name, funder, reference, starts_on, ends_on, notes")
    .eq("org_id", orgId)
    .order("starts_on", { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(grantOf);
}

export async function listRequirements(client: SupabaseClient, grantId: string): Promise<Requirement[]> {
  const { data, error } = await client
    .from("advisor_org_requirements")
    .select("id, grant_id, title, kind, measure, event_kind, target, unit, due_on, notes, sort_order")
    .eq("grant_id", grantId)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(requirementOf);
}

export async function getFundingProgress(client: SupabaseClient, grantId: string): Promise<ProgressRow[]> {
  const { data, error } = await client.rpc("get_org_funding_progress", { p_grant_id: grantId });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    requirementId: row.requirement_id as string,
    programId: (row.program_id as string | null) ?? null,
    teamName: (row.team_name as string | null) ?? null,
    autoValue: Number(row.auto_value ?? 0),
    manualValue: Number(row.manual_value ?? 0),
    tasksDone: Number(row.tasks_done ?? 0),
  }));
}

export async function listRequirementEntries(client: SupabaseClient, requirementIds: string[]): Promise<RequirementEntry[]> {
  if (requirementIds.length === 0) return [];
  const { data, error } = await client
    .from("advisor_org_requirement_entries")
    .select("id, requirement_id, program_id, done_on, amount, note, created_by_user_id")
    .in("requirement_id", requirementIds)
    .order("done_on", { ascending: true })
    .limit(2000);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    requirementId: row.requirement_id as string,
    programId: (row.program_id as string | null) ?? null,
    doneOn: row.done_on as string,
    amount: Number(row.amount ?? 0),
    note: (row.note as string | null) ?? null,
    createdByUserId: (row.created_by_user_id as string | null) ?? null,
  }));
}

export async function listFundingSnapshots(client: SupabaseClient, grantId: string): Promise<FundingSnapshot[]> {
  const { data, error } = await client
    .from("advisor_org_funding_snapshots")
    .select("id, taken_at, note, data")
    .eq("grant_id", grantId)
    .order("taken_at", { ascending: false })
    .limit(50);
  if (error || !Array.isArray(data)) return [];
  return (data as { id: string; taken_at: string; note: string | null; data: unknown }[]).flatMap((row) => {
    const report = snapshotReportOf(row.data);
    return report ? [{ id: row.id, takenAt: row.taken_at, note: row.note, report }] : [];
  });
}

/** Alles fuer eine Foerderung auf einmal - Reiter, Druckansicht, CSV und "Stand festhalten" nutzen dasselbe. */
export async function loadFunding(
  client: SupabaseClient,
  grant: Grant,
  teamNames: Map<string, string>,
  today: string,
): Promise<{ requirements: Requirement[]; entries: RequirementEntry[]; report: FundingReport }> {
  const [requirements, rows] = await Promise.all([listRequirements(client, grant.id), getFundingProgress(client, grant.id)]);
  const entries = await listRequirementEntries(client, requirements.map((requirement) => requirement.id));
  return { requirements, entries, report: buildFundingReport(grant, requirements, rows, entries, teamNames, today) };
}
