import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicAppOrigin();
  const client = await createClient();
  const { data, error } = await client.rpc("list_public_network_sitemap");
  const staticPages: MetadataRoute.Sitemap = ["", "/impressum", "/datenschutz", "/informierte-entscheidungen"].map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: path ? "yearly" : "weekly",
    priority: path ? 0.3 : 1,
  }));
  if (error) return staticPages;
  return [...staticPages, ...(data ?? []).map((entry: { path: string; updated_at: string }) => ({
    url: `${origin}${entry.path}`,
    lastModified: new Date(entry.updated_at),
    changeFrequency: "weekly" as const,
    priority: entry.path.startsWith("/connect/l/") ? 0.7 : 0.6,
  }))];
}
