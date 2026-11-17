import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BlogEditor } from "@/features/blog/BlogEditor";
import { blogPostFromRow } from "@/features/blog/blogModel";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BlogPostAdminPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(postId)) notFound();
  const client = await requirePlatformAdmin();
  const t = await getTranslations("admin.blog");
  const [{ data }, categories] = await Promise.all([client.rpc("admin_get_blog_post", { p_id: postId }), client.rpc("admin_list_blog_categories")]);
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) notFound();
  const post = blogPostFromRow(row);
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/admin/blog" className="text-sm text-slate-600 underline">{"← "}{t("title")}</Link>
      <h1 className="mt-4 mb-5 text-2xl font-semibold text-slate-950">{post.title || t("untitled")}</h1>
      <BlogEditor postId={postId} initial={post} status={row.status as "draft" | "approved" | "published"} supabaseUrl={(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")} appOrigin={getPublicAppOrigin()} categories={((categories.data ?? []) as { id: string; name_de: string; name_en: string }[]).map((c) => ({ id: c.id, name_de: c.name_de, name_en: c.name_en }))} />
    </main>
  );
}
