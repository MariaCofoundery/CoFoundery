"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTaskStatus, parseChecklist, taskFilterOf } from "@/features/advisor/teamraumModel";
import { pushOrgTaskNotices } from "@/features/advisor/teamraumNotifications";
import { TEAMRAUM_BASE, teamraumHref } from "@/features/advisor/teamraumRoutes";

/**
 * Teamraum schreiben. Wer darf, prueft die Datenbank (20270312120000): aktives Mitglied einer
 * aktiven Organisation, Zustaendige nur aus dem Team, Startups nur, wenn man sie sieht.
 * Hier steht nur, was aufgerufen wird und wohin es zurueckgeht.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidOrNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return UUID.test(text) ? text : null;
};
const dateOrNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

/** Zurueck in den Reiter, aus dem das Formular kam - zusammengesetzt, nie eine uebergebene Adresse. */
function backTo(formData: FormData, extra: Record<string, string> = {}) {
  // Vom Advisor-Start (Abhaken in "Aufgaben"): zurueck dorthin, mit dem gewaehlten Filter. Feste Adresse.
  const start = String(formData.get("back") ?? "");
  if (start === "start" || start === "start-team") {
    const params = new URLSearchParams({ ...(start === "start-team" ? { aufgaben: "team" } : {}), ...(extra.taskError ? { taskError: "1" } : {}) });
    return `/advisor/dashboard${params.size > 0 ? `?${params.toString()}` : ""}#start-tasks`;
  }
  const orgId = uuidOrNull(formData.get("orgId"));
  if (!orgId) return TEAMRAUM_BASE;
  const raw = String(formData.get("tab"));
  const tab = raw === "week" || raw === "pages" || raw === "who" ? raw : "tasks";
  const params = new URLSearchParams();
  const filter = taskFilterOf(formData.get("filter"));
  if (tab === "tasks" && filter !== "all") params.set("filter", filter);
  // Ansicht, Suche, Monat und "Erledigte zeigen" der Liste bleiben erhalten (Felder back_view usw.).
  const view = String(formData.get("back_view") ?? "");
  if (tab === "tasks" && (view === "board" || view === "list" || view === "calendar")) params.set("view", view);
  const month = String(formData.get("back_month") ?? "");
  if (tab === "tasks" && /^\d{4}-\d{2}$/.test(month)) params.set("month", month);
  const q = String(formData.get("back_q") ?? "").trim().slice(0, 80);
  if (tab === "tasks" && q) params.set("q", q);
  if (tab === "tasks" && formData.get("back_done") === "1") params.set("done", "1");
  const team = uuidOrNull(formData.get("back_team"));
  if (tab === "tasks" && team) params.set("team", team);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return teamraumHref(tab, orgId, Object.fromEntries(params));
}

