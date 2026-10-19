import assert from "node:assert/strict";
import test from "node:test";

import type { TradeoffsComparisonPerson } from "@/features/modules/tradeoffs/teamParse";
import { compareBeta, monthsUntil, pairGapsOf, parseAnswer } from "@/features/modules/ventureBeta/compare";
import { COMPARE_RULES, stanceOf } from "@/features/modules/ventureBeta/compareConfig";
import { BETA_CORE_ITEM_IDS } from "@/features/modules/ventureBeta/registry";

/**
 * Die Vergleichslogik der Beta: beschreibend, symmetrisch, ohne Wert.
 *
 * Alle Schwellen sind Beta-Hypothesen (`compareConfig.ts`). Getestet wird, dass die Engine sie so liest,
 * wie sie dort stehen - nicht, dass sie fachlich endgueltig sind.
 */
type Answers = Record<string, Record<string, unknown> | { missing: string }>;

const NOW = new Date("2026-10-19T12:00:00Z");

function person(id: string, name: string, answers: Answers, viewer = false): TradeoffsComparisonPerson {
  return {
    personId: id,
    name,
    isViewer: viewer,
    answers: Object.entries(answers).map(([item_key, value]) => ({
      item_key,
      value: "missing" in value ? null : (value as Record<string, unknown>),
      missing_reason: "missing" in value ? (value.missing as string) : null,
    })),
  };
}
const opt = (id: string, extra: Record<string, unknown> = {}) => ({ optionId: id, ...extra });
const set = (...ids: string[]) => ({ optionIds: ids });
const num = (n: number, unit = "Stunden pro Woche") => ({ number: n, unit });

function signalOf(itemId: string, a: Record<string, unknown> | { missing: string }, b: Record<string, unknown> | { missing: string }, extra: Answers[] = []) {
  const people = [person("a", "Anna", { [itemId]: a }), person("b", "Ben", { [itemId]: b }), ...extra.map((answers, i) => person(`x${i}`, `X${i}`, answers))];
  return compareBeta(people, { now: NOW }).find((r) => r.itemId === itemId)!.signal;
}

test("Z01: gleiche Wahl same; verschiedene Bilder needs_clarification; „kein klares Bild\" conversation_only", () => {
  assert.equal(signalOf("Z01", opt("Z01_o1"), opt("Z01_o1")), "same");
  assert.equal(signalOf("Z01", opt("Z01_o1"), opt("Z01_o3")), "needs_clarification");
  assert.equal(signalOf("Z01", opt("Z01_o1"), opt("Z01_o5")), "conversation_only");
  assert.equal(signalOf("Z01", opt("Z01_o5"), opt("Z01_o5")), "conversation_only");
});

test("ZB02/RO01/ZB03: set_overlap bzw. equality mit conversation_only - nie Komplementaritaet", () => {
  assert.equal(signalOf("Z02", set("Z02_o1", "Z02_o4"), set("Z02_o1", "Z02_o4")), "same");
  assert.equal(signalOf("Z02", set("Z02_o1", "Z02_o4"), set("Z02_o2", "Z02_o3")), "conversation_only");
  assert.equal(signalOf("O01", set("O01_o2"), set("O01_o2")), "same");
  assert.equal(signalOf("O01", set("O01_o2"), set("O01_o3")), "conversation_only");
  assert.equal(signalOf("Z03", opt("Z03_o1"), opt("Z03_o4")), "conversation_only");
  assert.ok(!JSON.stringify(COMPARE_RULES).includes("complementary"), "keine automatische Komplementaritaet");
});

test("ordinale Schwellen (BT01/BT02/GR02/TQ01/TQ02/EN01/KO01): kleiner Abstand neutral, grosser needs_clarification, Sonderantwort conversation_only", () => {
  for (const [id, scale] of [["F01", 3], ["F02", 3], ["M02", 5], ["T01", 4], ["T02", 4], ["N01", 4]] as const) {
    const o = (n: number) => opt(`${id}_o${n}`);
    assert.equal(signalOf(id, o(1), o(1)), "same", id);
    assert.equal(signalOf(id, o(1), o(2)), "neutral_difference", `${id} Abstand 1`);
    assert.equal(signalOf(id, o(1), o(3)), "needs_clarification", `${id} Abstand 2`);
    assert.equal(signalOf(id, o(1), o(scale)), scale >= 3 ? "needs_clarification" : "neutral_difference", `${id} gross`);
  }
  // Sonderantworten ausserhalb der Skala.
  assert.equal(signalOf("F01", opt("F01_o1"), opt("F01_o4")), "conversation_only");
  assert.equal(signalOf("F01", opt("F01_o5"), opt("F01_o3")), "conversation_only");
  assert.equal(signalOf("F02", opt("F02_o1"), opt("F02_o4")), "conversation_only");
  assert.equal(signalOf("N01", opt("N01_o1"), opt("N01_o5")), "conversation_only");
  // EN01: 1-2 Stufen neutral, ab 3 needs_clarification.
  const e = (n: number) => opt(`E01_o${n}`);
  assert.equal(signalOf("E01", e(2), e(3)), "neutral_difference");
  assert.equal(signalOf("E01", e(1), e(3)), "neutral_difference");
  assert.equal(signalOf("E01", e(1), e(4)), "needs_clarification");
  assert.equal(signalOf("E01", e(1), e(5)), "needs_clarification");
});

