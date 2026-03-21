import assert from "node:assert/strict";
import test from "node:test";
import {
  compareFounders,
  FOUNDER_MATCHING_ENGINE_EXAMPLES,
} from "@/features/reporting/founderMatchingEngine";

test("compareFounders classifies a complementary but workable founder pair", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.complementary_builders;

  assert.equal(result.overallMatchScore, 74.2);
  assert.equal(result.alignmentScore, 86.18);
  assert.equal(result.workingCompatibilityScore, 68.24);
  assert.deepEqual(
    result.tensionMap.map((entry) => [entry.dimension, entry.tensionType]),
    [
      ["Entscheidungslogik", "productive"],
      ["Risikoorientierung", "productive"],
      ["Arbeitsstruktur & Zusammenarbeit", "coordination"],
      ["Konfliktstil", "coordination"],
    ]
  );
});

test("compareFounders identifies critical pressure mismatches", () => {
  const result = FOUNDER_MATCHING_ENGINE_EXAMPLES.misaligned_pressure_pair;

  assert.equal(result.overallMatchScore, 29.8);
  assert.equal(result.alignmentScore, 37.64);
  assert.equal(result.workingCompatibilityScore, 26.08);

  const commitment = result.dimensions.find((entry) => entry.dimension === "Commitment");
  const work = result.dimensions.find(
    (entry) => entry.dimension === "Arbeitsstruktur & Zusammenarbeit"
  );
  const conflict = result.dimensions.find((entry) => entry.dimension === "Konfliktstil");

  assert.equal(commitment?.interactionType, "critical_tension");
  assert.equal(work?.interactionType, "critical_tension");
  assert.equal(conflict?.interactionType, "critical_tension");
});

test("compareFounders is deterministic for direct calls", () => {
  const a = {
    Unternehmenslogik: 68,
    Entscheidungslogik: 34,
    Risikoorientierung: 64,
    "Arbeitsstruktur & Zusammenarbeit": 72,
    Commitment: 81,
    Konfliktstil: 38,
  } as const;

  const b = {
    Unternehmenslogik: 62,
    Entscheidungslogik: 67,
    Risikoorientierung: 43,
    "Arbeitsstruktur & Zusammenarbeit": 58,
    Commitment: 76,
    Konfliktstil: 61,
  } as const;

  assert.deepEqual(compareFounders(a, b), compareFounders(a, b));
});
