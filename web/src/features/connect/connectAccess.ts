import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireConnectMember(next = "/connect") {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data: eligible } = await client.rpc("is_network_member");
  if (eligible !== true) {
    const { data: hasConnectAccount } = await client.rpc("has_network_account");
    redirect(hasConnectAccount === true ? "/account" : "/dashboard");
  }
  return { client, user };
}
