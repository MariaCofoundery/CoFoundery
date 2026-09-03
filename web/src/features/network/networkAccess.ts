import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireNetworkMember(next = "/network") {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data: eligible } = await client.rpc("is_network_member");
  if (eligible !== true) redirect("/dashboard");
  return { client, user };
}

