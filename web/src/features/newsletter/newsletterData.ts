import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsletterState } from "./NewsletterAsk";

export async function getNewsletterState(client: SupabaseClient, userId: string): Promise<NewsletterState> {
  const { data } = await client.from("newsletter_subscriptions").select("status").eq("user_id", userId).maybeSingle();
  const status = (data as { status?: string } | null)?.status;
  return status === "pending" || status === "confirmed" || status === "unsubscribed" ? status : "none";
}
