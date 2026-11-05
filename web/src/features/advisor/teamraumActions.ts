"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTaskStatus, parseChecklist, taskFilterOf } from "@/features/advisor/teamraumModel";

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
  const orgId = uuidOrNull(formData.get("orgId"));
  if (!orgId) return "/advisor/organisation";
  const tab = ["week", "tasks", "pages", "who"].includes(String(formData.get("tab"))) ? String(formData.get("tab")) : "tasks";
  const params = new URLSearchParams({ org: orgId, tab });
  const filter = taskFilterOf(formData.get("filter"));
  if (tab === "tasks" && filter !== "all") params.set("filter", filter);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return `/advisor/organisation?${params.toString()}`;
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
  /assignee_not_member/.test(message ?? "") ? "member" : /program_not_visible/.test(message ?? "") ? "program" : "failed";

function finish(path: string) {
  revalidatePath("/advisor/organisation");
  revalidatePath("/advisor/dashboard");
  redirect(path);
}

/** Anlegen oder bearbeiten - dasselbe Formular, mit oder ohne taskId. */
export async function saveOrgTaskAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const taskId = uuidOrNull(formData.get("taskId"));
  const status = formData.get("status");
  const { error } = await client.rpc("save_org_task", {
    p_task_id: taskId,
    p_org_id: uuidOrNull(formData.get("orgId")),
    p_title: String(formData.get("title") ?? "").slice(0, 200),
    p_details: String(formData.get("details") ?? "").slice(0, 4000),
    p_status: isTaskStatus(status) ? status : "open",
    p_assignee_user_id: uuidOrNull(formData.get("assignee")),
    p_due_on: dateOrNull(formData.get("dueOn")),
    p_program_id: uuidOrNull(formData.get("programId")),
    p_event_id: uuidOrNull(formData.get("eventId")),
    p_checklist: parseChecklist(String(formData.get("checklist") ?? "")),
  });
  if (error) finish(backTo(formData, { ...(taskId ? { task: taskId } : {}), taskError: errorOf(error.message) }));
  finish(backTo(formData, taskId ? { task: taskId, taskSaved: "1" } : { taskSaved: "1" }));
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
  finish(backTo(formData, { ...(taskId ? { task: taskId } : {}), ...(error ? { taskError: "failed" } : {}) }));
}

export async function deleteOrgTaskCommentAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const taskId = uuidOrNull(formData.get("taskId"));
  await client.rpc("delete_org_task_comment", { p_comment_id: uuidOrNull(formData.get("commentId")) });
  finish(backTo(formData, taskId ? { task: taskId } : {}));
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
