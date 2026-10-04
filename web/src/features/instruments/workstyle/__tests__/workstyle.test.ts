import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { WORKSTYLE_PRETEST_V1 as registry, previewWorkstyleForm, workstyleItemFor, workstyleRegistryFor, validateWorkstyleRegistry } from "@/features/instruments/workstyle/registry";
import { parseWorkstyleAnswer } from "@/features/instruments/workstyle/answers";
import { median, workstyleLongExport, workstyleStatistics } from "@/features/instruments/workstyle/analytics";
import type { ResearchRow } from "@/features/instruments/workstyle/data";
import { checkWorkstyleTeamReadiness, type WorkstyleTeamInputs } from "@/features/instruments/workstyle/teamReadiness";
import { getItemsV22 } from "@/features/instruments/align/registries";

test("all supplied prompts and metadata reproduce the technical registry and SQL seed", () => {
  execFileSync("python3", ["scripts/build-workstyle-registry.py", "--check"]);
  const source = readFileSync(`../${registry.source}`, "utf8");
  for (const item of registry.items) assert.ok(source.includes(`### ${item.item_key}\n\n${item.prompt}\n`), item.item_key);
  assert.equal(registry.items.length, 37);
  assert.equal(registry.core_item_keys.length, 20);
  assert.deepEqual(Object.fromEntries(["EVI", "EXP", "EL", "VOICE", "AMB", "ORG"].map(prefix => [prefix, registry.items.filter(item => item.item_key.startsWith(`${prefix}-`)).length])), { EVI: 7, EXP: 6, EL: 5, VOICE: 6, AMB: 6, ORG: 7 });
});

test("every form starts with the exact same 20 core items, followed only by its assigned research items", () => {
  const expected = { A: ["EVI-03", "EXP-03", "EL-03", "VOICE-02", "AMB-02", "ORG-03"], B: ["EVI-04", "EXP-04", "EL-05", "VOICE-04", "AMB-05", "ORG-05"], C: ["EVI-06", "EXP-05", "VOICE-06", "AMB-06", "ORG-07"] };
  for (const form of ["A", "B", "C"] as const) {
    const items = previewWorkstyleForm(form);
    assert.deepEqual(items.slice(0, 20).map(item => item.item_key), registry.core_item_keys);
    assert.deepEqual(items.slice(20).map(item => item.item_key), expected[form]);
    assert.ok(items.slice(20).every(item => item.research_only && item.product_status === "excluded"));
    assert.ok(items.slice(0, 20).every(item => !item.research_only && item.form === null));
  }
});

test("registry rejects reclassifying a research item as productive core", () => {
  const bad = structuredClone(registry);
  const item = bad.items.find(item => item.item_key === "AMB-02")!;
  Object.assign(item, { research_only: false });
  assert.throws(() => validateWorkstyleRegistry(bad), /research_usage/);
});

test("versions resolve exactly and the loaded historical manifest cannot be mutated", () => {
  // A wording/meaning change needs a new manifest, not regeneration under the old ID.
  assert.equal(createHash("sha256").update(readFileSync("docs/founder-workstyle-pretest-8.5a-v1.json")).digest("hex"), "ec66379fc20a9c6986f77de200499f2b3a56bafa8616f43ac616b065226a2531");
  assert.equal(workstyleRegistryFor("8.5a-v1"), registry);
  assert.throws(() => workstyleRegistryFor("unknown"), /unknown_workstyle_assessment_version/);
  assert.throws(() => workstyleItemFor("EVI-01", "8.4-v0.3", "8.5a-v1"), /unknown_workstyle_item_version/);
  assert.throws(() => Object.assign(registry.items[0], { prompt: "changed" }), TypeError);
  assert.throws(() => Object.assign(registry.forms.A, { 0: "EL-02" }), TypeError);
});

const identity = { assessment_version: "8.5a-v1", item_key: "EVI-01", item_version: "8.4-v0.2" };
test("cannot_assess carries no numeric value and preserves item and assessment versions", () => {
  assert.deepEqual(parseWorkstyleAnswer(identity, "A", { response_value: null, missing_reason: "cannot_assess" }), {
    assessment_key: "founder-workstyle-pretest", ...identity, response_value: null, missing_reason: "cannot_assess",
  });
  for (const input of [{ response_value: 3, missing_reason: "cannot_assess" }, { response_value: 6, missing_reason: null }, { response_value: 2.5, missing_reason: null }, { response_value: "3", missing_reason: null }, { response_value: null, missing_reason: null }]) {
    assert.throws(() => parseWorkstyleAnswer(identity, "A", input), /invalid_workstyle_answer/);
  }
});
test("responses cannot switch assigned research form or invent unsupported missing reasons", () => {
  assert.throws(() => parseWorkstyleAnswer({ ...identity, item_key: "EVI-03" }, "B", { response_value: 3, missing_reason: null }), /workstyle_item_not_assigned/);
  assert.throws(() => parseWorkstyleAnswer({ ...identity, item_key: "ORG-01" }, "B", { response_value: null, missing_reason: "cannot_assess" }), /invalid_workstyle_answer/);
});
test("the supplied response labels and ambiguity stem are unchanged; nominal voice is absent", () => {
  assert.deepEqual(registry.response_formats.frequency.map(option => option.label), ["nie", "selten", "manchmal", "häufig", "fast immer"]);
  assert.deepEqual(registry.response_formats.experience_weight.map(option => option.label), ["gar nicht", "eher wenig", "mittel", "stark", "sehr stark"]);
  assert.deepEqual(registry.response_formats.ambiguity_comfort.map(option => option.label), ["sehr unwohl", "eher unwohl", "weder noch", "eher wohl", "sehr wohl"]);
  assert.ok(registry.items.filter(item => item.item_key.startsWith("AMB-")).every(item => item.stem === "Wie wohl fühlst du dich jeweils in dieser Situation?"));
  assert.ok(!registry.items.some(item => item.item_key === "D01"));
});

