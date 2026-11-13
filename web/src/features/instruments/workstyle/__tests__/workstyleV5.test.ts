import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { WORKSTYLE_PRETEST_V5, workstyleRegistryFor, workstyleSessionItems, type WorkstyleRegistry } from "@/features/instruments/workstyle/registry";
import { parseWorkstyleV5Answer } from "@/features/instruments/workstyle/answers";
import { workstyleDisplayItem, workstyleDisplayOptions } from "@/features/instruments/workstyle/display";
import { CURRENT_WORKSTYLE_HREF, CURRENT_WORKSTYLE_INSTRUMENT, CURRENT_WORKSTYLE_VERSION } from "@/features/instruments/workstyle/current";
import { withWorkstyleCopy } from "@/features/instruments/workstyle/__tests__/localizedSource";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const registry: WorkstyleRegistry = read("docs/founder-workstyle-pretest-8.5a-v5.json");
const source = read(`../${registry.source}`);
const code = (path: string) => withWorkstyleCopy(readFileSync(path, "utf8")).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("v5 is generated from the frozen question source and its bytes are pinned", () => {
  execFileSync("python3", ["-I", "scripts/build-workstyle-v5-registry.py", "--check"]);
  assert.equal(createHash("sha256").update(readFileSync("docs/founder-workstyle-pretest-8.5a-v5.json")).digest("hex"), "559553519f85ec308f9af7c502978a479683587f7d0e76285928da74b0f10ff3");
  assert.equal(registry.assessment_version, "8.5a-v5");
  assert.equal(registry.registry_version, "5.0.0");
  assert.ok(registry.items.every(i => i.assessment_version === "8.5a-v5" && i.item_version === "v5.0"));
});

test("exactly 29 product core items and no research part", () => {
  assert.equal(registry.items.length, 29);
  assert.deepEqual(registry.actual_counts, { pool: 29, core: 29, research_only: 0 });
  assert.ok(registry.items.every(i => i.usage === "core" && !i.research_only && i.scientific_status === "core" && i.area_status === "development_area"));
  assert.deepEqual(
    Object.fromEntries(["EVI", "EXP", "EL", "VOICE", "AMB", "ORG"].map(area => [area, registry.items.filter(i => i.area_key === area).length])),
    { EVI: 5, EXP: 5, EL: 4, VOICE: 5, AMB: 4, ORG: 6 },
  );
  assert.ok(Object.values(registry.scoring).every(value => value === false));
});

test("formats: 20 A/B choices, 5 influence items (EXP), 4 unrest items (AMB) - no likelihood, no reversed items", () => {
  const byFormat = (format: string) => registry.items.filter(i => i.response_format === format).map(i => i.item_key);
  assert.equal(byFormat("comparative").length, 20);
  assert.deepEqual(byFormat("influence").sort(), ["EXP-01", "EXP-02", "EXP-03", "EXP-04", "EXP-06"]);
  assert.deepEqual(byFormat("ambiguity_unrest").sort(), ["AMB-01", "AMB-02", "AMB-04", "AMB-05"]);
  assert.deepEqual(Object.keys(registry.response_formats).sort(), ["ambiguity_unrest", "influence"]);
  for (const item of registry.items) {
    if (item.response_format === "comparative") {
      assert.deepEqual(item.options!.map(o => o.label), ["deutlich eher A", "eher A", "eher B", "deutlich eher B"]);
      assert.deepEqual(item.alternatives!.map(a => a.option_id), ["A", "B"]);
      assert.deepEqual(item.rendered_order, ["A", "B"]);
    } else {
      assert.deepEqual([item.options, item.alternatives, item.rendered_order], [[], [], null]);
    }
  }
});

