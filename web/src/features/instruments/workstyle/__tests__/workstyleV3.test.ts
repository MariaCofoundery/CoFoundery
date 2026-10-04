import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { WORKSTYLE_PRETEST_V3 as registry, workstyleItemFor, workstyleRegistryFor, workstyleSessionItems, workstyleResponseOptions, validateWorkstyleRegistry } from "@/features/instruments/workstyle/registry";
import { parseWorkstyleAnswer, parseWorkstyleV3Answer } from "@/features/instruments/workstyle/answers";
import { workstyleLongExport, workstyleStatistics } from "@/features/instruments/workstyle/analytics";
import { checkWorkstyleTeamReadiness, type WorkstyleTeamInputs } from "@/features/instruments/workstyle/teamReadiness";
import { getItemsV22 } from "@/features/instruments/align/registries";
import type { ResearchRow } from "@/features/instruments/workstyle/data";

const order = "ORG-01 EXP-01 VOICE-01 AMB-01 DEC-01 EL-01 EVI-01 EXP-02 ORG-03 AMB-02 EL-03 VOICE-02 EVI-02 DEC-02 EXP-03 FS-R1 AMB-04 ORG-04 EL-02 EXP-04 VOICE-03 EL-05 DEC-03 AMB-05 ORG-02 EVI-03 EL-04 ORG-05 EXP-05 VOICE-04 AMB-06 DEC-04 EVI-05 ORG-06 EVI-04 FS-R2 EXP-06 VOICE-05 AMB-03 ORG-07 EVI-06 EL-06 VOICE-06 DEC-R1 AMB-R1 VOICE-R1 EVI-R1 ORG-08 EL-R1 EXP-R1 ORG-R1 DEC-R2".split(" ");
const raw = (value: number | string | null, order: readonly string[] | null = null) => ({ response_value: typeof value === "number" ? value : null, response_option: typeof value === "string" ? value : null, missing_reason: value === null ? "cannot_assess" : null, rendered_order: order });

test("v0.4 reproduces exactly 52 unique screens with 29 core and 23 private candidates/research items", () => {
  execFileSync("python3", ["scripts/build-workstyle-v3-registry.py", "--check"]);
  assert.equal(registry.items.length, 52);
  assert.equal(new Set(registry.items.map(i => i.item_key)).size, 52);
  assert.deepEqual(registry.scientific_counts, { core: 29, core_research: 6, candidate_core: 4, research: 13 });
  assert.deepEqual(Object.fromEntries(["EVI", "EXP", "EL", "VOICE", "AMB", "ORG", "DEC", "FS"].map(area => [area, registry.items.filter(i => i.area_key === area).length])), { EVI: 7, EXP: 7, EL: 7, VOICE: 7, AMB: 7, ORG: 9, DEC: 6, FS: 2 });
  assert.equal(registry.core_item_keys.length, 29);
  assert.equal(registry.items.filter(i => i.research_only).length, 23);
  assert.ok(registry.items.every(i => i.research_only === (i.scientific_status !== "core")));
  assert.ok(registry.items.filter(i => ["DEC", "FS"].includes(i.area_key!)).every(i => i.research_only && i.product_status === "excluded"));
  const source = readFileSync(`../${registry.source}`, "utf8");
  for (const item of registry.items) {
    assert.ok(source.includes(`### ${item.item_key}\n\n${item.prompt}\n`));
    if (item.response_format === "behavioral") for (const o of item.options!) assert.ok(source.includes(`- ${o.option_id}: ${o.label}`));
    for (const a of item.alternatives ?? []) assert.ok(source.includes(`- ${a.option_id}: ${a.label}`));
  }
});

test("order is immutable and mixed, without consecutive FC or visible construct blocks", () => {
  const items = workstyleSessionItems("8.5a-v3", null);
  assert.deepEqual(items.map(i => i.item_key), order);
  assert.deepEqual(registry.forms, {});
  assert.equal(registry.presentation_variant, "mixed-v1");
  for (let i = 1; i < items.length; i++) {
    assert.notEqual(items[i].area_key, items[i - 1].area_key);
    assert.ok(items[i].response_format !== "comparative" || items[i - 1].response_format !== "comparative");
  }
  assert.throws(() => Object.assign(registry.items[0], { prompt: "changed" }), TypeError);
});

