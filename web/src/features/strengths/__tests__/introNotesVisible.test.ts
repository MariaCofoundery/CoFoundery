import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
const page = read("src/app/(product)/profile/strengths-interview/page.tsx");
const sceneForm = read("src/features/strengths/SceneForm.tsx");
const strip = read("src/features/strengths/IntroNotesStrip.tsx");

test("the keywords from the intro stay visible while going through the scenes and in round 3 (Maria, 25.11.2026)", () => {
  // Bis dahin standen sie nur beim Waehlen der Szenen.
  assert.match(sceneForm, /introNotes: string\[\]/);
  assert.match(sceneForm, /<IntroNotesStrip notes=\{introNotes\}[^>]*tone="onPurple"/);
  assert.match(page, /introNotes=\{state\.introNotes\}/);
  assert.match(page, /<IntroNotesStrip notes=\{state\.introNotes\}[^>]*tone="light"/);
});

test("the strip is only a reminder: it shows nothing without keywords and changes nothing about the evaluation", () => {
  assert.match(strip, /if \(notes\.length === 0\) return null/);
  assert.doesNotMatch(strip, /use client|action=|onClick|<button|<form|fetch\(/);
});

test("german and english have the new hint texts, and no text says 'sieht nur du'", () => {
  for (const lang of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${lang}/strengths.json`));
    assert.ok(messages.discover.scene.notesHint, `${lang}: scene hint`);
    assert.ok(messages.discover.round3.notesHint, `${lang}: round 3 hint`);
  }
  assert.doesNotMatch(read("messages/de/strengths.json"), /sieht (nur|erst mal nur|erst einmal nur) du/);
  assert.match(read("messages/de/strengths.json"), /Deine Antworten siehst nur du\./);
});
