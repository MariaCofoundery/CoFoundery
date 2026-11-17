"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { parseBlogDraftJson } from "@/features/blog/blogDraftImport";
import { blogPostToPayload, emptyBlogPost, normalizeBlogPost, type BlogPostData } from "@/features/blog/blogModel";

const BASE = "/admin/blog";
export type BlogActionResult = { ok: true; id?: string; path?: string; status?: string } | { ok: false; error: string };

function errorKey(message: string | undefined): string {
  const m = message ?? "";
  for (const code of ["blog_locked", "blog_not_approved", "blog_title", "blog_excerpt", "blog_author", "blog_empty", "blog_alt", "blog_cta"]) if (m.includes(code)) return code.slice(5);
  if (m.includes("blog_posts_slug_key") || m.includes("duplicate key") && m.includes("slug")) return "slug_taken";
  if (m.includes("translation_key")) return "translation_taken";
  if (m.includes("blog_posts_slug")) return "slug_invalid";
  return "save";
}

/** Ein neuer, leerer Entwurf. */
export async function createBlogPostAction() {
  const client = await requirePlatformAdmin();
  const { data: id, error } = await client.rpc("admin_save_blog_post", { p_id: null, p: blogPostToPayload(emptyBlogPost()) });
  if (error || !id) redirect(`${BASE}?error=create`);
  redirect(`${BASE}/${id}`);
}

/** Einen als JSON geschriebenen Beitrag einfuegen: wird ein Entwurf, nie ein Veroeffentlichen. Ist die Adresse vergeben, bekommt sie ein Suffix. */
export async function importBlogDraftAction(formData: FormData) {
  const client = await requirePlatformAdmin();
  const parsed = parseBlogDraftJson(String(formData.get("draft") ?? ""));
  if (!parsed.ok) redirect(`${BASE}?import=${parsed.error}`);
  let post = parsed.post;
  let id: string | null = null;
  for (let attempt = 0; attempt < 3 && !id; attempt += 1) {
    const { data, error } = await client.rpc("admin_save_blog_post", { p_id: null, p: blogPostToPayload(post) });
    if (!error && data) { id = data as string; break; }
    const key = errorKey(error?.message);
    if (key === "slug_taken") { post = { ...post, slug: `${post.slug.slice(0, 70)}-${randomUUID().slice(0, 4)}` }; continue; }
    if (key === "translation_taken") { post = { ...post, translationKey: "" }; continue; }
    redirect(`${BASE}?import=save`);
  }
  if (!id) redirect(`${BASE}?import=save`);
  redirect(`${BASE}/${id}`);
}

export async function saveBlogPostAction(id: string, raw: unknown): Promise<BlogActionResult> {
  const client = await requirePlatformAdmin();
  const post = normalizeBlogPost((raw ?? {}) as Record<string, unknown>);
  const { error } = await client.rpc("admin_save_blog_post", { p_id: id, p: blogPostToPayload(post as BlogPostData) });
  if (error) return { ok: false, error: errorKey(error.message) };
  revalidatePath(BASE);
  return { ok: true };
}

const SIGNATURES: { type: string; ext: string; match: (b: Buffer) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", match: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: "image/webp", ext: "webp", match: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

/** Bild hochladen: JPG, PNG oder WebP bis 2 MB, geprueft am Dateikopf. Der Alternativtext wird im Editor erzwungen, nicht hier. */
export async function uploadBlogImageAction(formData: FormData): Promise<BlogActionResult> {
  await requirePlatformAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "no_file" };
  if (file.size > 2_097_152) return { ok: false, error: "too_big" };
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = SIGNATURES.find((entry) => entry.match(buffer));
  if (!kind) return { ok: false, error: "type" };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: "not_configured" };
  const service = createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const path = `${randomUUID()}.${kind.ext}`;
  const { error } = await service.storage.from("blog").upload(path, buffer, { contentType: kind.type, upsert: false });
  if (error) return { ok: false, error: "upload" };
  return { ok: true, path };
}

/** Der Weg: freigeben, veroeffentlichen, zurueck in den Entwurf. Jeder Schritt ist eine eigene Handlung; davor wird der aktuelle Stand gespeichert. */
async function step(id: string, raw: unknown, status: "approved" | "published" | "draft"): Promise<BlogActionResult> {
  const client = await requirePlatformAdmin();
  if (status === "approved") {
    const saved = await saveBlogPostAction(id, raw);
    if (!saved.ok) return saved;
  }
  const { error } = await client.rpc("admin_set_blog_status", { p_id: id, p_status: status });
  if (error) return { ok: false, error: errorKey(error.message) };
  revalidatePath(BASE);
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/blog/feed.xml");
  revalidatePath("/sitemap.xml");
  return { ok: true, status };
}

export async function approveBlogPostAction(id: string, raw: unknown) { return step(id, raw, "approved"); }
export async function publishBlogPostAction(id: string) { return step(id, undefined, "published"); }
export async function unpublishBlogPostAction(id: string) { return step(id, undefined, "draft"); }

export async function deleteBlogPostAction(id: string): Promise<BlogActionResult> {
  const client = await requirePlatformAdmin();
  const { error } = await client.rpc("admin_delete_blog_post", { p_id: id });
  if (error) return { ok: false, error: "locked" };
  revalidatePath(BASE);
  return { ok: true };
}
