"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BLOG_LANGUAGES, BLOG_LIMITS, SEO_IDEAL, blogPostProblems, searchDescription, searchTitle, slugify,
  type BlogBlock, type BlogBlockType, type BlogPostData,
} from "@/features/blog/blogModel";
import {
  approveBlogPostAction, deleteBlogPostAction, publishBlogPostAction, saveBlogPostAction, unpublishBlogPostAction, uploadBlogImageAction,
} from "@/features/blog/blogAdminActions";

export type EditorCategory = { id: string; name_de: string; name_en: string };
type Props = { postId: string; initial: BlogPostData; status: "draft" | "approved" | "published"; supabaseUrl: string; categories: EditorCategory[]; appOrigin: string };

const BOX = "rounded-2xl border border-[#d9dcec] bg-white p-4";
const LABEL = "text-xs font-bold uppercase tracking-[.08em] text-[#6d28d9]";
const FIELD = "mt-1 w-full rounded-xl border border-[#c9ccdf] bg-white px-3 py-2 text-[15px]";
const BTN = "min-h-11 rounded-xl border border-[#c9ccdf] bg-white px-4 text-sm font-semibold text-slate-900 disabled:opacity-50";
const BTN_PRIMARY = "min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white disabled:opacity-50";
const newId = () => `b${Math.random().toString(36).slice(2, 9)}`;

