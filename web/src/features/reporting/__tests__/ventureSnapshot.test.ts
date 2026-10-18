import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { readableItems } from "@/features/instruments/align/questionnaireData";
import { getItemV22 } from "@/features/instruments/align/registries";
import { readAnswer, type ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import { buildVentureSnapshot, SNAPSHOT_ITEM_IDS, SNAPSHOT_LAYOUT } from "@/features/reporting/ventureSnapshotModel";

/**
 * Phase 1.1 - „So willst du gründen": die eigene Sicht auf ein Vorhaben als Karten.
 */

const read = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const items = new Map(readableItems("venture_alignment").map((item) => [item.itemId, item]));
const entry = (blockId: string, value: unknown): ReadoutEntry =>
  readAnswer({ blockId, value } as Parameters<typeof readAnswer>[0], [], items.get(blockId))!;
const missing = (blockId: string, missingCode: string): ReadoutEntry =>
  readAnswer({ blockId, missingCode } as Parameters<typeof readAnswer>[0], [], items.get(blockId))!;

test("jede Snapshot-Frage gibt es in der Registratur", () => {
  for (const itemId of SNAPSHOT_ITEM_IDS) assert.ok(getItemV22(itemId), itemId);
});

test("Karten nur mit Antworten - genau so, wie gegeben, ohne Rechnung", () => {
  const cards = buildVentureSnapshot([
    entry("R01", { number: 20, unit: "Stunden pro Woche" }),
    entry("R02", { number: 15, unit: "Stunden pro Woche" }),
    entry("R04", { optionId: "R04_o2", date: "2027-03-01" }),
    entry("U01", { optionId: "U01_o2" }),
    entry("S01_top", { optionIds: ["S01_top_o1", "S01_top_o3"] }),
    entry("S04", { text: "Erste zahlende Kund:innen" }),
    entry("L01", { entries: [{ entryId: "e1", text: "Keine persönliche Bürgschaft" }] }),
    missing("B01", "cannot_assess"),
  ]);
  assert.deepEqual(cards.map((c) => c.key), ["time", "money", "decisions", "goals", "limits"]);
  const facts = Object.fromEntries(cards.flatMap((c) => c.facts).map((f) => [f.itemId, f]));
  assert.deepEqual(facts.R01, { kind: "figure", itemId: "R01", number: 20, unit: "Stunden pro Woche" });
  assert.deepEqual(facts.R02, { kind: "figure", itemId: "R02", number: 15, unit: "Stunden pro Woche" });
  assert.equal(facts.R04.kind, "statement");
  assert.equal((facts.R04 as { detail: string }).detail, "2027-03-01");
  assert.equal(facts.U01.kind, "scale");
  assert.deepEqual([(facts.U01 as { position: number }).position, (facts.U01 as { of: number }).of], [2, 5]);
  assert.equal(facts.S01_top.kind, "chips");
  assert.deepEqual((facts.L01 as { chips: string[] }).chips, ["Keine persönliche Bürgschaft"]);
  // „Kann ich noch nicht einschätzen" wird nicht zu einer Zahl oder Aussage.
  assert.equal(facts.B01, undefined);
});

test("eine Stufe nur dort, wo die Frage geordnete Antworten hat", () => {
  const cards = buildVentureSnapshot([entry("K01", { optionId: "K01_o1" }), entry("U04", { optionId: "U04_o5" })]);
  const facts = Object.fromEntries(cards.flatMap((c) => c.facts).map((f) => [f.itemId, f]));
  assert.equal(getItemV22("K01")!.answerFormat, "single_choice");
  assert.equal(facts.K01.kind, "statement", "eine Wahl ohne Ordnung bekommt keine Achse");
  assert.equal(getItemV22("U04")!.answerFormat, "ordinal_choice");
  assert.equal(facts.U04.kind, "scale");
});

test("ohne Antworten keine Karten", () => {
  assert.deepEqual(buildVentureSnapshot([]), []);
  assert.deepEqual(buildVentureSnapshot([missing("R01", "not_decided")]), []);
});

test("kein Score, kein Prozent, kein Radar, keine Rangfolge", () => {
  for (const path of ["src/features/reporting/ventureSnapshotModel.ts", "src/features/reporting/VentureSnapshot.tsx", "src/features/reporting/ventureSnapshotData.ts"]) {
    const code = codeOnly(path);
    assert.doesNotMatch(code, /score|percent|Prozent|%|radar|rank|average|Math\.(round|max|min)|reduce\(/i, path);
  }
  // Die Achse markiert EIN Segment - die gewaehlte Stufe -, keinen Fuellstand.
  assert.match(codeOnly("src/features/reporting/VentureSnapshot.tsx"), /index \+ 1 === fact\.position \? "bg-slate-800" : "bg-slate-200"/);
  for (const locale of ["de", "en"]) {
    const venture = JSON.stringify(JSON.parse(read(`messages/${locale}/profile.json`)).founderProfile.venture);
    assert.doesNotMatch(venture, /%|score|Punkt(e|zahl)|kompatib|compatib|\bPassung|\bfit\b|\bbest\b/i, locale);
  }
});

test("nur eigene Antworten zu einem nicht archivierten Vorhaben - und nie im Druck", () => {
  const loader = codeOnly("src/features/reporting/ventureSnapshotData.ts");
  assert.match(loader, /\.eq\("user_id", userId\)/);
  assert.match(loader, /\.eq\("venture_id", ventureId\)/);
  assert.match(loader, /\.in\("block_id", \[\.\.\.SNAPSHOT_ITEM_IDS\]\)/);
  const page = codeOnly("src/app/me/profile/page.tsx");
  // Das Vorhaben kommt aus den eigenen, nicht archivierten (profileVentures).
  assert.match(page, /const aktuellesVorhaben = visibleVentures\.find\(\(venture\) => venture\.id === wahl\) \?\? visibleVentures\[0\] \?\? null;/);
  assert.match(codeOnly("src/features/reporting/profileReadModel.ts"), /visibleVentures: profileVentures\(ventures\)/);
  assert.doesNotMatch(codeOnly("src/app/me/profile/print/page.tsx"), /VentureSnapshot|getVentureSnapshot/);
  // Keine Teamkarten mehr: ein Auswahlfeld bei mehreren Vorhaben.
  assert.match(page, /<select\s*name="vorhaben"/);
  assert.doesNotMatch(page, /ventures\.alone|ventures\.withTeam/);
});

test("jede Karte und jede Frage hat eine Beschriftung in DE und EN", () => {
  for (const locale of ["de", "en"]) {
    const venture = JSON.parse(read(`messages/${locale}/profile.json`)).founderProfile.venture;
    for (const { key } of SNAPSHOT_LAYOUT) assert.ok(venture.cards[key], `${locale}: cards.${key}`);
    for (const itemId of SNAPSHOT_ITEM_IDS) assert.ok(venture.facts[itemId], `${locale}: facts.${itemId}`);
    for (const key of ["title", "intro", "select", "show", "current", "empty", "emptyText", "emptyCta", "draft", "allAnswers", "continue"]) {
      assert.ok(venture[key], `${locale}: venture.${key}`);
    }
    assert.ok(JSON.parse(read(`messages/${locale}/navigation.json`)).profileVenture, `${locale}: navigation.profileVenture`);
  }
});
