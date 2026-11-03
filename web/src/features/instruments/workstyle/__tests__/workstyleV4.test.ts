import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { WorkstyleRegistry } from "@/features/instruments/workstyle/registry";

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
