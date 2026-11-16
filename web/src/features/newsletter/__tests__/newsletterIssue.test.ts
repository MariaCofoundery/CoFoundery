import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderInline, renderRich, toPlain, escapeHtml } from "@/features/newsletter/newsletterMarkup";
import { emptyIssue, normalizeIssue, safeHref, sanitizeBlocks, type IssueData } from "@/features/newsletter/newsletterModel";
import { renderNewsletterHtml, renderNewsletterText, type RenderContext } from "@/features/newsletter/newsletterRender";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
const ctx: RenderContext = { appOrigin: "https://app.test", imageUrl: (p) => `https://img.test/${p}`, unsubscribeUrl: "https://app.test/abmelden/newsletter?u=1&t=2", privacyUrl: "https://app.test/datenschutz", imprintUrl: "https://app.test/impressum" };
const style = { color: "#000", linkColor: "#00f", fontSize: 16, lineHeight: 25, headingCase: "normal" as const, headingColor: "#000" };

test("markup: bold, italic and https links work", () => {
  const html = renderInline("Hallo **fett** und *kursiv* [Link](https://x.test/a?b=1&c=2)", "#00f");
  assert.match(html, /<strong>fett<\/strong>/);
  assert.match(html, /<em>kursiv<\/em>/);
  assert.match(html, /href="https:\/\/x\.test\/a\?b=1&amp;c=2"/);
});

test("markup: pasted HTML and unsafe links never come through", () => {
  const html = renderRich('<script>alert(1)</script> [x](javascript:alert(1)) [y](http://plain.test) <img src=x onerror=1>', style);
  assert.doesNotMatch(html, /<script|<img|href="javascript|href="http:/i);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(escapeHtml(`"'<>&`), "&quot;&#39;&lt;&gt;&amp;");
});

test("markup: headings, lists and paragraphs; uppercase headings", () => {
  const html = renderRich("# Titel\n\nAbsatz eins\nzweite Zeile\n\n- a\n- b", { ...style, headingCase: "upper" });
  assert.match(html, /<h2[^>]*>TITEL<\/h2>/);
  assert.match(html, /<p [^>]*>Absatz eins<br>zweite Zeile<\/p>/);
  assert.match(html, /<ul[^>]*><li[^>]*>a<\/li><li[^>]*>b<\/li><\/ul>/);
  assert.equal(toPlain("**a** [b](https://c.test)\n# H"), "a b (https://c.test)\nH");
});

test("model: unknown looks, bad colors, bad links and oversized blocks are normalized", () => {
  const issue = normalizeIssue({ look: "neon", accent: "red", font: "comic", blocks: Array.from({ length: 60 }, () => ({ type: "text", text: "x" })) });
  assert.equal(issue.look, "night");
  assert.equal(issue.accent, "#5b3df5");
  assert.equal(issue.font, "serif");
  assert.equal(issue.blocks.length, 40);
  assert.equal(safeHref("javascript:alert(1)", "https://app.test"), null);
  assert.equal(safeHref("http://plain.test", "https://app.test"), null);
  assert.equal(safeHref("//evil.test", "https://app.test"), null);
  assert.equal(safeHref("/connect", "https://app.test"), "https://app.test/connect");
  assert.deepEqual(sanitizeBlocks([{ type: "entries", title: "T", items: [{ kind: "listing", id: "not-a-uuid", title: "x" }, { kind: "problem", id: "11111111-1111-4111-8111-111111111111", title: "ok" }] }]).map((b) => (b.type === "entries" ? b.items.length : -1)), [1]);
});

test("render: the mail has the unsubscribe link, imprint and privacy, a text version, no tracking", () => {
  const issue: IssueData = { ...emptyIssue(), subject: "Hallo", preheader: "Vorschau", blocks: [{ id: "a", type: "text", text: "Hi **du**" }, { id: "b", type: "button", label: "Los", href: "/connect" }, { id: "c", type: "entries", title: "Neu", items: [{ kind: "listing", id: "11111111-1111-4111-8111-111111111111", title: "Steuerberaterin gesucht" }] }] };
  const html = renderNewsletterHtml(issue, ctx);
  assert.match(html, /abmelden\/newsletter\?u=1&amp;t=2/);
  assert.match(html, /Impressum/);
  assert.match(html, /\/connect\/listings\/11111111-1111-4111-8111-111111111111/);
  assert.doesNotMatch(html, /pixel|\.gif|track/i);
  const text = renderNewsletterText(issue, ctx);
  assert.match(text, /Abmelden: https:\/\/app\.test\/abmelden\/newsletter/);
  assert.match(text, /Steuerberaterin gesucht: https:\/\/app\.test\/connect\/listings\//);
});

test("render: the three looks differ, the night look has the dark ground, a header image carries its description", () => {
  const base = { ...emptyIssue(), subject: "s", blocks: [{ id: "a", type: "text" as const, text: "x" }] };
  assert.match(renderNewsletterHtml({ ...base, look: "night" }, ctx), /#0e0e22/);
  assert.match(renderNewsletterHtml({ ...base, look: "light" }, ctx), /#f4f3fb/);
  assert.match(renderNewsletterHtml({ ...base, look: "plain" }, ctx), /#f3f1ea/);
  const html = renderNewsletterHtml({ ...base, headerMode: "image", headerImagePath: "a.jpg", headerAlt: "Zwei Menschen" }, ctx);
  assert.match(html, /<img src="https:\/\/img\.test\/a\.jpg" alt="Zwei Menschen"/);
  assert.match(renderNewsletterHtml({ ...base, headingCase: "upper" }, ctx), /AUS DEM NETZWERK/);
});

test("the admin area is admin-only, sending is once per person and only for confirmed subscribers", () => {
  for (const path of ["src/app/(product)/admin/newsletter/page.tsx", "src/app/(product)/admin/newsletter/[issueId]/page.tsx"]) assert.match(read(path), /requirePlatformAdmin\(\)/);
  const actions = read("src/features/newsletter/newsletterAdminActions.ts");
  assert.equal((actions.match(/export async function/g) ?? []).length, (actions.match(/await requirePlatformAdmin\(\)/g) ?? []).length, "every action checks admin");
  const sql = read("../supabase/migrations/20270428120000_newsletter_issues.sql");
  assert.match(sql, /s\.status = 'confirmed'/);
  assert.match(sql, /newsletter_deliveries d where d\.issue_id = p_issue_id and d\.user_id = s\.user_id/);
  assert.match(sql, /'claim_newsletter_batch\(uuid, integer\)'[\s\S]*revoke all on function public\.%s from public, anon, authenticated[\s\S]*to service_role/);
  assert.match(sql, /allow_in_mails boolean not null default false/);
  const send = read("src/features/newsletter/newsletterSend.ts");
  assert.match(send, /claim_newsletter_batch/);
  assert.match(send, /newsletter_deliveries"\)\.delete\(\)/, "a failed package is released");
});

test("the permission toggle sits on own listings and problems, never on others", () => {
  assert.match(read("src/app/(product)/connect/listings/[listingId]/page.tsx"), /ownActive \? <AllowInMailsToggle/);
  assert.match(read("src/app/(product)/connect/problems/[problemId]/page.tsx"), /isAuthor && isPublished \? <div className="mt-5"><AllowInMailsToggle/);
});
