import type { Metadata } from "next";
import { BlogListView } from "@/features/blog/BlogListView";
import { listBlogCategories, listPublishedBlogPosts } from "@/features/blog/blogData";
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
  const other: BlogLanguage = language === "de" ? "en" : "de";
  const [posts, others, categories] = await Promise.all([listPublishedBlogPosts(language), listPublishedBlogPosts(other), listBlogCategories(language)]);
  return (
    <BlogListView
      language={language} posts={posts} categories={categories} activeSlug={null} title={copy.title} intro={copy.intro} empty={copy.empty}
      otherLanguageLink={others.length > 0 ? { href: `/blog?lang=${other}`, label: blogCopy(other).otherList, lang: other } : null}
    />
  );
}