test("GR01: Zeitpunkt in Monaten - unter 3 kein Hinweis, 3-5 neutral, ab 6 needs_clarification", () => {
  assert.equal(monthsUntil("2027-01-19", NOW), 3);
  assert.equal(signalOf("M01", opt("M01_o1"), opt("M01_o1")), "same");
  assert.equal(signalOf("M01", opt("M01_o1"), opt("M01_o2", { date: "2026-12-01" })), "none", "2 Monate");
  assert.equal(signalOf("M01", opt("M01_o1"), opt("M01_o2", { date: "2027-01-19" })), "neutral_difference", "3 Monate");
  assert.equal(signalOf("M01", opt("M01_o1"), opt("M01_o2", { date: "2027-04-19" })), "needs_clarification", "6 Monate");
  assert.equal(signalOf("M01", opt("M01_o1"), opt("M01_o3")), "needs_clarification", "sofort gegen nicht in 12 Monaten");
  assert.equal(signalOf("M01", opt("M01_o2", { date: "2027-02-01" }), opt("M01_o3")), "needs_clarification");
  assert.equal(signalOf("M01", opt("M01_o2"), opt("M01_o1")), "conversation_only", "ohne Datum nicht vergleichbar");
});

test("GR03: Monate - Abstand < 2 kein Hinweis, 2-3 neutral, ab 4 oder 0 gegen > 0 needs_clarification", () => {
  const m = (n: number) => num(n, "Monate");
  assert.equal(signalOf("M03", m(6), m(6)), "same");
  assert.equal(signalOf("M03", m(6), m(7)), "none");
  assert.equal(signalOf("M03", m(6), m(8)), "neutral_difference");
  assert.equal(signalOf("M03", m(6), m(10)), "needs_clarification");
  assert.equal(signalOf("M03", m(0), m(1)), "needs_clarification");
  assert.equal(signalOf("M03", m(6), { missing: "not_decided" }), "conversation_only");
});

test("EN03: bis der Pretest etwas zeigt, ist JEDER Unterschied ein Gespraechsimpuls - kein Thema wird anders behandelt", () => {
  const topics = ["E03_o1", "E03_o2", "E03_o3", "E03_o4", "E03_o5", "E03_o6"];
  assert.equal(signalOf("E03", set("E03_o2"), set("E03_o2")), "same");
  for (const topic of topics) {
    assert.equal(signalOf("E03", set(topic), set("E03_o7")), "conversation_only", `${topic} gegen „Keine davon"`);
    assert.equal(signalOf("E03", set(topic), set(topics.find((t) => t !== topic)!)), "conversation_only", topic);
  }
  assert.equal(stanceOf(COMPARE_RULES.E03!), "conversation_only");
});

test("ZC03/ZC04/EN02: Sonderfaelle", () => {
  // ZC03: 1 (bereits) gegen 7 (nicht geplant) -> needs_clarification, sonst neutral.
  assert.equal(signalOf("C03", set("C03_o1"), set("C03_o7")), "needs_clarification");
  assert.equal(signalOf("C03", set("C03_o2", "C03_o3"), set("C03_o2")), "neutral_difference");
  assert.equal(signalOf("C03", set("C03_o2"), set("C03_o2")), "same");
  // ZC04: Ausstieg gegen eine andere Wahl -> needs_clarification; sonst neutral; „andere" conversation_only.
  assert.equal(signalOf("C04", opt("C04_o1"), opt("C04_o3")), "neutral_difference");
  assert.equal(signalOf("C04", opt("C04_o4"), opt("C04_o1")), "needs_clarification");
  assert.equal(signalOf("C04", opt("C04_o5"), opt("C04_o1")), "conversation_only");
  // EN02: verschiedene konkrete Regeln -> needs_clarification, „abhaengig von der Art" conversation_only.
  assert.equal(signalOf("E02", opt("E02_o1"), opt("E02_o4")), "needs_clarification");
  assert.equal(signalOf("E02", opt("E02_o1"), opt("E02_o5")), "conversation_only");
});

test("Auslassungsgrund: nichts Vergleichbares - ein Gespraechsimpuls, kein Urteil", () => {
  for (const id of BETA_CORE_ITEM_IDS.filter((x) => x !== "C02")) {
    assert.equal(signalOf(id, { missing: "not_decided" }, id === "C01" ? num(10) : opt(`${id}_o1`)), "conversation_only", id);
  }
});

