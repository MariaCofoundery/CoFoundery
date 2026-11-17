import { normalizeBlogPost, type BlogPostData } from "@/features/blog/blogModel";

/**
 * "Entwurf einfuegen": ein Beitrag als JSON (title, slug, language, excerpt, blocks, author/authorName, date/postDate, translationKey, cover) wird eine neue
 * Ausgabe im ENTWURF - nie ein Veroeffentlichen. Das JSON geht durch dieselbe Bereinigung wie ein Speichern im Editor.
 */
export type BlogImportResult = { ok: true; post: BlogPostData } | { ok: false; error: "empty" | "invalid" | "too_big" | "no_content" };

const MAX_BYTES = 200_000;

export function parseBlogDraftJson(text: string): BlogImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "empty" };
  if (trimmed.length > MAX_BYTES) return { ok: false, error: "too_big" };
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try { parsed = JSON.parse(unfenced); } catch { return { ok: false, error: "invalid" }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "invalid" };
  const o = parsed as Record<string, unknown>;
  // Freundliche Namen aus dem Auftrag: author = authorName, date = postDate, cover = coverPath/coverAlt.
  const cover = o.cover && typeof o.cover === "object" ? (o.cover as Record<string, unknown>) : {};
  const post = normalizeBlogPost({
    ...o,
    authorName: o.authorName ?? o.author,
    postDate: o.postDate ?? o.date,
    coverPath: o.coverPath ?? cover.path,
    coverAlt: o.coverAlt ?? cover.alt,
  });
  if (!post.title.trim() || post.blocks.length === 0) return { ok: false, error: "no_content" };
  return { ok: true, post };
}
