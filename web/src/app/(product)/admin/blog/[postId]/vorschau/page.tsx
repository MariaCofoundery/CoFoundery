import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BlogBody } from "@/features/blog/BlogBody";
import { BlogFooter } from "@/features/blog/BlogFooter";
import { blogPostFromRow, blogCopy } from "@/features/blog/blogModel";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Vorschau eines Beitrags, auch vor dem Veroeffentlichen - nur fuer Admins, nicht indexierbar. */
export default async function BlogPreviewPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(postId)) notFound();
  const client = await requirePlatformAdmin();
  const t = await getTranslations("admin.blog");
  const { data } = await client.rpc("admin_get_blog_post", { p_id: postId });
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) notFound();
  const post = blogPostFromRow(row);
  const copy = blogCopy(post.language);
  return (
    <div className="min-h-screen bg-white">
      <p role="status" className="bg-amber-100 px-5 py-2 text-center text-sm font-semibold text-amber-900">{t("previewBanner")}</p>
      <main lang={post.language} className="mx-auto w-full max-w-3xl px-5 py-10">
        <h1 className="font-sans text-4xl font-bold leading-tight tracking-tight text-slate-950">{post.title}</h1>
        <p className="mt-3 font-sans text-sm text-slate-600">{copy.by} {post.authorName}</p>
        <div className="mt-8"><BlogBody blocks={post.blocks} appOrigin={getPublicAppOrigin()} /></div>
      </main>
      <BlogFooter language={post.language} />
    </div>
  );
}
