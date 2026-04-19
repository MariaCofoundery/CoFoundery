import assert from "node:assert/strict";
import test from "node:test";
import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
} from "@/features/reporting/founderMatchingEngine";
import { buildTimelineNodesFromDimensions } from "@/features/reporting/timelineLogic";

test("buildTimelineNodesFromDimensions caps deterministic output at five nodes", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
  );
  const nodes = buildTimelineNodesFromDimensions(compareResult.dimensions);

  assert.equal(nodes.length, 5);
  assert.equal(nodes[0]?.dimension, "Unternehmenslogik");
  assert.equal(nodes[0]?.kind, "tension");
  assert.equal(nodes.every((node) => typeof node.priorityScore === "number"), true);
});

test("buildTimelineNodesFromDimensions prefers blind spots in risk and commitment for similarity-heavy pairs", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
  );
  const nodes = buildTimelineNodesFromDimensions(compareResult.dimensions);

  assert.deepEqual(
    nodes.map((node) => `${node.dimension}:${node.kind}`),
    [
      "Unternehmenslogik:blind_spot",
      "Arbeitsstruktur & Zusammenarbeit:blind_spot",
      "Risikoorientierung:blind_spot",
      "Commitment:blind_spot",
      "Konfliktstil:blind_spot",
    ]
  );
  assert.equal(nodes.some((node) => node.dimension === "Risikoorientierung"), true);
  assert.equal(nodes.some((node) => node.dimension === "Commitment"), true);
});

test("buildTimelineNodesFromDimensions adds calm fallback nodes when the primary selection would be too sparse", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.a,
    FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.b
  );
  const nodes = buildTimelineNodesFromDimensions(compareResult.dimensions);

  assert.equal(nodes.length >= 2, true);
  assert.equal(nodes.every((node) => node.kind === "coordination_need"), true);
});