export function BlogEditor({ postId, initial, status, supabaseUrl, categories, appOrigin }: Props) {
  const t = useTranslations("admin.blog");
  const router = useRouter();
  const [post, setPost] = useState<BlogPostData>(initial);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<"publish" | "delete" | null>(null);
  const [pending, start] = useTransition();
  const locked = status !== "draft";
  const problems = blogPostProblems(post);
  const imageUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/blog/${encodeURIComponent(path)}`;

  const set = <K extends keyof BlogPostData>(key: K, value: BlogPostData[K]) => setPost((current) => ({ ...current, [key]: value }));
  const setBlock = (id: string, patch: Partial<BlogBlock>) => setPost((current) => ({ ...current, blocks: current.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as BlogBlock) : b)) }));
  const move = (index: number, delta: number) => setPost((current) => {
    const next = [...current.blocks]; const to = index + delta;
    if (to < 0 || to >= next.length) return current;
    [next[index], next[to]] = [next[to], next[index]];
    return { ...current, blocks: next };
  });
  const remove = (id: string) => setPost((current) => ({ ...current, blocks: current.blocks.filter((b) => b.id !== id) }));
  const add = (type: BlogBlockType) => {
    if (post.blocks.length >= BLOG_LIMITS.blocks) return;
    if (type === "button" && post.blocks.some((b) => b.type === "button")) return;
    const id = newId();
    if (type === "newsletter" && post.blocks.some((b) => b.type === "newsletter")) return;
    const block: BlogBlock = type === "newsletter" ? { id, type } : type === "text" ? { id, type, text: "" } : type === "quote" ? { id, type, text: "", by: "" } : type === "image" ? { id, type, path: "", alt: "" } : { id, type, label: "", href: "/" };
    // Der Knopf steht immer ganz am Ende; alles andere kommt vor ihn.
    setPost((current) => {
      const last = current.blocks[current.blocks.length - 1];
      if (type !== "button" && last?.type === "button") return { ...current, blocks: [...current.blocks.slice(0, -1), block, last] };
      return { ...current, blocks: [...current.blocks, block] };
    });
  };

  const say = (tone: "ok" | "error", key: string) => setNote({ tone, text: t(`messages.${key}`) });
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okKey: string) => start(async () => {
    const result = await fn();
    if (result.ok) { say("ok", okKey); setConfirm(null); router.refresh(); } else say("error", `error_${result.error ?? "save"}`);
  });
  const upload = (file: File | undefined, apply: (path: string) => void) => {
    if (!file) return;
    start(async () => {
      const data = new FormData(); data.set("file", file);
      const result = await uploadBlogImageAction(data);
      if (result.ok && result.path) { apply(result.path); say("ok", "uploaded"); } else say("error", `error_${result.ok ? "upload" : result.error}`);
    });
  };

  return (
    <div className="space-y-4">
      {note ? <p role="status" className={`rounded-2xl p-3 text-sm ${note.tone === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{note.text}</p> : null}
      {locked ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t(`editor.locked.${status}`)}</p> : null}

      <section className={BOX}>
        <h2 className={LABEL}>{t("editor.basics")}</h2>
        <label className="mt-3 block text-sm font-semibold">{t("editor.titleLabel")}<input className={FIELD} value={post.title} maxLength={BLOG_LIMITS.title} disabled={locked} onChange={(e) => set("title", e.target.value)} /></label>
        <label className="mt-3 block text-sm font-semibold">{t("editor.slug")}
          <div className="flex gap-2"><input className={FIELD} value={post.slug} maxLength={BLOG_LIMITS.slug} disabled={locked} onChange={(e) => set("slug", e.target.value.toLowerCase())} /><button type="button" className={`${BTN} mt-1 shrink-0`} disabled={locked} onClick={() => set("slug", slugify(post.title))}>{t("editor.fromTitle")}</button></div>
        </label>
        <p className="mt-1 text-xs text-slate-600">{t("editor.slugHint")}</p>
        <div className="mt-3 text-sm font-semibold" role="group" aria-label={t("editor.language")}>
          {t("editor.language")}
          <div className="mt-1 flex flex-wrap gap-2">
            {BLOG_LANGUAGES.map((code) => <button key={code} type="button" disabled={locked} aria-pressed={post.language === code} onClick={() => set("language", code)} className={`${BTN} ${post.language === code ? "border-[#5b3df5] bg-[#efeafd]" : ""}`}>{t(`lang.${code}`)}</button>)}
          </div>
        </div>
        <fieldset className="mt-3 rounded-xl border border-[#d9dcec] bg-[#faf9fe] px-3 pb-2 pt-1" disabled={locked}>
          <legend className="px-1 text-sm font-semibold">{t("editor.category")}</legend>
          <p className="text-xs text-slate-600">{t("editor.categoryHint")}</p>
          {categories.map((c) => (
            <label key={c.id} className="flex min-h-11 items-center gap-2.5 text-[15px]"><input type="radio" name="category" className="h-[18px] w-[18px]" checked={post.categoryId === c.id} onChange={() => set("categoryId", c.id)} />{post.language === "en" && c.name_en ? c.name_en : c.name_de}</label>
          ))}
          <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-slate-600"><input type="radio" name="category" className="h-[18px] w-[18px]" checked={post.categoryId === ""} onChange={() => set("categoryId", "")} />{t("editor.categoryNone")}</label>
          <Link href="/admin/blog/kategorien" className="inline-flex min-h-11 items-center text-sm font-semibold underline">{t("editor.categoryManage")}</Link>
        </fieldset>
        <label className="mt-3 block text-sm font-semibold">{t("editor.translationKey")}<input className={FIELD} value={post.translationKey} maxLength={80} disabled={locked} onChange={(e) => set("translationKey", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></label>
        <p className="mt-1 text-xs text-slate-600">{t("editor.translationHint")}</p>
        <label className="mt-3 block text-sm font-semibold">{t("editor.excerpt")}<textarea className={FIELD} rows={3} value={post.excerpt} maxLength={BLOG_LIMITS.excerpt} disabled={locked} onChange={(e) => set("excerpt", e.target.value)} /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">{t("editor.author")}<input className={FIELD} value={post.authorName} maxLength={BLOG_LIMITS.author} disabled={locked} onChange={(e) => set("authorName", e.target.value)} /></label>
          <label className="block text-sm font-semibold">{t("editor.date")}<input type="date" className={FIELD} value={post.postDate} disabled={locked} onChange={(e) => set("postDate", e.target.value)} /></label>
        </div>
      </section>

      <section className={BOX} aria-labelledby="blog-seo">
        <h2 id="blog-seo" className={LABEL}>{t("editor.seo")}</h2>
        <p className="mt-1 text-xs text-slate-600">{t("editor.seoHint")}</p>
        <label className="mt-3 block text-sm font-semibold">{t("editor.seoTitle")}
          <input className={FIELD} value={post.seoTitle} maxLength={BLOG_LIMITS.seoTitle} disabled={locked} placeholder={post.title} onChange={(e) => set("seoTitle", e.target.value)} />
        </label>
        <p className={`mt-1 text-xs ${searchTitle(post).length > SEO_IDEAL.title ? "text-amber-800" : "text-slate-600"}`}>{t("editor.counter", { count: searchTitle(post).length, ideal: SEO_IDEAL.title })}</p>
        <label className="mt-3 block text-sm font-semibold">{t("editor.seoDescription")}
          <textarea className={FIELD} rows={3} value={post.seoDescription} maxLength={BLOG_LIMITS.seoDescription} disabled={locked} placeholder={post.excerpt} onChange={(e) => set("seoDescription", e.target.value)} />
        </label>
        <p className={`mt-1 text-xs ${searchDescription(post).length > SEO_IDEAL.description ? "text-amber-800" : "text-slate-600"}`}>{t("editor.counter", { count: searchDescription(post).length, ideal: SEO_IDEAL.description })}</p>
        <div className="mt-3 rounded-xl border border-[#e3e5f2] bg-white p-3" aria-label={t("editor.seoPreview")}>
          <p className="text-xs font-semibold text-slate-600">{t("editor.seoPreview")}</p>
          <p className="mt-2 truncate text-xs text-[#1e6b3a]">{appOrigin.replace(/^https?:\/\//, "")} › blog › {post.slug || "…"}</p>
          <p className="mt-0.5 text-[19px] leading-snug text-[#1a0dab]">{searchTitle(post).slice(0, SEO_IDEAL.title + 5) || t("untitled")}{searchTitle(post).length > SEO_IDEAL.title + 5 ? "…" : ""}</p>
          <p className="mt-0.5 text-sm leading-snug text-slate-700">{searchDescription(post).slice(0, SEO_IDEAL.description + 5)}{searchDescription(post).length > SEO_IDEAL.description + 5 ? "…" : ""}</p>
        </div>
      </section>

      <section className={BOX}>
        <h2 className={LABEL}>{t("editor.cover")}</h2>
        {post.coverPath ? (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(post.coverPath)} alt={post.coverAlt} className="max-h-48 rounded-xl" />
            <label className="mt-2 block text-sm font-semibold">{t("editor.coverAlt")}<input className={FIELD} value={post.coverAlt} maxLength={BLOG_LIMITS.alt} disabled={locked} onChange={(e) => set("coverAlt", e.target.value)} /></label>
            <button type="button" className={`${BTN} mt-2`} disabled={locked} onClick={() => setPost((c) => ({ ...c, coverPath: "", coverAlt: "" }))}>{t("editor.coverRemove")}</button>
          </div>
        ) : <label className="mt-3 block text-sm font-semibold">{t("editor.coverUpload")}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={locked || pending} onChange={(e) => upload(e.target.files?.[0], (path) => set("coverPath", path))} className="mt-1 block w-full text-sm" /></label>}
      </section>

      <section className={BOX}>
        <h2 className={LABEL}>{t("editor.blocks")}</h2>
        <ol className="mt-3 space-y-3">
          {post.blocks.map((block, index) => (
            <li key={block.id} className="rounded-xl border border-[#e3e5f2] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{index + 1}. {block.type === "text" ? t("editor.addText").slice(2) : block.type === "quote" ? t("editor.quote") : block.type === "image" ? t("editor.addImage").slice(2) : block.type === "newsletter" ? t("editor.addNewsletter").slice(2) : t("editor.addButton").slice(2)}</span>
                <span className="ml-auto flex gap-1">
                  <button type="button" className={BTN} disabled={locked || index === 0} onClick={() => move(index, -1)} aria-label={t("editor.up")}>↑</button>
                  <button type="button" className={BTN} disabled={locked || index === post.blocks.length - 1} onClick={() => move(index, 1)} aria-label={t("editor.down")}>↓</button>
                  <button type="button" className={BTN} disabled={locked} onClick={() => remove(block.id)}>{t("editor.remove")}</button>
                </span>
              </div>
              {block.type === "text" ? (<><textarea className={`${FIELD} font-mono`} rows={9} maxLength={BLOG_LIMITS.text} disabled={locked} value={block.text} onChange={(e) => setBlock(block.id, { text: e.target.value })} /><p className="mt-1 text-xs text-slate-600">{t("editor.textHint")}</p></>) : null}
              {block.type === "quote" ? (<><textarea className={FIELD} rows={3} maxLength={500} disabled={locked} value={block.text} aria-label={t("editor.quote")} onChange={(e) => setBlock(block.id, { text: e.target.value })} /><input className={FIELD} maxLength={80} disabled={locked} value={block.by} placeholder={t("editor.quoteBy")} onChange={(e) => setBlock(block.id, { by: e.target.value })} /></>) : null}
              {block.type === "image" ? (
                <div className="mt-2">
                  {block.path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(block.path)} alt={block.alt} className="max-h-40 rounded-xl" />
                  ) : <label className="block text-sm font-semibold">{t("editor.imageUpload")}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={locked || pending} onChange={(e) => upload(e.target.files?.[0], (path) => setBlock(block.id, { path }))} className="mt-1 block w-full text-sm" /></label>}
                  <label className="mt-2 block text-sm font-semibold">{t("editor.imageAlt")}<input className={FIELD} maxLength={BLOG_LIMITS.alt} disabled={locked} value={block.alt} aria-required="true" aria-invalid={block.path !== "" && !block.alt.trim()} onChange={(e) => setBlock(block.id, { alt: e.target.value })} /></label>
                </div>
              ) : null}
              {block.type === "newsletter" ? <p className="mt-2 text-sm text-slate-700">{t("editor.newsletterHint")}</p> : null}
              {block.type === "button" ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">{t("editor.buttonLabel")}<input className={FIELD} maxLength={BLOG_LIMITS.label} disabled={locked} value={block.label} onChange={(e) => setBlock(block.id, { label: e.target.value })} /></label>
                  <label className="block text-sm font-semibold">{t("editor.buttonHref")}<input className={FIELD} maxLength={300} disabled={locked} value={block.href} onChange={(e) => setBlock(block.id, { href: e.target.value })} /></label>
                  <p className="text-xs text-slate-600 sm:col-span-2">{t("editor.buttonHint")}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["text", "quote", "image"] as const).map((type) => <button key={type} type="button" className={BTN} disabled={locked} onClick={() => add(type)}>{t(`editor.add${type[0].toUpperCase()}${type.slice(1)}`)}</button>)}
          <button type="button" className={BTN} disabled={locked || post.blocks.some((b) => b.type === "newsletter")} onClick={() => add("newsletter")}>{t("editor.addNewsletter")}</button>
          <button type="button" className={BTN} disabled={locked || post.blocks.some((b) => b.type === "button")} onClick={() => add("button")}>{t("editor.addButton")}</button>
        </div>
      </section>

      <section className={BOX}>
        <h2 className={LABEL}>{t("editor.workflow")}</h2>
        {!locked ? (
          problems.length ? (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">{t("editor.checklist")}</p><ul className="mt-1 list-disc pl-5">{problems.map((p) => <li key={p}>{t(`problems.${p}`)}</li>)}</ul></div>
          ) : <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{t("editor.ready")}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {status === "draft" ? (
            <>
              <button type="button" className={BTN} disabled={pending} onClick={() => run(() => saveBlogPostAction(postId, post), "saved")}>{t("editor.save")}</button>
              <button type="button" className={BTN_PRIMARY} disabled={pending || problems.length > 0} onClick={() => run(() => approveBlogPostAction(postId, post), "approved")}>{t("editor.approve")}</button>
            </>
          ) : null}
          {status === "approved" ? (
            confirm === "publish" ? (
              <>
                <span className="self-center text-sm font-semibold">{t("editor.publishSure")}</span>
                <button type="button" className={BTN_PRIMARY} disabled={pending} onClick={() => run(() => publishBlogPostAction(postId), "published")}>{t("editor.publishYes")}</button>
                <button type="button" className={BTN} onClick={() => setConfirm(null)}>{t("editor.publishNo")}</button>
              </>
            ) : <button type="button" className={BTN_PRIMARY} disabled={pending} onClick={() => setConfirm("publish")}>{t("editor.publish")}</button>
          ) : null}
          {status !== "draft" ? <button type="button" className={BTN} disabled={pending} onClick={() => run(() => unpublishBlogPostAction(postId), "unpublished")}>{t("editor.unpublish")}</button> : null}
          <a className={`${BTN} inline-flex items-center`} href={`/admin/blog/${postId}/vorschau`} target="_blank" rel="noopener">{t("editor.preview")}</a>
          {status === "published" ? <a className={`${BTN} inline-flex items-center`} href={`/blog/${post.slug}`} target="_blank" rel="noopener">{t("editor.viewLive")}</a> : null}
        </div>
        {status === "draft" ? (
          <div className="mt-3">
            {confirm === "delete" ? (
              <div className="flex flex-wrap gap-2"><span className="self-center text-sm font-semibold">{t("editor.deleteSure")}</span>
                <button type="button" className={BTN} disabled={pending} onClick={() => start(async () => { const r = await deleteBlogPostAction(postId); if (r.ok) router.push("/admin/blog"); else say("error", "error_delete"); })}>{t("editor.deleteYes")}</button>
                <button type="button" className={BTN} onClick={() => setConfirm(null)}>{t("editor.publishNo")}</button></div>
            ) : <button type="button" className="text-sm text-slate-600 underline" onClick={() => setConfirm("delete")}>{t("editor.delete")}</button>}
          </div>
        ) : null}
      </section>
    </div>
  );
}
