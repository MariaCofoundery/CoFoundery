import "server-only";
import { createClient } from "@/lib/supabase/server";
import { blogPostFromRow, type BlogLanguage, type BlogPostData } from "@/features/blog/blogModel";

/** Lesen fuer die oeffentlichen Seiten: nur ueber die Funktionen, die ausschliesslich Veroeffentlichtes liefern. */
export type BlogListEntry = { slug: string; language: BlogLanguage; title: string; excerpt: string; authorName: string; postDate: string; coverPath: string; coverAlt: string; publishedAt: string; categorySlug: string; categoryName: string; minutes: number };
export type BlogCategoryEntry = { slug: string; name: string; description: string };
export type BlogTranslation = { slug: string; language: BlogLanguage; title?: string };
export type PublicBlogPost = BlogPostData & { publishedAt: string; updatedAt: string; translations: BlogTranslation[]; categorySlug: string; categoryName: string };

export async function listPublishedBlogPosts(language: BlogLanguage | null, categorySlug: string | null = null): Promise<BlogListEntry[]> {
  const client = await createClient();
  const { data, error } = await client.rpc("public_list_blog_posts", { p_language: language, p_category: categorySlug });
  if (error) return [];
  return ((data ?? []) as Record<string, string | number | null>[]).map((r) => ({
    slug: String(r.slug), language: r.language === "en" ? "en" : "de", title: String(r.title ?? ""), excerpt: String(r.excerpt ?? ""), authorName: String(r.author_name ?? ""),
    postDate: String(r.post_date ?? ""), coverPath: String(r.cover_path ?? ""), coverAlt: String(r.cover_alt ?? ""), publishedAt: String(r.published_at ?? ""),
    categorySlug: String(r.category_slug ?? ""), categoryName: String(r.category_name ?? ""), minutes: Number(r.reading_minutes ?? 1) || 1,
  }));
}

export async function getPublishedBlogPost(slug: string): Promise<PublicBlogPost | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;
  const client = await createClient();
  const { data, error } = await client.rpc("public_get_blog_post", { p_slug: slug });
  const row = error ? null : ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) return null;
  const translations = (Array.isArray(row.translations) ? row.translations : []) as { slug?: string; language?: string; title?: string }[];
  return {
    ...blogPostFromRow(row),
    publishedAt: String(row.published_at ?? ""), updatedAt: String(row.updated_at ?? ""),
    categorySlug: String(row.category_slug ?? ""), categoryName: String(row.category_name ?? ""),
    translations: translations.flatMap((t) => (t.slug && (t.language === "de" || t.language === "en") ? [{ slug: t.slug, language: t.language, title: t.title }] : [])),
  };
}

export async function listBlogSitemap(): Promise<{ slug: string; language: BlogLanguage; updatedAt: string; translations: BlogTranslation[] }[]> {
  const client = await createClient();
  const { data, error } = await client.rpc("public_blog_sitemap");
  if (error) return [];
  return ((data ?? []) as { slug: string; language: string; updated_at: string; translations: { slug: string; language: string }[] | null }[]).map((r) => ({
    slug: r.slug, language: r.language === "en" ? "en" : "de", updatedAt: r.updated_at,
    translations: (r.translations ?? []).flatMap((t) => (t.language === "de" || t.language === "en" ? [{ slug: t.slug, language: t.language }] : [])),
  }));
}

export function blogImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/blog/${encodeURIComponent(path)}`;
}

/** Kategorien einer Sprache - nur die, die dort mindestens einen veroeffentlichten Beitrag haben. */
export async function listBlogCategories(language: BlogLanguage): Promise<BlogCategoryEntry[]> {
  const client = await createClient();
  const { data, error } = await client.rpc("public_list_blog_categories", { p_language: language });
  if (error) return [];
  return ((data ?? []) as { slug: string; name: string; description: string }[]).map((c) => ({ slug: c.slug, name: c.name, description: c.description ?? "" }));
}

export async function listBlogCategorySitemap(): Promise<{ slug: string; language: BlogLanguage }[]> {
  const client = await createClient();
  const { data, error } = await client.rpc("public_blog_category_sitemap");
  if (error) return [];
  return ((data ?? []) as { slug: string; language: string }[]).map((c) => ({ slug: c.slug, language: c.language === "en" ? "en" : "de" }));
}
