import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireConnectMember } from "./connectAccess";
export async function openClosedBetaSlug(kind: "p" | "l" | "pr", slug: string): Promise<never> {
  const { client } = await requireConnectMember(`/connect/${kind}/${slug}`);
  const { data, error } = await client.rpc("resolve_connect_member_slug", { p_kind: kind, p_slug: slug });
  if (error || !data) notFound();
  redirect(data as string);
}
