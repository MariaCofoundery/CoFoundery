import { safeHref } from "@/features/newsletter/newsletterModel";

/**
 * Blog: das Modell eines Beitrags. Rein (kein Server-Code), damit Admin, Seiten, Feed und Tests dasselbe benutzen.
 * Ein Beitrag besteht aus Bausteinen, nicht aus freiem HTML: Text (kleine Markdown-Auszeichnung), Zitat, Bild (Alternativtext Pflicht) und
 * hoechstens EIN Knopf - als letzter Baustein.
 */
export const BLOG_LANGUAGES = ["de", "en"] as const;
export type BlogLanguage = (typeof BLOG_LANGUAGES)[number];
export const BLOG_STATUSES = ["draft", "approved", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export type BlogBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "quote"; text: string; by: string }
  | { id: string; type: "image"; path: string; alt: string }
  | { id: string; type: "button"; label: string; href: string };
export type BlogBlockType = BlogBlock["type"];

export type BlogPostData = {
  slug: string; language: BlogLanguage; translationKey: string;
  title: string; excerpt: string; authorName: string; postDate: string;
  coverPath: string; coverAlt: string; blocks: BlogBlock[];
};

export const BLOG_LIMITS = { blocks: 60, text: 12000, title: 140, excerpt: 300, author: 80, slug: 80, alt: 200, label: 60 } as const;

const str = (value: unknown, max: number) => (typeof value === "string" ? value : "").slice(0, max);
const idOf = (value: unknown, index: number) => (typeof value === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(value) ? value : `b${index}`);
const pathOf = (value: unknown) => str(value, 200).replace(/[^A-Za-z0-9._-]/g, "");

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Aus einem Titel eine saubere Adresse: Kleinbuchstaben, Umlaute aufgeloest, Bindestriche. */
export function slugify(value: string): string {
  return value.toLowerCase()
    .replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, BLOG_LIMITS.slug).replace(/-+$/g, "");
}

export function isValidSlug(value: string): boolean {
  return value.length >= 3 && value.length <= BLOG_LIMITS.slug && SLUG_PATTERN.test(value);
}

export function sanitizeBlogBlocks(raw: unknown): BlogBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: BlogBlock[] = [];
  raw.slice(0, BLOG_LIMITS.blocks).forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const b = entry as Record<string, unknown>;
    const id = idOf(b.id, index);
    switch (b.type) {
      case "text": out.push({ id, type: "text", text: str(b.text, BLOG_LIMITS.text) }); break;
      case "quote": out.push({ id, type: "quote", text: str(b.text, 500), by: str(b.by, 80) }); break;
      case "image": out.push({ id, type: "image", path: pathOf(b.path), alt: str(b.alt, BLOG_LIMITS.alt) }); break;
      case "button": out.push({ id, type: "button", label: str(b.label, BLOG_LIMITS.label), href: str(b.href, 300) }); break;
    }
  });
  return out;
}

function validDate(value: unknown): string {
  const v = typeof value === "string" ? value.trim().slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  const parsed = new Date(`${v}T00:00:00Z`);
  // 30. Februar waere fuer JavaScript ein 2. Maerz, fuer die Datenbank ein Fehler: nur echte Tage zaehlen.
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== v ? "" : v;
}

export function normalizeBlogPost(raw: Record<string, unknown>): BlogPostData {
  const title = str(raw.title, BLOG_LIMITS.title);
  const slugRaw = str(raw.slug, BLOG_LIMITS.slug).trim().toLowerCase();
  return {
    slug: slugRaw ? (isValidSlug(slugRaw) ? slugRaw : slugify(slugRaw)) : slugify(title),
    language: (BLOG_LANGUAGES as readonly string[]).includes(String(raw.language)) ? (raw.language as BlogLanguage) : "de",
    translationKey: str(raw.translationKey, 80).toLowerCase().replace(/[^a-z0-9-]/g, ""),
    title, excerpt: str(raw.excerpt, BLOG_LIMITS.excerpt), authorName: str(raw.authorName, BLOG_LIMITS.author),
    postDate: validDate(raw.postDate),
    coverPath: pathOf(raw.coverPath), coverAlt: str(raw.coverAlt, BLOG_LIMITS.alt),
    blocks: sanitizeBlogBlocks(raw.blocks),
  };
}

