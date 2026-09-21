import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { NARRATIVE_MIN_LENGTH } from "@/features/capability/capabilityTypes";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const DATA = "src/features/capability/capabilityInterviewData.ts";
const ACTIONS = "src/features/capability/capabilityInterviewActions.ts";
const FORM = "src/features/capability/InterviewAnswerForm.tsx";
const PAGE = "src/app/(product)/profile/interview/page.tsx";

const interviewCopy = (locale: string) =>
  (
    JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      interview: Record<string, string>;
    }
  ).interview;

/**
 * Das Gespräch führen.
 *
 * Marias Vorgabe vom 21.09.2026: "es muss eine gute anleitung geben, dass man
 * sich zeit nehmen soll, es soll automatisch gespeichert sein, falls was
 * abstürzt bzw man auch speichern kann falls man nicht alles auf einmal
 * beantworten will."
 *
 * Hier steht, was davon wirklich zugesagt wird - und die eine Stelle, an der
 * das automatische Speichern den Ablauf fast kaputt gemacht haette.
 */

test("automatisch gespeichert wird still - ohne Weiterleitung und ohne Meldung", () => {
  // Diese Aktion laeuft, WAEHREND jemand schreibt. Ein `redirect` wuerde
  // mitten im Satz die Seite wechseln, eine Fehlermeldung wuerde vom Tippen
  // ablenken - und zwar wegen etwas, das der Browser gleich noch einmal
  // versucht.
  const actions = codeOnly(ACTIONS);
  const autosave = actions.slice(
    actions.indexOf("export async function autosaveInterviewAnswerAction"),
    actions.indexOf("export async function saveInterviewAnswerAction")
  );
  assert.ok(autosave.length > 0, "die Aktion fehlt");
  assert.doesNotMatch(autosave, /redirect\(/, "das Zwischenspeichern leitet weiter");
  assert.doesNotMatch(autosave, /back\(/, "das Zwischenspeichern zeigt einen Fehler");
  assert.match(autosave, /return \{ saved: (!error|false) \}/);

  // Und es schreibt nichts, was die Datenbank ohnehin ablehnen wuerde: Die
  // Untergrenze ist dieselbe wie beim Textfeld.
  assert.match(autosave, /answer\.length < NARRATIVE_MIN_LENGTH/);
});

test("die aktuelle Frage ist die letzte - nicht die erste unbeantwortete", () => {
  // DAS IST DIE STELLE, AN DER DAS AUTOMATISCHE SPEICHERN DEN ABLAUF FAST
  // KAPUTT GEMACHT HAETTE: Sobald genug Text da ist, steht die Antwort in der
  // Datenbank und `answered_at` ist gesetzt - obwohl der Mensch noch tippt.
  // Waere "die erste unbeantwortete" die aktuelle Frage, wuerde das Gespraech
  // beim Zwischenspeichern von selbst zur naechsten springen.
  const data = codeOnly(DATA);
  assert.match(data, /current: turns\.length > 0 \? turns\[turns\.length - 1\] : null/);
  assert.doesNotMatch(data, /find\(\(turn\) => turn\.answer === null\)/, "springt beim Speichern weiter");

  // Weitergegangen wird nur durch eine Handlung: Es entsteht eine neue Zeile.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /async function appendNextQuestion/);
  assert.match(actions, /sort_order: sortOrder/);
});

test("eine uebersprungene Frage wird nicht wieder gestellt", () => {
  // Sie bleibt im Verlauf stehen, mit leerer Antwort. Sie zu loeschen waere
  // bequemer - dann wuerde der Leitfaden sie beim naechsten Mal wieder
  // stellen, und "weiss ich nicht" muesste man dreimal sagen.
  const actions = codeOnly(ACTIONS);
  const skip = actions.slice(
    actions.indexOf("export async function skipInterviewQuestionAction"),
    actions.indexOf("async function appendNextQuestion")
  );
  assert.ok(skip.length > 0);
  assert.doesNotMatch(skip, /\.delete\(\)/, "die uebersprungene Frage wird geloescht");
  assert.match(skip, /appendNextQuestion/);
});

test("zwei Ebenen speichern, und sie sagen Verschiedenes", () => {
  // Der Browser sofort, der Server verzoegert. Beides braucht es: Ein
  // Zwischenspeichern bei jedem Tastendruck waere eine Anfrage pro Buchstabe,
  // und `localStorage` ist in einem privaten Fenster leer und auf einem
  // anderen Geraet nie da.
  const form = codeOnly(FORM);
  assert.match(form, /localStorage\.setItem/);
  assert.match(form, /autosaveInterviewAnswerAction/);
  assert.match(form, /AUTOSAVE_DELAY_MS/);

  // Jeder Zugriff auf den Browserspeicher ist abgesichert: In einem privaten
  // Fenster oder bei abgeschalteten Websitedaten wirft er.
  assert.equal(
    (form.match(/try \{/g) ?? []).length,
    3,
    "ein Zugriff auf localStorage ist nicht abgesichert"
  );

  // "In diesem Browser gesichert" und "Gespeichert" sind ZWEI Zusagen, und ein
  // Haken koennte beide bedeuten. Deshalb Worte, und deshalb verschiedene.
  for (const locale of ["de", "en"]) {
    const copy = interviewCopy(locale);
    const states = ["saveStateIdle", "saveStateLocal", "saveStateSaving", "saveStateSaved", "saveStateFailed"];
    for (const key of states) {
      assert.ok(copy[key], `${locale}: interview.${key} fehlt`);
    }
    assert.notEqual(
      copy.saveStateLocal,
      copy.saveStateSaved,
      `${locale}: Browser und Server sagen dasselbe`
    );
    // Und der Fehlerfall sagt, wo der Text noch liegt - sonst schreibt jemand
    // alles neu.
    assert.match(
      copy.saveStateFailed,
      locale === "de" ? /Browser/ : /browser/,
      `${locale}: der Fehlerfall sagt nicht, dass der Text noch da ist`
    );
  }
});

test("der laengere Stand gewinnt, und es wird gesagt", () => {
  // Wer mit 300 getippten Zeichen die Verbindung verliert, hat auf dem Server
  // vielleicht nur 100. Den laengeren Stand still zu verwerfen waere der
  // schlimmste Fall von allen.
  const form = codeOnly(FORM);
  assert.match(form, /draft\.trim\(\)\.length > savedAnswer\.trim\(\)\.length/);
  assert.match(form, /setRestored\(true\)/);
  assert.match(form, /interview\.restored/);

  for (const locale of ["de", "en"]) {
    const restored = interviewCopy(locale).restored;
    assert.ok(restored, `${locale}: interview.restored fehlt`);
    // Es bittet ums Nachsehen, statt eine Wiederherstellung zu behaupten.
    assert.match(
      restored,
      locale === "de" ? /[Pp]rüf/ : /check/i,
      `${locale}: der Hinweis bittet nicht ums Nachsehen`
    );
  }
});

test("die Nachfragen kommen nach dem Schreiben, nicht davor", () => {
  // Vorher waeren es drei Fragen gleichzeitig und niemand faengt an. Danach
  // sind sie das, was sie sein sollen: ein Nachhaken an derselben Geschichte.
  const form = codeOnly(FORM);
  assert.match(form, /showFollowUps = value\.trim\(\)\.length >= NARRATIVE_MIN_LENGTH/);
  assert.ok(NARRATIVE_MIN_LENGTH >= 10, "die Schwelle ist zu niedrig, um etwas zu bedeuten");

  // Und sie verlaengern dieselbe Antwort, statt eine eigene Station zu werden:
  // sechzehn Stationen statt acht waeren eine Stunde.
  for (const locale of ["de", "en"]) {
    assert.ok(interviewCopy(locale).followUpHint, `${locale}: interview.followUpHint fehlt`);
  }
});

test("die Anleitung steht vor dem Anfangen, die Zusage auch", () => {
  // Frage 3 fragt nach dem Privaten. Wer erst hinterher erfaehrt, wohin das
  // geht, hat nicht eingewilligt, sondern erzaehlt.
  const page = source(PAGE);
  const guidance = page.indexOf('t("interview.guidanceTime")');
  const privacy = page.indexOf('t("interview.privacy")');
  const start = page.indexOf("startInterviewAction");
  assert.ok(guidance > 0 && privacy > 0, "Anleitung oder Zusage fehlen");
  assert.ok(guidance < privacy, "die Zusage steht vor der Anleitung");
  assert.ok(privacy < page.indexOf('t("interview.start")'), "die Zusage steht nach dem Knopf");
  assert.ok(start > 0);
});

test("nichts auf der Seite behauptet einen zuhoerenden Coach", () => {
  // Marias Entscheidung war "Modell live, und wenn es nicht verfuegbar ist,
  // soll das angezeigt werden". Solange der Modellweg nicht gebaut ist, darf
  // dort auch keine Anzeige dazu stehen: Eine Zustandsanzeige fuer einen
  // Zustand, den es nicht gibt, ist die unehrlichste Art von Fortschritt.
  const page = codeOnly(PAGE);
  assert.doesNotMatch(page, /live|hört zu|listening/i, "die Seite behauptet einen Live-Coach");

  // Und es wird auch kein Modell gerufen.
  for (const path of [PAGE, ACTIONS, DATA, FORM]) {
    assert.doesNotMatch(
      codeOnly(path),
      /askModelForJson|ollama|enqueue_ai_job/i,
      `${path} ruft ein Modell`
    );
  }
});

test("das Gespraech ist vom Profil aus zu finden", () => {
  // Eine Seite, die niemand findet, ist keine.
  const profile = source("src/app/(product)/profile/page.tsx");
  assert.match(profile, /href="\/profile\/interview"/);

  // Und die Meldungen danach erscheinen: Unbekannte Schluessel wuerden als
  // roher Pfad auf der Seite landen.
  assert.match(profile, /"interview_done"/);
  assert.match(profile, /"interview_paused"/);
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      success: Record<string, string>;
      notices: Record<string, string>;
    };
    assert.ok(bundle.success.interview_done, `${locale}: success.interview_done fehlt`);
    assert.ok(bundle.notices.interview_paused, `${locale}: notices.interview_paused fehlt`);
  }
});

test("das Gespraech hat ein Ende", () => {
  // Bei der letzten Frage schliesst derselbe Knopf ab - sonst bliebe man bei
  // einer Frage stehen, zu der es keine naechste gibt.
  assert.match(codeOnly(FORM), /intent=\{isLastQuestion \? "complete" : "next"\}/);
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /mode === "complete"/);
  assert.match(actions, /status: "completed", completed_at/);

  // Und eine zweite Sitzung kann danach beginnen: Der Teilindex in der
  // Datenbank erlaubt genau eine AKTIVE.
  const migration = source("../supabase/migrations/20261021120000_capability_interview.sql");
  assert.match(migration, /where status = 'active'/);
});

