import test from "node:test";
import assert from "node:assert/strict";

import { questionBlocks } from "@/features/instruments/align/questionBlocks";
import { buildSections } from "@/features/instruments/align/questionnaireData";
import { screenSet } from "@/features/instruments/align/screens";
import { getItemV22 } from "@/features/instruments/align/registries";

type Frage = Parameters<typeof questionBlocks>[0][number];

/** Nur die Felder, die die Gruppierung anschaut. */
const frage = (itemId: string, groupPrompt: string | null = null) =>
  ({ itemId, groupPrompt } as Frage);

test("Fragen ohne gemeinsame Frage bleiben einzeln", () => {
  const bloecke = questionBlocks([frage("K01"), frage("K03"), frage("K04")]);
  assert.equal(bloecke.length, 3);
  for (const block of bloecke) {
    assert.equal(block.groupPrompt, null);
    assert.equal(block.items.length, 1);
  }
});

test("aufeinanderfolgende Fragen mit derselben Frage werden ein Block", () => {
  const bloecke = questionBlocks([
    frage("S01a", "Wie wichtig?"),
    frage("S01b", "Wie wichtig?"),
    frage("S01_top"),
    frage("S02"),
  ]);
  assert.equal(bloecke.length, 3);
  assert.deepEqual(bloecke[0].items.map((item) => item.itemId), ["S01a", "S01b"]);
  assert.equal(bloecke[0].groupPrompt, "Wie wichtig?");
  assert.equal(bloecke[1].items[0].itemId, "S01_top");
});

test("dieselbe Frage mit etwas dazwischen bleibt zwei Blöcke", () => {
  // Sonst würde die Reihenfolge des Bogens beim Anzeigen umsortiert - und die
  // Reihenfolge ist Teil der Fragen.
  const bloecke = questionBlocks([
    frage("S01a", "Wie wichtig?"),
    frage("S02"),
    frage("S01b", "Wie wichtig?"),
  ]);
  assert.equal(bloecke.length, 3);
});

test("die sechs Ziele landen in einem Block, die übrigen fünf einzeln", () => {
  // Am echten Bogen und nicht an erfundenen Fragen: Das UX-Review Teil 2
  // verlangt „als gemeinsamer Block ..., nicht als sechs große unabhängige
  // Fragekarten".
  const set = screenSet("venture_alignment", (itemId) => Boolean(getItemV22(itemId)));
  const schirm = set.screens.find((entry) => entry.items.includes("S01a"))!;
  const alle = buildSections("venture_alignment").flatMap((section) => section.items);
  const fragen = schirm.items.map(
    (itemId) => alle.find((item) => item.itemId === itemId)!,
  );

  const bloecke = questionBlocks(fragen);
  assert.deepEqual(
    bloecke[0].items.map((item) => item.itemId),
    ["S01a", "S01b", "S01c", "S01d", "S01e", "S01f"],
  );
  assert.ok(bloecke[0].groupPrompt);
  assert.equal(bloecke.length, 6, "nach dem Zielblock stehen fünf einzelne Fragen");
});
