import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { MODULE_ADAPTERS, ventureCoreAdapter, ventureTradeoffsAdapter } from "@/features/modules/adapters";
import { cardStateOf, deepeningsOf } from "@/features/modules/deepeningCards";
import { VENTURE_TRADEOFFS_MODULE } from "@/features/modules/definitions";
import { MODULE_REGISTRY } from "@/features/modules/registry";
import { readTradeoff, readTradeoffs } from "@/features/modules/tradeoffs/readout";
import { TRADEOFF_ITEM_IDS, tradeoffItems, VENTURE_TRADEOFFS } from "@/features/modules/tradeoffs/registry";
import type { AssessmentRow, ModuleContext } from "@/features/modules/types";
import { validateModuleRegistry } from "@/features/modules/validate";
import { INSTRUMENT_IDS } from "@/features/instruments/instruments";
import ventureRegistry from "../../../../docs/venture-alignment-registry-v1.json";

const read = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const user = { id: "u-1" };
const row = (over: Partial<AssessmentRow>): AssessmentRow => ({
  instrument_id: "venture-tradeoffs-v1",
  venture_id: "v-1",
  submitted_at: null,
  created_at: "2026-10-01T10:00:00Z",
  ...over,
});
const ctx = (over: Partial<ModuleContext>): ModuleContext =>
  ({ ventureId: "v-1", ventureAssessments: [], tradeoffsAssessments: [], tradeoffsAnswers: [], ...over }) as ModuleContext;

test("Registry und Instrument: vier Situationen, bekannte ID, Registry laeuft durch den Validator", () => {
  assert.ok((INSTRUMENT_IDS as readonly string[]).includes("venture-tradeoffs-v1"));
  assert.deepEqual(tradeoffItems().map((i) => i.itemId), [...TRADEOFF_ITEM_IDS]);
  assert.deepEqual(validateModuleRegistry(MODULE_REGISTRY).filter(Boolean), []);
  assert.equal(VENTURE_TRADEOFFS_MODULE.deepens, "venture_core");
  assert.deepEqual(deepeningsOf("venture_core").map((d) => d.moduleId), ["venture_tradeoffs"]);
});

test("Inhalt: W03-W06 sind die bestehenden Items - Wortlaut, Anliegen, Wege, Stufen unveraendert", () => {
  const source = (ventureRegistry as { items: Array<Record<string, unknown>> }).items;
  for (const item of tradeoffItems()) {
    const old = source.find((s) => s.itemId === item.itemId);
    assert.ok(old, item.itemId);
    for (const key of ["prompt", "concerns", "paths", "ratingOptions", "missing", "answerFormat"]) {
      assert.deepEqual((item as Record<string, unknown>)[key], old[key], `${item.itemId}.${key}`);
    }
  }
  assert.equal(VENTURE_TRADEOFFS.items.length, 4);
});

test("Status: abgegeben bleibt done_for_now, auch mit neuem Entwurf; Entwurf allein ist in_progress", () => {
  assert.equal(ventureTradeoffsAdapter.status(user, ctx({})).state, "not_started");
  assert.equal(cardStateOf("not_started"), "available");
  const draft = row({});
  assert.equal(ventureTradeoffsAdapter.status(user, ctx({ tradeoffsAssessments: [draft] })).state, "in_progress");
  const done = row({ submitted_at: "2026-09-01T10:00:00Z", created_at: "2026-09-01T09:00:00Z" });
  const both = ventureTradeoffsAdapter.status(user, ctx({ tradeoffsAssessments: [draft, done] }));
  assert.equal(both.state, "done_for_now");
  assert.equal(both.completedVersion, "venture-tradeoffs-v1");
});

test("Unabhaengigkeit: Zielkonflikte beeinflussen Venture-Core nicht - und umgekehrt", () => {
  const ventureDone = row({ instrument_id: "venture-alignment-v1", submitted_at: "2026-09-01T10:00:00Z" });
  const tradeoffsDone = row({ submitted_at: "2026-09-01T10:00:00Z" });
  // Nur Tradeoffs abgegeben: Venture-Core bleibt offen.
  assert.equal(ventureCoreAdapter.status(user, ctx({ ventureAssessments: [tradeoffsDone] })).state, "not_started");
  // Nur Venture-Core abgegeben: Tradeoffs bleibt ein Angebot.
  assert.equal(ventureTradeoffsAdapter.status(user, ctx({ tradeoffsAssessments: [ventureDone] })).state, "not_started");
  // Fremdes Vorhaben zaehlt nicht.
  assert.equal(
    ventureTradeoffsAdapter.status(user, ctx({ tradeoffsAssessments: [row({ venture_id: "v-2", submitted_at: "2026-09-01T10:00:00Z" })] })).state,
    "not_started"
  );
  assert.ok(MODULE_ADAPTERS.venture_tradeoffs);
});