test("the research consent text is versioned independently of product sharing", () => {
  const raw = readFileSync("docs/founder-workstyle-research-consent-v1.json", "utf8");
  assert.equal(createHash("sha256").update(raw).digest("hex"), "f0c91e1860439dd847aa015865fde46f436351b7e7a39fbe807ea7441171639a");
  const text = JSON.parse(raw);
  const doc = readFileSync("../docs/research/phase-8/workstyle-research-consent-v1.md", "utf8");
  assert.equal(text.consent_version, "workstyle_research_v1");
  for (const paragraph of text.paragraphs) assert.ok(doc.includes(paragraph));
  assert.ok(doc.includes(text.confirmation));
});

const rows: ResearchRow[] = [{ session_id: "pseudonym", form: "A", assessment_version: "8.5a-v1", consent_version: "workstyle_research_v1", started_at: "2026-10-04T10:00:00Z", completed_at: null, context: { founder_experience: "none", team_size: "solo" }, timings: { "EVI-01": 1500 }, feedback: { unclear_items: ["EVI-01"], other: "PRIVATE_FREE_TEXT" }, answers: [{ item_key: "EVI-01", item_version: "8.4-v0.2", response_value: null, missing_reason: "cannot_assess" }] }];
test("analytics separate missing, unanswered and numeric answers, with core counts by form", () => {
  const stats = workstyleStatistics(rows);
  assert.equal(stats.n, 1);
  assert.equal(stats.completionRate, 0);
  assert.deepEqual(stats.dropPositions, [{ position: "2: EVI-02", n: 1 }]);
  const item = stats.items.find(row => row.item.item_key === "EVI-01")!;
  assert.equal(item.missingPercent, 100);
  assert.deepEqual(item.distribution, [0, 0, 0, 0, 0]);
  assert.equal(item.medianTimeMs, 1500);
  assert.equal(stats.coreByForm[0].forms[1].n, 0);
  assert.equal(workstyleStatistics([]).completionRate, null);
  assert.equal(median([100, 1, 3, 5]), 4);
});
test("long export preserves versions and missing, omits direct identities and free text", () => {
  const csv = workstyleLongExport(rows);
  assert.equal(csv.trimEnd().split("\r\n").length, 27);
  assert.match(csv, /"cannot_assess","missing"/);
  assert.match(csv, /"8.4-v0.2"/);
  assert.doesNotMatch(csv, /PRIVATE_FREE_TEXT|assessment_id|user_id|person_id/);
  assert.match(workstyleLongExport([{ ...rows[0], session_id: '=HYPERLINK("bad")' }]), /"'=HYPERLINK/);
});

test("team adapter requires two equally versioned cores and complete shared venture answers", () => {
  const input: Extract<WorkstyleTeamInputs, { status: "ready" }> = {
    status: "ready", team_id: "team", team_context: "existing_team",
    people: ["a", "b"].map(person => ({ person_id: person, workstyle_assessment_id: `core-${person}`, assessment_version: "8.5a-v1", instrument_id: "founder-workstyle-pretest-8-5a-v1", manifest_version: "1.0.0",
      core: registry.core_item_keys.map(key => ({ item_key: key, item_version: "8.4-v0.2", value: { scale: 3 }, missing_reason: null })),
      venture_assessment_id: `venture-${person}`, venture_instrument: "venture-alignment-v1",
      venture_alignment: getItemsV22("venture_alignment").filter(item => !item.retired).map(item => ({ item_key: item.itemId, value: null, missing_reason: "prefer_not_to_say" })),
      access_status: "explicit_share_or_owner" })),
  };
  assert.equal(checkWorkstyleTeamReadiness(input), input);
  const missingVenture = structuredClone(input);
  missingVenture.people[1].venture_alignment = [];
  assert.deepEqual(checkWorkstyleTeamReadiness(missingVenture), { status: "not_ready" });
  const changedVersion = structuredClone(input);
  changedVersion.people[1].core[0].item_version = "8.4-v0.3";
  assert.deepEqual(checkWorkstyleTeamReadiness(changedVersion), { status: "not_ready" });
  const research = structuredClone(input);
  research.people[1].core[0].item_key = "EVI-03";
  assert.deepEqual(checkWorkstyleTeamReadiness(research), { status: "not_ready" });
  assert.deepEqual(checkWorkstyleTeamReadiness({ ...input, people: [...input.people, input.people[0]] }), { status: "not_ready" });
});
