import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { berlinDateParts, capabilityGroups, sharedParts, talkingPoints, TALKING_POINTS_MAX } from "@/features/gesamtbild/gesamtbildModel";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const DATA = "src/features/gesamtbild/gesamtbildData.ts";
const VIEW = "src/features/gesamtbild/Gesamtbild.tsx";
const PAGE = "src/app/(product)/teams/[teamId]/gesamtbild/page.tsx";

const keys = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object" ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix];

test("Faehigkeiten: nur das, was die Person damit vorhat - nur `own` ist Verantwortung", () => {
  const groups = capabilityGroups([
    { areaId: "a", ownershipWish: "own" },
    { areaId: "b", ownershipWish: "grow_into" },
    { areaId: "c", ownershipWish: "contribute" },
    { areaId: "d", ownershipWish: "prefer_external" },
    { areaId: "e", ownershipWish: "unclear" },
    { areaId: "f", ownershipWish: null },
    { areaId: "a", ownershipWish: "own" },
  ]);
  assert.deepEqual(groups, { own: ["a"], grow: ["b"], handOff: ["c", "d"] });
});

test("Gespraechsthemen: erst Gegensaetze, dann Nuancen, dann freie Felder - hoechstens vier", () => {
  const points = talkingPoints(
    [
      { area: "EVI", kind: "similar", question: "q1" },
      { area: "EXP", kind: "nuance", question: "q2" },
      { area: "AMB", kind: "opposite", question: "q3" },
      { area: "ORG", kind: "insufficient", question: null },
    ],
    ["finance_funding", "legal_governance", "customer_market"],
  );
  assert.deepEqual(
    points.map((point) => (point.kind === "workstyle" ? `w:${point.area}` : `f:${point.familyId}`)),
    ["w:AMB", "w:EXP", "f:finance_funding", "f:legal_governance"],
  );
  assert.equal(points.length, TALKING_POINTS_MAX);
  assert.deepEqual(talkingPoints([], []), []);
});

test("Geteilt: Staerken und Richtung sind eine Freigabe - es gibt keinen Teil 'Richtung' allein", () => {
  assert.deepEqual(sharedParts({ workstyle: true, capability: false, strengths: true }), ["workstyle", "strengths"]);
  assert.deepEqual(sharedParts({ workstyle: false, capability: false, strengths: false }), []);
  const bundle = JSON.parse(read("messages/de/align.json")).report.du.parts;
  assert.deepEqual(Object.keys(bundle).sort(), ["capability", "strengths", "workstyle"]);
});

test("Datum: Berlin, nicht die Serverzeit", () => {
  // 23:30 UTC am 12.11. ist in Berlin schon der 13.11.
  assert.deepEqual(berlinDateParts(new Date("2026-11-12T23:30:00Z")), { year: 2026, month: 11, day: 13 });
});

test("Jeder Teil kommt ueber seinen eigenen Lesepfad - und nichts wird gespeichert", () => {
  const data = code(DATA);
  for (const reader of ["getProductTeam", "getTeamCapabilityForTeam", "getTeamStrengthsOverview", "getFounderSetup", "getProductWorkstyle", "loadBetaReadiness"]) {
    assert.match(data, new RegExp(reader), reader);
  }
  // Kein direkter Zugriff auf Tabellen anderer Personen: nur das Team mit seinem Namen wird gelesen.
  const tables = [...data.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]);
  assert.deepEqual(tables, ["founder_teams"]);
  for (const file of [DATA, PAGE, VIEW]) {
    assert.doesNotMatch(code(file), /\.insert\(|\.update\(|\.upsert\(|\.delete\(|cache\(|unstable_cache|revalidate/, file);
  }
});

test("Find und Connect bekommen nichts aus dem Gesamtbild", () => {
  const view = code(VIEW);
  assert.match(view, /\/discovery\/suche\?familie=/);
  assert.doesNotMatch(view, /discovery[^"`]*\?[^"`]*(name|answer|strength)/i);
  assert.doesNotMatch(code(DATA), /discovery|matching/i);
});

test("Keine Bewertung: keine Zahl, kein Typ, keine Rangfolge", () => {
  assert.doesNotMatch(code(VIEW), /score|percent|prozent|ranking|compatib|passung/i);
  assert.doesNotMatch(code(DATA), /score|percent|ranking|compatib/i);
  for (const locale of ["de", "en"]) {
    const text = JSON.stringify(JSON.parse(read(`messages/${locale}/align.json`)).report);
    assert.doesNotMatch(text, /percent|prozent|\d\s*%|kompatibel|compatible|match\b/i, locale);
  }
});

test("Die Paar-Labs stehen nicht im Gesamtbild - sie haben eigene Freigaben und gelten nur fuer Paare", () => {
  assert.doesNotMatch(code(DATA), /commitment|readMyMind|read-my-mind|founderInTheWild|collaboration/i);
  assert.match(read("messages/de/align.json"), /Sie gelten nur für zwei Personen/);
});

test("Jedes Kapitel sagt, wer es sieht - in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const report = JSON.parse(read(`messages/${locale}/align.json`)).report;
    assert.ok(report.who, locale);
    for (const chapter of ["ich", "du", "startup"]) assert.ok(report.chapters[chapter].who, `${locale}: ${chapter}`);
  }
  assert.match(code(VIEW), /ChapterHead/);
});

test("Das PDF ist die Seite selbst: Knoepfe und Bewegung fallen im Druck weg", () => {
  const css = read("src/features/align/align.css");
  const print = css.slice(css.lastIndexOf("@media print"));
  assert.match(print, /\.gb-screen-only \{ display: none/);
  assert.match(print, /\.gb-cover-deco \{ display: none/);
  assert.match(code(VIEW), /PrintButton/);
  assert.doesNotMatch(code(VIEW), /"use client"/);
});

test("Beide Sprachen haben dieselben Texte, Englisch ohne deutsche Zeichen", () => {
  const de = JSON.parse(read("messages/de/align.json")).report;
  const en = JSON.parse(read("messages/en/align.json")).report;
  assert.deepEqual(keys(de).sort(), keys(en).sort());
  assert.doesNotMatch(JSON.stringify(en), /[äöüÄÖÜß]/);
});

test("Die Seite liegt im Team und ist von Align aus erreichbar", () => {
  assert.ok(existsSync(PAGE));
  assert.match(code("src/features/align/AlignOverview.tsx"), /\/gesamtbild`/);
});
