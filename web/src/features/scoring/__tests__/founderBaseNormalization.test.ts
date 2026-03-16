import test from "node:test";
import assert from "node:assert/strict";
import {
  founderDisplayScoreToPercent,
  founderPercentToDisplayScore,
  normalizeStoredBaseAnswerToFounderPercent,
} from "@/features/scoring/founderBaseNormalization";

test("normalizeStoredBaseAnswerToFounderPercent keeps live 0..100 values intact", () => {
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("0"), 0);
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("25"), 25);
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("50"), 50);
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("75"), 75);
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("100"), 100);
});

test("normalizeStoredBaseAnswerToFounderPercent maps legacy 1..4 values into 0..100", () => {
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("1"), 0);
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("2"), 33.333);
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("3"), 66.667);
  assert.equal(normalizeStoredBaseAnswerToFounderPercent("4"), 100);
});

test("display score helpers round-trip between founder percent and 1..6 UI scale", () => {
  assert.equal(founderPercentToDisplayScore(0), 1);
  assert.equal(founderPercentToDisplayScore(50), 3.5);
  assert.equal(founderPercentToDisplayScore(100), 6);

  assert.equal(founderDisplayScoreToPercent(1), 0);
  assert.equal(founderDisplayScoreToPercent(3.5), 50);
  assert.equal(founderDisplayScoreToPercent(6), 100);
});
