import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { isProductChromePath } from "@/features/navigation/productChromePath";
import { parseBlogDraftJson } from "@/features/blog/blogDraftImport";
import { parseInline, parseRich, toPlainText } from "@/features/blog/blogMarkup";
import { blogButtonHref, blogPostProblems, emptyBlogPost, isValidSlug, normalizeBlogPost, sanitizeBlogBlocks, slugify, type BlogPostData } from "@/features/blog/blogModel";

const root = new URL("../../../../", import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), "utf8");
function files(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? files(rel) : [rel];
  });
}

const good: BlogPostData = {
  slug: "drei-fragen", language: "de", translationKey: "", title: "Drei Fragen", excerpt: "Kurz.", authorName: "Maria", postDate: "2026-11-17", coverPath: "", coverAlt: "",
  blocks: [{ id: "a", type: "text", text: "# Hallo" }],
};

test("slugs: umlauts become ascii, results are always valid", () => {
  assert.equal(slugify("Drei Fragen vor dem Ja!"), "drei-fragen-vor-dem-ja");
  assert.equal(slugify("Überzeugt & größer"), "ueberzeugt-groesser");
  assert.ok(isValidSlug("abc-def"));
  for (const bad of ["ab", "Abc-def", "abc--def", "-abc", "abc-", "abc def"]) assert.equal(isValidSlug(bad), false, bad);
});

test("normalizing: language falls back to German, translation key is cleaned, dates must be real", () => {
  assert.equal(normalizeBlogPost({ language: "fr" }).language, "de");
  assert.equal(normalizeBlogPost({ language: "en" }).language, "en");
  assert.equal(normalizeBlogPost({ translationKey: "Three Questions!" }).translationKey, "threequestions");
  assert.equal(normalizeBlogPost({ postDate: "2026-02-30x" }).postDate, "");
  assert.equal(normalizeBlogPost({ postDate: "2026-11-17" }).postDate, "2026-11-17");
  assert.equal(normalizeBlogPost({ title: "Mein Titel" }).slug, "mein-titel");
});

test("blocks: only text, quote, image and button; image paths are cleaned", () => {
  const blocks = sanitizeBlogBlocks([{ type: "text", text: "x" }, { type: "entries" }, { type: "image", path: "../a b.jpg", alt: "Zwei" }, { type: "button", label: "Los", href: "/x" }, null, "x"]);
  assert.deepEqual(blocks.map((b) => b.type), ["text", "image", "button"]);
  assert.equal((blocks[1] as { path: string }).path, "..ab.jpg"); // nur A-Z a-z 0-9 . _ -
});

test("publishing rules: alt text is mandatory, one button at the end at most", () => {
  assert.deepEqual(blogPostProblems(good), []);
  assert.ok(blogPostProblems({ ...good, blocks: [{ id: "i", type: "image", path: "a.jpg", alt: " " }] }).includes("alt"));
  assert.ok(blogPostProblems({ ...good, coverPath: "c.jpg", coverAlt: "" }).includes("alt"));
  assert.equal(blogPostProblems({ ...good, coverPath: "c.jpg", coverAlt: "Ein Tisch" }).includes("alt"), false);
  const button = { id: "b", type: "button" as const, label: "Los", href: "/" };
  assert.deepEqual(blogPostProblems({ ...good, blocks: [...good.blocks, button] }), []);
  assert.ok(blogPostProblems({ ...good, blocks: [button, ...good.blocks] }).includes("cta"), "button not last");
  assert.ok(blogPostProblems({ ...good, blocks: [...good.blocks, button, { ...button, id: "c" }] }).includes("cta"), "two buttons");
  assert.ok(blogPostProblems({ ...good, title: "", excerpt: "", authorName: "", blocks: [] }).length >= 4);
});

test("button links: https or a path of the app, nothing else", () => {
  assert.equal(blogButtonHref("https://example.com/x", "https://app.test"), "https://example.com/x");
  assert.equal(blogButtonHref("/me/profile", "https://app.test"), "https://app.test/me/profile");
  for (const bad of ["javascript:alert(1)", "http://example.com", "//evil.test", "data:text/html,x", "mailto:a@b.c"]) assert.equal(blogButtonHref(bad, "https://app.test"), null, bad);
});

test("markup becomes data, never HTML: headings shift down, tags stay text", () => {
  const rich = parseRich("# Titel\n\nEin **fetter** und *schräger* Satz mit [Link](https://a.test).\n\n- eins\n- zwei\n\n### Klein");
  assert.deepEqual(rich.map((r) => r.kind === "heading" ? `h${r.level}` : r.kind), ["h2", "paragraph", "list", "h4"]);
  const para = rich[1];
  assert.ok(para.kind === "paragraph" && para.inline.some((i) => i.kind === "strong") && para.inline.some((i) => i.kind === "em") && para.inline.some((i) => i.kind === "link"));
  const hostile = parseInline("<script>alert(1)</script> [x](javascript:alert(1))");
  assert.ok(hostile.every((i) => i.kind === "text"), "no link for non-https, no HTML interpretation");
  assert.equal(toPlainText("# A **b** [c](https://d.test)"), "A b c");
});

test("draft import: friendly names, fenced JSON, no content is refused", () => {
  const ok = parseBlogDraftJson("```json\n" + JSON.stringify({ title: "Hallo Welt", language: "en", author: "Maria", date: "2026-11-17", excerpt: "x", blocks: [{ type: "text", text: "Hi" }] }) + "\n```");
  assert.ok(ok.ok && ok.post.language === "en" && ok.post.authorName === "Maria" && ok.post.postDate === "2026-11-17" && ok.post.slug === "hallo-welt");
  assert.deepEqual(parseBlogDraftJson(""), { ok: false, error: "empty" });
  assert.deepEqual(parseBlogDraftJson("{nope"), { ok: false, error: "invalid" });
  assert.deepEqual(parseBlogDraftJson(JSON.stringify({ title: "x", blocks: [] })), { ok: false, error: "no_content" });
  assert.equal(emptyBlogPost().language, "de");
});