test("all formats have the supplied labels; 52 missing responses preserve null and identity", () => {
  assert.deepEqual(registry.response_formats.influence.map(o => o.label), ["gar nicht", "eher wenig", "teilweise", "eher stark", "sehr stark"]);
  assert.deepEqual(registry.response_formats.seriousness.map(o => o.label), ["gar nicht ernst", "eher wenig ernst", "teilweise", "eher ernst", "sehr ernst"]);
  assert.deepEqual(workstyleResponseOptions(workstyleItemFor("ORG-03", "8.4-v0.4", "8.5a-v3")).map(o => o.label), ["deutlich eher A", "eher A", "eher B", "deutlich eher B"]);
  for (const item of registry.items) {
    const answer = parseWorkstyleV3Answer(item.item_key, item.item_version, raw(null, item.rendered_order));
    assert.equal(answer.response_value, null); assert.equal(answer.response_option, null); assert.equal(answer.missing_reason, "cannot_assess");
    assert.equal(answer.item_version, "8.4-v0.4");
    assert.equal(workstyleResponseOptions(item).length, item.response_format === "comparative" ? 4 : 5);
    assert.equal(item.stem, null);
    for (const option of workstyleResponseOptions(item)) {
      const selected = parseWorkstyleV3Answer(item.item_key, item.item_version, raw(option.value, item.rendered_order));
      assert.equal(selected.response_value, typeof option.value === "number" ? option.value : null);
      assert.equal(selected.response_option, typeof option.value === "string" ? option.value : null);
    }
  }
});

test("FC/Behavioral reject numbers, unknown options and altered presentation; ordinal items reject category IDs", () => {
  for (const key of ["EVI-04", "EL-03", "ORG-03", "DEC-01", "FS-R2"]) {
    const item = workstyleItemFor(key, "8.4-v0.4", "8.5a-v3");
    assert.throws(() => parseWorkstyleV3Answer(key, item.item_version, raw(3, item.rendered_order)));
    assert.throws(() => parseWorkstyleV3Answer(key, item.item_version, raw("unknown", item.rendered_order)));
  }
  assert.throws(() => parseWorkstyleV3Answer("ORG-03", "8.4-v0.4", raw("lean_a", ["B", "A"])));
  assert.throws(() => parseWorkstyleV3Answer("EVI-01", "8.4-v0.4", raw("lean_a")));
  assert.throws(() => parseWorkstyleV3Answer("EVI-01", "8.4-v0.4", { ...raw(3), missing_reason: "cannot_assess" }));
  assert.throws(() => parseWorkstyleAnswer({ assessment_version: "8.5a-v3", item_key: "EVI-01", item_version: "8.4-v0.4" }, null, { response_value: 3, missing_reason: null }));
  const bad = structuredClone(registry); Object.assign(bad.items.find(i => i.area_key === "DEC")!, { usage: "core", research_only: false });
  assert.throws(() => validateWorkstyleRegistry(bad));
});

