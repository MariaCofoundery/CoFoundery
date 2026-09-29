import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCardsV21,
  forbiddenPatterns,
  CARD_LIBRARY_V21,
} from "@/features/instruments/v21/conversationCardsV21";
import { compareV21 } from "@/features/instruments/v21/comparisonV21";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import { getItemV21, getItemsV21 } from "@/features/instruments/v21/registryV21";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

const opt = (itemId: string, index: number) => getItemV21(itemId)!.options[index].optionId;

const side = (answers: AlignmentAnswerV21[]) =>
  Object.fromEntries(answers.map((answer) => [answer.blockId, readAnswer(answer)!]));

const cardsFor = (
  a: AlignmentAnswerV21[],
  b: AlignmentAnswerV21[],
  marked: string[] = [],
) =>
  buildCardsV21({
    comparison: compareV21(side(a), side(b)),
    markedItemIds: marked,
    nameA: "Du",
    nameB: "Jule",
  });

test("die Bibliothek gehört zu dieser Fassung", () => {
  assert.equal(CARD_LIBRARY_V21.instrumentId, ALIGNMENT_V21_INSTRUMENT_ID);
  assert.ok(CARD_LIBRARY_V21.cards.length >= 10);
});

test("jede Karte hat alle vier Schritte", () => {
  // Fehlt die Vereinbarung, ist es ein Gespraechsimpuls und kein Werkzeug -
  // und ein Gespraech ohne Ergebnis ist genau das, was dieses Produkt
  // vermeiden soll.
  for (const card of CARD_LIBRARY_V21.cards) {
    assert.ok(card.observed.trim().length > 20, `${card.id}: Beobachtung`);
    assert.ok(card.meaning.trim().length > 20, `${card.id}: Bedeutung`);
    assert.match(card.question, /\?$/, `${card.id}: die Frage ist keine`);
    assert.ok(card.agreement.length > 0, `${card.id}: keine Vereinbarung`);
    assert.ok(card.source.trim().length > 5, `${card.id}: keine Quelle`);
  }
});

test("die Prüfung auf Einschränkungen greift überhaupt", () => {
  // Gegenprobe: Ein Befundsatz ohne Einschraenkung muss durchfallen. Sonst
  // waere das Muster so weit, dass es alles durchlaesst.
  const befund = "Ihr seid euch in diesem Bereich sehr ähnlich.";
  assert.ok(!/\bkann\b|\bnicht\b|\bkeine?\b|beschreibt|steht in keiner|hängt/i.test(befund));
});

test("die Bedeutung ist nie eine Tatsache über die Person", () => {
  // „Das beschreibt eure Angaben, nicht eure Einsatzbereitschaft“ - so
  // formuliert die Durchsicht es. Jede Bedeutung muss eine Einschraenkung
  // tragen, sonst liest sie sich als Befund.
  for (const card of CARD_LIBRARY_V21.cards) {
    // Die Einschraenkung darf verschieden aussehen - „nicht“, „keine“,
    // „kann“, „haengt von“ -, aber es muss eine geben.
    assert.match(
      card.meaning,
      /\bkann\b|\bnicht\b|\bkeine?\b|beschreibt|steht in keiner|hängt/i,
      `${card.id}: die Bedeutung klingt wie ein Befund`,
    );
  }
});

test("keine erzeugte Karte enthält einen verbotenen Satz", () => {
  // Die fuenf Beispiele der Durchsicht fuer "nicht gedeckt", plus die
  // Klassiker. Geprueft wird an echten Karten, nicht an der Bibliothek -
  // erst beim Zusammensetzen koennte etwas entstehen.
  const alle = [
    ...cardsFor(
      [{ blockId: "T03", value: { optionId: opt("T03", 0) } }],
      [{ blockId: "T03", value: { optionId: opt("T03", 2) } }],
    ),
    ...cardsFor(
      [{ blockId: "K02", value: { optionId: opt("K02", 0) } }],
      [{ blockId: "K02", value: { optionId: opt("K02", 2) } }],
    ),
    ...cardsFor(
      [{ blockId: "R01", value: { number: 10, unit: "Stunden pro Woche" } }],
      [{ blockId: "R01", value: { number: 30, unit: "Stunden pro Woche" } }],
    ),
    ...cardsFor(
      [{ blockId: "K01", value: { optionId: opt("K01", 0) } }],
      [{ blockId: "K01", value: { optionId: opt("K01", 0) } }],
    ),
  ];

  assert.ok(alle.length >= 4, "es wurden zu wenige Karten erzeugt");

  for (const card of alle) {
    const text = [card.observed, card.meaning, card.question, ...card.agreement].join(" ");
    for (const muster of forbiddenPatterns()) {
      assert.ok(!text.includes(muster), `${card.id}: „${muster}“`);
    }
    // Und keine Prozentzahl: „Euer Informations-Alignment betraegt 62 %.“
    assert.ok(!/\d+\s*%/.test(text), `${card.id}: eine Prozentzahl`);
  }
});

