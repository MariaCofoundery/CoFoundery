import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { WORKSTYLE_PRETEST_V3, WORKSTYLE_PRETEST_V4, workstyleRegistryFor, workstyleSessionItems, type WorkstyleRegistry } from "@/features/instruments/workstyle/registry";
import { parseWorkstyleV3Answer, parseWorkstyleV4Answer } from "@/features/instruments/workstyle/answers";
import { workstyleDisplayItem, workstyleDisplayOptions } from "@/features/instruments/workstyle/display";
import { CURRENT_WORKSTYLE_HREF, CURRENT_WORKSTYLE_INSTRUMENT, CURRENT_WORKSTYLE_VERSION } from "@/features/instruments/workstyle/current";
import { withWorkstyleCopy } from "@/features/instruments/workstyle/__tests__/localizedSource";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const registry: WorkstyleRegistry = read("docs/founder-workstyle-pretest-8.5a-v4.json");
const v3: WorkstyleRegistry = read("docs/founder-workstyle-pretest-8.5a-v3.json");
const source: { key: string; format: string; prompt: string; alternatives: string[] | null; unchanged: boolean }[] = read(`../${registry.source}`);

test("v4 is generated from the frozen Endfassung-29 source and its bytes are pinned", () => {
  execFileSync("python3", ["-I", "scripts/build-workstyle-v4-registry.py", "--check"]);
  assert.equal(createHash("sha256").update(readFileSync("docs/founder-workstyle-pretest-8.5a-v4.json")).digest("hex"), "349f3817cf94aaff9c26fee54e4460e2e558291a32dc890b6334a071f87ad632");
  assert.equal(registry.assessment_version, "8.5a-v4");
  assert.equal(registry.registry_version, "4.0.0");
  assert.ok(registry.items.every(i => i.assessment_version === "8.5a-v4" && i.item_version === "v4.0"));
});

test("exactly 29 product core items and no research part", () => {
  assert.equal(registry.items.length, 29);
  assert.deepEqual(registry.actual_counts, { pool: 29, core: 29, research_only: 0 });
  assert.deepEqual(registry.scientific_counts, { core: 29 });
  assert.equal(new Set(registry.core_item_keys).size, 29);
  assert.ok(registry.items.every(i => i.usage === "core" && !i.research_only && i.scientific_status === "core" && i.area_status === "development_area" && i.product_status === "pretest_comparison_candidate"));
  assert.deepEqual(Object.fromEntries(["ORG", "EXP", "EVI", "VOICE", "AMB", "EL", "DEC", "FS"].map(area => [area, registry.items.filter(i => i.area_key === area).length])), { ORG: 6, EXP: 5, EVI: 5, VOICE: 5, AMB: 4, EL: 4, DEC: 0, FS: 0 });
  assert.deepEqual(new Set(registry.core_item_keys), new Set(v3.core_item_keys));
  assert.ok(Object.values(registry.scoring).every(value => value === false));
});

