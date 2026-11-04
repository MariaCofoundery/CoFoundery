import assert from "node:assert/strict";
import test from "node:test";

import { parseUserText } from "@/features/ui/userTextMarkup";

test("**fett**, *kursiv* und _kursiv_ werden erkannt", () => {
  assert.deepEqual(parseUserText("Das ist **wichtig** und *leise* und _auch_."), [
    { kind: "text", text: "Das ist " },
    { kind: "strong", children: [{ kind: "text", text: "wichtig" }] },
    { kind: "text", text: " und " },
    { kind: "em", children: [{ kind: "text", text: "leise" }] },
    { kind: "text", text: " und " },
    { kind: "em", children: [{ kind: "text", text: "auch" }] },
    { kind: "text", text: "." },
  ]);
  assert.deepEqual(parseUserText("__auch fett__"), [{ kind: "strong", children: [{ kind: "text", text: "auch fett" }] }]);
});

test("verschachtelt: kursiv in fett", () => {
  assert.deepEqual(parseUserText("**ganz *sehr* wichtig**"), [
    {
      kind: "strong",
      children: [
        { kind: "text", text: "ganz " },
        { kind: "em", children: [{ kind: "text", text: "sehr" }] },
        { kind: "text", text: " wichtig" },
      ],
    },
  ]);
});

test("was keine Auszeichnung ist, bleibt Text", () => {
  for (const text of [
    "2 * 3 * 4 = 24",
    "snake_case_name und file_name.txt",
    "** nicht fett **",
    "ein einzelnes * Sternchen",
    "_ nicht kursiv _",
    "E-Mail: anna_meier@example.com",
    "Preis: 5*",
  ]) {
    assert.deepEqual(parseUserText(text), [{ kind: "text", text }], text);
  }
});

test("HTML bleibt Text, Zeilenumbrueche bleiben erhalten", () => {
  assert.deepEqual(parseUserText("<script>alert(1)</script>"), [{ kind: "text", text: "<script>alert(1)</script>" }]);
  assert.deepEqual(parseUserText("Zeile 1\n**Zeile 2**"), [
    { kind: "text", text: "Zeile 1\n" },
    { kind: "strong", children: [{ kind: "text", text: "Zeile 2" }] },
  ]);
  // Kursiv geht nicht ueber eine Zeile hinaus.
  assert.deepEqual(parseUserText("*erste\nzweite*"), [{ kind: "text", text: "*erste\nzweite*" }]);
});
