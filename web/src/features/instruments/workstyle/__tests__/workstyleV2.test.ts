import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { WORKSTYLE_PRETEST_V2 as registry, workstyleRegistryFor, workstyleItemFor, workstyleSessionItems, workstyleInstrumentId, validateWorkstyleRegistry } from "@/features/instruments/workstyle/registry";
import { parseWorkstyleAnswer } from "@/features/instruments/workstyle/answers";
import { workstyleStatistics, workstyleLongExport } from "@/features/instruments/workstyle/analytics";
import { checkWorkstyleTeamReadiness, type WorkstyleTeamInputs } from "@/features/instruments/workstyle/teamReadiness";
import { getItemsV22 } from "@/features/instruments/align/registries";
import type { ResearchRow } from "@/features/instruments/workstyle/data";

const order = "ORG-01 EXP-01 VOICE-01 AMB-01 EL-01 EVI-01 AMB-02 EVI-02 ORG-R1 EL-02 EXP-02 VOICE-02 VOICE-R1 EXP-03 EVI-03 ORG-02 AMB-03 EL-03 EL-R1 AMB-04 VOICE-03 EVI-04 ORG-03 EXP-04 EXP-R1 ORG-04 EL-04 VOICE-04 EVI-05 AMB-05 EVI-R1 AMB-R1 ORG-05 VOICE-05 EL-05 EXP-05".split(" ");
test("v0.3 source generates the exact immutable 30+6 v2 registry and ordered seed", () => {
  execFileSync("python3", ["scripts/build-workstyle-v2-registry.py", "--check"]);
  assert.equal(createHash("sha256").update(readFileSync("docs/founder-workstyle-pretest-8.5a-v2.json")).digest("hex"), "4f29c406c26b69a9f95191ebf4b71125bd01f46fdc717edd0526f5fb4f400b33");
  assert.equal(registry.items.length, 36);
  assert.equal(registry.core_item_keys.length, 30);
  assert.deepEqual(workstyleSessionItems("8.5a-v2", null).map(i => i.item_key), order);
  assert.deepEqual(registry.item_order, order);
  assert.deepEqual(registry.forms, {});
  assert.ok(registry.items.every(i => i.form === null && i.item_version === "8.4-v0.3"));
  for (const prefix of ["EVI", "EXP", "EL", "VOICE", "AMB", "ORG"]) {
    const group = registry.items.filter(i => i.item_key.startsWith(`${prefix}-`));
    assert.equal(group.filter(i => !i.research_only).length, 5);
    assert.deepEqual(group.filter(i => i.research_only).map(i => i.item_key), [`${prefix}-R1`]);
    assert.ok(group.filter(i => i.research_only).every(i => i.product_status === "excluded"));
  }
  const source = readFileSync(`../${registry.source}`, "utf8");
  for (const item of registry.items) assert.ok(source.includes(`### ${item.item_key}\n\n${item.prompt}\n`));
  assert.throws(() => Object.assign(registry.items[0], { prompt: "changed" }), TypeError);
});

test("v1 stays frozen and resolves separately; reusing a key never reinterprets the old item", () => {
  assert.equal(createHash("sha256").update(readFileSync("docs/founder-workstyle-pretest-8.5a-v1.json")).digest("hex"), "ec66379fc20a9c6986f77de200499f2b3a56bafa8616f43ac616b065226a2531");
  assert.notEqual(workstyleItemFor("EVI-05", "8.4-v0.2", "8.5a-v1").prompt, workstyleItemFor("EVI-05", "8.4-v0.3", "8.5a-v2").prompt);
  assert.throws(() => workstyleItemFor("EVI-05", "8.4-v0.2", "8.5a-v2"));
  assert.equal(workstyleSessionItems("8.5a-v1", "A").length, 26);
  assert.equal(workstyleSessionItems("8.5a-v1", "C").length, 25);
  assert.throws(() => workstyleSessionItems("8.5a-v2", "A"));
  assert.throws(() => workstyleSessionItems("8.5a-v1", null));
});

test("all 36 items allow only null/cannot_assess or five ordinal values, including the private R1 items", () => {
  for (const item of registry.items) {
    const identity = { assessment_version: "8.5a-v2", item_key: item.item_key, item_version: item.item_version };
    assert.deepEqual(item.missing_reasons, ["cannot_assess"]);
    const answer = parseWorkstyleAnswer(identity, null, { response_value: null, missing_reason: "cannot_assess" });
    assert.equal(answer.response_value, null);
    assert.equal(answer.missing_reason, "cannot_assess");
    for (const input of [{ response_value: 3, missing_reason: "cannot_assess" }, { response_value: 6, missing_reason: null }]) assert.throws(() => parseWorkstyleAnswer(identity, null, input));
    assert.throws(() => parseWorkstyleAnswer(identity, "A", { response_value: 3, missing_reason: null }));
  }
});

test("ambiguity is standalone discomfort; experience and voice keep their supplied v2 response labels", () => {
  assert.deepEqual(registry.response_formats.ambiguity_discomfort.map(o => o.label), ["überhaupt nicht unangenehm", "eher nicht unangenehm", "teils/teils", "eher unangenehm", "sehr unangenehm"]);
  assert.equal(registry.response_formats.experience_weight[3].label, "eher stark");
  assert.ok(registry.items.filter(i => i.item_key.startsWith("AMB-")).every(i => i.stem === null && i.response_format === "ambiguity_discomfort"));
  assert.ok(registry.items.filter(i => i.item_key.startsWith("VOICE-")).every(i => i.response_format === "likelihood"));
  for (const i of registry.items) {
    const split = i.prompt.lastIndexOf("Wie ");
    assert.ok(split > 0);
    assert.equal(i.prompt.slice(0, split) + i.prompt.slice(split), i.prompt);
  }
  const bad = structuredClone(registry);
  Object.assign(bad.items.find(i => i.research_only)!, { research_only: false });
  assert.throws(() => validateWorkstyleRegistry(bad));
});

