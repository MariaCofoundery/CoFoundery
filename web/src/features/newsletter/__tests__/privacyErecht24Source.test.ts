import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/** Die Datenschutzerklärung besteht aus Teil A (Bausteine von eRecht24, angepasst) und Teil B (eigener Text). */
const page = readFileSync(new URL("../../../app/datenschutz/page.tsx", import.meta.url), "utf8");
const body = page.slice(page.indexOf("export default function DatenschutzPage"));

test("Teil A nennt die Herkunft und behält die Quellenzeile von eRecht24", () => {
  assert.match(body, /Teil A · Allgemeine Hinweise und Pflichtangaben/);
  assert.match(body, /Teil B · So funktioniert Made2Found/);
  assert.match(body, /href="https:\/\/www\.e-recht24\.de"/);
  assert.match(body, /Datenschutz-Generator von eRecht24/);
});

test("der Generator-Text sagt nichts, was bei Made2Found nicht stimmt", () => {
  assert.doesNotMatch(body, /Kontaktformular/);
  assert.doesNotMatch(body, /Telefax/);
  assert.doesNotMatch(body, /Öffnungszeitpunkt/);
  assert.doesNotMatch(body, /Newsletterdiensteanbieter/);
});

test("Impressum und Datenschutz nennen dieselbe Telefonnummer", () => {
  const impressum = readFileSync(new URL("../../../app/impressum/page.tsx", import.meta.url), "utf8");
  assert.match(impressum, /Telefon: \+49176 76 467099/);
  assert.match(body, /Telefon: \+49176 76 467099/);
});
