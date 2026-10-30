import assert from "node:assert/strict";
import test from "node:test";
import { alignOfLine, changeTextAlign } from "@/features/advisor/programTextAlign";

test("mittig setzt den Marker vor die Zeile an der Schreibmarke", () => {
  const r = changeTextAlign("Hallo\nWelt", 2, 2, "center");
  assert.equal(r.text, "::c Hallo\nWelt");
});

test("eine neue Ausrichtung ersetzt die alte, links entfernt den Marker", () => {
  const centered = changeTextAlign("Hallo", 0, 5, "center");
  const right = changeTextAlign(centered.text, centered.selectionStart, centered.selectionEnd, "right");
  assert.equal(right.text, "::r Hallo");
  const left = changeTextAlign(right.text, right.selectionStart, right.selectionEnd, "left");
  assert.equal(left.text, "Hallo");
});

test("die Markierung bleibt auf dem Text, damit man mehrfach klicken kann", () => {
  const r = changeTextAlign("Hallo", 0, 5, "center");
  assert.equal(r.text.slice(r.selectionStart, r.selectionEnd), "Hallo");
});

test("mehrere markierte Zeilen werden alle ausgerichtet, andere nicht", () => {
  const text = "eins\nzwei\ndrei";
  const r = changeTextAlign(text, 0, 8, "right");
  assert.equal(r.text, "::r eins\n::r zwei\ndrei");
});

test("alignOfLine liest den Marker", () => {
  assert.deepEqual(alignOfLine("::c x"), { align: "center", rest: "x" });
  assert.deepEqual(alignOfLine("x"), { align: "left", rest: "x" });
});
