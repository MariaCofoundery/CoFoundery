import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isBrandColor, isChannel, isPostStatus, postOf, type ContentDefaults, type ContentItem, type ContentKind, type OrgCampaign, type OrgPost, type PostTask } from "@/features/advisor/socialCalendarModel";
import { stepsOf, type PostTemplate } from "@/features/advisor/postPlanning";

/** Social-Media-Kalender lesen - normaler Zugang, die Zeilensicherheit entscheidet (20270319120000). */

const POST_COLUMNS = "id, title, body, channels, planned_on, planned_time, status, campaign_id, event_id, assignee_user_id, created_by_user_id, brand_id, pillar_id, format_id, material_url, approver_user_id, open_info";

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

/** Post-Vorlagen der Organisation (20270324120000). */
export async function listPostTemplates(client: SupabaseClient, orgId: string): Promise<PostTemplate[]> {
  const { data, error } = await client.from("advisor_org_post_templates").select("id, name, steps").eq("org_id", orgId).order("name", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return (data as { id: string; name: string; steps: unknown }[]).map((row) => ({ templateId: row.id, name: row.name, steps: stepsOf(row.steps) }));
}

/** Marken, Saeulen und Formate der Organisation (20270411120000). */
export async function listContentItems(client: SupabaseClient, orgId: string): Promise<ContentItem[]> {
  const { data, error } = await client.from("advisor_org_content_items").select("id, kind, name, color").eq("org_id", orgId).order("created_at").limit(300);
  if (error || !Array.isArray(data)) return [];
  return (data as { id: string; kind: string; name: string; color: string | null }[])
    .filter((row) => row.kind === "brand" || row.kind === "pillar" || row.kind === "format")
    .map((row) => ({ id: row.id, kind: row.kind as ContentKind, name: row.name, color: isBrandColor(row.color) ? row.color : null }));
}

/** Der Standard fuer neue Beitraege - null, solange nichts eingerichtet ist. */
export async function getContentDefaults(client: SupabaseClient, orgId: string): Promise<ContentDefaults | null> {
  const { data, error } = await client.from("advisor_org_content_defaults").select("brand_id, pillar_id, format_id, channel, approver_user_id, status").eq("org_id", orgId).maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    brandId: (row.brand_id as string | null) ?? null,
    pillarId: (row.pillar_id as string | null) ?? null,
    formatId: (row.format_id as string | null) ?? null,
    channel: isChannel(row.channel) ? row.channel : null,
    approverUserId: (row.approver_user_id as string | null) ?? null,
    status: isPostStatus(row.status) ? row.status : null,
  };
}

/** Aufgaben, die an einem Beitrag haengen. Die Zeilensicherheit zeigt nur Aufgaben, die die Person ohnehin sehen darf. */
export async function listPostTasks(client: SupabaseClient, postId: string): Promise<PostTask[]> {
  const { data: links } = await client.from("advisor_org_post_tasks").select("task_id").eq("post_id", postId).limit(100);
  const ids = ((links ?? []) as { task_id: string }[]).map((row) => row.task_id);
  if (ids.length === 0) return [];
  const { data } = await client.from("advisor_org_tasks").select("id, title, status, due_on").in("id", ids).order("created_at");
  return ((data ?? []) as { id: string; title: string; status: string; due_on: string | null }[]).map((row) => ({ taskId: row.id, title: row.title, status: row.status, dueOn: row.due_on }));
}

/** Offene Teamaufgaben, die man an einen Beitrag haengen kann (ohne die schon verknuepften). */
export async function listLinkableTasks(client: SupabaseClient, orgId: string, exclude: string[]): Promise<{ id: string; title: string }[]> {
  const { data } = await client.from("advisor_org_tasks").select("id, title").eq("org_id", orgId).eq("visibility", "team").neq("status", "done").order("created_at", { ascending: false }).limit(60);
  return ((data ?? []) as { id: string; title: string }[]).filter((row) => !exclude.includes(row.id));
}
