import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getHomepageContent } from "@/data/homepage";

const page = readFileSync("src/app/(marketing)/page.tsx", "utf8");
const nav = readFileSync("src/components/marketing/HomepageNav.tsx", "utf8");

function allText(locale: string) {
  return JSON.stringify(getHomepageContent(locale));
}

test("de and en carry the same structure", () => {
  const shape = (value: unknown): unknown =>
    Array.isArray(value) ? value.map(shape) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)])) : typeof value;
  const keys = (locale: string) => JSON.stringify(shape(getHomepageContent(locale)), (_k, v) => v);
  // Optional example fields (a/b vs both) differ per row, so compare the top-level keys and list lengths.
  const de = getHomepageContent("de");
  const en = getHomepageContent("en");
  assert.deepEqual(Object.keys(de), Object.keys(en));
  for (const key of Object.keys(de) as (keyof typeof de)[]) {
    if (Array.isArray(de[key])) assert.equal((en[key] as unknown[]).length, (de[key] as unknown[]).length, String(key));
  }
  assert.ok(keys("de") && keys("en"));
});

test("the homepage names no score, ranking or compatibility verdict", () => {
  for (const locale of ["de", "en"]) {
    assert.doesNotMatch(allText(locale), /kompatibel|compatib|score|punkte|prozent|percent|ranking|rangliste|passt zu|traffic light|ampel/i, locale);
  }
});

test("the homepage makes no unproven promises or numbers", () => {
  for (const locale of ["de", "en"]) {
    assert.doesNotMatch(allText(locale), /kostenlos|free of charge|gratis|\d+\s*%|garantiert|guarantee/i, locale);
  }
});

test("the example result says its names are made up", () => {
  assert.match(getHomepageContent("de").exampleTag, /erfunden/);
  assert.match(getHomepageContent("en").exampleTag, /made-up/);
});

test("no invented voices: the testimonial block stays out until real quotes exist", () => {
  assert.doesNotMatch(page, /Was andere sagen|Platzhalter|testimonial/i);
});

test("every call to action leads into the sign-in, and the closed beta stays visible", () => {
  assert.equal((page.match(/href="\/start"/g) ?? []).length >= 3, true);
  assert.match(page, /href="\/login"/);
  assert.match(page, /getBetaAccessRequestHref\(\)/);
  assert.match(nav, /href="\/start"/);
  assert.match(nav, /href="\/login"/);
});

test("sections keep their order: hero, why, example, end result, areas, band", () => {
  const order = ["hero-title", "why-title", "example-title", "end-title", "areas-title", "band-title"].map((id) => page.indexOf(`"${id}"`));
  assert.ok(order.every((index) => index > 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});
