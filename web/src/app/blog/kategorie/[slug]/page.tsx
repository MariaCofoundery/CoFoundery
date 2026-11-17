import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const language = await chosenLanguage(query.lang);
  const category = (await listBlogCategories(language)).find((c) => c.slug === slug);
  if (!category) return { title: "Blog", robots: { index: false, follow: false } };
  const url = `${getPublicAppOrigin()}/blog/kategorie/${slug}${language === "en" ? "?lang=en" : ""}`;
  const title = `${category.name} | ${blogCopy(language).title}`;
  return {
    title, description: category.description || blogCopy(language).intro,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description: category.description, url, locale: blogCopy(language).ogLocale },
  };
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const language = await chosenLanguage(query.lang);
  const copy = blogCopy(language);
  const other: BlogLanguage = language === "de" ? "en" : "de";
  const [categories, posts, otherCategories] = await Promise.all([listBlogCategories(language), listPublishedBlogPosts(language, slug), listBlogCategories(other)]);
  const category = categories.find((c) => c.slug === slug);
  // Eine Kategorie ohne veroeffentlichten Beitrag in dieser Sprache gibt es oeffentlich nicht (404), ausser sie hat Beitraege in der anderen Sprache.
  if (!category) notFound();
  return (
    <BlogListView
      language={language} posts={posts} categories={categories} activeSlug={slug} title={category.name} intro={category.description || copy.intro} empty={copy.categoryEmpty}
      otherLanguageLink={otherCategories.some((c) => c.slug === slug) ? { href: `/blog/kategorie/${slug}?lang=${other}`, label: blogCopy(other).otherList, lang: other } : null}
    />
  );
}
