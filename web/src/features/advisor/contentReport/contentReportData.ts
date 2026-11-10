import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrgMembers } from "@/features/advisor/orgData";
import { listProgramEventsSplit } from "@/features/advisor/teamProgramData";
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
    listProgramEventsSplit(client, orgId),
  ]);
  const posts = Array.isArray(postsResult.data) ? (postsResult.data as Record<string, unknown>[]).map(postOf) : [];
  const members = memberList.filter((member) => member.status === "active").map((member) => ({ userId: member.userId, name: member.displayName ?? unnamed }));
  // Termine liest man nur ueber die Funktion list_program_events (die Tabelle ist nicht direkt lesbar).
  const events = [...eventsResult.active, ...eventsResult.archived].map((event) => ({ id: event.eventId, title: event.title }));
  return { posts, campaigns, content, members, lookup: lookupOf(content, members, campaigns, events) };
}
