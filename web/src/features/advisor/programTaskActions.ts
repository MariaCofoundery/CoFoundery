"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseChecklist } from "@/features/advisor/teamraumModel";

/**
 * Aufgaben im Programm schreiben (20270329120000). Wer was darf, prueft die Datenbank. Der Rueckweg wird aus Seite und
 * Programm zusammengesetzt, nie uebernommen: "team" ist die Seite Programm der Startups, "org" die Teamseite der Organisation.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidOrNull = (value: unknown) => (UUID.test(String(value ?? "")) ? String(value) : null);

function backOf(formData: FormData, extra = "") {
  const programId = uuidOrNull(formData.get("programId"));
  const goals = formData.get("area") === "goals";
  if (formData.get("side") === "org" && programId) return `/advisor/programm/${programId}?tab=${goals ? "ziele" : "aufgaben"}${extra}`;
  // Bei mehreren Programmen (mehrere Organisationen) muss der Rueckweg sagen, WELCHES - sonst erscheint die Rueckmeldung
  // bei allen und der Sprung geht zum ersten.
  const which = programId ? `program=${programId}` : "";
  const query = [which, extra.replace(/^&/, "")].filter(Boolean).join("&");
  return `/programm${query ? `?${query}` : ""}#${goals ? "ziele" : "aufgaben"}${programId ? `-${programId}` : ""}`;
}

async function requireClient(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(backOf(formData))}`);
  return client;
}

function finish(path: string) {
  revalidatePath("/programm");
  revalidatePath("/advisor/programm/[programId]", "page");
  revalidatePath("/dashboard");
  revalidatePath("/advisor/dashboard");
  redirect(path);
}

export async function saveProgramTaskAction(formData: FormData) {
  const client = await requireClient(formData);
  const taskId = uuidOrNull(formData.get("taskId"));
  const due = String(formData.get("dueOn") ?? "");
  const { error } = await client.rpc("save_program_task", {
    p_task_id: taskId,
    p_program_id: uuidOrNull(formData.get("programId")),
    p_title: String(formData.get("title") ?? "").slice(0, 200),
    p_details: String(formData.get("details") ?? "").slice(0, 4000),
    p_status: ["open", "doing", "done"].includes(String(formData.get("status"))) ? String(formData.get("status")) : "open",
    p_due_on: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    p_assignee_user_id: uuidOrNull(formData.get("assignee")),
    p_visibility: !taskId && formData.get("visibility") === "private" ? "private" : "shared",
    p_checklist: parseChecklist(String(formData.get("checklist") ?? "")),
  });
  finish(backOf(formData, error ? "&taskError=1" : "&taskSaved=1"));
}

export async function moveProgramTaskAction(formData: FormData) {
  const client = await requireClient(formData);
  const status = String(formData.get("status"));
  const { error } = await client.rpc("move_program_task", { p_task_id: uuidOrNull(formData.get("taskId")), p_status: ["open", "doing", "done"].includes(status) ? status : "open" });
  finish(backOf(formData, error ? "&taskError=1" : ""));
}

export async function deleteProgramTaskAction(formData: FormData) {
  const client = await requireClient(formData);
  const { error } = await client.rpc("delete_program_task", { p_task_id: uuidOrNull(formData.get("taskId")) });
  finish(backOf(formData, error ? "&taskError=1" : ""));
}

export async function setProgramTaskVisibilityAction(formData: FormData) {
  const client = await requireClient(formData);
  const { error } = await client.rpc("set_program_task_visibility", { p_task_id: uuidOrNull(formData.get("taskId")), p_visibility: formData.get("visibility") === "private" ? "private" : "shared" });
  finish(backOf(formData, error ? "&taskError=1" : ""));
}

export async function checkProgramTaskItemAction(formData: FormData) {
  const client = await requireClient(formData);
  const index = Number(formData.get("index"));
  const { error } = await client.rpc("check_program_task_item", { p_task_id: uuidOrNull(formData.get("taskId")), p_index: Number.isInteger(index) ? index : -1, p_done: formData.get("done") === "yes" });
  finish(backOf(formData, error ? "&taskError=1" : ""));
}

export async function addProgramTaskCommentAction(formData: FormData) {
  const client = await requireClient(formData);
  const { error } = await client.rpc("add_program_task_comment", { p_task_id: uuidOrNull(formData.get("taskId")), p_body: String(formData.get("body") ?? "").slice(0, 2000) });
  finish(backOf(formData, error ? "&taskError=1" : ""));
}

export async function deleteProgramTaskCommentAction(formData: FormData) {
  const client = await requireClient(formData);
  const { error } = await client.rpc("delete_program_task_comment", { p_comment_id: uuidOrNull(formData.get("commentId")) });
  finish(backOf(formData, error ? "&taskError=1" : ""));
}

/** Ziele: beide Seiten legen an, bearbeiten und haken ab; loeschen darf, wer es angelegt hat, oder die Inhaberin. */
export async function saveProgramGoalAction(formData: FormData) {
  const client = await requireClient(formData);
  const due = String(formData.get("dueOn") ?? "");
  const { error } = await client.rpc("save_program_goal", {
    p_goal_id: uuidOrNull(formData.get("goalId")),
    p_program_id: uuidOrNull(formData.get("programId")),
    p_title: String(formData.get("title") ?? "").slice(0, 200),
    p_details: String(formData.get("details") ?? "").slice(0, 2000),
    p_due_on: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
  });
  finish(backOf(formData, error ? "&goalError=1" : "&goalSaved=1"));
}

export async function setProgramGoalStatusAction(formData: FormData) {
  const client = await requireClient(formData);
  const { error } = await client.rpc("set_program_goal_status", { p_goal_id: uuidOrNull(formData.get("goalId")), p_status: formData.get("status") === "reached" ? "reached" : "open" });
  finish(backOf(formData, error ? "&goalError=1" : ""));
}

export async function deleteProgramGoalAction(formData: FormData) {
  const client = await requireClient(formData);
  const { error } = await client.rpc("delete_program_goal", { p_goal_id: uuidOrNull(formData.get("goalId")) });
  finish(backOf(formData, error ? "&goalError=1" : ""));
}
