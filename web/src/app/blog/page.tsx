import type { Metadata } from "next";
import Link from "next/link";
import { BlogFooter } from "@/features/blog/BlogFooter";
import { blogImageUrl, listPublishedBlogPosts } from "@/features/blog/blogData";
import { blogCopy, type BlogLanguage } from "@/features/blog/blogModel";
import { getRequestLocale } from "@/i18n/getLocale";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const dynamic = "force-dynamic";

async function chosenLanguage(lang: string | undefined): Promise<BlogLanguage> {
  if (lang === "de" || lang === "en") return lang;
  return (await getRequestLocale()) === "en" ? "en" : "de";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const language = await chosenLanguage((await searchParams).lang);
  const copy = blogCopy(language);
  const url = `${getPublicAppOrigin()}/blog${language === "en" ? "?lang=en" : ""}`;
  return {
    title: copy.title, description: copy.intro,
    alternates: { canonical: url, types: { "application/rss+xml": "/blog/feed.xml" } },
    openGraph: { type: "website", title: copy.title, description: copy.intro, url, locale: copy.ogLocale },
  };
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const language = await chosenLanguage((await searchParams).lang);
  const copy = blogCopy(language);
  const otherLanguage: BlogLanguage = language === "de" ? "en" : "de";
  const [posts, others] = await Promise.all([listPublishedBlogPosts(language), listPublishedBlogPosts(otherLanguage)]);
  const dateFormat = new Intl.DateTimeFormat(copy.locale, { dateStyle: "long", timeZone: "UTC" });
  return (
    <>
      <main lang={language} className="mx-auto w-full max-w-3xl px-5 py-10">
        <h1 className="font-sans text-4xl font-bold leading-tight tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-700">{copy.intro}</p>
        {others.length > 0 ? <p className="mt-4 font-sans text-sm"><Link href={`/blog?lang=${otherLanguage}`} hrefLang={otherLanguage} lang={otherLanguage} className="inline-flex min-h-11 items-center font-semibold text-[#4a2fb8] underline underline-offset-2">{blogCopy(otherLanguage).otherList}</Link></p> : null}
        {posts.length === 0 ? <p className="mt-10 text-slate-700">{copy.empty}</p> : (
          <ul className="mt-10 space-y-10">
            {posts.map((post) => (
              <li key={post.slug}>
                <article>
                  {post.coverPath ? (
                    <Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true" className="mb-4 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={blogImageUrl(post.coverPath)} alt="" loading="lazy" decoding="async" className="aspect-[1200/630] w-full rounded-2xl object-cover" />
                    </Link>
                  ) : null}
                  <p className="font-sans text-sm text-slate-600"><time dateTime={post.postDate}>{dateFormat.format(new Date(`${post.postDate}T00:00:00Z`))}</time></p>
                  <h2 className="mt-1 font-sans text-2xl font-bold leading-snug text-slate-950"><Link href={`/blog/${post.slug}`} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]">{post.title}</Link></h2>
                  <p className="mt-2 text-lg leading-8 text-slate-700">{post.excerpt}</p>
                  <p className="mt-2 font-sans text-sm text-slate-600">{copy.by} {post.authorName}</p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BlogFooter language={language} />
    </>
  );
}