test("kein Absendeknopf ohne Pending-Zustand", () => {
  // GEMELDET AM 21.09.2026: "Irgendwann zwischendurch hatte ich die Ansage,
  // hey, die Frage ist jetzt veraltet [...] obwohl ich gar nichts gemacht
  // habe."
  //
  // DIE URSACHE WAR DAS FEHLENDE PENDING: Ein Klick zeigte nichts, also
  // klickte man noch einmal - und der zweite Klick schickte die inzwischen
  // veraltete Frage-Kennung. `SubmitButton` gab es im Projekt, mit genau
  // diesem Satz in seiner Beschreibung ("disabled waehrend pending verhindert
  // das doppelte Absenden"); ich hatte rohe Knoepfe gebaut.
  const form = codeOnly(FORM);
  assert.doesNotMatch(form, /type="submit"/, "ein roher Absendeknopf ohne Pending");
  assert.equal(
    (form.match(/<SubmitButton/g) ?? []).length,
    3,
    "Weiter, Speichern und Ueberspringen brauchen alle drei einen Pending-Zustand"
  );

  // Und die Pending-Texte existieren, sonst zeigt der Knopf einen Schluessel.
  for (const locale of ["de", "en"]) {
    const copy = interviewCopy(locale);
    for (const key of ["submitPending", "pausePending", "skipPending"]) {
      assert.ok(copy[key], `${locale}: interview.${key} fehlt`);
    }
  }
});

