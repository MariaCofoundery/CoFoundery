import test from "node:test";
import assert from "node:assert/strict";

import { buildCards, forbiddenPatterns, CARD_LIBRARY } from "@/features/instruments/align/conversationCards";
import { compareV21 } from "@/features/instruments/v21/comparisonV21";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import { readableItems } from "@/features/instruments/align/questionnaireData";
import { registryOf, getItemV22, getItemsV22, SCOPES } from "@/features/instruments/align/registries";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import type { AssessmentScope } from "@/features/instruments/align/registries";

const opt = (itemId: string, index: number) => getItemV22(itemId)!.options[index].optionId;

const side = (scope: AssessmentScope, answers: AlignmentAnswerV21[]) => {
  const nachId = new Map(readableItems(scope).map((item) => [item.itemId, item]));
  return Object.fromEntries(
    answers.map((answer) => [
      answer.blockId,
      readAnswer(answer, [], nachId.get(answer.blockId))!,
    ]),
  );
};

const cardsFor = (
  scope: AssessmentScope,
  a: AlignmentAnswerV21[],
  b: AlignmentAnswerV21[],
  marked: string[] = [],
) =>
  buildCards({
    comparison: compareV21(side(scope, a), side(scope, b), {
      items: readableItems(scope),
      sections: registryOf(scope).sections,
    }),
    markedItemIds: marked,
    nameA: "Du",
    nameB: "Jule",
  });

test("jede Kennung in der Bibliothek zeigt auf eine Frage, die es gibt", () => {
  // Der Fehler, den das verhindert: In v2.1 hiess der Einwand-Zeitpunkt T03,
  // in v2.2 heisst er T01. Eine Karte mit der alten Kennung waere nicht
  // falsch gewesen, sondern unsichtbar - und das ist schlimmer.
  const alle = new Set(SCOPES.flatMap((scope) => getItemsV22(scope).map((item) => item.itemId)));
  for (const card of CARD_LIBRARY.cards) {
    const ids = "itemIds" in card.trigger ? card.trigger.itemIds : [];
    for (const id of ids) {
      assert.ok(alle.has(id), `${card.id}: ${id} gibt es in keinem Bogen`);
    }
  }
});

test("beide Bögen bekommen Karten, nicht nur einer", () => {
  // Zuerst hatte das Arbeitsprofil genau eine - dann waere der halbe Report
  // leer geblieben.
  const profil = cardsFor(
    "founder_profile",
    [{ blockId: "A01", value: { optionId: opt("A01", 0) } }],
    [{ blockId: "A01", value: { optionId: opt("A01", 4) } }],
  );
  const vorhaben = cardsFor(
    "venture_alignment",
    [{ blockId: "S01", value: { optionIds: [opt("S01", 0)] } }],
    [{ blockId: "S01", value: { optionIds: [opt("S01", 0), opt("S01", 1)] } }],
  );
  assert.ok(profil.length >= 1, "das Arbeitsprofil bekommt keine Karte");
  assert.ok(vorhaben.length >= 1, "das Vorhaben bekommt keine Karte");
});

test("jede Karte hat alle vier Schritte", () => {
  for (const card of CARD_LIBRARY.cards) {
    assert.ok(card.observed.trim().length > 20, `${card.id}: Beobachtung`);
    assert.ok(card.meaning.trim().length > 20, `${card.id}: Bedeutung`);
    assert.match(card.question, /\?$/, `${card.id}: die Frage ist keine`);
    assert.ok(card.agreement.length > 0, `${card.id}: keine Vereinbarung`);
    assert.ok(card.source.trim().length > 5, `${card.id}: keine Quelle`);
  }
});

test("die Bedeutung ist nie eine Tatsache über die Person", () => {
  for (const card of CARD_LIBRARY.cards) {
    assert.match(
      card.meaning,
      /\bkann\b|\bnicht\b|\bkeine?\b|beschreibt|steht in keiner|hängt/i,
      `${card.id}: die Bedeutung klingt wie ein Befund`,
    );
  }
});

