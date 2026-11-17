import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { createBlogPostAction, importBlogDraftAction } from "@/features/blog/blogAdminActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Row = { id: string; slug: string; language: "de" | "en"; title: string; status: "draft" | "approved" | "published"; post_date: string; published_at: string | null; updated_at: string; translation_key: string };
const PILL: Record<Row["status"], string> = { draft: "bg-amber-100 text-amber-900", approved: "bg-sky-100 text-sky-900", published: "bg-emerald-100 text-emerald-900" };
const IMPORT_KEYS: Record<string, string> = { empty: "importEmpty", invalid: "importInvalid", too_big: "importTooBig", no_content: "importNoContent" };

export default async function BlogAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; import?: string }> }) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const [t, locale, posts] = await Promise.all([getTranslations("admin.blog"), getLocale(), client.rpc("admin_list_blog_posts")]);
  const rows = (posts.error ? [] : (posts.data ?? [])) as Row[];
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-600 underline">{"← "}{t("back")}</Link>
      <h1 className="mt-4 text-3xl font-semibold text-slate-950">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">{t("intro")}</p>
      <p className="mt-2 flex flex-wrap gap-4 text-sm"><Link href="/blog" className="inline-flex min-h-11 items-center font-semibold underline">{t("viewBlog")}</Link><a href="/blog/feed.xml" className="inline-flex min-h-11 items-center font-semibold underline">{t("feed")}</a></p>
      {params.error ? <p role="alert" className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t("errorCreate")}</p> : null}
      {params.import ? <p role="alert" className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t(IMPORT_KEYS[params.import] ?? "importSave")}</p> : null}
      <form action={createBlogPostAction} className="mt-4"><SubmitButton label={t("new")} pendingLabel="…" className="min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white" /></form>
      <section className="mt-6 rounded-2xl border border-[#d9dcec] bg-white p-4" aria-labelledby="blog-import-title">
        <h2 id="blog-import-title" className="text-lg font-semibold">{t("importTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("importText")}</p>
        <form action={importBlogDraftAction} className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-slate-900" htmlFor="blog-draft">{t("importLabel")}</label>
          <textarea id="blog-draft" name="draft" rows={6} spellCheck={false} className="w-full rounded-xl border border-[#c9ccdf] bg-white p-3 font-mono text-sm" />
          <SubmitButton label={t("importButton")} pendingLabel="…" className="min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white" />
        </form>
      </section>
      <h2 className="mt-8 text-lg font-semibold">{t("posts")}</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("empty")}</p> : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/blog/${row.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#d9dcec] bg-white px-4 py-3 hover:bg-[#faf9fe]">
                <span className="min-w-0 flex-1 font-semibold">{row.title || t("untitled")}<span className="block truncate text-xs font-normal text-slate-500">/blog/{row.slug}</span></span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">{t(`lang.${row.language}`)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PILL[row.status]}`}>{t(`status.${row.status}`)}</span>
                <span className="text-sm text-slate-600">{fmt.format(new Date(`${row.post_date}T00:00:00Z`))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
