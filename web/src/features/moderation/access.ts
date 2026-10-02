import "server-only";
import { notFound } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const { data: { user } } = await getRequestUser();
  if (!user) notFound();
  const client = await createClient();
  const { data, error } = await client.rpc("is_platform_admin");
  if (error || data !== true) notFound();
  return client;
}