const row: ResearchRow = { session_id: "pseudonym-v2", form: null, assessment_version: "8.5a-v2", manifest_version: "2.0.0", consent_version: "workstyle_research_v2", started_at: "2026-10-04T10:00:00Z", completed_at: null, resume_position: 3, context: { founder_experience: "2-3", team_size: "solo" }, timings: { "ORG-01": 1234 }, feedback: { clear_realistic_items: ["ORG-01"], other: "PRIVATE_TEXT" }, answers: [{ item_key: "ORG-01", item_version: "8.4-v0.3", response_value: null, missing_reason: "cannot_assess" }] };
const historical: ResearchRow = { ...row, session_id: "pseudonym-v1", form: "A", assessment_version: "8.5a-v1", answers: [{ item_key: "ORG-01", item_version: "8.4-v0.2", response_value: 5, missing_reason: null }] };
test("admin aggregates never mix v1/v2 items and count clear/realistic feedback; v2 has no form statistics", () => {
  const stats = workstyleStatistics([row, historical], "8.5a-v2");
  assert.equal(stats.n, 1);
  assert.equal(stats.items.length, 36);
  assert.deepEqual(stats.forms, []);
  assert.deepEqual(stats.coreByForm, []);
  assert.deepEqual(stats.dropPositions, [{ position: "4: AMB-01", n: 1 }]);
  const org = stats.items.find(i => i.item.item_key === "ORG-01")!;
  assert.equal(org.flags.clearRealistic, 1);
  assert.equal(org.missingPercent, 100);
  assert.equal(org.medianTimeMs, 1234);
  assert.deepEqual(org.distribution, [0, 0, 0, 0, 0]);
  assert.equal(workstyleStatistics([row, historical], "8.5a-v1").n, 1);
});
test("CSV has versions, research flags and a truly empty v2 form, excluding identities and text", () => {
  const csv = workstyleLongExport([row, historical], "8.5a-v2");
  assert.equal(csv.trimEnd().split("\r\n").length, 37);
  assert.match(csv, /"pseudonym-v2","","8.5a-v2","2.0.0"/);
  assert.match(csv, /"8.4-v0.3","research_only","true"/);
  assert.doesNotMatch(csv, /8\.5a-v1|PRIVATE_TEXT|person_id|user_id|assessment_id/);
});

test("only two fully shared matching instrument/manifest/item versions qualify; R1 never qualifies", () => {
  const input: Extract<WorkstyleTeamInputs, { status: "ready" }> = { status: "ready", team_id: "team", team_context: "existing_team", people: ["a", "b"].map(person_id => ({ person_id, assessment_version: "8.5a-v2", instrument_id: workstyleInstrumentId("8.5a-v2"), manifest_version: "2.0.0", workstyle_assessment_id: person_id,
    core: registry.core_item_keys.map(item_key => ({ item_key, item_version: "8.4-v0.3", value: { scale: 3 }, missing_reason: null })),
    venture_assessment_id: person_id, venture_instrument: "venture-alignment-v1", access_status: "explicit_share_or_owner",
    venture_alignment: getItemsV22("venture_alignment").filter(i => !i.retired).map(i => ({ item_key: i.itemId, value: null, missing_reason: "prefer_not_to_say" })) })) };
  assert.equal(checkWorkstyleTeamReadiness(input), input);
  for (const patch of [{ assessment_version: "8.5a-v1" }, { manifest_version: "1.0.0" }, { instrument_id: workstyleInstrumentId("8.5a-v1") }]) {
    const changed = structuredClone(input); Object.assign(changed.people[1], patch);
    assert.deepEqual(checkWorkstyleTeamReadiness(changed), { status: "not_ready" });
  }
  for (const patch of [{ item_key: "ORG-R1" }, { item_version: "8.4-v0.2" }]) {
    const changed = structuredClone(input); Object.assign(changed.people[1].core[0], patch);
    assert.deepEqual(checkWorkstyleTeamReadiness(changed), { status: "not_ready" });
  }
  assert.equal(workstyleRegistryFor("8.5a-v1").core_item_keys.length, 20);
});

test("v2 consent is independently frozen and documented without form assignment", () => {
  const raw = readFileSync("docs/founder-workstyle-research-consent-v2.json", "utf8");
  assert.equal(createHash("sha256").update(raw).digest("hex"), "dcbac09e8f3ae388243047c07628545b631499f056f00dbceff400b4cb622b91");
  const consent = JSON.parse(raw);
  assert.equal(consent.consent_version, "workstyle_research_v2");
  assert.equal(consent.assessment_version, "8.5a-v2");
  assert.doesNotMatch(consent.paragraphs.join(" "), /A\/B\/C|Core|research_only/);
  const source = readFileSync("../docs/research/phase-8/workstyle-research-consent-v2.md", "utf8");
  for (const paragraph of consent.paragraphs) assert.ok(source.includes(paragraph));
});
