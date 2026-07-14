import assert from "node:assert/strict";
import test from "node:test";
import { getMarketingContent } from "@/data/marketing";
import { findEnglishReportCopyQualityIssues } from "@/features/reporting/content/reportCopyGuards";

const NON_VISIBLE_CONTENT_KEYS = new Set([
  "href",
  "icon",
  "left",
  "leftWidth",
  "right",
  "rightWidth",
  "tone",
  "visual",
  "width",
]);

function collectVisibleStringValues(value: unknown, key = ""): string[] {
  if (typeof value === "string") {
    if (NON_VISIBLE_CONTENT_KEYS.has(key)) {
      return [];
    }

    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectVisibleStringValues(item, key));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([entryKey, entryValue]) =>
      collectVisibleStringValues(entryValue, entryKey)
    );
  }

  return [];
}

function collectStructure(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(collectStructure);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([entryKey, entryValue]) => [entryKey, collectStructure(entryValue)])
    );
  }

  return typeof value;
}

test("getMarketingContent returns German marketing copy by default", () => {
  const content = getMarketingContent();

  assert.equal(content.topNav.product, "Produkt");
  assert.equal(content.hero.primaryCta, "Founder-Kompatibilität prüfen");
  assert.equal(content.home.faqTitle, "Häufige Fragen");
});

test("getMarketingContent returns English marketing copy for locale en", () => {
  const content = getMarketingContent("en");

  assert.equal(content.topNav.product, "Product");
  assert.equal(content.hero.primaryCta, "Check founder compatibility");
  assert.equal(content.home.faqTitle, "Common questions");
});

test("getMarketingContent normalizes explicit German locales", () => {
  for (const locale of ["de", "de-DE"]) {
    const content = getMarketingContent(locale);

    assert.equal(content.topNav.product, "Produkt");
    assert.equal(content.hero.primaryCta, "Founder-Kompatibilität prüfen");
  }
});

test("getMarketingContent normalizes regional English locales", () => {
  const content = getMarketingContent("en-US");

  assert.equal(content.topNav.product, "Product");
  assert.equal(content.hero.primaryCta, "Check founder compatibility");
});

test("getMarketingContent falls back to German for unsupported locales", () => {
  const content = getMarketingContent("fr");

  assert.equal(content.topNav.product, "Produkt");
  assert.equal(content.hero.primaryCta, "Founder-Kompatibilität prüfen");
});

test("English marketing copy avoids sensitive report-copy language", () => {
  const englishText = collectVisibleStringValues(getMarketingContent("en")).join("\n");

  assert.deepEqual(findEnglishReportCopyQualityIssues(englishText), []);
});

test("German and English marketing content have matching structures", () => {
  assert.deepEqual(
    collectStructure(getMarketingContent("de")),
    collectStructure(getMarketingContent("en"))
  );
});

test("English marketing copy keeps the central product guardrails", () => {
  const content = getMarketingContent("en");
  const englishText = collectVisibleStringValues(content).join("\n");
  const centralProductCopy = [
    content.hero.subline,
    ...content.home.approachParagraphs,
    ...content.home.dimensionsParagraphs,
    ...content.howItWorks.panels.flatMap((panel) => [panel.text, panel.label]),
    content.howItWorks.sharedRule,
  ].join("\n");

  assert.match(centralProductCopy, /collaboration|work together|working assumptions/i);
  assert.match(centralProductCopy, /conversation|discuss|address .* early/i);
  assert.match(centralProductCopy, /\bagreements?\b/i);
  assert.doesNotMatch(
    englishText,
    /\b(?:ideal|good|right|suitable|qualified)\s+(?:fit|founder|candidate|co-founder)\b/i
  );
  assert.doesNotMatch(
    englishText,
    /\b(?:hiring|human resources|employee|candidate)\s+(?:assessment|evaluation|rating|fit)\b/i
  );
  assert.doesNotMatch(
    englishText,
    /\b(?:rate|rank|score|evaluate)s?\s+(?:people|persons|founders|candidates)\b/i
  );
  assert.doesNotMatch(englishText, /\b\d+(?:[.,]\d+)?\s*%/);
  assert.doesNotMatch(englishText, /\b(?:compatibility|fit|match)\s+score\b/i);
});
