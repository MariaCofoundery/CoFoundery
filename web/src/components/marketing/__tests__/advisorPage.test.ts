import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getAdvisorPageContent } from "@/data/advisorPage";
import { FREE_NOW, getHomepageContent } from "@/data/homepage";

const page = readFileSync("src/app/(marketing)/fuer-advisor/page.tsx", "utf8");
const homePage = readFileSync("src/app/(marketing)/page.tsx", "utf8");
const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
const css = readFileSync("src/components/marketing/landing.module.css", "utf8");

type Locale = "de" | "en";
const LOCALES: Locale[] = ["de", "en"];
const text = (locale: Locale) => JSON.stringify(getAdvisorPageContent(locale));
/** Alles ausser dem einen Preissatz, der "kostenlos" sagen darf. */
const withoutPrice = (locale: Locale) => text(locale).split(JSON.stringify(FREE_NOW[locale]).slice(1, -1)).join("");

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]));
  return typeof value;
}

test("the advisor page carries the same structure in de and en", () => {
  assert.deepEqual(shape(getAdvisorPageContent("de")), shape(getAdvisorPageContent("en")));
});

test("the advisor page names no score or ranking, makes no promises, and says 'free' only in the one price sentence", () => {
  for (const locale of LOCALES) {
    assert.doesNotMatch(withoutPrice(locale), /kompatibel|compatib|score|punkte|prozent|percent|ranking|rangliste|rangfolge|passt zu|ampel/i, locale);
    assert.doesNotMatch(withoutPrice(locale), /kostenlos|free of charge|gratis|\d+\s*%|garantiert|guarantee|bleibt kostenlos|always free|preis|price list/i, locale);
    assert.ok(text(locale).includes(JSON.stringify(FREE_NOW[locale]).slice(1, -1)), `${locale}: the price sentence is on the page`);
  }
});

test("what Maria decided on 24.11.2026 is on the page: going solo works, invitations go both ways, access by code", () => {
  const de = getAdvisorPageContent("de").faq.items;
  assert.match(de[0].a, /allein/);
  assert.match(de[1].a, /Beides/);
  assert.match(getAdvisorPageContent("de").faq.items[4].a, /Zugangscode/);
  const en = getAdvisorPageContent("en").faq.items;
  assert.match(en[0].a, /on your own/);
  assert.match(en[1].a, /Both/);
  assert.match(en[4].a, /access code/);
});

test("advisors only see what teams share: the page says so and keeps the shares separate", () => {
  for (const locale of LOCALES) {
    const shares = getAdvisorPageContent(locale).features.shares;
    assert.match(shares.text, locale === "de" ? /getrennte Freigaben/ : /separate shares/);
  }
});

test("every example is labelled as made up and the page invents no voices", () => {
  assert.match(getAdvisorPageContent("de").hero.example, /erfunden/);
  assert.match(getAdvisorPageContent("en").hero.example, /made-up/);
  assert.equal((page.match(/\{c\.hero\.example\}/g) ?? []).length >= 3, true);
  assert.doesNotMatch(page, /Was andere sagen|Platzhalter|testimonial/i);
});

test("every call to action leads into the sign-in or the beta access box", () => {
  assert.equal((page.match(/href="\/start"/g) ?? []).length >= 2, true);
  assert.match(page, /href="\/login"/);
  assert.match(page, /href="#zugang"/);
  assert.match(page, /id="zugang"/);
  assert.match(page, /getBetaAccessRequestHref\(\)/);
  assert.match(page, /<FloatingStart/);
});

test("programs get a conversation offer by mail instead of a price", () => {
  assert.match(page, /mailto:\$\{BETA_ACCESS_REQUEST_EMAIL\}\?subject=/);
  assert.match(getAdvisorPageContent("de").talk.title, /Programm/);
});

test("the page is public, in the sitemap and linked from the start page and its footer", () => {
  assert.match(sitemap, /"\/fuer-advisor"/);
  assert.match(homePage, /href="\/fuer-advisor"/);
  assert.equal(getHomepageContent("de").net.advisor.moreHref, "/fuer-advisor");
  assert.equal(getHomepageContent("en").net.advisor.moreHref, "/fuer-advisor");
  assert.match(page, /alternates: \{ canonical: "\/fuer-advisor" \}/);
});

test("the heading stays on two lines that never wrap, and the star art stands still with less motion", () => {
  assert.match(css, /\.advHero h1 \{[^}]*white-space: nowrap/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.land \* \{ animation: none !important/);
  assert.match(page, /<div className=\{land\.land\}>/);
});
