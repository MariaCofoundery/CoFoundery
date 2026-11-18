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
  assert.match(page, /Stand: 18\. November 2026/);
});

test("what the text promises is what the code does: 14 days, a daily purge, closed table, no account link", () => {
  assert.match(purge, /status = 'pending' and requested_at < /);
  assert.match(retention, /NEWSLETTER_PENDING_DAYS = 14/);
  assert.match(retention, /purge_stale_newsletter_public/);
  assert.match(purge, /grant execute on function public\.purge_stale_newsletter_public\(integer\) to service_role/);
  assert.match(migration, /revoke all on public\.newsletter_public_subscribers from public, anon, authenticated/);
  assert.doesNotMatch(migration.slice(0, migration.indexOf("create table public.newsletter_public_deliveries")), /\bip\b|user_agent|references auth\.users/i, "no IP, no browser data, no account link in the list");
});

test("the header comment lists what was added and what must be reviewed", () => {
  assert.match(page, /purge_stale_newsletter_public/);
  assert.match(page, /Abschnitte 6c \(Werte\), 11b \(Danke und Herz\)/);
  assert.match(page, /LEGAL REVIEW REQUIRED:[\s\S]*Öffnungs- und Klickverfolgung/);
});

test("the privacy text also covers values, thanks and the reminders - and what it says matches the code", () => {
  assert.match(page, /<BulletSection number="6c" title="Werte">/);
  assert.match(page, /<BulletSection number="11b" title="Danke und Herz in CONNECT">/);
  assert.match(page, /<Sub>Erinnerungen<\/Sub>/);
  const read = (path: string) => readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");
  const values = read("supabase/migrations/20270413120000_person_values.sql");
  assert.match(values, /connect_show boolean not null default false/, "values are shown nowhere by default");
  assert.match(values, /Advisoren und Organisationen sehen Werte nie/);
  assert.match(page, /Advisors und Organisationen sehen Werte nie/);
  assert.match(page, /bis 200 Zeichen/);
  assert.match(values, /char_length\(meaning\) <= 200/);
  assert.match(page, /bis 300 Zeichen/);
  assert.match(values, /char_length\(violated_note\) <= 300/);
  const thanks = read("supabase/migrations/20270423120000_connect_thanks.sql");
  assert.match(thanks, /show_on_profile boolean not null default false/);
  assert.match(thanks, /char_length\(body\) between 1 and 280/);
  assert.match(page, /bis 280 Zeichen/);
  assert.match(read("supabase/migrations/20270426120000_connect_thanks_direct.sql"), /einmal je Person alle 90 Tage, hoechstens fuenf/);
  assert.match(page, /einmal in 90 Tagen, höchstens fünf direkte Danksagungen/);
  assert.match(read("supabase/migrations/20270421120000_onboarding_reminders.sql"), /nach einem und nach drei Tagen je EINE/);
  assert.match(page, /Höchstens zwei Mails, nach etwa einem und nach etwa drei Tagen/);
  assert.match(read("supabase/migrations/20270119120000_team_program_updates.sql"), /Zwei Tage vorher bekommt jedes Teammitglied EINEN Hinweis/);
  assert.match(retention, /REMINDER_STAMP_DAYS = 365/);
  assert.match(page, /Erinnerungs-Vermerke \(Check-in\) löschen wir nach 365 Tagen/);
});
