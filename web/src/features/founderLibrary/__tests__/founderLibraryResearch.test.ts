import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { founderLibraryViewFrom } from "@/features/founderLibrary/founderLibraryViewKey";
import { FOUNDER_LIBRARY_RESEARCH_SOURCES } from "@/features/founderLibrary/founderLibraryResearchRegistry";

const json = (locale: string) => JSON.parse(readFileSync(`messages/${locale}/founderLibrary.json`, "utf8")) as {
  views: Record<string, string>;
  research: { entries: Record<string, { summary: string; limits: string }> } & Record<string, unknown>;
};

test("Studien: jede Quelle hat DOI, Link und in beiden Sprachen Einordnung und Grenzen", () => {
  for (const source of FOUNDER_LIBRARY_RESEARCH_SOURCES) {
    assert.match(source.doi, /^10\./);
    assert.match(source.url, /^https:\/\//);
    for (const locale of ["de", "en"]) {
      const entry = json(locale).research.entries[source.id];
      assert.ok(entry?.summary && entry?.limits, `${locale}: ${source.id} ohne Einordnung oder Grenzen`);
    }
  }
  assert.deepEqual(Object.keys(json("de").research), Object.keys(json("en").research));
});

test("Studien: die Seite behauptet nicht mehr als die Quelle traegt", () => {
  for (const locale of ["de", "en"]) {
    const text = JSON.stringify(json(locale).research);
    // Keine Stichprobenzahlen und Mittelwerte, solange niemand sie im Volltext gegengelesen hat.
    assert.doesNotMatch(text, /\b(116|119|136)\b|3,98|3\.98/, `${locale}: ungepruefte Zahl`);
    assert.doesNotMatch(text, /statistisch|statistically/i, `${locale}: behauptet Statistik`);
  }
});

test("Studien: ?view= kennt drei Ansichten, alles Unbekannte ist das Glossar", () => {
  assert.equal(founderLibraryViewFrom("research"), "research");
  assert.equal(founderLibraryViewFrom("updates"), "updates");
  assert.equal(founderLibraryViewFrom("x"), "glossary");
  assert.equal(founderLibraryViewFrom(undefined), "glossary");
  assert.ok(json("de").views.research && json("en").views.research);
});
