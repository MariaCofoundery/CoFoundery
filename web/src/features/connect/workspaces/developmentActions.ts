"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { workspaceSession } from "./data";
import { workspaceId } from "./model";
import { publicationPayload, type PublicationFields } from "./developmentModel";
import { notifySavedSearchMatches } from "@/features/connect/savedSearchNotifications";
import { getConnectProblem } from "@/features/connect/connectProblemData";
function refresh(id: string) {
  revalidatePath(`/connect/workspaces/${id}`);
  revalidatePath("/connect/workspaces");
}
export async function publishWorkspaceAction(
  id: string,
  expected: string | null,
  form: FormData,
) {
  const path = `/connect/workspaces/${id}/publish`;
  const { client, user } = await workspaceSession(path);
  if (!workspaceId(id) || (expected && !workspaceId(expected)))
    redirect("/connect/workspaces");
  let fields: PublicationFields;
  try {
    fields = publicationPayload(String(form.get("publication") ?? ""));
  } catch {
    redirect(`${path}?error=1`);
  }
  const { data, error } = await client.rpc("publish_problem_workspace", {
    p_workspace: id,
    p_fields: fields,
    p_expected_problem: expected,
    p_confirm: form.get("confirm") === "on",
  });
  if (error || !data) redirect(`${path}?error=1`);
  const problem = await getConnectProblem(client, data);
  if (problem) {
    revalidatePath(`/connect/pr/${problem.public_slug}`);
    if (!expected)
      await notifySavedSearchMatches(client, {
        kind: "problem",
        id: problem.id,
        ownerUserId: user.id,
        title: problem.title,
        summary: problem.description,
        topics: problem.topics,
        industries: problem.industries,
        locations: problem.locations,
        geographicScope: problem.geographic_scope,
        remoteMode: null,
        direction: null,
        category: null,
      });
  }
  refresh(id);
  revalidatePath("/connect/problems");
  revalidatePath(`/connect/problems/${data}`);
  revalidatePath("/sitemap.xml");
  redirect(`/connect/workspaces/${id}?saved=1`);
}
export async function saveOpportunityAction(
  id: string,
  opportunity: string | null,
  form: FormData,
) {
  const path = `/connect/workspaces/${id}/opportunities/${opportunity ?? "new"}`;
  const { client } = await workspaceSession(path);
  if (!workspaceId(id) || (opportunity && !workspaceId(opportunity)))
    redirect("/connect/workspaces");
  const entries = form.getAll("entries").map(String);
  if (entries.some((e) => !workspaceId(e))) redirect(`${path}?error=1`);
  const { data, error } = await client.rpc("save_problem_opportunity", {
    p_workspace: id,
    p_opportunity: opportunity,
    p_title: String(form.get("title") ?? ""),
    p_affected_group: String(form.get("affected_group") ?? ""),
    p_statement: String(form.get("opportunity_statement") ?? ""),
    p_value: String(form.get("possible_value") ?? ""),
    p_entries: entries,
  });
  if (error || !data) redirect(`${path}?error=1`);
  refresh(id);
  revalidatePath(path);
  redirect(`/connect/workspaces/${id}/opportunities/${data}?saved=1`);
}
export async function archiveOpportunityAction(
  id: string,
  opportunity: string,
  form: FormData,
) {
  const path = `/connect/workspaces/${id}/opportunities/${opportunity}`;
  const { client } = await workspaceSession(path);
  if (!workspaceId(id) || !workspaceId(opportunity))
    redirect("/connect/workspaces");
  if (form.get("confirm") !== "on") redirect(`${path}?error=1`);
  const { error } = await client.rpc("archive_problem_opportunity", {
    p_workspace: id,
    p_opportunity: opportunity,
  });
  if (error) redirect(`${path}?error=1`);
  refresh(id);
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}
export async function linkOpportunityVentureAction(
  id: string,
  opportunity: string,
  mode: "new" | "existing",
  form: FormData,
) {
  const path = `/connect/workspaces/${id}/opportunities/${opportunity}`;
  const { client } = await workspaceSession(path);
  const venture =
    mode === "existing" ? String(form.get("venture") ?? "") : null;
  if (
    !workspaceId(id) ||
    !workspaceId(opportunity) ||
    (mode === "existing" && !workspaceId(venture!))
  )
    redirect("/connect/workspaces");
  if (form.get("confirm") !== "on") redirect(`${path}?error=1`);
  const { error } = await client.rpc("link_problem_opportunity_venture", {
    p_workspace: id,
    p_opportunity: opportunity,
    p_venture: venture,
    p_name: mode === "new" ? String(form.get("name") ?? "") : null,
  });
  if (error) redirect(`${path}?error=1`);
  refresh(id);
  revalidatePath(path);
  revalidatePath("/dashboard");
  redirect(`${path}?saved=1`);
}

export async function restoreOpportunityAction(id: string, opportunity: string, form: FormData) {
  const path = `/connect/workspaces/${id}/opportunities/${opportunity}`;
  const { client } = await workspaceSession(path);
  if (!workspaceId(id) || !workspaceId(opportunity) || form.get("confirm") !== "on") redirect(`${path}?error=1`);
  const { error } = await client.rpc("restore_problem_opportunity", { p_workspace: id, p_opportunity: opportunity, p_confirm: true });
  if (error) redirect(`${path}?error=1`);
  refresh(id); revalidatePath(path); redirect(`${path}?saved=1`);
}
