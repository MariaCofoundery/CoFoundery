import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { workspaceId, type ProblemWorkspace } from "./model";
export async function workspaceSession(path = "/connect/workspaces") {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  return { user, client: await createClient() };
}
export async function readWorkspace(id: string) {
  if (!workspaceId(id)) notFound();
  const session = await workspaceSession(`/connect/workspaces/${id}`);
  const { data, error } = await session.client.rpc("get_problem_workspace", {
    p_workspace: id,
  });
  if (error || !data) notFound();
  return { ...session, workspace: data as ProblemWorkspace };
}
