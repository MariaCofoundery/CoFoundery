import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { emptyIssue, issueFromRow, issueToPayload, normalizeIssue } from "@/features/newsletter/newsletterModel";
import { parseDraftJson } from "@/features/newsletter/newsletterDraftImport";
import { renderNewsletterHtml, renderNewsletterText } from "@/features/newsletter/newsletterRender";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
const ctx = { appOrigin: "https://app.test", imageUrl: (p: string) => `https://img.test/${p}`, unsubscribeUrl: "https://app.test/u", privacyUrl: "https://app.test/datenschutz", imprintUrl: "https://app.test/impressum" };
const base = { ...emptyIssue(), subject: "s", blocks: [{ id: "a", type: "text" as const, text: "x" }] };

test("an issue is German unless it says English; anything else falls back to German", () => {
  assert.equal(emptyIssue().language, "de");
  assert.equal(normalizeIssue({ language: "en" }).language, "en");
  assert.equal(normalizeIssue({ language: "fr" }).language, "de");
  assert.equal(normalizeIssue({}).language, "de");
  assert.equal(issueFromRow({ language: "en" }).language, "en");
  assert.equal(issueToPayload({ ...base, language: "en" }).language, "en");
});

test("an English issue gets English header, footer and lang attribute, a German one stays German", () => {
  const en = renderNewsletterHtml({ ...base, language: "en" }, ctx);
  assert.match(en, /<html lang="en">/);
  assert.match(en, /From the network/);
  assert.match(en, /Unsubscribe with one click/);
  assert.doesNotMatch(en, /Aus dem Netzwerk|Mit einem Klick abmelden|Impressum/);
  const de = renderNewsletterHtml({ ...base, language: "de" }, ctx);
  assert.match(de, /<html lang="de">/);
  assert.match(de, /Aus dem Netzwerk/);
  assert.match(renderNewsletterHtml({ ...base, language: "en", headingCase: "upper" }, ctx), /FROM THE NETWORK/);
  const text = renderNewsletterText({ ...base, language: "en" }, ctx);
  assert.match(text, /Unsubscribe: https:\/\/app\.test\/u/);
  assert.match(text, /Legal notice:/);
});

test("the draft import takes the language from the JSON", () => {
  const parsed = parseDraftJson(JSON.stringify({ language: "en", subject: "Hi", blocks: [{ id: "a", type: "text", text: "Hello" }] }));
  assert.ok(parsed.ok && parsed.issue.language === "en");
});

test("the migration filters claiming and finishing by the subscriber's language and keeps once-per-person", () => {
  const sql = read("../supabase/migrations/20270504120000_newsletter_language.sql");
  assert.match(sql, /add column language text not null default 'de'/);
  assert.match(sql, /check \(language in \('de', 'en'\)\)/);
  const claim = sql.slice(sql.indexOf("function public.claim_newsletter_batch"), sql.indexOf("function public.finish_newsletter_if_done"));
  assert.match(claim, /left join public\.person_core pc on pc\.user_id = s\.user_id/);
  assert.match(claim, /coalesce\(pc\.locale, 'de'\) = 'en' then 'en' else 'de' end\) = v_lang/);
  assert.match(claim, /s\.status = 'confirmed'/);
  assert.match(claim, /newsletter_deliveries d where d\.issue_id = p_issue_id and d\.user_id = s\.user_id/);
  const finish = sql.slice(sql.indexOf("function public.finish_newsletter_if_done"));
  assert.match(finish, /= v_lang/);
  assert.match(sql, /grant execute on function public\.claim_newsletter_batch\(uuid, integer\) to service_role/);
  assert.match(sql, /revoke all on function public\.claim_newsletter_batch\(uuid, integer\) from public, anon, authenticated/);
});

test("the editor offers the language and the recipient count follows it", () => {
  const editor = read("src/features/newsletter/NewsletterEditor.tsx");
  assert.match(editor, /LANGUAGES\.map/);
  assert.match(editor, /recipientsByLanguage\.members\[issue\.language\]/);
});
