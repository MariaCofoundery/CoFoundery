import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { taskOf, type MemberPresence, type OrgTask, type TaskComment } from "@/features/advisor/teamraumModel";
import { pageOf, type OrgPage, type OrgPageSummary } from "@/features/advisor/teamraumPageModel";

/**
 * Teamraum lesen - mit dem normalen Zugang. Die Zeilensicherheit zeigt nur Mitgliedern der
 * Organisation etwas (20270312120000); ein Team im Programm bekommt hier nie eine Zeile.
 */

const TASK_COLUMNS =
  "id, org_id, title, details, status, assignee_user_id, due_on, program_id, event_id, page_id, visibility, checklist, created_by_user_id, created_at, updated_at, done_at, advisor_org_task_assignees(user_id, created_at)";

export async function listOrgTasks(client: SupabaseClient, orgId: string): Promise<OrgTask[]> {
  // Alles Offene (bis 500) und die zuletzt erledigten (bis 200): Erledigtes waechst mit der Zeit und darf das Neue nicht
  // verdraengen - frueher fehlten ab 500 Aufgaben die NEUESTEN.
  const [open, done] = await Promise.all([
    client.from("advisor_org_tasks").select(TASK_COLUMNS).eq("org_id", orgId).neq("status", "done").order("created_at", { ascending: true }).limit(500),
    client.from("advisor_org_tasks").select(TASK_COLUMNS).eq("org_id", orgId).eq("status", "done").order("done_at", { ascending: false, nullsFirst: false }).limit(200),
  ]);
  const rows = [...(Array.isArray(open.data) && !open.error ? open.data : []), ...(Array.isArray(done.data) && !done.error ? done.data : [])] as Record<string, unknown>[];
  return rows.map(taskOf).sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

export async function listTaskComments(client: SupabaseClient, taskId: string): Promise<TaskComment[]> {
  const { data, error } = await client
    .from("advisor_org_task_comments")
    .select("id, task_id, author_user_id, body, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error || !Array.isArray(data)) return [];
  return (data as { id: string; task_id: string; author_user_id: string; body: string; created_at: string }[]).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    authorUserId: row.author_user_id,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function listOrgPresence(client: SupabaseClient, orgId: string): Promise<MemberPresence[]> {
  const { data, error } = await client
    .from("advisor_org_member_presence")
    .select("user_id, team_role, away_until, stand_in_user_id")
    .eq("org_id", orgId);
  if (error || !Array.isArray(data)) return [];
  return (data as { user_id: string; team_role: string | null; away_until: string | null; stand_in_user_id: string | null }[]).map((row) => ({
    userId: row.user_id,
    teamRole: row.team_role,
    awayUntil: row.away_until,
    standInUserId: row.stand_in_user_id,
  }));
}

/** Fuer den Advisor-Start: eigene offene Aufgaben ueber alle Organisationen - mit Datum zuerst, dann ohne. */
export async function listMyOpenOrgTasks(client: SupabaseClient, userId: string, orgId?: string): Promise<OrgTask[]> {
  // Mit `orgId` wird in der Abfrage gefiltert - nicht erst danach: Sonst verdraengten 40 Aufgaben einer anderen Organisation die der gewaehlten.
  let query = client
    .from("advisor_org_tasks")
    .select(`${TASK_COLUMNS}, mine:advisor_org_task_assignees!inner(user_id)`)
    .eq("mine.user_id", userId)
    .neq("status", "done");
  if (orgId) query = query.eq("org_id", orgId);
  const { data, error } = await query.order("due_on", { ascending: true, nullsFirst: false }).limit(40);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(taskOf);
}

/** Fuer den Advisor-Start: was im Team ansteht - offen, ueberfaellig oder in den naechsten Tagen faellig, egal fuer wen. */
export async function listUpcomingOrgTasks(client: SupabaseClient, withinDays = 7, orgId?: string): Promise<OrgTask[]> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  let query = client
    .from("advisor_org_tasks")
    .select(TASK_COLUMNS)
    .neq("status", "done")
    .lte("due_on", horizon.toISOString().slice(0, 10));
  if (orgId) query = query.eq("org_id", orgId);
  const { data, error } = await query.order("due_on", { ascending: true }).limit(40);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(taskOf);
}

/** Das naechste vereinbarte Gespraech zum Stand je Team - nur Teams, die diese Person sieht (Auswertung, 20270311120000). */
export async function getOrgNextCheckIns(client: SupabaseClient, orgId: string): Promise<{ programId: string; nextOn: string }[]> {
  const { data, error } = await client.rpc("get_org_report_check_ins", { p_org_id: orgId, p_from: null, p_to: null });
  if (error || !Array.isArray(data)) return [];
  return (data as { program_id: string; next_on: string | null }[]).flatMap((row) => (row.next_on ? [{ programId: row.program_id, nextOn: row.next_on }] : []));
}

/** Alle Seiten der Organisation ohne Text - fuer den Baum. */
export async function listOrgPages(client: SupabaseClient, orgId: string): Promise<OrgPageSummary[]> {
  const { data, error } = await client
    .from("advisor_org_pages")
    .select("id, parent_id, title, is_template, visibility, event_id, created_by_user_id, updated_by_user_id, updated_at")
    .eq("org_id", orgId)
    .order("title", { ascending: true })
    .limit(500);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(pageOf);
}

export async function getOrgPage(client: SupabaseClient, orgId: string, pageId: string): Promise<OrgPage | null> {
  const { data, error } = await client
    .from("advisor_org_pages")
    .select("id, parent_id, title, body, is_template, visibility, event_id, created_by_user_id, updated_by_user_id, updated_at")
    .eq("org_id", orgId)
    .eq("id", pageId)
    .maybeSingle();
  if (error || !data) return null;
  return pageOf(data as Record<string, unknown>);
}
