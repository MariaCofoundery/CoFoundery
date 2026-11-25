import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appendNoteToText } from "@/features/strengths/strengthsDiscoverGuide";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
const page = read("src/app/(product)/profile/strengths-interview/page.tsx");
const sceneForm = read("src/features/strengths/SceneForm.tsx");
const strip = read("src/features/strengths/IntroNotesStrip.tsx");
const actions = read("src/features/strengths/strengthsDiscoverActions.ts");

test("the keywords from the intro stay visible while going through the scenes and in round 3 (Maria, 25.11.2026)", () => {
  // Bis dahin standen sie nur beim Waehlen der Szenen.
  assert.match(sceneForm, /introNotes: string\[\]/);
  assert.match(sceneForm, /<IntroNotesStrip[\s\S]*notes=\{introNotes\}[\s\S]*tone="onPurple"/);
  assert.match(page, /introNotes=\{state\.introNotes\}/);
  assert.match(page, /<IntroNotesStrip notes=\{state\.introNotes\}[^>]*tone="light"/);
});

test("in the scene a keyword can be tapped and goes into the text field the person is writing in", () => {
  assert.match(sceneForm, /onPick=\{takeNote\}/);
  // angehaengt, nicht ersetzt: mit Leerzeichen dazwischen, auf die erlaubte Laenge gekuerzt
  assert.match(sceneForm, /appendNoteToText\(value, note, STORY_MAX_LENGTH\)/);
  // wie beim Wiederherstellen eines Browserstands: Abschnitt neu aufbauen, danach Fokus zurueck ans Feld
  assert.match(sceneForm, /setInitial\(next\)/);
  assert.match(sceneForm, /setRevision\(\(current\) => current \+ 1\)/);
  assert.match(sceneForm, /field\.focus\(\)/);
});

test("a further keyword can be added while going through the scenes, and it is saved on the person's own conversation", () => {
  assert.match(sceneForm, /onAdd=\{\(note\) => startAddNote\(async \(\) => \{ await addIntroNoteAction\(note\); \}\)\}/);
  const add = actions.slice(actions.indexOf("export async function addIntroNoteAction"));
  const body = add.slice(0, add.indexOf("\n}\n") + 3);
  assert.match(body, /cleanIntroNotes\(\[\.\.\.state\.introNotes, String\(note \?\? ""\)\]\)/);
  assert.match(body, /\.update\(\{ intro_notes: next \}\)/);
  assert.match(body, /\.eq\("kind", STRENGTHS_INTERVIEW\)/);
  assert.match(body, /revalidatePath\(PATH\)/);
  assert.doesNotMatch(body, /redirect\(|onward\(|back\(/, "the scene stays open");
});

test("the strip lives inside the scene's form, so it has no form of its own and Enter in its field does not submit the scene", () => {
  assert.doesNotMatch(strip.replace(/\/\/[^\n]*/g, ""), /<form/);
  assert.match(strip, /event\.key !== "Enter"/);
  assert.match(strip, /event\.preventDefault\(\)/);
  assert.match(strip, /type="button"/);
});

test("the strip is only a reminder: it shows nothing without keywords (unless adding is possible) and never evaluates anything", () => {
  assert.match(strip, /if \(notes\.length === 0 && !onAdd\) return null/);
  assert.doesNotMatch(strip, /fetch\(|action=|"use server"|supabase/);
});

test("german and english have the new texts, and no text says 'sieht nur du'", () => {
  for (const lang of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${lang}/strengths.json`));
    for (const key of ["notesHint", "notesTake", "notesAddLabel", "notesAddPlaceholder", "notesAdd"]) assert.ok(messages.discover.scene[key], `${lang}: scene.${key}`);
    assert.ok(messages.discover.round3.notesHint, `${lang}: round 3 hint`);
    assert.match(messages.discover.scene.notesTake, /\{note\}/, `${lang}: the keyword is put into the label`);
  }
  assert.doesNotMatch(read("messages/de/strengths.json"), /sieht (nur|erst mal nur|erst einmal nur) du/);
  assert.match(read("messages/de/strengths.json"), /Deine Antworten siehst nur du\./);
});

test("appending a keyword keeps what is already written, adds one space, and respects the length", () => {
  assert.equal(appendNoteToText("", "Orga im Verein", 100), "Orga im Verein");
  assert.equal(appendNoteToText("Ich habe geplant.", "Orga im Verein", 100), "Ich habe geplant. Orga im Verein");
  assert.equal(appendNoteToText("Ich habe geplant. ", "Orga im Verein", 100), "Ich habe geplant. Orga im Verein");
  assert.equal(appendNoteToText("Zeile\n", "Teamleitung", 100), "Zeile\nTeamleitung");
  assert.equal(appendNoteToText("Text", "  ", 100), "Text", "a blank keyword changes nothing");
  assert.equal(appendNoteToText("Text", "Orga   im  Verein", 100), "Text Orga im Verein", "inner spaces are tidied");
  assert.equal(appendNoteToText("12345", "abcdef", 8), "12345 ab", "cut to the allowed length (8 characters in total)");
  assert.equal(appendNoteToText("12345678", "abc", 8), "12345678", "no room left: the text stays as it is");
  assert.equal(appendNoteToText("1234567890", "abc", 8), "1234567890", "never cuts text that is already longer");
});
