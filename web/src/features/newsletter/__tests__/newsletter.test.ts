import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isValidNewsletterToken, newsletterToken } from "@/features/newsletter/newsletterToken";
import { getNewsletterConfirmCopy } from "@/features/email/newsletterConfirmCopy";
import { buildNewsletterConfirmHtml } from "@/lib/email/sendNewsletterConfirmEmail";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

test("the link signature is bound to person and purpose", () => {
  const confirm = newsletterToken("u1", "confirm", "s3cret");
  assert.equal(isValidNewsletterToken("u1", "confirm", confirm, "s3cret"), true);
  assert.equal(isValidNewsletterToken("u1", "unsubscribe", confirm, "s3cret"), false, "a confirm link cannot unsubscribe");
  assert.equal(isValidNewsletterToken("u2", "confirm", confirm, "s3cret"), false, "not for another person");
  assert.equal(isValidNewsletterToken("u1", "confirm", confirm, "other"), false);
  assert.equal(isValidNewsletterToken("u1", "confirm", "", "s3cret"), false);
  assert.equal(isValidNewsletterToken("u1", "confirm", "zz", "s3cret"), false);
});

test("the confirmation mail asks plainly, names the sender and has no tracking", () => {
  for (const locale of ["de", "en"] as const) {
    const copy = getNewsletterConfirmCopy(locale, "Mara");
    assert.match(copy.headline, /Mara/);
    assert.match(copy.ctaHint, /ignor/i);
    const html = buildNewsletterConfirmHtml({ recipientEmail: "a@example.com", name: "Mara", confirmUrl: "https://x.test/newsletter/bestaetigen?u=1&t=2", locale });
    assert.match(html, /href="https:\/\/x\.test\/newsletter\/bestaetigen\?u=1&amp;t=2"/);
    assert.doesNotMatch(html, /pixel|tracking|\.gif/i);
  }
  assert.doesNotMatch(JSON.stringify(getNewsletterConfirmCopy("en", null)), /[äöüÄÖÜß]/);
});

test("consent is an explicit choice: no pre-ticked box, confirmation through the mail, unsubscribe by link", () => {
  const ask = read("src/features/newsletter/NewsletterAsk.tsx");
  assert.doesNotMatch(ask, /type="checkbox"|defaultChecked/);
  const sql = read("../supabase/migrations/20270427120000_newsletter_consent.sql");
  assert.match(sql, /status in \('pending', 'confirmed', 'unsubscribed'\)/);
  assert.match(sql, /grant execute on function public\.confirm_newsletter\(uuid\) to service_role/);
  assert.match(sql, /revoke all on function public\.confirm_newsletter\(uuid\) from public, anon, authenticated/);
  const confirmPage = read("src/app/newsletter/bestaetigen/page.tsx");
  const unsubPage = read("src/app/abmelden/newsletter/page.tsx");
  for (const page of [confirmPage, unsubPage]) {
    assert.match(page, /isValidNewsletterToken/);
    assert.match(page, /<button/, "the click, not the page load, changes the state");
  }
  assert.match(confirmPage, /"confirm"[\s\S]*confirm_newsletter/);
  assert.match(unsubPage, /"unsubscribe"[\s\S]*unsubscribe_newsletter/);
});

test("the question appears in settings, on the dashboard and after 'no time' - and only dashboard hides when confirmed", () => {
  assert.match(read("src/app/(product)/account/page.tsx"), /source="settings"/);
  assert.match(read("src/features/dashboard/DashboardAside.tsx"), /newsletter !== "confirmed" \? <NewsletterAsk/);
  assert.match(read("src/app/welcome/morgen/page.tsx"), /source="welcome"/);
});

import { ACCOUNT_EXPORT_PAIR_TABLES, ACCOUNT_EXPORT_TABLES } from "@/features/account/accountExport";

test("the data export contains the newsletter consent, reminders, mail opt-ins and both sides of a thanks", () => {
  const tables = ACCOUNT_EXPORT_TABLES.map((entry) => entry.table) as string[];
  for (const name of ["newsletter_subscriptions", "onboarding_reminders", "notification_opt_ins"]) assert.ok(tables.includes(name), name);
  const pair = ACCOUNT_EXPORT_PAIR_TABLES.find((entry) => entry.table === "network_thanks");
  assert.deepEqual(pair?.columns, ["thanker_user_id", "helper_user_id"]);
});
