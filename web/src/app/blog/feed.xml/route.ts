import { listPublishedBlogPosts } from "@/features/blog/blogData";
import { blogCopy } from "@/features/blog/blogModel";
import { PRODUCT_FULL_NAME } from "@/features/brand";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const dynamic = "force-dynamic";

const esc = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** RSS 2.0 aller veroeffentlichten Beitraege (optional ?lang=de oder ?lang=en). Nur Titel, Kurztext und Link - nichts Persoenliches. */
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang");
  const language = lang === "de" || lang === "en" ? lang : null;
  const origin = getPublicAppOrigin();
  const posts = await listPublishedBlogPosts(language);
  const copy = blogCopy(language ?? "de");
  const items = posts.slice(0, 50).map((post) => `
    <item>
      <title>${esc(post.title)}</title>
      <link>${origin}/blog/${post.slug}</link>
      <guid isPermaLink="true">${origin}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt || `${post.postDate}T00:00:00Z`).toUTCString()}</pubDate>
      <dc:creator>${esc(post.authorName)}</dc:creator>
      <dc:language>${post.language}</dc:language>
      <description>${esc(post.excerpt)}</description>
    </item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${PRODUCT_FULL_NAME} ${copy.title}`)}</title>
    <link>${origin}/blog</link>
    <description>${esc(copy.intro)}</description>
    <language>${language ?? "de"}</language>
    <atom:link href="${origin}/blog/feed.xml${language ? `?lang=${language}` : ""}" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}