export function blogPostFromRow(row: Record<string, unknown>): BlogPostData {
  return normalizeBlogPost({
    slug: row.slug, language: row.language, translationKey: row.translation_key, title: row.title, excerpt: row.excerpt, authorName: row.author_name,
    postDate: row.post_date, coverPath: row.cover_path, coverAlt: row.cover_alt, blocks: row.blocks,
  });
}

export function blogPostToPayload(post: BlogPostData) {
  return {
    slug: post.slug, language: post.language, translation_key: post.translationKey, title: post.title, excerpt: post.excerpt, author_name: post.authorName,
    post_date: post.postDate || null, cover_path: post.coverPath, cover_alt: post.coverAlt, blocks: post.blocks,
  };
}

export function emptyBlogPost(base?: Partial<BlogPostData>): BlogPostData {
  return normalizeBlogPost({ language: "de", blocks: [{ id: "intro", type: "text", text: "" }], ...base });
}

/** Was fehlt, damit der Beitrag freigegeben werden kann? (Dieselben Regeln prueft die Datenbank noch einmal.) */
export type BlogProblem = "title" | "slug" | "excerpt" | "author" | "empty" | "alt" | "cta";
export function blogPostProblems(post: BlogPostData): BlogProblem[] {
  const problems: BlogProblem[] = [];
  if (!post.title.trim()) problems.push("title");
  if (!isValidSlug(post.slug)) problems.push("slug");
  if (!post.excerpt.trim()) problems.push("excerpt");
  if (!post.authorName.trim()) problems.push("author");
  if (post.blocks.length === 0) problems.push("empty");
  if (post.blocks.some((b) => b.type === "image" && (!b.alt.trim() || !b.path)) || (post.coverPath && !post.coverAlt.trim())) problems.push("alt");
  const buttons = post.blocks.filter((b) => b.type === "button");
  const last = post.blocks[post.blocks.length - 1];
  if (buttons.length > 1 || (buttons.length === 1 && (last?.type !== "button" || !last.label.trim() || !last.href.trim()))) problems.push("cta");
  return problems;
}

/** Ein Knopf ist nur ein Link, wenn sein Ziel in einer Seite etwas zu suchen hat: https oder ein Pfad dieser App. */
export function blogButtonHref(href: string, appOrigin: string): string | null {
  return safeHref(href, appOrigin);
}

/** Die festen Worte der oeffentlichen Seiten - in der Sprache des BEITRAGS, nicht der des Besuchs. */
export const BLOG_COPY = {
  de: {
    name: "Blog", title: "Blog", intro: "Gedanken zu Zusammenarbeit, Konflikten und Führung in Gründungsteams.", all: "Alle Beiträge", empty: "Noch keine Beiträge.",
    by: "Von", back: "Alle Beiträge", readIn: "Dieser Beitrag auf Deutsch", otherList: "Beiträge auf Englisch", imprint: "Impressum", privacy: "Datenschutz",
    home: "Zur Startseite", feed: "RSS-Feed", published: "Veröffentlicht am", locale: "de-DE", ogLocale: "de_DE", more: "Weiterlesen",
  },
  en: {
    name: "Blog", title: "Blog", intro: "Thoughts on working together, conflict and leadership in founding teams.", all: "All posts", empty: "No posts yet.",
    by: "By", back: "All posts", readIn: "Read this post in English", otherList: "Posts in German", imprint: "Legal notice", privacy: "Privacy",
    home: "Home", feed: "RSS feed", published: "Published on", locale: "en-US", ogLocale: "en_US", more: "Read more",
  },
} as const;

export function blogCopy(language: BlogLanguage) {
  return BLOG_COPY[language];
}

export const LANGUAGE_NAMES: Record<BlogLanguage, { own: string }> = { de: { own: "Deutsch" }, en: { own: "English" } };