test("formats: all EXP on influence, EVI-01/03/05 and four ORG items as A/B, no seriousness scale", () => {
  const byFormat = (format: string) => registry.items.filter(i => i.response_format === format).map(i => i.item_key).sort();
  assert.deepEqual(byFormat("comparative"), ["EVI-01", "EVI-03", "EVI-05", "ORG-03", "ORG-04", "ORG-07", "ORG-08"]);
  assert.deepEqual(byFormat("influence"), ["EXP-01", "EXP-02", "EXP-03", "EXP-04", "EXP-06"]);
  assert.deepEqual(byFormat("ambiguity_discomfort"), ["AMB-01", "AMB-02", "AMB-04", "AMB-05"]);
  assert.equal(byFormat("likelihood").length, 13);
  assert.deepEqual(Object.keys(registry.response_formats).sort(), ["ambiguity_discomfort", "influence", "likelihood"]);
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

test("wording is taken verbatim from the source; only EVI-06, VOICE-05, AMB-05 and EL-01 equal v3", () => {
  for (const entry of source) {
    const item = registry.items.find(i => i.item_key === entry.key)!;
    assert.equal(item.prompt, entry.prompt);
    assert.equal(item.response_format, entry.format);
    assert.deepEqual(item.alternatives!.map(a => a.label), entry.alternatives ?? []);
  }
  assert.deepEqual(source.filter(e => e.unchanged).map(e => e.key).sort(), ["AMB-05", "EL-01", "EVI-06", "VOICE-05"]);
  for (const item of registry.items) {
    const old = v3.items.find(i => i.item_key === item.item_key)!;
    const same = old.prompt === item.prompt && old.response_format === item.response_format && JSON.stringify(old.alternatives) === JSON.stringify(item.alternatives);
    assert.equal(same, source.find(e => e.key === item.item_key)!.unchanged, item.item_key);
  }
});

test("fixed order keeps the v3 core sequence, without consecutive areas or consecutive A/B items", () => {
  assert.deepEqual(registry.item_order, v3.item_order!.filter(key => registry.core_item_keys.includes(key)));
  assert.deepEqual(registry.items.map(i => i.item_key), registry.item_order);
  assert.deepEqual(registry.core_item_keys, registry.item_order);
  assert.deepEqual(registry.forms, {});
  for (let i = 1; i < registry.items.length; i++) {
    assert.notEqual(registry.items[i].area_key, registry.items[i - 1].area_key);
    assert.ok(registry.items[i].response_format !== "comparative" || registry.items[i - 1].response_format !== "comparative");
  }
});

test("v4 item identities never collide with v3", () => {
  const v3Identities = new Set(v3.items.map(i => `${i.item_key}/${i.item_version}`));
  assert.ok(registry.items.every(i => !v3Identities.has(`${i.item_key}/${i.item_version}`)));
});

// ---------------------------------------------------------------------------
// App: Registry, aktuelle Fassung, Antwortpruefung, Anzeige, Fragebogen
// ---------------------------------------------------------------------------
const code = (path: string) => withWorkstyleCopy(readFileSync(path, "utf8")).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("the app registry validates v4 and resolves it exactly; v3 stays its own version", () => {
  assert.equal(workstyleRegistryFor("8.5a-v4"), WORKSTYLE_PRETEST_V4);
  assert.equal(workstyleRegistryFor("8.5a-v3"), WORKSTYLE_PRETEST_V3);
  assert.equal(workstyleSessionItems("8.5a-v4", null).length, 29);
  assert.deepEqual(workstyleSessionItems("8.5a-v4", null).map(i => i.item_key), registry.item_order);
  assert.throws(() => workstyleSessionItems("8.5a-v4", "A"), /unexpected_workstyle_form/);
  assert.equal(CURRENT_WORKSTYLE_INSTRUMENT, "founder-workstyle-pretest-8-5a-v4");
  assert.equal(CURRENT_WORKSTYLE_VERSION, "8.5a-v4");
  assert.equal(CURRENT_WORKSTYLE_HREF, "/research/workstyle-pretest?version=8.5a-v4");
});

test("v4 answers: own item version, A/B as options with presentation, scales 1-5, no v3 crossover", () => {
  const scale = parseWorkstyleV4Answer("EVI-02", "v4.0", { response_value: 4, response_option: null, missing_reason: null, rendered_order: null });
  assert.equal(scale.assessment_version, "8.5a-v4");
  const choice = parseWorkstyleV4Answer("EVI-01", "v4.0", { response_value: null, response_option: "strong_a", missing_reason: null, rendered_order: ["A", "B"] });
  assert.deepEqual([choice.response_option, choice.rendered_order], ["strong_a", ["A", "B"]]);
  const bad = [
    ["EVI-01", "v4.0", { response_value: 2, response_option: null, missing_reason: null, rendered_order: ["A", "B"] }],
    ["EVI-01", "v4.0", { response_value: null, response_option: "strong_a", missing_reason: null, rendered_order: ["B", "A"] }],
    ["EVI-02", "v4.0", { response_value: 6, response_option: null, missing_reason: null, rendered_order: null }],
    ["EVI-02", "8.4-v0.4", { response_value: 4, response_option: null, missing_reason: null, rendered_order: null }],
    ["DEC-01", "v4.0", { response_value: 4, response_option: null, missing_reason: null, rendered_order: null }],
  ] as const;
  for (const [key, version, input] of bad) assert.throws(() => parseWorkstyleV4Answer(key, version, input), key);
  // The v3 parser never accepts a v4 item version.
  assert.throws(() => parseWorkstyleV3Answer("EVI-02", "v4.0", { response_value: 4, response_option: null, missing_reason: null, rendered_order: null }));
});

test("English display covers all 29 v4 questions and their A/B options without changing stored values", () => {
  const en = read("src/features/instruments/workstyle/display.v4.en.json").items as Record<string, { prompt: string; alternatives?: Record<string, string> }>;
  assert.deepEqual(Object.keys(en).sort(), [...registry.core_item_keys].sort());
  const v3en = read("src/features/instruments/workstyle/display.en.json").items as Record<string, { prompt: string }>;
  for (const item of WORKSTYLE_PRETEST_V4.items) {
    const display = workstyleDisplayItem(item, "en");
    assert.equal(display.prompt, en[item.item_key].prompt);
    assert.match(display.prompt, /(How|Which) [^?]*\?$/, `${item.item_key}: the question ends the prompt`);
    assert.deepEqual(workstyleDisplayOptions(item, "en").map(o => o.value), workstyleDisplayOptions(item, "de").map(o => o.value));
    if (item.response_format === "comparative") assert.deepEqual(display.alternatives?.map(a => a.option_id), ["A", "B"]);
    for (const alternative of display.alternatives ?? []) assert.equal(alternative.label, en[item.item_key].alternatives?.[alternative.option_id]);
    // Unchanged German wording keeps the unchanged English wording.
    if (source.find(entry => entry.key === item.item_key)!.unchanged) assert.equal(display.prompt, v3en[item.item_key].prompt);
    assert.equal(workstyleDisplayItem(item, "de"), item);
  }
});

test("questionnaire: 29 questions, no research part, no consent, no context, no timings", () => {
  const flow = code("src/features/instruments/workstyle/WorkstyleV4Flow.tsx");
  assert.match(flow, /const items = workstyleSessionItems\("8\.5a-v4", null\);/);
  assert.match(flow, /startWorkstyleV4\(\)/);
  assert.match(flow, /saveWorkstyleV4\(s\.assessment_id, item\.item_key/);
  assert.doesNotMatch(flow, /consent|Einwilligung|startWorkstyleResearch|startWorkstyleProduct|saveWorkstyleV3|saveWorkstyleFeedback|ContextFields|research|Forschung|elapsed|response_time/i);
  const actions = code("src/features/instruments/workstyle/actions.ts");
  const v4 = actions.slice(actions.indexOf("export async function startWorkstyleV4"));
  assert.match(v4, /client\.rpc\("start_workstyle_v4", \{ p_new: newAssessment \}\)/);
  assert.match(v4, /client\.rpc\("save_workstyle_v4", \{/);
  assert.doesNotMatch(v4, /consent|context|response_time|p_finalize/);
});

test("route: the current version opens the v4 questionnaire; v3 only resumes and points to v4 for a new start", () => {
  const page = code("src/app/(product)/research/workstyle-pretest/page.tsx");
  assert.match(page, /const version = query\.version \?\? CURRENT_WORKSTYLE_VERSION;/);
  assert.match(page, /if \(version === "8\.5a-v4"\) \{/);
  assert.match(page, /<WorkstyleV4Flow initialSession=\{session\} context=\{completionContext\} previousVersion=\{Boolean\(previous\?\.submitted_at\)\} \/>/);
  // Earlier versions only for people who already have a participation there.
  assert.match(page, /if \(version !== CURRENT_WORKSTYLE_VERSION && \(!user \|\| !\(await getMyWorkstylePretest\(version\)\)\)\) \{/);
  const v3 = code("src/features/instruments/workstyle/WorkstyleProfileFlow.tsx");
  assert.doesNotMatch(v3, /startWorkstyleProduct\(true\)/);
  assert.match(v3, /<Link href=\{CURRENT_WORKSTYLE_HREF\}[^>]*>\s*Neue Fassung beantworten\s*<\/Link>/);
  const actions = code("src/features/instruments/workstyle/actions.ts");
  assert.match(actions, /if \(newAssessment \|\| !\(await getMyWorkstylePretest\("8\.5a-v3"\)\)\)/);
});

test("own report: a v3 profile is marked as the earlier version and cannot be shared from the page", () => {
  const page = code("src/app/me/profile/workstyle/page.tsx");
  assert.match(page, /\{older && \(/);
  assert.match(page, /t\("olderVersion\.title"\)/);
  assert.match(page, /href=\{CURRENT_WORKSTYLE_HREF\}/);
  assert.match(page, /\{!older && <section id="freigaben"/);
  for (const locale of ["de", "en"]) {
    const copy = read(`messages/${locale}/report.json`).workstyle.olderVersion;
    assert.ok(copy.title && copy.body && copy.cta, locale);
    assert.doesNotMatch(JSON.stringify(copy), /\d\s*%|Score|Punkt/);
  }
});
