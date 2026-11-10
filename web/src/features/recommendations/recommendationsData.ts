import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { REC_PAGE_SIZE, type RecFilters, type RecKind, type Recommendation } from "@/features/recommendations/recommendationsModel";

type Row = { id: string; kind: RecKind; title: string; sub: string | null; url: string | null; subject_user_id: string | null; venture_id: string | null; topics: string[] | null; region: string | null; comment: string; author_user_id: string; author_name: string | null; published_at: string | null; mine: boolean };

export async function listRecommendations(client: SupabaseClient, f: RecFilters): Promise<{ items: Recommendation[]; hasMore: boolean }> {
  const { data } = await client.rpc("list_recommendations", {
    p_kinds: f.kinds, p_topics: f.topics, p_region: f.region || null, p_q: f.q || null, p_since_days: f.since ? Number(f.since) : null,
    p_sort: f.sort, p_limit: REC_PAGE_SIZE + 1, p_offset: (f.page - 1) * REC_PAGE_SIZE,
  });
  const rows = ((data ?? []) as Row[]);
  return {
    hasMore: rows.length > REC_PAGE_SIZE,
    items: rows.slice(0, REC_PAGE_SIZE).map((r) => ({ id: r.id, kind: r.kind, title: r.title, sub: r.sub, url: r.url, subjectUserId: r.subject_user_id, ventureId: r.venture_id, topics: r.topics ?? [], region: r.region, comment: r.comment, authorUserId: r.author_user_id, authorName: r.author_name ?? "", publishedAt: r.published_at, mine: r.mine })),
  };
}

export async function recommendationKindCounts(client: SupabaseClient): Promise<Record<string, number>> {
  const { data } = await client.rpc("recommendation_kind_counts");
  return Object.fromEntries(((data ?? []) as { kind: string; total: number | string }[]).map((r) => [r.kind, Number(r.total)]));
}

export async function recommendationRegions(client: SupabaseClient): Promise<string[]> {
  const { data } = await client.rpc("list_recommendation_regions");
  return ((data ?? []) as { region: string }[]).map((r) => r.region);
}

export type OwnRecommendation = { id: string; kind: RecKind; title: string; status: string; createdAt: string; subjectUserId: string | null; authorUserId: string; comment: string; sub: string | null; authorName: string };

/** Eigene Empfehlungen und die, in denen ich als Person genannt werde (Tabelle: nur Autor und genannte Person lesen). */
export async function listOwnRecommendations(client: SupabaseClient, userId: string): Promise<{ given: OwnRecommendation[]; aboutMe: OwnRecommendation[] }> {
  const { data } = await client.from("network_recommendations").select("id, kind, title, sub, comment, status, created_at, subject_user_id, author_user_id").or(`author_user_id.eq.${userId},subject_user_id.eq.${userId}`).order("created_at", { ascending: false }).limit(100);
  const rows = ((data ?? []) as { id: string; kind: RecKind; title: string; sub: string | null; comment: string; status: string; created_at: string; subject_user_id: string | null; author_user_id: string }[]);
  const authorIds = [...new Set(rows.filter((r) => r.author_user_id !== userId).map((r) => r.author_user_id))];
  const names = new Map<string, string>();
  if (authorIds.length) {
    const { data: profiles } = await client.from("network_profiles").select("user_id, display_name").in("user_id", authorIds);
    for (const p of (profiles ?? []) as { user_id: string; display_name: string | null }[]) names.set(p.user_id, p.display_name ?? "");
  }
  const map = (r: (typeof rows)[number]): OwnRecommendation => ({ id: r.id, kind: r.kind, title: r.title, status: r.status, createdAt: r.created_at, subjectUserId: r.subject_user_id, authorUserId: r.author_user_id, comment: r.comment, sub: r.sub, authorName: names.get(r.author_user_id) ?? "" });
  return { given: rows.filter((r) => r.author_user_id === userId).map(map), aboutMe: rows.filter((r) => r.subject_user_id === userId && r.author_user_id !== userId).map(map) };
}

export async function searchPeople(client: SupabaseClient, q: string): Promise<{ userId: string; name: string; sub: string }[]> {
  const term = q.replace(/[%_,()]/g, "").trim();
  if (term.length < 2) return [];
  const { data } = await client.from("network_profiles").select("user_id, display_name, headline").eq("status", "active").ilike("display_name", `%${term}%`).limit(8);
  return ((data ?? []) as { user_id: string; display_name: string | null; headline: string | null }[]).filter((r) => r.display_name).map((r) => ({ userId: r.user_id, name: r.display_name ?? "", sub: r.headline ?? "" }));
}

export async function searchVentures(client: SupabaseClient, q: string): Promise<{ id: string; name: string; sub: string }[]> {
  const term = q.replace(/[%_,()]/g, "").trim();
  if (term.length < 2) return [];
  const { data } = await client.from("network_ventures").select("id, name, what_it_does").eq("status", "active").ilike("name", `%${term}%`).limit(8);
  return ((data ?? []) as { id: string; name: string; what_it_does: string | null }[]).map((r) => ({ id: r.id, name: r.name, sub: (r.what_it_does ?? "").slice(0, 120) }));
}

export type AdminRecommendation = { id: string; kind: RecKind; title: string; sub: string | null; url: string | null; comment: string; topics: string[]; region: string | null; status: string; createdAt: string; authorName: string; reportCount: number };
export async function adminListRecommendations(client: SupabaseClient, status: string): Promise<AdminRecommendation[]> {
  const { data } = await client.rpc("admin_list_recommendations", { p_status: status });
  return ((data ?? []) as { id: string; kind: RecKind; title: string; sub: string | null; url: string | null; comment: string; topics: string[] | null; region: string | null; status: string; created_at: string; author_name: string | null; report_count: number | string }[]).map((r) => ({ id: r.id, kind: r.kind, title: r.title, sub: r.sub, url: r.url, comment: r.comment, topics: r.topics ?? [], region: r.region, status: r.status, createdAt: r.created_at, authorName: r.author_name ?? "", reportCount: Number(r.report_count) }));
}
