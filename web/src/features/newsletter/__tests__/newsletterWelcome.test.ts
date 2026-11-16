import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getNewsletterWelcomeCopy } from "@/features/email/newsletterWelcomeCopy";
import { buildNewsletterWelcomeHtml, buildNewsletterWelcomeText, type WelcomeParams } from "@/lib/email/sendNewsletterWelcomeEmail";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
const params: WelcomeParams = {
  recipientEmail: "a@example.com",
  locale: "de",
  photoUrl: "https://app.test/brand/maria.jpg",
  miaUrl: "https://app.test/brand/mia.png",
  logoUrl: "https://app.test/brand/made2found-symbol.png",
  ctaUrl: "https://app.test/me/profile",
  unsubscribeUrl: "https://app.test/abmelden/newsletter?u=1&t=2",
  privacyUrl: "https://app.test/datenschutz",
  imprintUrl: "https://app.test/impressum",
};

test("welcome mail: German version carries Maria's story, photo, Mia, one button and the unsubscribe link", () => {
  const html = buildNewsletterWelcomeHtml(params);
  assert.match(html, /Ich bin schon einmal|zweite Geschäftsführerin/);
  assert.match(html, /src="https:\/\/app\.test\/brand\/maria\.jpg"/);
  assert.match(html, /src="https:\/\/app\.test\/brand\/mia\.png"/);
  assert.match(html, /made2found-symbol\.png/);
  assert.equal((html.match(/href="https:\/\/app\.test\/me\/profile"/g) ?? []).length, 1);
  assert.match(html, /abmelden\/newsletter\?u=1&amp;t=2/);
  assert.doesNotMatch(html, /Gehalt/);
});

test("welcome mail: no scores, no tracking pixel", () => {
  const html = buildNewsletterWelcomeHtml(params);
  assert.doesNotMatch(html, /<img[^>]+width="1"[^>]+height="1"/i);
  assert.doesNotMatch(html, /Prozent|Punkte:|Score/i);
  assert.equal((html.match(/<img /g) ?? []).length, 3);
});

test("welcome mail: English version has the same shape and no German characters", () => {
  const de = getNewsletterWelcomeCopy("de");
  const en = getNewsletterWelcomeCopy("en");
  assert.equal(en.how.length, de.how.length);
  assert.equal(en.learned.length, de.learned.length);
  assert.equal(en.areas.length, de.areas.length);
  const html = buildNewsletterWelcomeHtml({ ...params, locale: "en" });
  assert.match(html, /<html lang="en">/);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ""), /[äöüßÄÖÜ]/);
  assert.match(buildNewsletterWelcomeText({ ...params, locale: "en" }), /Unsubscribe:/);
});

test("welcome mail: sent once after confirming, claim before send, release on failure", () => {
  const sql = read("../supabase/migrations/20270502120000_newsletter_welcome.sql");
  assert.match(sql, /welcome_sent_at is null/);
  assert.match(sql, /grant execute on function public\.claim_newsletter_welcome\(uuid\) to service_role/);
  assert.match(sql, /where confirmed_at is not null/); // existing subscribers do not get it automatically
  const helper = read("src/features/newsletter/newsletterWelcome.ts");
  assert.ok(helper.indexOf("claim_newsletter_welcome") < helper.indexOf("sendNewsletterWelcomeEmail("));
  assert.match(helper, /release_newsletter_welcome/);
  const page = read("src/app/newsletter/bestaetigen/page.tsx");
  assert.match(page, /confirmed === true\) await sendWelcomeAfterConfirm/);
});