test("ein zweiter Klick ist kein Fehler", () => {
  // Selbst mit Pending bleibt der Fall moeglich (zwei Fenster, Zurueck-Knopf).
  // Dann ist aber nichts verloren gegangen - und eine Fehlermeldung gehoert
  // nur dorthin, wo jemand etwas verloren hat.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /function continueQuietly/);
  assert.match(actions, /continueQuietly\(state, turnId\)/);

  // Drei Faelle, drei Antworten: abgeschlossen ist ein Ende, eine beantwortete
  // Frage ist ein zweiter Klick, und nur eine unbeantwortete ist ein Fehler.
  const quietly = actions.slice(
    actions.indexOf("function continueQuietly"),
    actions.indexOf("export async function startInterviewAction")
  );
  assert.match(quietly, /if \(!state\) \{[\s\S]{0,200}saved=interview_done/);
  assert.match(quietly, /submitted\?\.answer/);
  assert.match(quietly, /back\("stale"\)/);

  // Und beide Wege - Weiter und Ueberspringen - nehmen dieselbe Behandlung.
  assert.equal(
    (actions.match(/continueQuietly\(state, turnId\)/g) ?? []).length,
    2,
    "einer der beiden Wege zeigt weiter einen Fehler"
  );
});

test("die Verhaltensbereiche sind fuer die Erkennung sichtbar", () => {
  // GEMELDET AM 21.09.2026 nach dem ersten echten Durchlauf: "das waren
  // wirklich nur die Hard Skills".
  //
  // DER FEHLER WAR MEINER: Die fuenf Bereiche der Familie
  // "Aussenauftritt & Moderation" sind ins Vokabular und in beide
  // Sprachbundles gekommen - aber nicht in die Begriffsliste der Erkennung.
  // Damit konnten sie aus einem Text nie vorgeschlagen werden, und die
  // Auswertung zeigte ausschliesslich Fachliches.
  const analysis = readFileSync("src/features/capability/narrativeAnalysis.ts", "utf8");
  for (const areaId of [
    "public_speaking",
    "facilitation",
    "networking",
    "difficult_conversations",
    "teaching_mentoring",
  ]) {
    assert.match(analysis, new RegExp(`\\n  ${areaId}: \\[`), `${areaId} hat keine Begriffe`);
  }
});