test("poles: every A/B item names two distinct poles; per area both poles occur on both sides", () => {
  assert.deepEqual(Object.keys(registry.pole_sides!).sort(), ["EL", "EVI", "ORG", "VOICE"]);
  for (const item of registry.items) {
    assert.equal(item.response_format === "comparative", Boolean(item.poles), item.item_key);
    if (item.poles) assert.notEqual(item.poles.A, item.poles.B, item.item_key);
  }
  // Ausgewogen: Der rechte Pol steht nicht immer bei A (sonst zieht die Anordnung die Antworten auf eine Seite).
  for (const area of ["EVI", "EL", "VOICE", "ORG"]) {
    const sides = registry.pole_sides![area];
    const items = registry.items.filter(i => i.area_key === area && i.poles && sides[i.poles.A] && sides[i.poles.B]);
    const rightIsA = items.map(i => sides[i.poles!.A] === "right");
    assert.ok(rightIsA.includes(true) && rightIsA.includes(false), `${area}: A is right and left at least once`);
    for (const item of items) assert.notEqual(sides[item.poles!.A], sides[item.poles!.B], item.item_key);
  }
  // ORG hat zwei Facetten: Struktur/Fluss (Einzelantworten, keine Achse) und Fokus/Planstabilitaet (Achse).
  const facetA = registry.items.filter(i => i.facet === "vorbereitung_rhythmus").map(i => i.item_key).sort();
  assert.deepEqual(facetA, ["ORG-01", "ORG-02"]);
  assert.ok(registry.items.filter(i => i.facet === "fokus_planstabilitaet").every(i => i.area_key === "ORG"));
  assert.ok(registry.items.every(i => i.facet === null || i.facet_status === "development_mapping"));
});

test("wording is taken verbatim from the frozen source, the instruction is part of the manifest", () => {
  for (const entry of source.items) {
    const item = registry.items.find(i => i.item_key === entry.key)!;
    assert.equal(item.prompt, entry.prompt);
    assert.equal(item.response_format, entry.format);
    assert.deepEqual(item.alternatives!.map(a => a.label), entry.alternatives ?? []);
  }
  assert.match(registry.instruction!.de, /nicht die, die du grundsätzlich für besser hältst/);
  assert.match(registry.instruction!.en, /not the one you think is better in general/);
});

test("fixed order has no consecutive areas; v5 item identities never collide with older versions", () => {
  assert.deepEqual(registry.items.map(i => i.item_key), registry.item_order);
  for (let i = 1; i < registry.items.length; i++) assert.notEqual(registry.items[i].area_key, registry.items[i - 1].area_key);
  for (const older of ["v3", "v4"]) {
    const old: WorkstyleRegistry = read(`docs/founder-workstyle-pretest-8.5a-${older}.json`);
    const identities = new Set(old.items.map(i => `${i.item_key}/${i.item_version}`));
    assert.ok(registry.items.every(i => !identities.has(`${i.item_key}/${i.item_version}`)), older);
  }
});

test("the app resolves v5 exactly and names it the current version", () => {
  assert.equal(workstyleRegistryFor("8.5a-v5"), WORKSTYLE_PRETEST_V5);
  assert.equal(workstyleSessionItems("8.5a-v5", null).length, 29);
  assert.deepEqual(workstyleSessionItems("8.5a-v5", null).map(i => i.item_key), registry.item_order);
  assert.throws(() => workstyleSessionItems("8.5a-v5", "A"), /unexpected_workstyle_form/);
  assert.equal(CURRENT_WORKSTYLE_INSTRUMENT, "founder-workstyle-pretest-8-5a-v5");
  assert.equal(CURRENT_WORKSTYLE_VERSION, "8.5a-v5");
  assert.equal(CURRENT_WORKSTYLE_HREF, "/research/workstyle-pretest?version=8.5a-v5");
});

test("v5 answers: A/B as options with presentation, scales 1-5, no crossover with older item versions", () => {
  const scale = parseWorkstyleV5Answer("EXP-02", "v5.0", { response_value: 4, response_option: null, missing_reason: null, rendered_order: null });
  assert.equal(scale.assessment_version, "8.5a-v5");
  const choice = parseWorkstyleV5Answer("EVI-01", "v5.0", { response_value: null, response_option: "strong_a", missing_reason: null, rendered_order: ["A", "B"] });
  assert.deepEqual([choice.response_option, choice.rendered_order], ["strong_a", ["A", "B"]]);
  const bad = [
    ["EVI-01", "v5.0", { response_value: 2, response_option: null, missing_reason: null, rendered_order: ["A", "B"] }],
    ["EVI-01", "v5.0", { response_value: null, response_option: "strong_a", missing_reason: null, rendered_order: ["B", "A"] }],
    ["EXP-02", "v5.0", { response_value: 6, response_option: null, missing_reason: null, rendered_order: null }],
    ["EXP-02", "v4.0", { response_value: 4, response_option: null, missing_reason: null, rendered_order: null }],
    ["DEC-01", "v5.0", { response_value: 4, response_option: null, missing_reason: null, rendered_order: null }],
  ] as const;
  for (const [key, version, input] of bad) assert.throws(() => parseWorkstyleV5Answer(key, version, input), key);
});

