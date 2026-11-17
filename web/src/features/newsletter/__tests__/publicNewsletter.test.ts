import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildPublicNewsletterConfirmHtml } from "@/lib/email/sendPublicNewsletterConfirmEmail";
import { AUDIENCES, emptyIssue, issueFromRow, issueToPayload, normalizeIssue } from "@/features/newsletter/newsletterModel";
import { PUBLIC_NEWSLETTER_COPY } from "@/features/newsletter/publicNewsletterCopy";
import { isValidNewsletterToken, newsletterToken } from "@/features/newsletter/newsletterToken";

const root = new URL("../../../../", import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), "utf8");
const sql = read("../supabase/migrations/20270507120000_newsletter_public.sql");

test("the audience of an issue: members unless it says otherwise", () => {
  assert.deepEqual([...AUDIENCES], ["members", "public", "all"]);
  assert.equal(emptyIssue().audience, "members");
  assert.equal(normalizeIssue({ audience: "all" }).audience, "all");
  assert.equal(normalizeIssue({ audience: "everyone" }).audience, "members");
  assert.equal(issueFromRow({ audience: "public" }).audience, "public");
  assert.equal(issueToPayload({ ...emptyIssue(), audience: "public" }).audience, "public");
});

test("the confirm mail: one button, the confirm link, the language, no tracking pixel", () => {
  const html = buildPublicNewsletterConfirmHtml({ confirmUrl: "https://app.test/newsletter/bestaetigen/extern?i=1&t=2&l=en", language: "en" });
  assert.match(html, /<html lang="en">/);
  assert.match(html, /i=1&amp;t=2&amp;l=en/);
  assert.equal((html.match(/<a href=/g) ?? []).length, 2, "the button and the privacy link");
  assert.doesNotMatch(html, /width="1" height="1"|pixel|track/i);
  assert.match(buildPublicNewsletterConfirmHtml({ confirmUrl: "https://x.test/a", language: "de" }), /Ja, schickt mir den Newsletter/);
});

test("copy exists in both languages with the same keys", () => {
  const keys = (o: Record<string, unknown>, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
  assert.deepEqual(keys(PUBLIC_NEWSLETTER_COPY.de).sort(), keys(PUBLIC_NEWSLETTER_COPY.en).sort());
});

test("tokens: a confirm link cannot unsubscribe and the other way round", () => {
  const confirm = newsletterToken("sub-1", "confirm", "secret");
  assert.ok(isValidNewsletterToken("sub-1", "confirm", confirm, "secret"));
  assert.equal(isValidNewsletterToken("sub-1", "unsubscribe", confirm, "secret"), false);
  assert.equal(isValidNewsletterToken("sub-2", "confirm", confirm, "secret"), false);
});

test("the list is separate from accounts: own table, closed to browsers, double opt-in, blocklist after unsubscribe", () => {
  assert.match(sql, /create table public\.newsletter_public_subscribers/);
  assert.doesNotMatch(sql.slice(0, sql.indexOf("create table public.newsletter_public_deliveries")), /user_id uuid/, "no link to an account in the list itself");
  assert.match(sql, /revoke all on public\.newsletter_public_subscribers from public, anon, authenticated/);
  assert.match(sql, /status in \('pending', 'confirmed', 'unsubscribed'\)/);
  assert.match(sql, /where id = p_id and status = 'pending'/, "only a pending signup can be confirmed");
  assert.match(sql, /status = 'pending' and requested_at < pg_catalog\.now\(\) - interval '14 days'/, "unconfirmed signups are deleted");
  assert.match(sql, />= 40 then/, "global request limit");
  const grants = sql.slice(sql.lastIndexOf("do $$"));
  assert.match(grants, /revoke all on function public\.%s from public, anon, authenticated/);
  assert.match(grants, /to service_role/);
});

test("sending: audience decides, nobody twice, an unsubscribed address gets nothing", () => {
  assert.match(sql, /v_audience not in \('public', 'all'\)/);
  assert.match(sql, /v_audience not in \('members', 'all'\)/);
  assert.match(sql, /newsletter_public_deliveries d where d\.issue_id = p_issue_id and d\.subscriber_id = s\.id/);
  assert.match(sql, /where s\.status = 'confirmed' and s\.language = v_lang/);
  assert.match(sql, /pg_catalog\.lower\(u\.email\) = s\.email/, "for 'all' a member address gets it as a member");
  const send = read("src/features/newsletter/newsletterSend.ts");
  assert.match(send, /claim_newsletter_public_batch/);
  assert.match(send, /newsletter_public_deliveries"\)\.delete\(\)/, "a failed package is released for the list as well");
});

test("the signup action only returns to the blog, checks the hidden field and never reveals whether an address exists", () => {
  const action = read("src/features/newsletter/publicNewsletterActions.ts");
  assert.match(action, /\^\\\/blog/);
  assert.match(action, /website/);
  const pub = read("src/features/newsletter/publicNewsletter.ts");
  assert.match(pub, /"already" und "wait" sehen von aussen wie "sent" aus/);
  assert.doesNotMatch(pub, /return\s+"already"/);
});

test("confirm and unsubscribe pages: the visit changes nothing, only the button does; both outside the product chrome", () => {
  for (const path of ["src/app/newsletter/bestaetigen/extern/page.tsx", "src/app/abmelden/newsletter/extern/page.tsx"]) {
    const page = read(path);
    assert.match(page, /isValidNewsletterToken/);
    assert.match(page, /<form action=/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
  }
  assert.match(read("src/app/newsletter/bestaetigen/extern/page.tsx"), /href="\/me\/profile"/, "a gentle pointer to the app after confirming");
});

test("the blog stays free of accounts: the signup lives in features/newsletter, nothing from the blog reads members", () => {
  const files = (dir: string): string[] => readdirSync(join(root, dir)).flatMap((n) => { const rel = `${dir}/${n}`; return statSync(join(root, rel)).isDirectory() ? files(rel) : [rel]; });
  for (const f of files("src/features/blog").filter((x) => /\.tsx?$/.test(x) && !x.includes("__tests__"))) assert.doesNotMatch(read(f), /getRequestUser|person_core|auth\.admin/, f);
});
