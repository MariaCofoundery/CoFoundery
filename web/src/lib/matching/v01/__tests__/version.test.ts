import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { CONNECT_CONSTANTS, FIND_CONSTANTS, MATCHING_VERSION, NORMALIZATION_VERSION } from "@/lib/matching/v01/version";

/** Die Konstanten der Engine stehen exakt so in der eingefrorenen Spec (Hash-geprüft). */
const RESEARCH = path.join(import.meta.dirname, "..", "..", "..", "..", "..", "..", "docs", "research");
const read = (f: string) => readFileSync(path.join(RESEARCH, f));

test("Spec ist unverändert eingefroren (SHA-256 wie in .sha256)", () => {
  const lines = read("matching-engine-v0.1-spec.sha256").toString("utf8").trim().split("\n");
  assert.equal(lines.length, 2);
  for (const line of lines) {
    const [hash, file] = line.trim().split(/\s+/);
    assert.equal(createHash("sha256").update(read(path.basename(file))).digest("hex"), hash, file);
  }
});

test("Versionen und Gewichte entsprechen der Spec-JSON", () => {
  const spec = JSON.parse(read("matching-engine-v0.1-spec.json").toString("utf8"));
  assert.equal(MATCHING_VERSION, spec.matching_version);
  assert.equal(NORMALIZATION_VERSION, spec.normalization_version);
  const cv = spec.find.coverage_values;
  assert.equal(FIND_CONSTANTS.coverage.ownLevelGe3, cv.own_level_ge3);
  assert.equal(FIND_CONSTANTS.coverage.contributeLevelGe3, cv.contribute_level_ge3);
  assert.equal(FIND_CONSTANTS.coverage.ownLevelLt3OrUnknown, cv.own_level_lt3_or_unknown);
  assert.equal(FIND_CONSTANTS.coverage.contributeUnclearOrEmptyLevelGe3, cv.contribute_unclear_or_empty_level_ge3);
  assert.equal(cv.grow_into, 0);
  assert.equal(FIND_CONSTANTS.coverage.sameFamilyFactor, cv.same_family_factor);
  assert.deepEqual([...FIND_CONSTANTS.familyExcluded], cv.family_excluded);
  assert.equal(FIND_CONSTANTS.mutualityMinWeight, spec.find.mutuality.w_min);
  assert.equal(FIND_CONSTANTS.mutualityMeanWeight, spec.find.mutuality.w_mean);
  const ip = spec.find.intent_parts;
  assert.deepEqual([...FIND_CONSTANTS.searchIntentDistance], [0, 1, 2].map((d) => ip.search_intent_distance[d]));
  assert.deepEqual([...FIND_CONSTANTS.startHorizonDistance], [0, 1, 2, 3].map((d) => ip.start_horizon_distance[d]));
  assert.deepEqual([...FIND_CONSTANTS.goalGroupDistance], [0, 1, 2].map((d) => ip.goal_group_distance[d]));
  assert.equal(FIND_CONSTANTS.stage.bothSame, ip.stage.both_already_building_or_both_no_idea);
  assert.equal(FIND_CONSTANTS.stage.oneWithIdea, ip.stage.one_with_idea_one_without);
  assert.equal(FIND_CONSTANTS.stage.otherwise, ip.stage.otherwise);
  assert.deepEqual({ ...CONNECT_CONSTANTS.weights }, spec.connect.weights);
  assert.equal(CONNECT_CONSTANTS.expertiseOnlyTopicValue, spec.connect.expertise_only_topic_value);
  assert.equal(CONNECT_CONSTANTS.noTopicCap, spec.connect.no_topic_cap);
  assert.equal(CONNECT_CONSTANTS.noTopicTextMin, spec.connect.no_topic_text_min);
});
