import Link from "next/link";
import { BlogFooter } from "@/features/blog/BlogFooter";
import { blogImageUrl, type BlogCategoryEntry, type BlogListEntry } from "@/features/blog/blogData";
import { blogCopy, type BlogLanguage } from "@/features/blog/blogModel";

const GRADIENTS = ["linear-gradient(120deg,#6d49e0,#0a80b8)", "linear-gradient(120deg,#2dbfa8,#0a80b8)", "linear-gradient(120deg,#d4286b,#6d49e0)", "linear-gradient(120deg,#e08a1e,#d4286b)", "linear-gradient(120deg,#5b3df5,#2dbfa8)"];
const CHIP = "inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2 sm:px-5";

function Cover({ post, index }: { post: BlogListEntry; index: number }) {
  const frame = "aspect-[1200/630] w-full rounded-2xl object-cover";
  return (
    <Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true" className="block">
      {post.coverPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={blogImageUrl(post.coverPath)} alt="" loading={index === 0 ? "eager" : "lazy"} decoding="async" className={frame} />
      ) : <span className={`block ${frame}`} style={{ background: GRADIENTS[index % GRADIENTS.length] }} />}
    </Link>
  );
}

function Meta({ post, language }: { post: BlogListEntry; language: BlogLanguage }) {
  const copy = blogCopy(language);
  const date = new Intl.DateTimeFormat(copy.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${post.postDate}T00:00:00Z`));
  return <p className="font-sans text-sm text-slate-600">{copy.by} {post.authorName} · <time dateTime={post.postDate}>{date}</time> · {post.minutes} {copy.minutes}</p>;
}

function CategoryLabel({ post, language }: { post: BlogListEntry; language: BlogLanguage }) {
  if (!post.categorySlug) return null;
  return <Link href={`/blog/kategorie/${post.categorySlug}${language === "en" ? "?lang=en" : ""}`} className="inline-flex min-h-6 items-center self-start font-sans text-[13px] font-bold uppercase tracking-[.06em] text-[#4a2fb8] hover:underline">{post.categoryName}</Link>;
}

/** Uebersicht und Kategorie-Seite: Kopf mit Mia, Kategorien, neuester Beitrag gross, die uebrigen im Raster. */
export function BlogListView({ language, posts, categories, activeSlug, title, intro, otherLanguageLink, empty }: {
  language: BlogLanguage; posts: BlogListEntry[]; categories: BlogCategoryEntry[]; activeSlug: string | null; title: string; intro: string;
  otherLanguageLink: { href: string; label: string; lang: BlogLanguage } | null; empty: string;
}) {
  const copy = blogCopy(language);
  const suffix = language === "en" ? "?lang=en" : "";
  const [first, ...rest] = posts;
  return (
    <>
      <main lang={language} className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex items-center justify-between gap-4 overflow-hidden rounded-[28px] bg-[#f3effd] px-5 pt-5 sm:px-12 sm:py-8">
          <div className="min-w-0 pb-4 sm:max-w-xl sm:pb-0">
            <h1 className="font-sans text-[44px] font-bold leading-none tracking-tight text-slate-950 sm:text-[56px]">{title}</h1>
            <p className="mt-3 text-xl leading-snug text-slate-700 sm:text-[23px]">{intro}</p>
            {otherLanguageLink ? <p className="mt-2 font-sans text-sm"><Link href={otherLanguageLink.href} hrefLang={otherLanguageLink.lang} lang={otherLanguageLink.lang} className="inline-flex min-h-11 items-center font-semibold text-[#4a2fb8] underline underline-offset-2">{otherLanguageLink.label}</Link></p> : null}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mia.png" alt={copy.miaAlt} width={203} height={286} className="h-[130px] w-auto shrink-0 rounded-2xl mix-blend-multiply sm:h-[240px]" />
        </div>

        {categories.length > 0 ? (
          <nav aria-label={copy.categories} className="mt-8 flex flex-wrap gap-2.5">
            <Link href={`/blog${suffix}`} aria-current={activeSlug === null ? "page" : undefined} className={`${CHIP} ${activeSlug === null ? "bg-slate-950 text-white" : "border border-slate-300 text-slate-950 hover:bg-slate-50"}`}>{copy.all}</Link>
            {categories.map((c) => (
              <Link key={c.slug} href={`/blog/kategorie/${c.slug}${suffix}`} aria-current={activeSlug === c.slug ? "page" : undefined} className={`${CHIP} ${activeSlug === c.slug ? "bg-slate-950 text-white" : "border border-slate-300 text-slate-950 hover:bg-slate-50"}`}>{c.name}</Link>
            ))}
          </nav>
        ) : null}

        {activeSlug ? <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{categories.find((c) => c.slug === activeSlug)?.description}</p> : null}

        {posts.length === 0 ? <p className="mt-10 text-slate-700">{empty}</p> : (
          <>
            <article className="mt-8 grid gap-6 rounded-3xl bg-[#f6f4fd] p-5 sm:p-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:gap-10">
              <Cover post={first} index={0} />
              <div className="flex min-w-0 flex-col gap-3">
                <CategoryLabel post={first} language={language} />
                <h2 className="font-sans text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-[34px]"><Link href={`/blog/${first.slug}`} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]">{first.title}</Link></h2>
                <p className="text-[19px] leading-relaxed text-slate-700">{first.excerpt}</p>
                <Meta post={first} language={language} />
              </div>
            </article>
            {rest.length > 0 ? (
              <ul className="mt-10 grid gap-10 sm:grid-cols-2">
                {rest.map((post, i) => (
                  <li key={post.slug}>
                    <article className="flex flex-col gap-3">
                      <Cover post={post} index={i + 1} />
                      <CategoryLabel post={post} language={language} />
                      <h2 className="font-sans text-2xl font-bold leading-snug tracking-tight text-slate-950"><Link href={`/blog/${post.slug}`} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]">{post.title}</Link></h2>
                      <p className="text-lg leading-relaxed text-slate-700">{post.excerpt}</p>
                      <Meta post={post} language={language} />
                    </article>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </main>
      <BlogFooter language={language} />
    </>
  );
}
