/**
 * Teamraum (seit 05.11.2026): Aufgaben und "Wer macht was" fuer das Team einer Organisation.
 *
 * Nur reine Funktionen - was in welche Spalte gehoert, was diese Woche ansteht, wie viel offen ist.
 * Die Regeln, wer lesen und schreiben darf, stehen in der Datenbank (20270312120000).
 * Zahlen sind Anzahl offener Aufgaben, keine Leistung und keine Rangfolge.
 */

export const TASK_STATUSES = ["open", "doing", "waiting", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_FILTERS = ["all", "mine", "nobody"] as const;
export type TaskFilter = (typeof TASK_FILTERS)[number];

export type ChecklistItem = { text: string; done: boolean };

export type OrgTask = {
  id: string;
  orgId: string;
  title: string;
  details: string | null;
  status: TaskStatus;
  assigneeUserId: string | null;
  dueOn: string | null;
  programId: string | null;
  eventId: string | null;
  /** Seit 20270313120000: aus einer Haekchen-Zeile dieser Seite entstanden. */
  pageId: string | null;
  checklist: ChecklistItem[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  doneAt: string | null;
};

export type TaskComment = { id: string; taskId: string; authorUserId: string; body: string; createdAt: string };

export type MemberPresence = { userId: string; teamRole: string | null; awayUntil: string | null; standInUserId: string | null };

export const isTaskStatus = (value: unknown): value is TaskStatus => (TASK_STATUSES as readonly unknown[]).includes(value);
export const taskFilterOf = (value: unknown): TaskFilter => ((TASK_FILTERS as readonly unknown[]).includes(value) ? (value as TaskFilter) : "all");

/** Ein ISO-Datum (YYYY-MM-DD) plus Tage, ohne Zeitzonen-Spruenge. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const isOpen = (task: OrgTask) => task.status !== "done";
export const isOverdue = (task: OrgTask, today: string) => isOpen(task) && task.dueOn !== null && task.dueOn < today;

/** Faellige zuerst, ohne Datum zuletzt, sonst in der Reihenfolge des Anlegens. */
export function byDue(a: OrgTask, b: OrgTask): number {
  if (a.dueOn !== b.dueOn) {
    if (a.dueOn === null) return 1;
    if (b.dueOn === null) return -1;
    return a.dueOn < b.dueOn ? -1 : 1;
  }
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function filterTasks(tasks: OrgTask[], filter: TaskFilter, userId: string): OrgTask[] {
  if (filter === "mine") return tasks.filter((task) => task.assigneeUserId === userId);
  if (filter === "nobody") return tasks.filter((task) => task.assigneeUserId === null);
  return tasks;
}

/**
 * Die vier Spalten. "Erledigt" zeigt die zuletzt erledigten zuerst und nur die juengsten -
 * sonst waechst die Spalte, bis niemand mehr die anderen sieht.
 */
export function boardColumns(tasks: OrgTask[], doneLimit = 8): Record<TaskStatus, OrgTask[]> & { doneHidden: number } {
  const columns = { open: [] as OrgTask[], doing: [] as OrgTask[], waiting: [] as OrgTask[], done: [] as OrgTask[] };
  for (const task of tasks) columns[task.status].push(task);
  columns.open.sort(byDue);
  columns.doing.sort(byDue);
  columns.waiting.sort(byDue);
  columns.done.sort((a, b) => ((a.doneAt ?? a.updatedAt) < (b.doneAt ?? b.updatedAt) ? 1 : -1));
  const doneHidden = Math.max(0, columns.done.length - doneLimit);
  return { ...columns, done: columns.done.slice(0, doneLimit), doneHidden };
}

/** "Fuer dich diese Woche": eigene offene Aufgaben, ueberfaellig getrennt, sonst faellig in den naechsten sieben Tagen. */
export function myWeek(tasks: OrgTask[], userId: string, today: string): { overdue: OrgTask[]; thisWeek: OrgTask[]; later: number } {
  const mine = tasks.filter((task) => task.assigneeUserId === userId && isOpen(task)).sort(byDue);
  const horizon = addDays(today, 7);
  return {
    overdue: mine.filter((task) => isOverdue(task, today)),
    thisWeek: mine.filter((task) => task.dueOn !== null && task.dueOn >= today && task.dueOn <= horizon),
    later: mine.filter((task) => task.dueOn === null || task.dueOn > horizon).length,
  };
}

/** Noch niemand zustaendig - damit nichts liegen bleibt, weil alle dachten, jemand anderes macht es. */
export const unassignedTasks = (tasks: OrgTask[]) => tasks.filter((task) => isOpen(task) && task.assigneeUserId === null).sort(byDue);

/** Je Mitglied: offene und ueberfaellige Aufgaben. Eine Anzahl, keine Wertung. */
export function openCountsByMember(tasks: OrgTask[], today: string): Map<string, { open: number; overdue: number }> {
  const counts = new Map<string, { open: number; overdue: number }>();
  for (const task of tasks) {
    if (!isOpen(task) || !task.assigneeUserId) continue;
    const entry = counts.get(task.assigneeUserId) ?? { open: 0, overdue: 0 };
    entry.open += 1;
    if (isOverdue(task, today)) entry.overdue += 1;
    counts.set(task.assigneeUserId, entry);
  }
  return counts;
}

export function openCountsByProgram(tasks: OrgTask[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (isOpen(task) && task.programId) counts.set(task.programId, (counts.get(task.programId) ?? 0) + 1);
  }
  return counts;
}

export const checklistProgress = (task: Pick<OrgTask, "checklist">) => ({
  done: task.checklist.filter((item) => item.done).length,
  total: task.checklist.length,
});

/** Abwesend ist, wer ein Datum ab heute eingetragen hat; ein vergangenes Datum zaehlt nicht mehr. */
export const isAway = (presence: MemberPresence | undefined, today: string) => Boolean(presence?.awayUntil && presence.awayUntil >= today);

/**
 * Die Checkliste als Text zum Bearbeiten: eine Zeile je Punkt, "[x] " vorne heisst erledigt.
 * Leere Zeilen fallen weg, hoechstens 30 Punkte zu je 200 Zeichen - wie in der Datenbank.
 */
export function parseChecklist(text: string): ChecklistItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = /^(?:-\s*)?\[( |x|X)?\]\s*(.*)$/.exec(line);
      return match ? { text: match[2].trim(), done: (match[1] ?? "").toLowerCase() === "x" } : { text: line.replace(/^-\s+/, ""), done: false };
    })
    .filter((item) => item.text.length > 0)
    .slice(0, 30)
    .map((item) => ({ ...item, text: item.text.slice(0, 200) }));
}

export const checklistToText = (items: ChecklistItem[]) => items.map((item) => `${item.done ? "[x]" : "[ ]"} ${item.text}`).join("\n");

/** Die Zeile aus der Datenbank. Unbekanntes faellt weg statt zu raten. */
export function taskOf(row: Record<string, unknown>): OrgTask {
  const checklist = Array.isArray(row.checklist)
    ? (row.checklist as unknown[]).flatMap((item) =>
        item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string"
          ? [{ text: (item as { text: string }).text, done: (item as { done?: unknown }).done === true }]
          : [],
      )
    : [];
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    title: row.title as string,
    details: (row.details as string | null) ?? null,
    status: isTaskStatus(row.status) ? row.status : "open",
    assigneeUserId: (row.assignee_user_id as string | null) ?? null,
    dueOn: (row.due_on as string | null) ?? null,
    programId: (row.program_id as string | null) ?? null,
    eventId: (row.event_id as string | null) ?? null,
    pageId: (row.page_id as string | null) ?? null,
    checklist,
    createdByUserId: (row.created_by_user_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    doneAt: (row.done_at as string | null) ?? null,
  };
}
