import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Aufgaben im Programm (20270329120000): gemeinsam zwischen einem Startup und seiner Organisation, oder privat. Die
 * Datenbank liefert nur, was diese Person sehen darf (Zeilenregel program_tasks_access).
 */
export type ProgramTask = {
  id: string;
  programId: string;
  title: string;
  details: string | null;
  status: "open" | "doing" | "done";
  dueOn: string | null;
  assigneeUserId: string | null;
  visibility: "shared" | "private";
  createdByUserId: string | null;
  createdAt: string;
};

export type ProgramTaskPerson = { userId: string; name: string; side: "team" | "org" };

const taskOf = (row: Record<string, unknown>): ProgramTask => ({
  id: row.id as string,
  programId: row.program_id as string,
  title: row.title as string,
  details: (row.details as string | null) ?? null,
  status: row.status === "done" ? "done" : row.status === "doing" ? "doing" : "open",
  dueOn: (row.due_on as string | null) ?? null,
  assigneeUserId: (row.assignee_user_id as string | null) ?? null,
  visibility: row.visibility === "private" ? "private" : "shared",
  createdByUserId: (row.created_by_user_id as string | null) ?? null,
  createdAt: row.created_at as string,
});

const COLUMNS = "id, program_id, title, details, status, due_on, assignee_user_id, visibility, created_by_user_id, created_at";

export async function listProgramTasks(client: SupabaseClient, programId: string): Promise<ProgramTask[]> {
  const { data, error } = await client.from("team_program_tasks").select(COLUMNS).eq("program_id", programId).order("created_at", { ascending: false }).limit(300);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(taskOf);
}

/** Alle meine offenen Aufgaben ueber meine Programme - fuer die Startseite. */
export async function listMyProgramTasks(client: SupabaseClient, userId: string): Promise<ProgramTask[]> {
  const { data, error } = await client
    .from("team_program_tasks")
    .select(COLUMNS)
    .neq("status", "done")
    .or(`assignee_user_id.eq.${userId},created_by_user_id.eq.${userId}`)
    .order("due_on", { ascending: true, nullsFirst: false })
    .limit(50);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(taskOf);
}

export async function getProgramTaskPeople(client: SupabaseClient, programId: string): Promise<ProgramTaskPerson[]> {
  const { data, error } = await client.rpc("get_program_task_people", { p_program_id: programId });
  if (error || !Array.isArray(data)) return [];
  return (data as { user_id: string; display_name: string; side: string }[]).map((row) => ({ userId: row.user_id, name: row.display_name, side: row.side === "org" ? "org" : "team" }));
}
