import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FREE_NOW, getHomepageContent } from "@/data/homepage";
import { getNetworkPageContent } from "@/data/networkPage";

const page = readFileSync("src/app/(marketing)/netzwerk/page.tsx", "utf8");
const homePage = readFileSync("src/app/(marketing)/page.tsx", "utf8");
const advisorPage = readFileSync("src/app/(marketing)/fuer-advisor/page.tsx", "utf8");
const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
const art = readFileSync("src/components/marketing/NetworkArt.tsx", "utf8");
const css = readFileSync("src/components/marketing/landing.module.css", "utf8");

type Locale = "de" | "en";
const LOCALES: Locale[] = ["de", "en"];
const text = (locale: Locale) => JSON.stringify(getNetworkPageContent(locale));
const withoutPrice = (locale: Locale) => text(locale).split(JSON.stringify(FREE_NOW[locale]).slice(1, -1)).join("");

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]));
  return typeof value;
}

test("the network page carries the same structure in de and en", () => {
  assert.deepEqual(shape(getNetworkPageContent("de")), shape(getNetworkPageContent("en")));
});

test("the network page names no score or ranking, makes no promises, and says 'free' only in the one price sentence", () => {
  for (const locale of LOCALES) {
    assert.doesNotMatch(withoutPrice(locale), /kompatibel|compatib|score|punkte|prozent|percent|ranking|rangliste|rangfolge|passt zu|ampel/i, locale);
    assert.doesNotMatch(withoutPrice(locale), /kostenlos|free of charge|gratis|\d+\s*%|garantiert|guarantee|bleibt kostenlos|always free|preis|price list/i, locale);
    assert.ok(text(locale).includes(JSON.stringify(FREE_NOW[locale]).slice(1, -1)), `${locale}: the price sentence is on the page`);
  }
});

test("investment and succession are not promoted, and no public visibility is promised (the app says 'currently not available')", () => {
  for (const locale of LOCALES) {
    assert.doesNotMatch(text(locale), /invest|nachfolge|succession|anlage/i, `${locale}: no investment or succession`);
    // "Veröffentlichen" (publish) is fine; "öffentlich" (public) is not promised.
    assert.doesNotMatch(text(locale), /(?<!ver)öffentlich|publicly|public\b|suchmaschine|search engine/i, `${locale}: no public visibility promised`);
  }
  assert.match(getNetworkPageContent("de").faq.items[1].a, /Zurzeit sehen deine Einträge Mitglieder/);
});

test("what Maria decided on 24.11.2026: the headline, no founder needed, access by code", () => {
  const de = getNetworkPageContent("de");
  assert.deepEqual(de.hero.title, ["Du siehst ein Problem?", "Mach es sichtbar."]);
  assert.match(de.faq.items[0].a, /^Nein\./);
  assert.match(de.faq.items[4].a, /Zugangscode/);
  const en = getNetworkPageContent("en");
  assert.deepEqual(en.hero.title, ["See a problem?", "Make it visible."]);
  assert.match(en.faq.items[0].a, /^No\./);
  assert.match(en.faq.items[4].a, /access code/);
});

test("the notification promise matches the app: a short mail, at most when something new fits, no names", () => {
  const de = getNetworkPageContent("de").features.alert;
  assert.ok(de.bullets.some((b) => /höchstens wenn etwas Neues passt/.test(b)));
  assert.ok(de.bullets.some((b) => /keine Namen/.test(b)));
});

test("every example is labelled as an example and the page invents no voices", () => {
  assert.equal(getNetworkPageContent("de").hero.example, "Beispiel");
  assert.equal(getNetworkPageContent("en").hero.example, "Example");
  assert.match(getNetworkPageContent("de").features.post.windowLabel, /Beispiel/);
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

test("the page is in the sitemap and linked from the start page, the advisor page and every footer", () => {
  assert.match(sitemap, /"\/netzwerk"/);
  assert.equal(getHomepageContent("de").net.connect.moreHref, "/netzwerk");
  assert.equal(getHomepageContent("en").net.connect.moreHref, "/netzwerk");
  for (const source of [homePage, advisorPage, page]) assert.match(source, /<Link href="\/netzwerk">\{(c|home)\.network\}<\/Link>/);
  assert.match(page, /alternates: \{ canonical: "\/netzwerk" \}/);
});

test("the art is a still drawing that only moves with CSS and the heading never wraps", () => {
  assert.match(art, /aria-hidden="true"/);
  assert.doesNotMatch(art, /useEffect|requestAnimationFrame|"use client"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.land \* \{ animation: none !important/);
  assert.match(css, /\.advHero h1 \{[^}]*white-space: nowrap/);
  assert.match(css, /@keyframes netRipple/);
});
