import test from "node:test";
import assert from "node:assert/strict";

import { needsConfirmation } from "@/features/instruments/align/needsConfirmation";

const T = (tag: number) => `2026-09-${String(tag).padStart(2, "0")}T12:00:00Z`;

test("wer allein ist, wird nicht gefragt", () => {
  // Die Angaben stehen niemandem gegenueber. Eine Frage waere ohne Anlass.
  assert.equal(
    needsConfirmation({ confirmedAt: null, otherJoinedAt: [], hasAnswers: true }),
    false,
  );
});

test("wer noch nicht geantwortet hat, soll ausfüllen und nicht bestätigen", () => {
  assert.equal(
    needsConfirmation({ confirmedAt: null, otherJoinedAt: [T(20)], hasAnswers: false }),
    false,
  );
});

test("kommt jemand dazu und wurde nie bestätigt, wird gefragt", () => {
  assert.equal(
    needsConfirmation({ confirmedAt: null, otherJoinedAt: [T(20)], hasAnswers: true }),
    true,
  );
});

test("wer nach der Bestätigung dazukommt, löst eine neue Frage aus", () => {
  assert.equal(
    needsConfirmation({ confirmedAt: T(20), otherJoinedAt: [T(25)], hasAnswers: true }),
    true,
  );
});

test("wer vorher da war, löst keine aus", () => {
  assert.equal(
    needsConfirmation({ confirmedAt: T(25), otherJoinedAt: [T(20)], hasAnswers: true }),
    false,
  );
});

test("bei mehreren zählt der Letzte", () => {
  // Sonst wuerde ein alter Beitritt eine neue Person verdecken.
  assert.equal(
    needsConfirmation({
      confirmedAt: T(22), otherJoinedAt: [T(20), T(28), T(21)], hasAnswers: true,
    }),
    true,
  );
});

test("Gleichstand gilt als bestätigt", () => {
  // Eine Frage, die aus einer Millisekunde entsteht, waere Nerverei ohne
  // Erkenntnis.
  assert.equal(
    needsConfirmation({ confirmedAt: T(20), otherJoinedAt: [T(20)], hasAnswers: true }),
    false,
  );
});
