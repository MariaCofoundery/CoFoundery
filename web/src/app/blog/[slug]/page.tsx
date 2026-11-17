import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogBody } from "@/features/blog/BlogBody";
import { BlogFooter } from "@/features/blog/BlogFooter";
import { blogImageUrl, getPublishedBlogPost, listPublishedBlogPosts } from "@/features/blog/blogData";
import { blogCopy, LANGUAGE_NAMES, readingMinutes, searchDescription, searchTitle } from "@/features/blog/blogModel";
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
  // Vorschaubild: das Titelbild; ohne eines das Logo, damit auch dann etwas in der Vorschau steht.
  const image = post.coverPath ? [{ url: blogImageUrl(post.coverPath), alt: post.coverAlt }] : [{ url: `${origin}/brand/made2found-logo-on-light.png`, alt: "Made2Found" }];
  const title = searchTitle(post);
  const description = searchDescription(post);
  return {
    title, description, authors: [{ name: post.authorName }],
    alternates: { canonical: url, languages, types: { "application/rss+xml": "/blog/feed.xml" } },
    openGraph: { type: "article", title, description, url, locale: copy.ogLocale, publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: [post.authorName], images: image },
    twitter: { card: post.coverPath ? "summary_large_image" : "summary", title, description, images: image.map((i) => i.url) },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedBlogPost((await params).slug);
  if (!post) notFound();
  const origin = getPublicAppOrigin();
  const copy = blogCopy(post.language);
  const date = new Intl.DateTimeFormat(copy.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${post.postDate}T00:00:00Z`));
  const suffix = post.language === "en" ? "?lang=en" : "";
  const more = post.categorySlug ? (await listPublishedBlogPosts(post.language, post.categorySlug)).filter((p) => p.slug !== post.slug).slice(0, 2) : [];
  const jsonLd = {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, inLanguage: post.language,
    datePublished: post.publishedAt, dateModified: post.updatedAt, author: { "@type": "Person", name: post.authorName },
    mainEntityOfPage: `${origin}/blog/${post.slug}`, ...(post.coverPath ? { image: blogImageUrl(post.coverPath) } : {}),
  };
  return (
    <>
      <main lang={post.language} className="mx-auto w-full max-w-3xl px-5 py-10">
        <nav aria-label={copy.breadcrumbs} className="flex flex-wrap items-center gap-x-2 font-sans text-sm text-slate-600">
          <Link href={`/blog${suffix}`} className="inline-flex min-h-11 items-center hover:underline">{copy.name}</Link>
          {post.categorySlug ? (<><span aria-hidden="true">›</span><Link href={`/blog/kategorie/${post.categorySlug}${suffix}`} className="inline-flex min-h-11 items-center hover:underline">{post.categoryName}</Link></>) : null}
        </nav>
        <article>
          <header>
            {post.categorySlug ? <Link href={`/blog/kategorie/${post.categorySlug}${suffix}`} className="font-sans text-[13px] font-bold uppercase tracking-[.06em] text-[#4a2fb8] hover:underline">{post.categoryName}</Link> : null}
            <h1 className="mt-2 font-sans text-4xl font-bold leading-tight tracking-tight text-slate-950">{post.title}</h1>
            <p className="mt-3 font-sans text-sm text-slate-600">{copy.by} {post.authorName} · <time dateTime={post.postDate}>{date}</time> · {readingMinutes(post.blocks)} {copy.minutes}</p>
            {post.coverPath ? (
              <figure className="mt-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={blogImageUrl(post.coverPath)} alt={post.coverAlt} decoding="async" className="aspect-[1200/630] w-full rounded-2xl object-cover" />
              </figure>
            ) : null}
          </header>
          <div className="mt-8"><BlogBody blocks={post.blocks} appOrigin={origin} language={post.language} /></div>
        </article>
        <aside aria-label={copy.aboutTitle} className="mt-10 flex items-start gap-4 border-t border-slate-200 pt-6 font-sans">
          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-slate-600">{post.authorName.trim().charAt(0).toUpperCase()}</span>
          <p className="text-[15px] leading-relaxed text-slate-700"><strong className="text-slate-950">{post.authorName}</strong></p>
        </aside>
        {post.translations.length > 0 ? (
          <p className="mt-10 border-t border-slate-200 pt-4 font-sans text-sm">
            {post.translations.map((t) => (
              <Link key={t.slug} href={`/blog/${t.slug}`} hrefLang={t.language} lang={t.language} className="mr-4 inline-flex min-h-11 items-center font-semibold text-[#4a2fb8] underline underline-offset-2">{blogCopy(t.language).readIn} ({LANGUAGE_NAMES[t.language].own})</Link>
            ))}
          </p>
        ) : null}
        {more.length > 0 ? (
          <section aria-labelledby="more" className="mt-10 border-t border-slate-200 pt-8">
            <h2 id="more" className="font-sans text-2xl font-bold text-slate-950">{copy.moreIn} „{post.categoryName}“</h2>
            <ul className="mt-5 grid gap-6 sm:grid-cols-2">
              {more.map((p) => (
                <li key={p.slug}>
                  <article className="flex flex-col gap-2">
                    {p.coverPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={blogImageUrl(p.coverPath)} alt="" loading="lazy" decoding="async" className="aspect-[1200/630] w-full rounded-xl object-cover" />
                    ) : <span aria-hidden="true" className="block aspect-[1200/630] w-full rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)]" />}
                    <h3 className="font-sans text-lg font-bold leading-snug"><Link href={`/blog/${p.slug}`} className="text-slate-950 hover:underline">{p.title}</Link></h3>
                    <p className="font-sans text-sm text-slate-600">{p.minutes} {copy.minutes}</p>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </main>
      <BlogFooter language={post.language} />
    </>
  );
}
