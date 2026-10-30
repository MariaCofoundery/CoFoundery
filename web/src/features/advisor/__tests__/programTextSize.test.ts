import test from "node:test";
import assert from "node:assert/strict";
import { changeTextSize as change } from "@/features/advisor/programTextSize";

const changeTextSize = (text: string, start: number, end: number, delta: 1 | -1) => change(text, start, end, delta).text;

test("einmal groesser: ++Text++", () => {
  assert.equal(changeTextSize("Hallo Welt", 0, 5, 1), "++Hallo++ Welt");
});

test("weiter klicken ersetzt die Zeichen, statt neue anzuhaengen: +++ dann ++++", () => {
  const one = changeTextSize("Hallo Welt", 0, 5, 1);
  // Nach dem Klick steht die Auswahl typischerweise um die Zeichen herum oder darin - beides zaehlt gleich.
  assert.equal(changeTextSize(one, 0, 9, 1), "+++Hallo+++ Welt");
  assert.equal(changeTextSize(one, 2, 7, 1), "+++Hallo+++ Welt");
  const two = changeTextSize(one, 2, 7, 1);
  assert.equal(changeTextSize(two, 3, 8, 1), "++++Hallo++++ Welt");
});

test("es gibt eine Obergrenze: drei Stufen groesser", () => {
  assert.equal(changeTextSize("++++Hallo++++", 4, 9, 1), "++++Hallo++++");
});

test("kleiner und wieder zurueck: bei Stufe null verschwinden die Zeichen", () => {
  const small = changeTextSize("Hallo Welt", 0, 5, -1);
  assert.equal(small, "--Hallo-- Welt");
  assert.equal(changeTextSize(small, 2, 7, 1), "Hallo Welt");
  assert.equal(changeTextSize(changeTextSize(small, 2, 7, -1), 3, 8, -1), "---Hallo--- Welt");
});

test("ohne Auswahl gilt das Wort an der Schreibmarke", () => {
  assert.equal(changeTextSize("Hallo Welt", 8, 8, 1), "Hallo ++Welt++");
});

test("wer + oder - im Text hat, bekommt keine falschen Stufen", () => {
  assert.equal(changeTextSize("a - b", 0, 1, 1), "++a++ - b");
});

test("die Auswahl bleibt auf dem Text, damit man mehrfach klicken kann", () => {
  const first = change("Hallo Welt", 0, 5, 1);
  assert.equal(first.text.slice(first.selectionStart, first.selectionEnd), "Hallo");
  // Zweiter Klick mit genau dieser Auswahl.
  const second = change(first.text, first.selectionStart, first.selectionEnd, 1);
  assert.equal(second.text, "+++Hallo+++ Welt");
  assert.equal(second.text.slice(second.selectionStart, second.selectionEnd), "Hallo");
  const third = change(second.text, second.selectionStart, second.selectionEnd, 1);
  assert.equal(third.text, "++++Hallo++++ Welt");
});