test("ZC02: jede Erwartung gegen ZC01 JEDES anderen - kein Teamdurchschnitt (Maria, Alex, Ben)", () => {
  const maria = person("m", "Maria", { C01: num(15), C02: num(20) }, true);
  const alex = person("a", "Alex", { C01: num(25), C02: num(20) });
  const ben = person("b", "Ben", { C01: num(10), C02: num(8) });
  const gaps = pairGapsOf("C02", "C01", [maria, alex, ben]);
  // Maria (erwartet 20) gegen Ben (10): Luecke. Gegen Alex (25): keine. Alex (20) gegen Maria (15) und Ben (10): zwei Luecken.
  const asText = gaps.map((g) => `${g.expectedBy.name}>${g.offeredBy.name}`).sort();
  assert.deepEqual(asText, ["Alex>Ben", "Alex>Maria", "Maria>Ben"]);
  assert.ok(!asText.includes("Maria>Alex"), "ein hoeheres Angebot ist keine Luecke");
  assert.ok(!asText.some((g) => g.startsWith("Ben")), "Ben erwartet weniger, als alle bieten");
  const result = compareBeta([maria, alex, ben], { now: NOW }).find((r) => r.itemId === "C02")!;
  assert.equal(result.signal, "needs_clarification");
  assert.equal(result.pairGaps.length, 3);
  // Beispiel aus der Aufgabe: Maria 20h, Alex bietet 25h, Ben bietet 10h -> nur Maria <-> Ben.
  const onlyMaria = compareBeta([person("m", "Maria", { C01: num(30), C02: num(20) }, true), person("a", "Alex", { C01: num(25), C02: num(10) }), person("b", "Ben", { C01: num(10), C02: num(10) })], { now: NOW }).find((r) => r.itemId === "C02")!;
  assert.deepEqual(onlyMaria.pairGaps.map((g) => `${g.expectedBy.name}>${g.offeredBy.name}`), ["Maria>Ben"]);
  // Vier Founder, alle gedeckt: keine Luecke, kein Signal.
  const four = ["a", "b", "c", "d"].map((id) => person(id, id.toUpperCase(), { C01: num(20), C02: num(15) }));
  assert.equal(compareBeta(four, { now: NOW }).find((r) => r.itemId === "C02")!.signal, "none");
  // Ein Bereich (von-bis) zaehlt mit seinem oberen Ende.
  assert.deepEqual(pairGapsOf("C02", "C01", [person("a", "A", { C02: num(20) }), person("b", "B", { C01: { number: 10, to: 25, unit: "Stunden pro Woche" } })]), []);
});

test("symmetrisch und ohne Score: dieselben Ergebnisse fuer jede lesende Person; keine Zahl, die ein Urteil waere", () => {
  const people = (viewer: string) => [
    person("a", "Anna", { Z01: opt("Z01_o1"), T01: opt("T01_o1"), C01: num(10), C02: num(20) }, viewer === "a"),
    person("b", "Ben", { Z01: opt("Z01_o3"), T01: opt("T01_o3"), C01: num(5), C02: num(10) }, viewer === "b"),
  ];
  const strip = (viewer: string) =>
    compareBeta(people(viewer), { now: NOW }).map((r) => ({ ...r, cells: r.cells.map(({ isViewer: _drop, ...c }) => c), pairGaps: r.pairGaps.map((g) => ({ e: g.expectedBy.personId, o: g.offeredBy.personId, x: g.expected, y: g.offered })) }));
  assert.deepEqual(strip("a"), strip("b"));
  const keys = new Set(compareBeta(people("a"), { now: NOW }).flatMap((r) => Object.keys(r)));
  assert.deepEqual([...keys].sort(), ["cells", "itemId", "pairGaps", "signal"]);
  assert.ok(![...keys].some((k) => /score|rank|percent|index|total/i.test(k)));
});

test("parseAnswer: Antworten, Zahlen, Betraege und Auslassungen", () => {
  assert.deepEqual(parseAnswer({ value: { optionId: "Z01_o1" }, missing_reason: null }), { kind: "option", optionId: "Z01_o1" });
  assert.deepEqual(parseAnswer({ value: null, missing_reason: "not_decided" }), { kind: "missing", code: "not_decided" });
  assert.deepEqual(parseAnswer({ value: { number: 8, unit: "Monate" }, missing_reason: null }), { kind: "number", number: 8, unit: "Monate" });
  assert.deepEqual(parseAnswer({ value: { amount: 500, currency: "EUR" }, missing_reason: null }), { kind: "amount", amount: 500, currency: "EUR" });
  assert.deepEqual(parseAnswer(undefined), { kind: "none" });
});
