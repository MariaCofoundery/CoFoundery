import test from "node:test";
import assert from "node:assert/strict";

import { directionRows } from "@/features/instruments/align/mapRows";
import { getItemsV22 } from "@/features/instruments/align/registries";
import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";

const items = getItemsV22("venture_alignment");
const ziel = (id: string) => items.find((item) => item.itemId === id)!;

const wichtigkeit = (id: string, position: number, label: string): ReadoutEntry => ({
  itemId: id,
  section: "S",
  prompt: ziel(id).prompt,
  value: { kind: "ordinal", label, position, of: 5 },
  missing: null,
});

test("alle sechs Ziele stehen da, auch die unbeantworteten", () => {
  // Ein Bild, das nur die beantworteten zeigt, sieht bei jedem anders aus -
  // und man sieht nicht mehr, was jemand ausgelassen hat.
  const rows = directionRows([wichtigkeit("S01a", 5, "sehr wichtig")], items);
  assert.equal(rows.length, 6);
  assert.deepEqual(
    rows.map((row) => row.itemId),
    ["S01a", "S01b", "S01c", "S01d", "S01e", "S01f"],
  );
});

test("ein offenes Ziel ist keine Null", () => {
  // Wer "habe ich noch nicht entschieden" waehlt, darf nicht aussehen wie
  // jemand, der es abgelehnt hat.
  const offen: ReadoutEntry = {
    itemId: "S01b",
    section: "S",
    prompt: ziel("S01b").prompt,
    value: null,
    missing: { code: "not_decided", label: "habe ich noch nicht entschieden" },
  };

  const row = directionRows([offen], items).find((entry) => entry.itemId === "S01b")!;
  assert.equal(row.ordinal, null);
  assert.equal(row.missing?.label, "habe ich noch nicht entschieden");
});

test("die kurzen Namen kommen aus dem Sprachreview", () => {
  const rows = directionRows([], items);
  assert.deepEqual(rows.map((row) => row.label), [
    "Wirtschaftliche Tragfähigkeit",
    "Wachstum & Skalierung",
    "Gesellschaftliche / ökologische Wirkung",
    "Exit-Perspektive",
    "Fachliche / technologische Verwirklichung",
    "Unternehmerische Unabhängigkeit",
  ]);
});

test("die Vorrangmarkierung trifft die gemeinten Ziele", () => {
  // S01_top nennt die Ziele mit ihrem ganzen Satz - so stehen sie dort zur
  // Wahl. Ueber eine Kennung zu vergleichen ginge daneben, weil die Antwort
  // keine traegt.
  const top: ReadoutEntry = {
    itemId: "S01_top",
    section: "S",
    prompt: ziel("S01_top").prompt,
    value: {
      kind: "choices",
      labels: [ziel("S01a").prompt, ziel("S01d").prompt],
      priority: null,
      texts: [],
    },
    missing: null,
  };

  const rows = directionRows([top, wichtigkeit("S01a", 4, "ziemlich wichtig")], items);
  assert.deepEqual(
    rows.filter((row) => row.top).map((row) => row.itemId),
    ["S01a", "S01d"],
  );
});

test("Vorrang ist keine höhere Stufe", () => {
  // Man kann ein "mittel" wichtiges Ziel voranstellen, weil es gerade dran
  // ist. Die Markierung darf die Stufe deshalb nicht anfassen.
  const top: ReadoutEntry = {
    itemId: "S01_top",
    section: "S",
    prompt: ziel("S01_top").prompt,
    value: { kind: "choices", labels: [ziel("S01c").prompt], priority: null, texts: [] },
    missing: null,
  };

  const row = directionRows([top, wichtigkeit("S01c", 3, "mittel")], items)
    .find((entry) => entry.itemId === "S01c")!;

  assert.equal(row.top, true);
  assert.equal(row.ordinal?.position, 3, "die Markierung hat die Stufe verschoben");
  assert.equal(row.ordinal?.label, "mittel");
});
