import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync(new URL("../../../app/datenschutz/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../../../supabase/migrations/20270507120000_newsletter_public.sql", import.meta.url), "utf8");
const purge = readFileSync(new URL("../../../../../supabase/migrations/20270509120000_newsletter_public_purge.sql", import.meta.url), "utf8");
const retention = readFileSync(new URL("../../privacy/retentionCleanup.ts", import.meta.url), "utf8");

test("the privacy text covers the newsletter (with and without account) and the blog", () => {
  assert.match(page, /<BulletSection number="15b" title="Newsletter">/);
  assert.match(page, /<BulletSection number="15c" title="Der öffentliche Blog">/);
  for (const phrase of ["Double-Opt-in", "Sperre", "Art. 6 Abs. 1 lit. a DSGVO", "§ 7 Abs. 2 Nr. 3", "14 Tagen", "kein Cookie", "darf in Mails erscheinen", "Resend"]) assert.ok(page.includes(phrase), phrase);
  assert.match(page, /Stand: 17\. November 2026/);
});

test("what the text promises is what the code does: 14 days, a daily purge, closed table, no account link", () => {
  assert.match(purge, /status = 'pending' and requested_at < /);
  assert.match(retention, /NEWSLETTER_PENDING_DAYS = 14/);
  assert.match(retention, /purge_stale_newsletter_public/);
  assert.match(purge, /grant execute on function public\.purge_stale_newsletter_public\(integer\) to service_role/);
  assert.match(migration, /revoke all on public\.newsletter_public_subscribers from public, anon, authenticated/);
  assert.doesNotMatch(migration.slice(0, migration.indexOf("create table public.newsletter_public_deliveries")), /\bip\b|user_agent|references auth\.users/i, "no IP, no browser data, no account link in the list");
});

test("the retention list and the open points are written down in the file's header comment", () => {
  assert.match(page, /purge_stale_newsletter_public/);
  assert.match(page, /Erinnerungs-Mails, Danke-Herz, Wertemodul/);
  assert.match(page, /LEGAL REVIEW REQUIRED:[\s\S]*Öffnungs- und Klickverfolgung/);
});
