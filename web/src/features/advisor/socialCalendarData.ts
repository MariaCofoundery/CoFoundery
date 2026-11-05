import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { postOf, type OrgCampaign, type OrgPost } from "@/features/advisor/socialCalendarModel";

/** Social-Media-Kalender lesen - normaler Zugang, die Zeilensicherheit entscheidet (20270319120000). */

const POST_COLUMNS = "id, title, body, channels, planned_on, planned_time, status, campaign_id, event_id, assignee_user_id, created_by_user_id";

export async function listOrgPosts(client: SupabaseClient, orgId: string, from: string, to: string): Promise<OrgPost[]> {
  const { data, error } = await client.from("advisor_org_posts").select(POST_COLUMNS).eq("org_id", orgId).gte("planned_on", from).lte("planned_on", to).order("planned_on").limit(1000);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(postOf);
}

/** Postings, die an Veranstaltungen haengen - fuer "Hierzu ist noch nichts geplant", unabhaengig vom Monat. */
export async function listOrgEventPosts(client: SupabaseClient, orgId: string): Promise<OrgPost[]> {
  const { data, error } = await client.from("advisor_org_posts").select(POST_COLUMNS).eq("org_id", orgId).not("event_id", "is", null).limit(1000);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(postOf);
}

export async function getOrgPost(client: SupabaseClient, orgId: string, postId: string): Promise<OrgPost | null> {
  const { data, error } = await client.from("advisor_org_posts").select(POST_COLUMNS).eq("org_id", orgId).eq("id", postId).maybeSingle();
  if (error || !data) return null;
  return postOf(data as Record<string, unknown>);
}

export async function listOrgCampaigns(client: SupabaseClient, orgId: string): Promise<OrgCampaign[]> {
  const { data, error } = await client.from("advisor_org_campaigns").select("id, name, starts_on, ends_on, notes").eq("org_id", orgId).order("starts_on", { ascending: false, nullsFirst: false }).limit(200);
  if (error || !Array.isArray(data)) return [];
  return (data as { id: string; name: string; starts_on: string | null; ends_on: string | null; notes: string | null }[]).map((row) => ({
    id: row.id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    notes: row.notes,
  }));
}
