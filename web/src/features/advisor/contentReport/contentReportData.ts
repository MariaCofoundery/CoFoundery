import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrgMembers } from "@/features/advisor/orgData";
import { listContentItems, listOrgCampaigns } from "@/features/advisor/socialCalendarData";
import { postOf, type ContentItem, type OrgCampaign, type OrgPost } from "@/features/advisor/socialCalendarModel";
import { lookupOf, type ReportLookup } from "@/features/advisor/contentReport/contentReportModel";

const POST_COLUMNS = "id, title, body, channels, planned_on, planned_time, status, campaign_id, event_id, assignee_user_id, created_by_user_id, brand_id, pillar_id, format_id, material_url, approver_user_id, open_info, post_no, published_url, result_views, result_reactions, result_clicks, result_note";

export type ContentReportData = { posts: OrgPost[]; campaigns: OrgCampaign[]; content: ContentItem[]; lookup: ReportLookup; members: { userId: string; name: string }[] };

/** Alles, was der Report braucht. Die Zeilensicherheit der Tabellen gilt: wer kein Mitglied ist, bekommt nichts. */
export async function loadContentReport(client: SupabaseClient, orgId: string, unnamed: string): Promise<ContentReportData> {
  const [postsResult, campaigns, content, memberList, eventsResult] = await Promise.all([
    client.from("advisor_org_posts").select(POST_COLUMNS).eq("org_id", orgId).order("planned_on").limit(2000),
    listOrgCampaigns(client, orgId),
    listContentItems(client, orgId),
    getOrgMembers(client, orgId),
    client.from("team_program_events").select("id, title").eq("org_id", orgId).limit(1000),
  ]);
  const posts = Array.isArray(postsResult.data) ? (postsResult.data as Record<string, unknown>[]).map(postOf) : [];
  const members = memberList.filter((member) => member.status === "active").map((member) => ({ userId: member.userId, name: member.displayName ?? unnamed }));
  const events = Array.isArray(eventsResult.data) ? (eventsResult.data as { id: string; title: string }[]) : [];
  return { posts, campaigns, content, members, lookup: lookupOf(content, members, campaigns, events) };
}
