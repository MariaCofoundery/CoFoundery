"use server";
import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { workspaceSession } from "./data";
import { workspaceId, parseWorkspaceEntry } from "./model";
import { getRequestLocale } from "@/i18n/getLocale";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { sendProblemWorkspaceInviteEmail } from "@/lib/email/sendProblemWorkspaceInviteEmail";
export type WorkspaceDelivery = { error?: true; url?: string; sent?: boolean };
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
function finish(id: string, error: boolean): never {
  revalidatePath("/connect/workspaces");
  revalidatePath(`/connect/workspaces/${id}`);
  redirect(`/connect/workspaces/${id}?${error ? "error" : "saved"}=1`);
}
async function mutate(id: string, rpc: string, args: Record<string, unknown>) {
  const { client } = await workspaceSession();
  if (!workspaceId(id)) redirect("/connect/workspaces");
  const { error } = await client.rpc(rpc, { p_workspace: id, ...args });
  finish(id, Boolean(error));
}
export async function createWorkspaceAction(form: FormData) {
  const { client } = await workspaceSession();
  const problem = String(form.get("problem") ?? "") || null;
  if (problem && !workspaceId(problem))
    redirect("/connect/workspaces/new?error=1");
  const { data, error } = await client.rpc("create_problem_workspace", {
    p_title: String(form.get("title") ?? "").trim(),
    p_description: String(form.get("description") ?? "").trim(),
    p_problem: problem,
  });
  if (error || !data) redirect("/connect/workspaces/new?error=1");
  revalidatePath("/connect/workspaces");
  redirect(`/connect/workspaces/${data}`);
}
export async function updateWorkspaceAction(id: string, form: FormData) {
  await mutate(id, "update_problem_workspace", {
    p_title: String(form.get("title") ?? "").trim(),
    p_description: String(form.get("description") ?? "").trim(),
  });
}
export async function archiveWorkspaceAction(id: string, form: FormData) {
  if (form.get("confirm") !== "on") finish(id, true);
  await mutate(id, "archive_problem_workspace", {});
}
export async function saveWorkspaceEntryAction(
  id: string,
  entry: string | null,
  form: FormData,
) {
  if (entry && !workspaceId(entry)) finish(id, true);
  await mutate(id, "save_problem_workspace_entry", {
    p_entry: entry,
    ...parseWorkspaceEntry(form),
  });
}
export async function deleteWorkspaceEntryAction(
  id: string,
  entry: string,
  form: FormData,
) {
  if (!workspaceId(entry) || form.get("confirm") !== "on") finish(id, true);
  await mutate(id, "delete_problem_workspace_entry", { p_entry: entry });
}
export async function setWorkspaceMemberAction(
  id: string,
  user: string,
  form: FormData,
) {
  if (!workspaceId(user)) finish(id, true);
  const role = String(form.get("role") ?? "");
  if (role === "remove" && form.get("confirm") !== "on") finish(id, true);
  await mutate(id, "set_problem_workspace_member", {
    p_user: user,
    p_role: role,
  });
}
export async function revokeWorkspaceInviteAction(id: string, invite: string) {
  if (!workspaceId(invite)) finish(id, true);
  await mutate(id, "revoke_problem_workspace_invite", { p_invite: invite });
}
export async function inviteWorkspaceAction(
  id: string,
  _previous: WorkspaceDelivery,
  form: FormData,
): Promise<WorkspaceDelivery> {
  const { client } = await workspaceSession();
  if (!workspaceId(id)) return { error: true };
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = randomBytes(24).toString("hex");
  const { error } = await client.rpc("invite_problem_workspace_member", {
    p_workspace: id,
    p_email: email,
    p_role: String(form.get("role") ?? ""),
    p_hash: hash(token),
  });
  if (error) return { error: true };
  const url = `${getPublicAppOrigin()}/connect/workspaces/invite/${token}`;
  const sent = await sendProblemWorkspaceInviteEmail(
    email,
    url,
    await getRequestLocale(),
  );
  revalidatePath(`/connect/workspaces/${id}`);
  return { url, sent };
}
export async function rotateWorkspaceInviteAction(
  id: string,
  invite: string,
  _previous: WorkspaceDelivery,
): Promise<WorkspaceDelivery> {
  const { client } = await workspaceSession();
  if (!workspaceId(id) || !workspaceId(invite)) return { error: true };
  const token = randomBytes(24).toString("hex");
  const { data, error } = await client.rpc("rotate_problem_workspace_invite", {
    p_workspace: id,
    p_invite: invite,
    p_hash: hash(token),
  });
  if (error || !data) return { error: true };
  const url = `${getPublicAppOrigin()}/connect/workspaces/invite/${token}`;
  const sent = await sendProblemWorkspaceInviteEmail(
    data as string,
    url,
    await getRequestLocale(),
  );
  revalidatePath(`/connect/workspaces/${id}`);
  return { url, sent };
}
export async function claimWorkspaceInviteAction(token: string) {
  const { client } = await workspaceSession(
    `/connect/workspaces/invite/${token}`,
  );
  if (!/^[0-9a-f]{48}$/.test(token)) redirect("/connect/workspaces?invalid=1");
  const { data, error } = await client.rpc("claim_problem_workspace_invite", {
    p_hash: hash(token),
  });
  if (error || !data) redirect("/connect/workspaces?invalid=1");
  revalidatePath("/connect/workspaces");
  redirect(`/connect/workspaces/${data}`);
}
