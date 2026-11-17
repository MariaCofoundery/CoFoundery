import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogBody } from "@/features/blog/BlogBody";
import { BlogFooter } from "@/features/blog/BlogFooter";
import { blogImageUrl, getPublishedBlogPost } from "@/features/blog/blogData";
import { blogCopy, LANGUAGE_NAMES } from "@/features/blog/blogModel";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublishedBlogPost((await params).slug);
  if (!post) return { title: "Blog", robots: { index: false, follow: false } };
  const origin = getPublicAppOrigin();
  const url = `${origin}/blog/${post.slug}`;
  const copy = blogCopy(post.language);
  const languages: Record<string, string> = { [post.language]: url };
  for (const t of post.translations) languages[t.language] = `${origin}/blog/${t.slug}`;
  const image = post.coverPath ? [{ url: blogImageUrl(post.coverPath), alt: post.coverAlt }] : undefined;
  return {
    title: post.title, description: post.excerpt, authors: [{ name: post.authorName }],
    alternates: { canonical: url, languages, types: { "application/rss+xml": "/blog/feed.xml" } },
    openGraph: { type: "article", title: post.title, description: post.excerpt, url, locale: copy.ogLocale, publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: [post.authorName], images: image },
    twitter: { card: image ? "summary_large_image" : "summary", title: post.title, description: post.excerpt, images: image?.map((i) => i.url) },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedBlogPost((await params).slug);
  if (!post) notFound();
  const origin = getPublicAppOrigin();
  const copy = blogCopy(post.language);
  const date = new Intl.DateTimeFormat(copy.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${post.postDate}T00:00:00Z`));
  const jsonLd = {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, inLanguage: post.language,
    datePublished: post.publishedAt, dateModified: post.updatedAt, author: { "@type": "Person", name: post.authorName },
    mainEntityOfPage: `${origin}/blog/${post.slug}`, ...(post.coverPath ? { image: blogImageUrl(post.coverPath) } : {}),
  };
  return (
    <>
      <main lang={post.language} className="mx-auto w-full max-w-3xl px-5 py-10">
        <p className="font-sans text-sm"><Link href={post.language === "en" ? "/blog?lang=en" : "/blog"} className="inline-flex min-h-11 items-center font-semibold text-slate-700 hover:underline">← {copy.back}</Link></p>
        <article>
          <header>
            <h1 className="mt-2 font-sans text-4xl font-bold leading-tight tracking-tight text-slate-950">{post.title}</h1>
            <p className="mt-3 font-sans text-sm text-slate-600">{copy.by} {post.authorName} · <time dateTime={post.postDate}>{date}</time></p>
            {post.coverPath ? (
              <figure className="mt-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={blogImageUrl(post.coverPath)} alt={post.coverAlt} decoding="async" className="aspect-[1200/630] w-full rounded-2xl object-cover" />
              </figure>
            ) : null}
          </header>
          <div className="mt-8"><BlogBody blocks={post.blocks} appOrigin={origin} /></div>
        </article>
        {post.translations.length > 0 ? (
          <p className="mt-10 border-t border-slate-200 pt-4 font-sans text-sm">
            {post.translations.map((t) => (
              <Link key={t.slug} href={`/blog/${t.slug}`} hrefLang={t.language} lang={t.language} className="mr-4 inline-flex min-h-11 items-center font-semibold text-[#4a2fb8] underline underline-offset-2">{blogCopy(t.language).readIn} ({LANGUAGE_NAMES[t.language].own})</Link>
            ))}
          </p>
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </main>
      <BlogFooter language={post.language} />
    </>
  );
}