test("the blog is public and not part of the product chrome", () => {
  for (const path of ["/blog", "/blog/drei-fragen", "/blog/feed.xml"]) assert.equal(isProductChromePath(path), false, path);
});

test("public pages carry imprint and privacy, the feed and per-post SEO", () => {
  assert.match(read("src/features/blog/BlogFooter.tsx"), /href="\/impressum"/);
  assert.match(read("src/features/blog/BlogFooter.tsx"), /href="\/datenschutz"/);
  for (const page of ["src/app/blog/page.tsx", "src/app/blog/[slug]/page.tsx"]) assert.match(read(page), /<BlogFooter/, page);
  const post = read("src/app/blog/[slug]/page.tsx");
  for (const piece of [/canonical/, /languages/, /openGraph/, /twitter/, /BlogPosting/, /alt=\{post\.coverAlt\}/]) assert.match(post, piece);
  assert.match(read("src/app/blog/feed.xml/route.ts"), /application\/rss\+xml/);
  assert.match(read("src/app/sitemap.ts"), /listBlogSitemap/);
  assert.match(read("src/app/blog/layout.tsx"), /application\/rss\+xml/);
});

test("the language switch only appears where a translation exists", () => {
  const post = read("src/app/blog/[slug]/page.tsx");
  assert.match(post, /post\.translations\.length > 0/);
  const index = read("src/app/blog/page.tsx");
  assert.match(index, /others\.length > 0/);
});

test("images always carry alt text on the page; images without one are not rendered", () => {
  const body = read("src/features/blog/BlogBody.tsx");
  assert.match(body, /!block\.alt\.trim\(\)\) return null/);
  assert.match(body, /alt=\{block\.alt\}/);
});

test("no tracking: no third-party scripts, no cookies, no analytics in the blog", () => {
  const all = [...files("src/app/blog"), ...files("src/features/blog")].filter((f) => /\.(tsx|ts)$/.test(f) && !f.includes("__tests__"));
  for (const file of all) {
    const src = read(file);
    assert.doesNotMatch(src, /<script[^>]*src=/i, file);
    assert.doesNotMatch(src, /document\.cookie|cookies\(\)|gtag|analytics|plausible|posthog|fbq|hotjar/i, file);
  }
});

test("the blog never touches members, teams, accounts or research", () => {
  const all = [...files("src/app/blog"), ...files("src/features/blog")].filter((f) => /\.(tsx|ts)$/.test(f) && !f.includes("__tests__"));
  for (const file of all) {
    const src = read(file);
    assert.doesNotMatch(src, /getRequestUser|profiles\b|person_core|founder_teams|network_profiles|research|alignment_answers|auth\.admin/i, file);
  }
});

test("every admin action checks for a platform admin; nothing publishes by itself", () => {
  const actions = read("src/features/blog/blogAdminActions.ts");
  const bodies = actions.split(/export async function /).slice(1);
  assert.ok(bodies.length >= 8);
  for (const body of bodies) assert.match(body, /await requirePlatformAdmin\(\)|return step\(/, body.slice(0, 40));
  assert.match(actions, /async function step[\s\S]*?await requirePlatformAdmin\(\)/);
  assert.doesNotMatch(read("src/features/blog/blogDraftImport.ts"), /published|approved/);
  for (const dir of ["src/app/api", "src/app/blog"]) for (const f of files(dir)) if (/blog/i.test(f) || dir === "src/app/blog") assert.doesNotMatch(read(f), /admin_set_blog_status/, f);
});

test("the migration closes the table, gates the way and exposes only published posts", () => {
  const sql = read("../supabase/migrations/20270505120000_blog.sql");
  assert.match(sql, /revoke all on public\.blog_posts from public, anon, authenticated/);
  assert.match(sql, /where b\.status = 'published'/);
  assert.match(sql, /status <> 'approved' then raise exception 'blog_not_approved'/);
  assert.match(sql, /'blog_alt'/);
  assert.match(sql, /public_get_blog_post\(text\)', 'public_blog_sitemap\(\)'/);
  assert.doesNotMatch(sql, /user_id|team_id|auth\.users/);
});

test("admin copy exists in both languages", () => {
  const de = JSON.parse(read("messages/de/admin.json")).blog;
  const en = JSON.parse(read("messages/en/admin.json")).blog;
  const keys = (o: Record<string, unknown>, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
  assert.deepEqual(keys(de).sort(), keys(en).sort());
  assert.ok(keys(de).length > 80);
});

test("the blog skill's example is valid JSON that the import accepts, and its rules match the model", () => {
  const skill = read("../.claude/skills/blog/SKILL.md");
  const json = /```json\n([\s\S]*?)\n```/.exec(skill)?.[1] ?? "";
  const parsed = parseBlogDraftJson(json);
  assert.ok(parsed.ok, "example imports");
  if (parsed.ok) {
    assert.equal(parsed.post.slug, "anteile-unter-co-foundern-teilen");
    assert.equal(parsed.post.translationKey, "splitting-equity");
    assert.deepEqual(blogPostProblems(parsed.post), [], "the example is ready to approve");
  }
  assert.match(skill, /Höchstens ein `button`, und er steht als letzter Baustein/);
  assert.match(skill, /Veröffentlicht nie|veröffentlichst nie/);
  assert.match(skill, /Alternativtext/);
});
