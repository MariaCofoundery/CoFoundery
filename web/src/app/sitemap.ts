import type { MetadataRoute } from "next";
import { listBlogCategorySitemap, listBlogSitemap } from "@/features/blog/blogData";
import { createClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicAppOrigin();
  const client = await createClient();
  const { data, error } = await client.rpc("list_public_network_sitemap");
  const staticPages: MetadataRoute.Sitemap = ["", "/fuer-advisor", "/impressum", "/datenschutz", "/informierte-entscheidungen"].map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: path ? "yearly" : "weekly",
    priority: path ? 0.3 : 1,
  }));
  // Blog: die Uebersicht und jeder veroeffentlichte Beitrag, mit den Sprachfassungen, die es wirklich gibt.
  const [blogPosts, blogCategories] = await Promise.all([listBlogSitemap().catch(() => []), listBlogCategorySitemap().catch(() => [])]);
  const blogPages: MetadataRoute.Sitemap = blogPosts.length === 0 ? [] : [
    { url: `${origin}/blog`, changeFrequency: "weekly", priority: 0.6 },
    ...blogCategories.map((c) => ({ url: `${origin}/blog/kategorie/${c.slug}${c.language === "en" ? "?lang=en" : ""}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...blogPosts.map((post) => ({
      url: `${origin}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(post.translations.length ? { alternates: { languages: { [post.language]: `${origin}/blog/${post.slug}`, ...Object.fromEntries(post.translations.map((t) => [t.language, `${origin}/blog/${t.slug}`])) } } } : {}),
    })),
  ];
  staticPages.push(...blogPages);
  if (error) return staticPages;
  return [...staticPages, ...(data ?? []).map((entry: { path: string; updated_at: string }) => ({
    url: `${origin}${entry.path}`,
    lastModified: new Date(entry.updated_at),
    changeFrequency: "weekly" as const,
    priority: entry.path.startsWith("/connect/l/") ? 0.7 : 0.6,
  }))];
}
