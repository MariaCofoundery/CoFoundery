import test from "node:test";
import assert from "node:assert/strict";

import { getItemsV22, SCOPES } from "@/features/instruments/align/registries";
import {
  readableItems,
  withPartner,
  OHNE_NAMEN,
} from "@/features/instruments/align/questionnaireData";

test("keine Frage traegt Markdown-Maskierung", () => {
  // Am 29.09.2026 stand „... ungefaehr von \\[Name\\]?“ woertlich auf dem
  // Bildschirm - React setzt Text so, wie er dasteht. Die Maskierung ist
  // Schreibweise der Quelle und gehoert nicht in die Frage.
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      assert.ok(
        !item.prompt.includes("\\"),
        `${item.itemId}: ${item.prompt}`,
      );
      for (const option of item.options) {
        assert.ok(!option.label.includes("\\"), `${item.itemId}/${option.label}`);
      }
    }
  }
});

test("keine Redaktionsmarke steht in einer Frage", () => {
  // „[nur wenn relevant]“ ist eine Anweisung an die Redaktion. Die Bedingung
  // steht als showAfter in der Registratur und WIRKT dort, statt daneben zu
  // stehen.
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      assert.ok(
        !/nur wenn relevant/i.test(item.prompt),
        `${item.itemId} traegt eine Redaktionsmarke`,
      );
    }
  }

  // Und die Bedingung ist wirklich da - sonst waere die Marke ersatzlos weg.
  const l02 = getItemsV22("venture_alignment").find((item) => item.itemId === "L02");
  assert.equal(l02?.showAfter, "L01");
});

test("ein Platzhalter erreicht den Bildschirm nie als Platzhalter", () => {
  const roh = getItemsV22("venture_alignment").find((item) => item.itemId === "R02");
  assert.ok(roh?.prompt.includes("[Name]"), "R02 hat den Platzhalter verloren");

  // Mit Namen.
  assert.match(withPartner(roh!.prompt, "Ben"), /von Ben\?$/);

  // Ohne Namen - und NICHT leer. Eine eckige Klammer sieht aus wie ein Fehler.
  assert.match(withPartner(roh!.prompt), new RegExp(`von ${OHNE_NAMEN}\\?$`));
  assert.match(withPartner(roh!.prompt, "   "), new RegExp(`von ${OHNE_NAMEN}\\?$`));

  // Auch der Weg ueber die Lesbarmachung ersetzt ihn.
  for (const items of [readableItems("venture_alignment"), readableItems("venture_alignment", "Ben")]) {
    for (const item of items) {
      assert.ok(!item.prompt.includes("[Name]"), `${item.itemId} zeigt den Platzhalter`);
    }
  }
});
