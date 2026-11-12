import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  answeredScenes,
  canSkipScene,
  checkScene,
  cleanIntroNotes,
  cleanSceneSelection,
  composeAnswer,
  DISCOVER_QUESTIONS,
  discoverPhase,
  isValidSceneSelection,
  keySentence,
  needsFollowUp,
  PART_MAX_LENGTH,
  ROUND_THREE,
  SCENE_IDS,
  type DiscoverTurn,
} from "@/features/strengths/strengthsDiscoverGuide";
import { findStrengthsQuestion, isCounterQuestion } from "@/features/strengths/strengthsInterviewGuide";

/**
 * „Stärken entdecken“ (Fassung 3, 12.11.2026): Szenen statt fester Aufforderungen, drei Runden.
 * Die Ablaufregeln stehen in `strengthsDiscoverGuide.ts`; hier steht, was sie zusagen.
 */

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const bundle = (locale: string) => JSON.parse(read(`messages/${locale}/strengths.json`));

const turn = (questionId: string, state: "open" | "answered" | "skipped" = "open"): DiscoverTurn => ({
  questionId,
  answered: state === "answered",
  skipped: state === "skipped",
});

const keys = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`))
    : [prefix];

test("zwölf Szenen und fünf Fragen der dritten Runde, jede mit ihrer Art", () => {
  assert.equal(SCENE_IDS.length, 12);
  assert.deepEqual(ROUND_THREE.filter((q) => q.kind === "counter").map((q) => q.id), ["r3_put_off", "r3_hand_over", "r3_others_better"]);
  assert.equal(ROUND_THREE.filter((q) => q.kind === "outside").length, 1);
  assert.equal(DISCOVER_QUESTIONS.length, 17);
  // Die Gegenfragen gehen nicht in die Auswertung - auch die der neuen Fassung nicht.
  for (const q of ROUND_THREE) assert.equal(isCounterQuestion(q.id), q.kind === "counter", q.id);
  for (const id of SCENE_IDS) assert.equal(findStrengthsQuestion(id)?.kind, "situation", id);
});

test("Auswahl: nur bekannte Szenen, ohne Doppelte, fünf oder sechs", () => {
  const picked = cleanSceneSelection(["sc_order", "gibt_es_nicht", "sc_order", "sc_unsure", "sc_nobody", "sc_convinced", "sc_from_zero"]);
  assert.deepEqual(picked, ["sc_order", "sc_unsure", "sc_nobody", "sc_convinced", "sc_from_zero"]);
  assert.equal(isValidSceneSelection(picked), true);
  assert.equal(isValidSceneSelection(picked.slice(0, 4)), false);
  assert.equal(isValidSceneSelection(cleanSceneSelection([...SCENE_IDS])), false);
  assert.equal(isValidSceneSelection(cleanSceneSelection(SCENE_IDS.slice(0, 6))), true);
});

test("Antwort: die Teile ohne Überschriften, getrennt durch eine Leerzeile", () => {
  assert.equal(composeAnswer({ situation: " Lage ", action: "", outcome: "Ergebnis" }), "Lage\n\nErgebnis");
  const ok = checkScene({ situation: "Der Kunde war skeptisch.", action: "Ich habe ihm Zahlen gezeigt." });
  assert.equal(ok.ok && ok.answer, "Der Kunde war skeptisch.\n\nIch habe ihm Zahlen gezeigt.");
  assert.deepEqual(checkScene({ situation: "kurz" }), { ok: false, reason: "short" });
  assert.deepEqual(checkScene({ action: "x".repeat(PART_MAX_LENGTH + 1) }), { ok: false, reason: "long" });
  // Drei volle Teile bleiben unter der Grenze der Datenbank (2000).
  const full = checkScene({ situation: "a".repeat(PART_MAX_LENGTH), action: "b".repeat(PART_MAX_LENGTH), outcome: "c".repeat(PART_MAX_LENGTH) });
  assert.equal(full.ok && full.answer.length <= 2000, true);
});

test("Nachfrage: nur bei sehr kurzer Antwort auf „Was hast du getan?“ und nur einmal", () => {
  assert.equal(needsFollowUp("Ich habe es gelöst.", false), true);
  assert.equal(needsFollowUp("Ich habe es gelöst.", true), false);
  assert.equal(needsFollowUp("", false), false);
  assert.equal(needsFollowUp("Ich habe zuerst gefragt, was ihn stört, und dann zwei Leute mitgebracht, die es erlebt hatten.", false), false);
});

test("Stichworte aus dem Intro: gekürzt, ohne Leeres und Doppeltes, höchstens acht", () => {
  assert.deepEqual(cleanIntroNotes(["  Pilotkundin  gewonnen ", "", "Pilotkundin gewonnen", 5, null]), ["Pilotkundin gewonnen"]);
  assert.equal(cleanIntroNotes(Array.from({ length: 20 }, (_, i) => `Notiz ${i}`)).length, 8);
  assert.equal(cleanIntroNotes(["x".repeat(200)])[0].length, 60);
});

test("Wo steht die Person: aus den Fragen des Gesprächs", () => {
  assert.deepEqual(discoverPhase([]), { phase: "pick" });
  const scenes = ["sc_unsure", "sc_nobody", "sc_convinced", "sc_order", "sc_from_zero"];
  assert.deepEqual(discoverPhase(scenes.map((id) => turn(id))), { phase: "scene", index: 0 });
  assert.deepEqual(discoverPhase([turn(scenes[0], "answered"), turn(scenes[1], "skipped"), ...scenes.slice(2).map((id) => turn(id))]), { phase: "scene", index: 2 });
  const done = scenes.map((id) => turn(id, "answered"));
  assert.deepEqual(discoverPhase(done), { phase: "interim" });
  const round = ROUND_THREE.map((q) => turn(q.id));
  assert.deepEqual(discoverPhase([...done, ...round]), { phase: "round3", index: 5 });
  assert.deepEqual(discoverPhase([...done, ...round.map((t) => ({ ...t, answered: true }))]), { phase: "finish" });
  assert.deepEqual(discoverPhase([...done, ...round.map((t, i) => (i < 2 ? { ...t, answered: true } : { ...t, skipped: true }))]), { phase: "finish" });
  assert.equal(answeredScenes(done), 5);
});

test("Überspringen geht nur, solange danach noch fünf Szenen beantwortbar bleiben", () => {
  const five = ["sc_unsure", "sc_nobody", "sc_convinced", "sc_order", "sc_from_zero"].map((id) => turn(id));
  assert.equal(canSkipScene(five), false, "bei fünf Szenen gibt es nichts zu überspringen");
  const six = [...five, turn("sc_asked_for")];
  assert.equal(canSkipScene(six), true);
  // Eine ist schon übersprungen: Es bleiben genau fünf, also keine zweite.
  assert.equal(canSkipScene([turn("sc_unsure", "skipped"), ...six.slice(1)]), false);
});

test("Zwischenstand: der Satz, der zeigt, was die Person getan hat", () => {
  assert.equal(keySentence({ parts: { action: "Ich habe zuerst gefragt." }, answer: "Lage\n\nIch habe zuerst gefragt." }), "Ich habe zuerst gefragt.");
  assert.equal(keySentence({ parts: {}, answer: "Nur ein Text." }), "Nur ein Text.");
  const long = `${"Das ist ein erster ganz ordentlicher Satz, der etwas länger ist. ".repeat(1)}${"Und danach kommt noch sehr viel mehr Text, der abgeschnitten werden muss, weil er sonst zu lang wäre für eine Karte. ".repeat(2)}`;
  const cut = keySentence({ parts: { action: long }, answer: long });
  assert.ok(cut.length <= 175, cut);
});

test("Fragetexte: echte Fragen mit Zeitanker, nie nach Stärken gefragt", () => {
  const anchor = /zuletzt|schon einmal|schon mal|immer wieder|letzte|Beschreib das letzte Mal/i;
  for (const locale of ["de", "en"]) {
    const questions = bundle(locale).interview.questions;
    for (const id of SCENE_IDS) {
      const entry = questions[id];
      assert.ok(entry?.title && entry.scene && entry.short && entry.hint, `${locale}: ${id} unvollständig`);
      assert.match(entry.title, /\?\s*(\S.*\?)?$/, `${locale}: ${id} ist keine Frage`);
      assert.doesNotMatch(entry.title, /^(Erzähl|Tell)/, `${locale}: ${id} ist eine Aufforderung`);
      assert.doesNotMatch(entry.title, /Stärke|strength/i, `${locale}: ${id} fragt nach Stärken`);
      if (locale === "de") assert.match(entry.title, anchor, `${locale}: ${id} ohne Zeitanker`);
    }
    for (const { id, kind } of ROUND_THREE) {
      const entry = questions[id];
      assert.ok(entry?.title && entry.hint, `${locale}: ${id} unvollständig`);
      assert.match(entry.title, /\?/, `${locale}: ${id} ist keine Frage`);
      if (kind !== "counter") assert.doesNotMatch(entry.title, /Stärke|strength/i, `${locale}: ${id}`);
    }
  }
});

test("Beide Sprachen haben dieselben Texte, Englisch ohne deutsche Zeichen", () => {
  const de = bundle("de");
  const en = bundle("en");
  assert.deepEqual(keys(de.discover).sort(), keys(en.discover).sort());
  for (const id of [...SCENE_IDS, ...ROUND_THREE.map((q) => q.id)]) {
    assert.deepEqual(keys(de.interview.questions[id]).sort(), keys(en.interview.questions[id]).sort(), id);
  }
  assert.doesNotMatch(JSON.stringify(en.discover), /[äöüÄÖÜß]/);
  for (const id of [...SCENE_IDS, ...ROUND_THREE.map((q) => q.id)]) assert.doesNotMatch(JSON.stringify(en.interview.questions[id]), /[äöüÄÖÜß]/, id);
});

test("Die Stichworte und der Zeitanker gehen nicht in die Auswertung", () => {
  // Der Arbeiter liest nur die Antworten (`get_ai_strength_job_answers`), nicht die Spalten der Fassung 3.
  const migration = read("../supabase/migrations/20261205120000_strength_interview.sql");
  const reader = migration.slice(migration.indexOf("create or replace function public.get_ai_strength_job_answers"), migration.indexOf("-- 8. Der Arbeiter schreibt"));
  assert.doesNotMatch(reader, /intro_notes|happened_when|answer_parts/);
  const worker = code("scripts/ai-worker.ts");
  assert.doesNotMatch(worker, /intro_notes|happened_when|answer_parts/);
  // Die Handlungen der Fassung 3 rufen die Auswertung nicht selbst.
  assert.doesNotMatch(code("src/features/strengths/strengthsDiscoverActions.ts"), /request_strength_proposals|ai_jobs|strengthAnalysis/);
});

test("Ein offenes Gespräch der Fassung 2 läuft weiter wie bisher", () => {
  const page = code("src/app/(product)/profile/strengths-interview/page.tsx");
  assert.match(page, /state\.guideVersion >= 3/);
  assert.match(page, /autosaveStrengthsAnswerAction/);
  assert.match(page, /saveStrengthsAnswerAction/);
});
