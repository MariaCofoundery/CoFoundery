import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  genericV01,
  normalizePlace,
  normalizeTerm,
  normalizeTerms,
  samePlace,
  sameTerm,
  textTokens,
} from "@/lib/matching/v01/normalization";
import { INDUSTRY_SYNONYMS, LOCATION_ALIASES, TOPIC_SYNONYMS } from "@/lib/matching/v01/dictionary";

/**
 * Parität mit der eingefrorenen Python-Normalisierung (N-DICTIONARY, v03).
 * Die Fixture enthält alle Freitextwerte des synthetischen Datensatzes plus Randfälle
 * und die Ausgabe des eingefrorenen Codes. Keine Labels.
 */
type TermOut = { key: string | null; toks: string[] | null };
type PlaceOut = { key: string | null; toks: string[] | null; wild: boolean } | null;
const fixture = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "fixtures", "parity-normalization-v01.json"), "utf8"),
) as {
  terms: { raw: string; kind: "industry" | "topic"; out: TermOut[] }[];
  places: { raw: string; out: PlaceOut }[];
  text_tokens: { raw: string; out: string[] }[];
  generic_v01: { raw: string; out: string }[];
  same_place: { a: string; b: string; out: boolean | null }[];
  same_term: { a: string; b: string; out: boolean }[];
};

test("Begriffe: Schlüssel und Token wie das eingefrorene N-DICTIONARY", () => {
  assert.ok(fixture.terms.length > 200);
  for (const c of fixture.terms) {
    const out = normalizeTerms([c.raw], c.kind).map((t) => ({ key: t.key, toks: [...t.toks] }));
    assert.deepEqual(out, c.out, `${c.kind}: ${JSON.stringify(c.raw)}`);
  }
});

test("Orte: Schlüssel, Token und Platzhalter wie das Original", () => {
  for (const c of fixture.places) {
    const p = normalizePlace(c.raw);
    assert.deepEqual(p === null ? null : { key: p.key, toks: p.toks === null ? null : [...p.toks], wild: p.wild }, c.out, c.raw);
  }
});

test("Ortsvergleich und Begriffsvergleich wie das Original", () => {
  for (const c of fixture.same_place) assert.equal(samePlace(normalizePlace(c.a), normalizePlace(c.b)), c.out, `${c.a} / ${c.b}`);
  for (const c of fixture.same_term) {
    const out = normalizeTerms([c.a], "topic").some((x) => normalizeTerms([c.b], "topic").some((y) => sameTerm(x, y)));
    assert.equal(out, c.out, `${c.a} / ${c.b}`);
  }
});

test("Text-Token und v01-Generik wie das Original", () => {
  for (const c of fixture.text_tokens) assert.deepEqual(textTokens(c.raw), c.out, c.raw);
  for (const c of fixture.generic_v01) assert.equal(genericV01(c.raw), c.out, c.raw);
});

test("Wörterbuch: Umfang wie in der Spec (15 Branchen, 25 Themen, 10 Metropolregionen)", () => {
  assert.equal(INDUSTRY_SYNONYMS.length, 15);
  assert.equal(TOPIC_SYNONYMS.length, 25);
  assert.equal(LOCATION_ALIASES.length, 10);
});

test("bekannte Gleichheiten, Ungleichheiten und Platzhalter (Spec §12)", () => {
  const t = (x: string, y: string, kind: "industry" | "topic" = "industry") => sameTerm(normalizeTerm(x, kind), normalizeTerm(y, kind));
  assert.equal(t("HealthTech", "Healthcare"), true);
  assert.equal(t("MDR", "MDR Klasse IIb", "topic"), true);
  assert.equal(t("Kundenakquise", "Neukundengewinnung", "topic"), false, "C5: kein Synonym ohne Wörterbuch");
  assert.equal(t("Marketing", "Marketplace", "topic"), true, "bekannter Fehltreffer (Spec §12): Stamm 'market'");
  assert.equal(t("Marktplatz", "Two-sided Marketplace"), true, "beide im Wörterbuch: gleicher Schlüssel");
  assert.equal(t("Marketplace", "Media"), false, "beide im Wörterbuch: das Wörterbuch entscheidet");
  assert.equal(t("Vertrieb", "Sales", "topic"), true, "Wörterbuch: DE/EN");
  assert.equal(t("München", "Munich"), false, "Übersetzung ohne Wörterbuch-Eintrag als Branche: kein Treffer");
  assert.equal(samePlace(normalizePlace("Stuttgart, BW"), normalizePlace("Region Stuttgart")), true);
  assert.equal(samePlace(normalizePlace("Leipzig"), normalizePlace("DACH")), false, "Platzhalter erfüllt keinen konkreten Ort");
  assert.equal(samePlace(normalizePlace("DACH"), normalizePlace("bundesweit")), null);
  assert.equal(normalizePlace(""), null);
  assert.equal(normalizePlace("   "), null);
});

test("RAW VALUE bleibt erhalten", () => {
  const term = normalizeTerm("  HealthTech ", "industry");
  assert.equal(term.raw, "  HealthTech ");
  assert.equal(term.key, "ind:health");
  assert.equal(normalizePlace("Großraum Berlin")?.raw, "Großraum Berlin");
});