const row: ResearchRow = { session_id: "pseudonym", form: null, assessment_version: "8.5a-v3", manifest_version: "3.0.0", consent_version: "workstyle_research_v3", started_at: "2026-10-04T10:00:00Z", completed_at: null, resume_position: 8, context: { founder_experience: "0", team_size: "solo" }, feedback: { other: "PRIVATE_TEXT" }, timings: { "ORG-03": 1234 }, answers: [
  { item_key: "ORG-03", item_version: "8.4-v0.4", response_value: null, response_option: "lean_b", missing_reason: null, rendered_order: ["A", "B"], answered_at: "2026-10-04T10:01:00Z" },
  { item_key: "EL-03", item_version: "8.4-v0.4", response_value: null, response_option: "C", missing_reason: null },
  { item_key: "DEC-01", item_version: "8.4-v0.4", response_value: null, response_option: null, missing_reason: "cannot_assess", rendered_order: ["A", "B"] },
] };
test("v3 admin counts categorical raw options without a numeric midpoint and separates versions", () => {
  const stats = workstyleStatistics([row, { ...row, assessment_version: "8.5a-v2" }], "8.5a-v3");
  assert.equal(stats.n, 1); assert.equal(stats.items.length, 52); assert.deepEqual(stats.forms, []);
  assert.deepEqual(stats.items.find(i => i.item.item_key === "ORG-03")!.distribution, [0, 0, 1, 0]);
  assert.deepEqual(stats.items.find(i => i.item.item_key === "EL-03")!.distribution, [0, 0, 1, 0, 0]);
  assert.equal(stats.items.find(i => i.item.item_key === "DEC-01")!.missingPercent, 100);
  assert.deepEqual(stats.dropPositions, [{ position: "9: ORG-03", n: 1 }]);
});
test("CSV exports raw options, metadata, position, answer time, order and pseudonymous session only", () => {
  const csv = workstyleLongExport([row], "8.5a-v3");
  assert.equal(csv.trimEnd().split("\r\n").length, 53);
  for (const column of ["session_id", "instrument_id", "assessment_version", "manifest_version", "item_version", "construct", "facet", "scientific_status", "response_format", "raw_answer", "item_position", "answered_at", "finalized_at", "rendered_ab_order", "consent_version"]) assert.ok(csv.includes(`"${column}"`));
  assert.match(csv, /"lean_b","","lean_b"/); assert.match(csv, /"A\|B"/); assert.match(csv, /"C","","C"/);
  assert.doesNotMatch(csv, /PRIVATE_TEXT|user_id|person_id|assessment_id|8\.4-v0\.3/);
});

test("readiness accepts only matching v3 cores, excluding DEC, FS and core_research", () => {
  const input: Extract<WorkstyleTeamInputs, { status: "ready" }> = { status: "ready", team_id: "team", team_context: "existing_team", people: ["a", "b"].map(person_id => ({ person_id, assessment_version: "8.5a-v3", instrument_id: "founder-workstyle-pretest-8-5a-v3", manifest_version: "3.0.0", workstyle_assessment_id: person_id,
    core: registry.core_item_keys.map(item_key => ({ item_key, item_version: "8.4-v0.4", value: null, missing_reason: "cannot_assess" })),
    venture_assessment_id: person_id, venture_instrument: "venture-alignment-v1", access_status: "explicit_share_or_owner",
    venture_alignment: getItemsV22("venture_alignment").filter(i => !i.retired).map(i => ({ item_key: i.itemId, value: null, missing_reason: "prefer_not_to_say" })) })) };
  assert.equal(checkWorkstyleTeamReadiness(input), input);
  for (const key of ["DEC-01", "FS-R1", "EL-03", "EXP-05"]) {
    const changed = structuredClone(input); changed.people[0].core[0].item_key = key;
    assert.deepEqual(checkWorkstyleTeamReadiness(changed), { status: "not_ready" });
  }
  for (const patch of [{ assessment_version: "8.5a-v2" }, { manifest_version: "2.0.0" }]) {
    const changed = structuredClone(input); Object.assign(changed.people[0], patch);
    assert.deepEqual(checkWorkstyleTeamReadiness(changed), { status: "not_ready" });
  }
});

test("historical item identity is namespaced by instrument/version and v3 consent text stays identical to v2", () => {
  const identities = ["8.5a-v1", "8.5a-v2", "8.5a-v3"].flatMap(v => workstyleRegistryFor(v).items.map(i => `${v}/${i.item_key}/${i.item_version}`));
  assert.equal(new Set(identities).size, identities.length);
  assert.throws(() => workstyleItemFor("ORG-03", "8.4-v0.3", "8.5a-v3"));
  const v2 = JSON.parse(readFileSync("docs/founder-workstyle-research-consent-v2.json", "utf8"));
  const v3 = JSON.parse(readFileSync("docs/founder-workstyle-research-consent-v3.json", "utf8"));
  assert.equal(v3.consent_version, "workstyle_research_v3");
  assert.deepEqual(v3.paragraphs, v2.paragraphs); assert.equal(v3.confirmation, v2.confirmation);
  assert.equal(createHash("sha256").update(readFileSync("docs/founder-workstyle-pretest-8.5a-v3.json")).digest("hex"), "9dc5a5f893a016d215ad4bea1fb95d533a26112cc5869c4194c2341d9f092053");
});