test("English display covers all 29 v5 questions and their A/B options without changing stored values", () => {
  const en = read("src/features/instruments/workstyle/display.v5.en.json").items as Record<string, { prompt: string; alternatives?: Record<string, string> }>;
  assert.deepEqual(Object.keys(en).sort(), [...registry.core_item_keys].sort());
  for (const item of WORKSTYLE_PRETEST_V5.items) {
    const display = workstyleDisplayItem(item, "en");
    assert.equal(display.prompt, en[item.item_key].prompt);
    assert.doesNotMatch(JSON.stringify(en[item.item_key]), /[äöüÄÖÜß]/, item.item_key);
    assert.deepEqual(workstyleDisplayOptions(item, "en").map(o => o.value), workstyleDisplayOptions(item, "de").map(o => o.value));
    if (item.response_format === "comparative") assert.deepEqual(display.alternatives?.map(a => a.option_id), ["A", "B"]);
    for (const alternative of display.alternatives ?? []) assert.equal(alternative.label, en[item.item_key].alternatives?.[alternative.option_id]);
    assert.equal(workstyleDisplayItem(item, "de"), item);
  }
});

test("questionnaire: 29 questions, instruction first, no research part, no consent, no timings", () => {
  const flow = code("src/features/instruments/workstyle/WorkstyleV5Flow.tsx");
  assert.match(flow, /const items = workstyleSessionItems\("8\.5a-v5", null\);/);
  assert.match(flow, /startWorkstyleV5\(\)/);
  assert.match(flow, /saveWorkstyleV5\(s\.assessment_id, item\.item_key/);
  assert.match(flow, /WORKSTYLE_PRETEST_V5\.instruction/);
  assert.doesNotMatch(flow, /consent|Einwilligung|startWorkstyleResearch|startWorkstyleProduct|saveWorkstyleV3|saveWorkstyleV4|saveWorkstyleFeedback|ContextFields|research|Forschung|elapsed|response_time/i);
  const actions = code("src/features/instruments/workstyle/actions.ts");
  const v5 = actions.slice(actions.indexOf("export async function startWorkstyleV5"));
  assert.match(v5, /client\.rpc\("start_workstyle_v5", \{ p_new: newAssessment \}\)/);
  assert.match(v5, /client\.rpc\("save_workstyle_v5", \{/);
  assert.doesNotMatch(v5, /consent|context|response_time|p_finalize/);
  assert.doesNotMatch(actions, /startWorkstyleV4|saveWorkstyleV4/);
  // Bei jeder Zweierwahl erinnert eine Zeile daran, was gefragt ist.
  assert.match(code("src/features/instruments/workstyle/WorkstyleQuestion.tsx"), /data-workstyle-choice-hint/);
  for (const locale of ["de", "en"]) assert.ok(read(`messages/${locale}/workstyleFlow.json`).v5_choice_hint, locale);
});

test("route: the current version opens the v5 questionnaire; v4 is no longer resumable and leads to v5", () => {
  const page = code("src/app/(product)/research/workstyle-pretest/page.tsx");
  assert.match(page, /const version = query\.version \?\? CURRENT_WORKSTYLE_VERSION;/);
  assert.match(page, /if \(version === "8\.5a-v5"\) \{/);
  assert.match(page, /<WorkstyleV5Flow initialSession=\{session\} context=\{completionContext\} previousVersion=\{Boolean\(previous\?\.submitted_at\)\} \/>/);
  assert.match(page, /version === "8\.5a-v4" \|\| !earlier/);
  assert.match(page, /\["8\.5a-v1", "8\.5a-v2", "8\.5a-v3", "8\.5a-v4", "8\.5a-v5"\]/);
});
