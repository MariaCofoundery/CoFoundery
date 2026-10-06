import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { basisAnswered, followUpApplies } from "@/features/instruments/align/followUps";
import { getItemsV22 } from "@/features/instruments/align/registries";

/**
 * Beta-Gate 06.10.2026: Anschlussfragen gelten nur, wenn ihre Ausgangsfrage
 * inhaltlich beantwortet ist - in Oberflaeche, Abgabe und Teambereitschaft
 * gleich. Vorher konnte niemand das Vorhaben abgeben, der in L01 keine Grenze
 * nannte (R05 unsichtbar, aber verlangt; L02/L03 nach einer Nicht-Antwort
 * verlangt, aber unsichtbar).
 */

const read = (path: string) => readFileSync(path, "utf8");

test("eine Nicht-Antwort loest keine Anschlussfrage aus", () => {
  assert.equal(basisAnswered({ missingCode: "prefer_not_to_say" }), false);
  assert.equal(basisAnswered({ missingCode: "confidential_first", value: { entries: [{ entryId: "a", text: "x" }] } }), false);
  assert.equal(basisAnswered(undefined), false);
  assert.equal(basisAnswered(null), false);
  assert.equal(basisAnswered({}), false);
});

test("Eintragslisten zaehlen nur mit Text, andere Werte mit Inhalt", () => {
  assert.equal(basisAnswered({ value: { entries: [] } }), false);
  assert.equal(basisAnswered({ value: { entries: [{ entryId: "a", text: "  " }] } }), false);
  assert.equal(basisAnswered({ value: { entries: [{ entryId: "a", text: "Keine Fremdfinanzierung" }] } }), true);
  assert.equal(basisAnswered({ value: { optionId: "after_6_months" } }), true);
  assert.equal(basisAnswered({ value: {} }), false);
  assert.equal(basisAnswered({ value: ["a"] }), true);
  assert.equal(basisAnswered({ value: "" }), false);
  assert.equal(basisAnswered({ value: 12 }), true);
});

test("die realen Anschlussfragen haengen an ihrer eigenen Ausgangsfrage", () => {
  const items = getItemsV22("venture_alignment");
  const byId = new Map(items.map((item) => [item.itemId, item]));
  assert.equal(byId.get("R05")?.showAfter, "R04");
  assert.equal(byId.get("L02")?.showAfter, "L01");
  assert.equal(byId.get("L03")?.showAfter, "L01");

  const answers = new Map<string, { value?: unknown; missingCode?: string }>([
    ["R04", { value: { optionId: "x" } }],
    ["L01", { missingCode: "prefer_not_to_say" }],
  ]);
  const get = (id: string) => answers.get(id);
  // R05 gilt, weil R04 beantwortet ist - unabhaengig von L01.
  assert.equal(followUpApplies(byId.get("R05")!, get), true);
  // L02/L03 gelten nicht nach einer Nicht-Antwort in L01.
  assert.equal(followUpApplies(byId.get("L02")!, get), false);
  assert.equal(followUpApplies(byId.get("L03")!, get), false);
  // Ohne showAfter gilt jede Frage.
  assert.equal(followUpApplies({}, get), true);
});

test("Oberflaeche, Abgabe und Teambereitschaft benutzen dieselbe Regel", () => {
  const ui = read("src/features/instruments/align/Questionnaire.tsx");
  assert.match(ui, /!item\.basisItemId \|\| basisAnswered\(answers\[item\.basisItemId\]\)/);
  // Nicht mehr pauschal an den L01-Eintraegen.
  assert.doesNotMatch(ui, /!item\.basisItemId \|\| basisEntries\.length > 0/);

  const submit = read("src/features/instruments/align/answerActions.ts");
  assert.match(submit, /\.select\("block_id, value, missing_code"\)/);
  assert.match(submit, /if \(!followUpApplies\(item, \(itemId\) => antwort\.get\(itemId\)\)\) return false;/);
  assert.doesNotMatch(submit, /item\.showAfter && !beantwortet\.has\(item\.showAfter\)/);

  const readiness = read("src/features/instruments/workstyle/teamReadiness.ts");
  assert.match(readiness, /followUpApplies\(item, key => ventureAnswer\.get\(key\)\)/);
});
