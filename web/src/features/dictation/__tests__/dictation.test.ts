import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  appendSpeechChunk,
  mapSpeechErrorKey,
  mergeSpeechIntoValue,
} from "@/features/dictation/useDictation";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

test("dictated text is appended, never replacing what someone typed", () => {
  const typed = "Ich habe den Vertrieb aufgebaut.";
  const merged = mergeSpeechIntoValue(typed, "Dazu kam die Vertragsverhandlung.", "");

  assert.ok(merged.startsWith(typed), "Getipptes muss vorne stehen bleiben");
  assert.ok(merged.includes("Vertragsverhandlung"));
  assert.ok(merged.includes("\n\n"), "Diktiertes bleibt als eigener Absatz erkennbar");
});

test("an empty field does not start with a blank line", () => {
  assert.equal(mergeSpeechIntoValue("", "Erster Satz.", ""), "Erster Satz.");
  assert.equal(mergeSpeechIntoValue("", "", ""), "");
});

test("the interim result is shown while speaking and does not duplicate the final one", () => {
  // Waehrend des Sprechens: Zwischenstand sichtbar.
  const interim = mergeSpeechIntoValue("", "Erster Satz.", "zweiter Satz");
  assert.equal(interim, "Erster Satz. zweiter Satz");

  // Sobald derselbe Satz final ist, waechst der finale Teil und der
  // Zwischenstand ist leer - der Satz darf nicht zweimal dastehen.
  const finalised = mergeSpeechIntoValue("", "Erster Satz. Zweiter Satz.", "");
  assert.equal(finalised, "Erster Satz. Zweiter Satz.");
});

test("chunks are joined with a single space and blank chunks change nothing", () => {
  assert.equal(appendSpeechChunk("Eins", "  zwei  "), "Eins zwei");
  assert.equal(appendSpeechChunk("Eins", "   "), "Eins");
  assert.equal(appendSpeechChunk("", "zwei"), "zwei");
});

test("silence is told apart from a real failure", () => {
  assert.equal(mapSpeechErrorKey("no-speech"), "noSpeech");
  assert.equal(mapSpeechErrorKey("not-allowed"), "permission");
  assert.equal(mapSpeechErrorKey("service-not-allowed"), "permission");
  assert.equal(mapSpeechErrorKey("audio-capture"), "microphone");
  assert.equal(mapSpeechErrorKey("aborted"), "aborted");
  assert.equal(mapSpeechErrorKey("something-new"), "generic");
});

test("every error key has copy in both locales", () => {
  const de = readJson("messages/de/common.json");
  const en = readJson("messages/en/common.json");
  const errorsOf = (messages: Record<string, unknown>) =>
    ((messages.dictation as Record<string, unknown>).errors as Record<string, string>);

  for (const key of ["permission", "microphone", "aborted", "noSpeech", "generic"]) {
    assert.ok(errorsOf(de)[key], `de fehlt errors.${key}`);
    assert.ok(errorsOf(en)[key], `en fehlt errors.${key}`);
  }
});

test("the recording keeps running across pauses and ends on its own", () => {
  const hook = source("src/features/dictation/useDictation.ts");

  // Ohne diese beiden bricht die Aufnahme nach dem ersten Satz ab - beim
  // Erzaehlen einer laengeren Sache ist genau das der Normalfall.
  assert.match(hook, /recognition\.continuous = true/);
  assert.match(hook, /recognition\.interimResults = true/);
  // Ein offenes Mikrofon soll niemand versehentlich laufen lassen.
  assert.match(hook, /DICTATION_INACTIVITY_MS = \d+/);
  assert.match(hook, /scheduleInactivityTimeout\(\)/);
  // Und es darf einen Seitenwechsel nicht ueberleben.
  assert.match(hook, /recognitionRef\.current\?\.abort\(\)/);
});

test("dictation stays a browser feature: no transcript is sent anywhere", () => {
  const dictationSource = [
    source("src/features/dictation/useDictation.ts"),
    source("src/features/dictation/DictatedTextarea.tsx"),
    source("src/features/dictation/DictationControls.tsx"),
  ].join("\n");

  // Das Diktat ist bewusst keine Auftragsverarbeitung. Nichts am Text geht
  // ueber unsere Wege hinaus - gespeichert wird erst, was das Formular
  // abschickt.
  assert.doesNotMatch(dictationSource, /fetch\(/);
  assert.doesNotMatch(dictationSource, /XMLHttpRequest/);
  assert.doesNotMatch(dictationSource, /new WebSocket/);
  assert.doesNotMatch(dictationSource, /use server/);
});

test("the form field keeps its name and its validation", () => {
  const field = source("src/features/dictation/DictatedTextarea.tsx");

  // Es haelt seinen Wert selbst, bleibt fuer die Server Action aber ein
  // gewoehnliches Feld.
  assert.match(field, /name=\{name\}/);
  // Wuerde eines davon nicht weitergegeben, waere die Browser-Validierung
  // still weg - und zwar ohne dass etwas rot wird.
  assert.match(field, /required=\{required\}/);
  assert.match(field, /minLength=\{minLength\}/);
  assert.match(field, /maxLength=\{maxLength\}/);
});

test("the capability narrative is dictatable and still posts as narrative", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  const narrativeField = page.split('name="narrative"')[0]?.slice(-400) ?? "";

  assert.match(narrativeField, /DictatedTextarea/, "das Feld soll diktierbar sein");
  assert.match(page, /minLength=\{NARRATIVE_MIN_LENGTH\}/);
  // Die Person soll wissen, wer da zuhoert.
  assert.match(page, /dictation\.browserHint/);
});

test("the dictation logic lives in one place, not next to the field that uses it", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  const feedback = source("src/features/feedback/ProductFeedbackEntry.tsx");

  // Vier Kopien mit vier Reifegraden waren der Ausgangspunkt. Die
  // Feedback-Fassung war die ausgereifteste und ist zum Hook geworden; sie
  // darf ihre eigene nicht behalten.
  for (const consumer of [page, feedback]) {
    assert.doesNotMatch(consumer, /webkitSpeechRecognition/);
    assert.doesNotMatch(consumer, /new SpeechRecognitionCtor\(\)/);
  }
  assert.match(feedback, /useDictation\(\{/);
});
