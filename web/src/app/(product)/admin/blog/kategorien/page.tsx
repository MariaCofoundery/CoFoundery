import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BlogCategoriesEditor, type CategoryRow } from "@/features/blog/BlogCategoriesEditor";
import { requirePlatformAdmin } from "@/features/moderation/access";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BlogCategoriesPage() {
  const client = await requirePlatformAdmin();
  const t = await getTranslations("admin.blog.categories");
  const { data } = await client.rpc("admin_list_blog_categories");
  const rows = (data ?? []) as CategoryRow[];
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/admin/blog" className="text-sm text-slate-600 underline">{"← "}{t("back")}</Link>
      <h1 className="mt-4 text-3xl font-semibold text-slate-950">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">{t("intro")}</p>
      <div className="mt-6"><BlogCategoriesEditor initial={rows} /></div>
    </main>
  );
}