const item = (id: string) => tradeoffItems().find((i) => i.itemId === id)!;

test("Ergebnis: nur aus gewaehlten Wegen und Gewichten - ohne Wertung", () => {
  const w03 = item("W03");
  const more = readTradeoff(w03, { value: { importanceA: 5, importanceB: 2, path: "A" } });
  assert.equal(more.statements[0]?.kind, "weights_more");
  assert.equal((more.statements[0] as { more: string }).more, w03.concerns![0]);
  assert.equal(more.statements[1]?.kind, "path");
  const equal = readTradeoff(w03, { value: { importanceA: 3, importanceB: 3, path: "B" } });
  assert.equal(equal.statements[0]?.kind, "weights_equal");
  const against = readTradeoff(w03, { value: { importanceA: 5, importanceB: 2, path: "B" } });
  assert.ok(against.statements.some((s) => s.kind === "path_against_weight"));
  const high = readTradeoff(w03, { value: { importanceA: 5, importanceB: 4, path: "A" } });
  assert.equal((high.statements[0] as { lessIsHigh: boolean }).lessIsHigh, true);
  const missing = readTradeoff(w03, { value: null, missingCode: "not_decided" });
  assert.equal(missing.path, null);
  assert.equal(missing.statements[0]?.kind, "not_decided");
  const all = readTradeoffs(tradeoffItems(), []);
  assert.equal(all.length, 4);
  assert.ok(all.every((r) => r.statements.length === 0));
});

test("Zuordnung Weg <-> Anliegen: erster Weg gehoert zum ersten Anliegen (in allen vier Situationen)", () => {
  for (const i of tradeoffItems()) {
    assert.equal(i.concerns?.length, 2, i.itemId);
    assert.ok((i.paths?.length ?? 0) >= 2, i.itemId);
  }
});

test("DE/EN: gleiche Schluessel in ventureTradeoffs.json, keine Scores, kein Prozent, kein x von y", () => {
  const keys = (o: unknown, p = ""): string[] =>
    Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
      v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]
    );
  const de = JSON.parse(read("messages/de/ventureTradeoffs.json"));
  const en = JSON.parse(read("messages/en/ventureTradeoffs.json"));
  assert.deepEqual(keys(de).sort(), keys(en).sort());
  const dem = JSON.parse(read("messages/de/modules.json"));
  const enm = JSON.parse(read("messages/en/modules.json"));
  assert.deepEqual(keys(dem).sort(), keys(enm).sort());
  for (const text of [read("messages/de/ventureTradeoffs.json"), read("messages/en/ventureTradeoffs.json")]) {
    assert.doesNotMatch(text, /\d\s*%|Prozent|percent|\bScore\b|\d+\s+(von|of)\s+\d+|kompatibel|compatible/i);
  }
});

test("Legacy-Uebernahme nur auf ausdrueckliche Handlung; keine Teamsicht, kein Sharing", () => {
  const actions = codeOnly("src/features/modules/tradeoffs/actions.ts");
  assert.match(actions, /source/);
  assert.match(actions, /legacy/);
  // Kopiert wird nur in startTradeoffs, nie in Laden/Speichern/Abgeben.
  const copies = [...actions.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
  assert.deepEqual(copies.sort(), ["clearTradeoffAnswer", "saveTradeoffAnswer", "startTradeoffs", "submitTradeoffs"]);
  const page = codeOnly("src/app/(product)/founder-alignment/vorhaben/zielkonflikte/page.tsx");
  assert.match(page, /legacy/);
  assert.doesNotMatch(page, /share|teilen|Team-?Vergleich/i);
  for (const f of walk("src/features/modules/ui").filter((n) => /Tradeoffs/.test(n))) {
    assert.doesNotMatch(codeOnly(f), /alignment_shares|\.rpc\(/, f);
  }
});

test("alte Leser sehen das neue Instrument nicht: jede Abfrage auf venture_alignment nennt ihr Instrument", () => {
  const offenders = walk("src").filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) && !f.includes(join("modules", "tradeoffs"))
  ).filter((f) => {
    const code = codeOnly(f);
    return /module["']?,\s*["']venture_alignment["']/.test(code) && !/instrument_id|VENTURE_ALIGNMENT_INSTRUMENT_ID|instrumentId/.test(code);
  });
  assert.deepEqual(offenders, []);
});