test("keine erzeugte Karte enthält einen verbotenen Satz", () => {
  const alle = [
    ...cardsFor("founder_profile",
      [{ blockId: "T01", value: { optionId: opt("T01", 0) } }],
      [{ blockId: "T01", value: { optionId: opt("T01", 2) } }]),
    ...cardsFor("venture_alignment",
      [{ blockId: "R01", value: { number: 10, unit: "Stunden pro Woche" } }],
      [{ blockId: "R01", value: { number: 30, unit: "Stunden pro Woche" } }]),
    ...cardsFor("venture_alignment",
      [{ blockId: "K04", value: { optionId: opt("K04", 0) } }],
      [{ blockId: "K04", value: { optionId: opt("K04", 2) } }]),
  ];
  assert.ok(alle.length >= 3, "es wurden zu wenige Karten erzeugt");

  for (const card of alle) {
    const text = [card.observed, card.meaning, card.question, ...card.agreement].join(" ");
    for (const muster of forbiddenPatterns()) {
      assert.ok(!text.includes(muster), `${card.id}: „${muster}“`);
    }
    assert.ok(!/\d+\s*%/.test(text), `${card.id}: eine Prozentzahl`);
  }
});

test("A und I werden nicht gegeneinander gestellt", () => {
  // Master-Fassung, Abschnitt 8.1: niemals zu einem
  // Analytisch-gegen-Intuitiv-Wert verschmelzen. Beide koennen gleichzeitig
  // hoch sein.
  const karte = CARD_LIBRARY.cards.find((entry) => entry.id === "abwaegen_und_gefuehl")!;
  assert.match(karte.meaning, /keine Gegensätze|beides/i);
});

test("Zahlen werden nebeneinandergestellt, nicht verrechnet", () => {
  const karten = cardsFor("venture_alignment",
    [{ blockId: "R01", value: { number: 10, unit: "Stunden pro Woche" } }],
    [{ blockId: "R01", value: { number: 30, unit: "Stunden pro Woche" } }]);
  assert.equal(karten.length, 1);
  assert.match(karten[0].observed, /10 Stunden pro Woche/);
  assert.match(karten[0].observed, /30 Stunden pro Woche/);
  assert.ok(!/20|Abstand|Differenz/.test(karten[0].observed));
});

test("eine Markierung geht vor", () => {
  const karten = cardsFor("founder_profile",
    [{ blockId: "T01", value: { optionId: opt("T01", 0) } }],
    [{ blockId: "T01", value: { optionId: opt("T01", 2) } }],
    ["T01"]);
  assert.match(karten[0].id, /^markiert:/);
});

test("zu einer unbeantworteten Frage gibt es keine Karte", () => {
  assert.deepEqual(cardsFor("founder_profile", [], []), []);
});

test("gleiche Antwort heißt nicht „kein Konfliktpotenzial“", () => {
  const karten = cardsFor("venture_alignment",
    [{ blockId: "K01", value: { optionId: opt("K01", 0) } }],
    [{ blockId: "K01", value: { optionId: opt("K01", 0) } }]);
  assert.equal(karten.length, 1);
  assert.match(karten[0].question, /Bedingungen/);
});

test("ein Satz ohne Angabe fällt weg, statt mit einer Lücke dazustehen", () => {
  for (const karte of cardsFor("venture_alignment",
    [{ blockId: "R01", value: { number: 10, unit: "Stunden pro Woche" } }],
    [{ blockId: "R01", value: { number: 12, unit: "Stunden pro Woche" } }])) {
    assert.ok(!/\{|\}|undefined|null/.test(karte.observed), karte.observed);
  }
});

test("höchstens eine Karte je Frage", () => {
  const mitOptionen = (scope: AssessmentScope) =>
    getItemsV22(scope).filter((item) => item.options.length > 1);
  const karten = cardsFor(
    "venture_alignment",
    mitOptionen("venture_alignment").map((item) => ({
      blockId: item.itemId,
      value: item.answerFormat === "multi_choice"
        ? { optionIds: [item.options[0].optionId] }
        : { optionId: item.options[0].optionId },
    })) as AlignmentAnswerV21[],
    mitOptionen("venture_alignment").map((item) => ({
      blockId: item.itemId,
      value: item.answerFormat === "multi_choice"
        ? { optionIds: [item.options[1].optionId] }
        : { optionId: item.options[1].optionId },
    })) as AlignmentAnswerV21[],
  );
  const ids = karten.map((karte) => karte.itemId);
  assert.equal(new Set(ids).size, ids.length);
});