test("gleiche Antwort heißt nicht „kein Konfliktpotenzial“", () => {
  // Der vierte Satz der Durchsicht: Bei derselben Wahl wird trotzdem gefragt,
  // welche Bedingungen jeweils wichtig waren.
  const karten = cardsFor(
    [{ blockId: "K01", value: { optionId: opt("K01", 0) } }],
    [{ blockId: "K01", value: { optionId: opt("K01", 0) } }],
  );
  assert.equal(karten.length, 1);
  assert.match(karten[0].question, /Bedingungen/);
  assert.ok(!karten[0].meaning.includes("kein Konflikt"));
});

test("Zahlen werden nebeneinandergestellt, nicht verrechnet", () => {
  const karten = cardsFor(
    [{ blockId: "R01", value: { number: 10, unit: "Stunden pro Woche" } }],
    [{ blockId: "R01", value: { number: 30, unit: "Stunden pro Woche" } }],
  );
  assert.equal(karten.length, 1);
  assert.match(karten[0].observed, /10 Stunden pro Woche/);
  assert.match(karten[0].observed, /30 Stunden pro Woche/);
  // Keine Differenz: „Der Commitment-Abstand betraegt zehn Stunden.“
  assert.ok(!/20|Abstand|Differenz/.test(karten[0].observed));
});

test("eine Markierung geht vor", () => {
  // Wer sagt „darueber moechte ich sprechen“, hat einen Grund, den kein
  // Vergleich kennt - und der gehoert zuerst gefragt.
  const karten = cardsFor(
    [{ blockId: "T03", value: { optionId: opt("T03", 0) } }],
    [{ blockId: "T03", value: { optionId: opt("T03", 2) } }],
    ["T03"],
  );
  assert.match(karten[0].id, /^markiert:/);
});

test("zu einer unbeantworteten Frage gibt es keine Karte", () => {
  // Es gibt nichts zu besprechen, was noch niemand gesagt hat.
  assert.deepEqual(cardsFor([], []), []);
});

test("zu einer zurückgehaltenen Antwort schon - aber ohne Vorwurf", () => {
  const karten = cardsFor(
    [{ blockId: "G01", value: { optionId: opt("G01", 0) } }],
    [{ blockId: "G01", missingCode: "prefer_not_to_say" }],
  );
  assert.equal(karten.length, 1);
  assert.match(karten[0].meaning, /bewusster Schritt|respektiert/);
  assert.ok(!/Commitment|fehlend/.test(karten[0].meaning));
});

test("ein Satz ohne Angabe fällt weg, statt mit einer Lücke dazustehen", () => {
  // „{b} nennt undefined“ waere schlimmer als ein kuerzerer Satz.
  const karten = cardsFor(
    [{ blockId: "R01", value: { number: 10, unit: "Stunden pro Woche" } }],
    [{ blockId: "R01", value: { number: 12, unit: "Stunden pro Woche" } }],
  );
  for (const karte of karten) {
    assert.ok(!/\{|\}|undefined|null/.test(karte.observed), karte.observed);
  }
});

test("höchstens eine Karte je Frage", () => {
  const karten = cardsFor(
    getItemsV21()
      .filter((item) => item.options.length > 1)
      .map((item) => ({ blockId: item.itemId, value: { optionId: item.options[0].optionId } })),
    getItemsV21()
      .filter((item) => item.options.length > 1)
      .map((item) => ({ blockId: item.itemId, value: { optionId: item.options[1].optionId } })),
  );
  const ids = karten.map((karte) => karte.itemId);
  assert.equal(new Set(ids).size, ids.length);
});

test("die Reihenfolge ist die des Fragebogens, nicht nach Schwere", () => {
  // Eine Rangfolge nach Schwere wuerde einen Schwellwert behaupten, den es
  // nicht gibt.
  const karten = cardsFor(
    [
      { blockId: "R01", value: { number: 10, unit: "Stunden pro Woche" } },
      { blockId: "T03", value: { optionId: opt("T03", 0) } },
    ],
    [
      { blockId: "R01", value: { number: 30, unit: "Stunden pro Woche" } },
      { blockId: "T03", value: { optionId: opt("T03", 2) } },
    ],
  );
  const reihenfolge = karten.map((karte) => karte.itemId);
  const quelle = getItemsV21().map((item) => item.itemId);
  const sortiert = [...reihenfolge].sort(
    (a, b) => quelle.indexOf(a!) - quelle.indexOf(b!),
  );
  assert.deepEqual(reihenfolge, sortiert);
});