async function requireUser(next: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(next)}`);
  return client;
}

const errorOf = (message: string | undefined) =>
  /assignee_not_member/.test(message ?? "") ? "member" : /too_many_assignees/.test(message ?? "") ? "tooMany" : /program_not_visible/.test(message ?? "") ? "program" : "failed";

function finish(path: string) {
  revalidatePath("/advisor/teamraum", "layout");
  revalidatePath("/advisor/dashboard");
  redirect(path);
}

/** Anlegen oder bearbeiten - dasselbe Formular, mit oder ohne taskId. */
/**
 * Die Checkliste aus dem Formular. Im Panel (Feld checkPanel) steht jeder Punkt als Feld checkText/checkDone; "toggleItem" kehrt
 * den Haken eines Punktes um, "removeItem" nimmt ihn heraus, "newItem" haengt einen an. Das alte Formular schickt einen Text.
 */
function checklistOf(formData: FormData) {
  if (formData.get("checkPanel") !== "1") return parseChecklist(String(formData.get("checklist") ?? ""));
  const texts = formData.getAll("checkText").map(String);
  const dones = formData.getAll("checkDone").map(String);
  const toggle = Number.parseInt(String(formData.get("toggleItem") ?? ""), 10);
  const remove = Number.parseInt(String(formData.get("removeItem") ?? ""), 10);
  const items = texts.flatMap((text, index) => {
    if (index === remove) return [];
    const done = dones[index] === "yes";
    return [{ text: text.trim().slice(0, 200), done: index === toggle ? !done : done }];
  });
  const added = String(formData.get("newItem") ?? "").trim().slice(0, 200);
  return [...items, ...(added ? [{ text: added, done: false }] : [])].filter((item) => item.text.length > 0).slice(0, 30);
}

export async function saveOrgTaskAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const taskId = uuidOrNull(formData.get("taskId"));
  const status = formData.get("status");
  // Privat gilt nur beim Anlegen (bestehende Aufgaben wechseln ueber setOrgTaskVisibilityAction) und gehoert der Person
  // allein: keine anderen Zustaendigen, kein Team im Programm.
  const isPrivate = !taskId && formData.get("visibility") === "private";
  const { data: savedId, error } = await client.rpc("save_org_task", {
    p_task_id: taskId,
    p_org_id: uuidOrNull(formData.get("orgId")),
    p_title: String(formData.get("title") ?? "").slice(0, 200),
    p_details: String(formData.get("details") ?? "").slice(0, 4000),
    p_status: isTaskStatus(status) ? status : "open",
    // Mehrere Zustaendige (20270322120000): jede gewaehlte Person ist ein eigenes Feld "assignee".
    p_assignee_user_ids: isPrivate ? [] : [...new Set(formData.getAll("assignee").map((value) => uuidOrNull(value)).filter((value): value is string => value !== null))].slice(0, 6),
    p_due_on: dateOrNull(formData.get("dueOn")),
    p_program_id: isPrivate ? null : uuidOrNull(formData.get("programId")),
    p_event_id: uuidOrNull(formData.get("eventId")),
    p_checklist: checklistOf(formData),
    p_visibility: isPrivate ? "private" : "team",
  });
  if (error) finish(backTo(formData, { ...(taskId ? { task: taskId } : {}), taskError: errorOf(error.message) }));
  // Wer neu zustaendig ist, hat den Hinweis schon (Datenbank); hier noch die Mitteilung aufs Geraet.
  if (typeof savedId === "string") await pushOrgTaskNotices(client, savedId, "org_task_assigned");
  finish(backTo(formData, taskId ? { task: taskId, taskSaved: "1" } : { taskSaved: "1" }));
}

/**
 * Speichern mit einem Handgriff: Stand, Haken oder Punkt entfernen. Ein Knopf mit Serverfunktion als formAction kann seinen eigenen
 * Wert nicht mitschicken (React ueberschreibt den Namen) - deshalb wird der Handgriff an die Funktion gebunden (bind), und alles,
 * was gerade im Formular steht, geht mit.
 */
export async function saveOrgTaskWithAction(op: { status?: string; toggle?: number; remove?: number }, formData: FormData) {
  if (op.status && isTaskStatus(op.status)) formData.set("status", op.status);
  if (typeof op.toggle === "number") formData.set("toggleItem", String(op.toggle));
  if (typeof op.remove === "number") formData.set("removeItem", String(op.remove));
  return saveOrgTaskAction(formData);
}

/** Eine eigene Aufgabe privat machen oder mit dem Team teilen - nur, wer sie angelegt hat (die Datenbank prueft das). */
export async function setOrgTaskVisibilityAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const taskId = uuidOrNull(formData.get("taskId"));
  const { error } = await client.rpc("set_org_task_visibility", { p_task_id: taskId, p_visibility: formData.get("visibility") === "private" ? "private" : "team" });
  finish(backTo(formData, { ...(taskId ? { task: taskId } : {}), ...(error ? { taskError: "failed" } : { taskSaved: "1" }) }));
}

export async function moveOrgTaskAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const status = formData.get("status");
  const { error } = await client.rpc("move_org_task", { p_task_id: uuidOrNull(formData.get("taskId")), p_status: isTaskStatus(status) ? status : "open" });
  finish(backTo(formData, error ? { taskError: "failed" } : {}));
}

export async function takeOrgTaskAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("take_org_task", { p_task_id: uuidOrNull(formData.get("taskId")) });
  finish(backTo(formData, error ? { taskError: "failed" } : {}));
}

export async function checkOrgTaskItemAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const taskId = uuidOrNull(formData.get("taskId"));
  const index = Number(formData.get("index"));
  const { error } = await client.rpc("check_org_task_item", {
    p_task_id: taskId,
    p_index: Number.isInteger(index) ? index : -1,
    p_done: formData.get("done") === "yes",
  });
  finish(backTo(formData, { ...(taskId ? { task: taskId } : {}), ...(error ? { taskError: "failed" } : {}) }));
}

export async function deleteOrgTaskAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("delete_org_task", { p_task_id: uuidOrNull(formData.get("taskId")) });
  finish(backTo(formData, error ? { taskError: "failed" } : { taskDeleted: "1" }));
}

export async function addOrgTaskCommentAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const taskId = uuidOrNull(formData.get("taskId"));
  const { error } = await client.rpc("add_org_task_comment", { p_task_id: taskId, p_body: String(formData.get("body") ?? "").slice(0, 2000) });
  if (!error && taskId) await pushOrgTaskNotices(client, taskId, "org_task_comment");
  finish(backTo(formData, { ...(taskId ? { task: taskId } : {}), ...(error ? { taskError: "failed" } : {}) }));
}

export async function deleteOrgTaskCommentAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const taskId = uuidOrNull(formData.get("taskId"));
  const { error } = await client.rpc("delete_org_task_comment", { p_comment_id: uuidOrNull(formData.get("commentId")) });
  finish(backTo(formData, { ...(taskId ? { task: taskId } : {}), ...(error ? { taskError: "failed" } : {}) }));
}

export async function setMyOrgPresenceAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("set_my_org_presence", {
    p_org_id: uuidOrNull(formData.get("orgId")),
    p_team_role: String(formData.get("teamRole") ?? "").slice(0, 80),
    p_away_until: dateOrNull(formData.get("awayUntil")),
    p_stand_in_user_id: uuidOrNull(formData.get("standIn")),
  });
  finish(backTo(formData, error ? { taskError: errorOf(error.message) } : { taskSaved: "1" }));
}

// ---------------------------------------------------------------------------
// Seiten (Stufe 2, 20270313120000). Die Formulare schicken tab=pages mit.
// ---------------------------------------------------------------------------

const pageErrorOf = (message: string | undefined) =>
  /org_page_changed/.test(message ?? "") ? "changed" : /org_page_too_deep/.test(message ?? "") ? "deep" : /org_page_has_children/.test(message ?? "") ? "children" : "failed";

export async function saveOrgPageAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const pageId = uuidOrNull(formData.get("pageId"));
  const expected = String(formData.get("expected") ?? "");
  const { data, error } = await client.rpc("save_org_page", {
    p_page_id: pageId,
    p_org_id: uuidOrNull(formData.get("orgId")),
    p_parent_id: uuidOrNull(formData.get("parentId")),
    p_title: String(formData.get("title") ?? "").slice(0, 160),
    p_body: String(formData.get("body") ?? "").slice(0, 50000),
    p_event_id: uuidOrNull(formData.get("eventId")),
    p_is_template: formData.get("isTemplate") === "yes",
    p_expected_updated_at: pageId && expected ? expected : null,
    // Nur fuer neue Seiten: eine eigene Notiz ist privat (20270315120000).
    p_visibility: formData.get("visibility") === "private" ? "private" : "team",
  });
  if (error) finish(backTo(formData, { ...(pageId ? { doc: pageId, edit: "1" } : { newDoc: "1" }), docError: pageErrorOf(error.message) }));
  finish(backTo(formData, { doc: String(data ?? pageId ?? ""), docSaved: "1" }));
}

export async function deleteOrgPageAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const pageId = uuidOrNull(formData.get("pageId"));
  const { error } = await client.rpc("delete_org_page", { p_page_id: pageId });
  if (error) finish(backTo(formData, { ...(pageId ? { doc: pageId } : {}), docError: pageErrorOf(error.message) }));
  finish(backTo(formData, { docDeleted: "1" }));
}

export async function checkOrgPageItemAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const pageId = uuidOrNull(formData.get("pageId"));
  const index = Number(formData.get("index"));
  const { error } = await client.rpc("check_org_page_item", {
    p_page_id: pageId,
    p_item: Number.isInteger(index) ? index : -1,
    p_text: String(formData.get("text") ?? "").slice(0, 400),
    p_done: formData.get("done") === "yes",
  });
  finish(backTo(formData, { ...(pageId ? { doc: pageId } : {}), ...(error ? { docError: pageErrorOf(error.message) } : {}) }));
}

export async function createTaskFromPageItemAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const pageId = uuidOrNull(formData.get("pageId"));
  const index = Number(formData.get("index"));
  const { error } = await client.rpc("create_org_task_from_page_item", {
    p_page_id: pageId,
    p_item: Number.isInteger(index) ? index : -1,
    p_text: String(formData.get("text") ?? "").slice(0, 400),
  });
  finish(backTo(formData, { ...(pageId ? { doc: pageId } : {}), ...(error ? { docError: pageErrorOf(error.message) } : { docTask: "1" }) }));
}

/** Eine eigene Notiz mit dem Team teilen - oder wieder privat machen. Nur, wer sie geschrieben hat. */
export async function setOrgPageVisibilityAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const pageId = uuidOrNull(formData.get("pageId"));
  const { error } = await client.rpc("set_org_page_visibility", {
    p_page_id: pageId,
    p_visibility: formData.get("visibility") === "private" ? "private" : "team",
  });
  finish(backTo(formData, { ...(pageId ? { doc: pageId } : {}), ...(error ? { docError: pageErrorOf(error.message) } : { docSaved: "1" }) }));
}

/**
 * Mehrere Aufgaben auf einmal - aus den Diktat-Vorschlaegen (DictateTasks). Jede einzeln ueber
 * save_org_task, also mit denselben Pruefungen wie eine von Hand angelegte. Hoechstens zwanzig.
 */
export async function createOrgTasksAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("tasks") ?? "[]"));
  } catch {
    items = [];
  }
  const tasks = (Array.isArray(items) ? items : []).slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const title = typeof entry.title === "string" ? entry.title.trim().slice(0, 200) : "";
    return title ? [{ title, assignee: uuidOrNull(String(entry.assigneeUserId ?? "")), dueOn: dateOrNull(String(entry.dueOn ?? "")), programId: uuidOrNull(String(entry.programId ?? "")) }] : [];
  });
  const orgId = uuidOrNull(formData.get("orgId"));
  let created = 0;
  let failed = false;
  for (const task of tasks) {
    const { data: savedId, error } = await client.rpc("save_org_task", {
      p_task_id: null,
      p_org_id: orgId,
      p_title: task.title,
      p_details: "",
      p_status: "open",
      p_assignee_user_id: task.assignee,
      p_due_on: task.dueOn,
      p_program_id: task.programId,
      p_event_id: null,
      p_checklist: [],
    });
    if (error) failed = true;
    else {
      created += 1;
      if (typeof savedId === "string") await pushOrgTaskNotices(client, savedId, "org_task_assigned");
    }
  }
  finish(backTo(formData, failed ? { taskError: "failed", taskCreated: String(created) } : { taskSaved: "1", taskCreated: String(created) }));
}

/** Aus dem Aufgaben-Kalender: eine Aufgabe auf einen anderen Tag ziehen. */
export async function moveTaskDueAction(taskId: string, day: string): Promise<{ ok: boolean }> {
  if (!UUID.test(taskId) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false };
  const client = await createClient();
  const { error } = await client.rpc("set_org_task_due", { p_task_id: taskId, p_due_on: day });
  if (!error) revalidatePath("/advisor/teamraum", "layout");
  return { ok: !error };
}
