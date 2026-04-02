import assert from "node:assert/strict";
import test from "node:test";
import { compareFounders, FOUNDER_MATCHING_TEST_CASES } from "@/features/reporting/founderMatchingEngine";
import { buildFounderMatchingMarkers } from "@/features/reporting/founderMatchingMarkers";
import { buildFounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";

test("marker architecture uses mode-aware wording for complementary matches", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.complementary_builders.a,
    FOUNDER_MATCHING_TEST_CASES.complementary_builders.b
  );
  const selection = buildFounderMatchingSelection(compareResult);

  const preFounderMarkers = buildFounderMatchingMarkers(compareResult, selection, "pre_founder");
  const existingTeamMarkers = buildFounderMatchingMarkers(compareResult, selection, "existing_team");

  assert.equal(preFounderMarkers.primary?.markerClass, "conditional_complement");
  assert.equal(preFounderMarkers.primary?.label, "Produktiv, wenn ihr es vorher klärt");
  assert.equal(preFounderMarkers.primary?.workbookPosture, "define");

  assert.equal(existingTeamMarkers.primary?.markerClass, "conditional_complement");
  assert.equal(existingTeamMarkers.primary?.label, "Produktiv, wenn ihr es aktiv führt");
  assert.equal(existingTeamMarkers.primary?.workbookPosture, "regulate");
});

test("marker architecture escalates critical strategic mismatch into critical clarification", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
  );
  const selection = buildFounderMatchingSelection(compareResult);
  const markers = buildFounderMatchingMarkers(compareResult, selection, "pre_founder");

  assert.equal(markers.primary?.markerClass, "critical_clarification_point");
  assert.equal(markers.primary?.dimension, "Unternehmenslogik");
  assert.match(markers.primary?.explanation ?? "", /Richtungsfrage|vor dem Start klären/i);
  assert.equal(markers.primary?.workbookPosture, "escalate_for_discussion");
});

test("marker architecture turns blind-spot pairs into explicit rule-need markers", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
    FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
  );
  const selection = buildFounderMatchingSelection(compareResult);
  const preFounderMarkers = buildFounderMatchingMarkers(compareResult, selection, "pre_founder");
  const existingTeamMarkers = buildFounderMatchingMarkers(compareResult, selection, "existing_team");

  assert.equal(preFounderMarkers.primary?.markerClass, "high_rule_need");
  assert.equal(preFounderMarkers.primary?.source, "blind_spot_watch");
  assert.equal(preFounderMarkers.primary?.label, "Früh explizit machen");
  assert.equal(preFounderMarkers.primary?.workbookPosture, "define");

  assert.equal(existingTeamMarkers.primary?.markerClass, "high_rule_need");
  assert.equal(existingTeamMarkers.primary?.source, "blind_spot_watch");
  assert.equal(existingTeamMarkers.primary?.label, "Stillen Drift nicht laufen lassen");
  assert.match(existingTeamMarkers.primary?.explanation ?? "", /nicht still mitlaufen/i);
});

test("marker set keeps stable base visible as secondary marker when tension dominates", () => {
  const compareResult = compareFounders(
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
    FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
  );
  const selection = buildFounderMatchingSelection(compareResult);
  const markers = buildFounderMatchingMarkers(compareResult, selection, "existing_team");

  assert.ok(markers.secondary.some((entry) => entry.markerClass === "conditional_complement"));
  assert.equal(markers.secondary.length, 1);
});
