import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isProductChromePath } from "@/features/navigation/productChromePath";
import { resumablePath } from "@/features/navigation/lastPlace";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const VIEW = "src/features/align/AlignOverview.tsx";
const DATA = "src/features/align/alignOverviewData.ts";
const PAGE = "src/app/(product)/align/page.tsx";

const keys = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`))
    : [prefix];

test("/align traegt die Produktleiste und ist ein Ort, zu dem man zurueckkehrt", () => {
  assert.equal(isProductChromePath("/align"), true);
  assert.equal(resumablePath("/align"), "/align");
});

test("Die Uebersicht bewertet nicht: keine Punkte, keine Prozent, keine Rangfolge", () => {
  const view = code(VIEW);
  assert.doesNotMatch(view, /score|percent|prozent|ranking|rank\b|compatib|passung/i);
  for (const locale of ["de", "en"]) {
    const text = read(`messages/${locale}/align.json`);
    assert.doesNotMatch(text, /percent|prozent|\d\s*%|kompatibel|compatible|match/i, locale);
  }
});

test("Die Uebersicht legt nichts an und schreibt nichts", () => {
  for (const file of [DATA, PAGE, VIEW]) {
    const text = code(file);
    assert.doesNotMatch(text, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|resolveVenture|rpc\("(create|set|save|accept)/, file);
  }
});

test("Kein Knopf ins Leere: das Gesamtbild erscheint nur mit Adresse", () => {
  const view = code(VIEW);
  assert.match(view, /gesamtbildHref \? <GesamtbildBand/);
  assert.doesNotMatch(code(PAGE), /gesamtbildHref/);
});

test("Find bekommt nichts aus Align: freie Felder fuehren nur zu einer vorbefuellten Suche", () => {
  const view = code(VIEW);
  assert.match(view, /\/discovery\/suche\?familie=/);
  // Nur die Familie steht in der Adresse - keine Namen, keine Antworten.
  assert.doesNotMatch(view, /discovery[^"`]*\?[^"`]*(name|answer|strength)/i);
  assert.match(read("messages/de/align.json"), /Find bekommt nichts aus Align/);
});

test("Beide Sprachen haben dieselben Texte, und Englisch bleibt ohne deutsche Zeichen", () => {
  const de = JSON.parse(read("messages/de/align.json"));
  const en = JSON.parse(read("messages/en/align.json"));
  assert.deepEqual(keys(de).sort(), keys(en).sort());
  assert.doesNotMatch(read("messages/en/align.json"), /[äöüÄÖÜß]/);
});

test("Bewegung gibt es nur mit CSS - und bei 'weniger Bewegung' steht alles still", () => {
  const css = read("src/features/align/align.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
  for (const name of ["align-twinkle", "align-glow", "align-fade-up", "align-rise", "align-ring", "align-page"]) {
    assert.match(css.slice(css.indexOf("prefers-reduced-motion")), new RegExp(`\\.${name}`), name);
  }
  assert.doesNotMatch(code(VIEW), /"use client"/);
});
