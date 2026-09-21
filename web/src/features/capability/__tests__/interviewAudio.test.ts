import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { INTERVIEW_QUESTIONS } from "@/features/capability/capabilityInterviewGuide";
import { hasSpokenTexts, spokenText } from "@/features/capability/interviewAudio";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const SCRIPT = "scripts/tts-build.ts";
const PAGE = "src/app/(product)/profile/interview/page.tsx";

/**
 * Die Stimme (aicappella).
 *
 * GEBAUT AM 21.09.2026. Der Katalog steht fest - genau das ist der Grund für
 * diese Bauweise: einmal erzeugen, ablegen, ausliefern.
 */

test("zur Laufzeit wird nichts erzeugt und nichts angefragt", () => {
  // DER EIGENTLICHE GEWINN: Der Schluessel muss nie zu Vercel. Es gibt in der
  // Anwendung keinen Aufruf beim Stimmdienst - nur statische Dateien und ein
  // Verzeichnis im Code. Ein Rendering kostet ausserdem rund zwanzig Sekunden
  // (gemessen: 8,5 Sekunden Sprache in 19 Sekunden), und so lange wartet
  // niemand vor einer Frage.
  for (const path of ["src/features/capability/interviewAudio.ts", PAGE]) {
    const code = codeOnly(path);
    assert.doesNotMatch(code, /aicappella|AICAPELLA|fetch\(/i, `${path} ruft den Dienst`);
  }

  // Der Schluessel steht nur im Skript, und dort aus der Umgebung.
  const script = codeOnly(SCRIPT);
  assert.match(script, /process\.env\.AICAPELLA_API_KEY/);
  assert.doesNotMatch(script, /aic_live_/, "ein Schluessel steht im Quelltext");
});

test("kein Knopf ohne Datei", () => {
  // Ein Knopf, der auf eine fehlende Datei zeigt, ist die unangenehmste Art
  // von Fehler: Man drueckt, und es passiert nichts.
  assert.equal(spokenText("de", "gibt.es.nicht"), null);
  assert.equal(spokenText("xx", "owned_last.title"), null);

  const page = source(PAGE);
  assert.match(page, /spokenText\(locale, `\$\{question\.id\}\.title`\) \?/);
  // Die Nachfragen stehen im Formular, nicht in der Seite - sie erscheinen
  // erst, wenn jemand angefangen hat zu schreiben.
  assert.match(
    source("src/features/capability/InterviewAnswerForm.tsx"),
    /followUp\.audio \? <SpeakButton/
  );
});

test("nur MP3 wird ausgeliefert - WAV ist Zwischenspeicher", () => {
  // Zweiunddreissig Texte waeren als WAV rund vierzehn Megabyte. Gemessen am
  // 21.09.2026: 8,5 Sekunden sind 406 KB als WAV und 51 KB als MP3.
  const audio = codeOnly("src/features/capability/interviewAudio.ts");
  assert.match(audio, /if \(!entry\?\.mp3\) return null/);

  // Und die WAV-Dateien liegen nicht im Repository.
  assert.match(source("../web/.gitignore"), /public\/audio\/interview\/\*\*\/\*\.wav/);
});

test("nur was sich geaendert hat wird neu erzeugt", () => {
  // Sonst kostete jede Rechtschreibkorrektur zwanzig Minuten und ein Stueck
  // Guthaben.
  const script = codeOnly(SCRIPT);
  assert.match(script, /known\?\.hash === hash && known\.mp3 && existsSync/);

  // UND EIN VORHANDENES WAV WIRD NUR UMGEWANDELT, nicht neu gerendert: Wer den
  // Encoder erst spaeter installiert, zahlt nicht zweimal. Genau so geprueft
  // am 21.09.2026 - mit einem falschen Schluessel liefen die beiden
  // vorhandenen Texte durch, ohne einen einzigen Auftrag.
  assert.match(script, /known\?\.hash === hash && existsSync\(`\$\{target\}\.wav`\) && ENCODER/);
});

test("der Dienst heisst job_id, nicht id", () => {
  // Die Dokumentation sagt "Antwort enthaelt eine id". Sie heisst `job_id` -
  // und `GET /jobs` OHNE Kennung liefert die ganze Liste. Wer das verwechselt,
  // laedt froehlich eine Fehlermeldung als WAV herunter: am 21.09.2026 genau
  // so passiert, 99 Bytes.
  const script = codeOnly(SCRIPT);
  assert.match(script, /created\.job_id/);
  // Deshalb wird geprueft, dass wirklich ein WAV ankommt.
  assert.match(script, /subarray\(0, 4\)\.toString\("ascii"\) !== "RIFF"/);
});

test("die Grenzen des Dienstes stehen im Skript", () => {
  // 300 Zeichen je Abschnitt, 20 Abschnitte je Auftrag. Getrennt wird an
  // Satzgrenzen: Mitten im Satz hoert man die Naht, weil jeder Abschnitt fuer
  // sich gerendert wird.
  const script = codeOnly(SCRIPT);
  assert.match(script, /MAX_SEGMENT = 300/);
  assert.match(script, /\.slice\(0, 20\)/);
  assert.match(script, /split\(\/\(\?<=\[\.!\?–\]\)\\s\+\//);
});

test("gesprochen wird, was im Leitfaden steht", () => {
  // Drei Texte je Frage: die Frage, der Hinweis, die zwei Nachfragen. Kommt
  // eine Frage dazu, faellt es hier auf - das Skript liest das Sprachbundle,
  // nicht eine Liste im Code.
  const script = codeOnly(SCRIPT);
  assert.match(script, /\$\{id\}\.title/);
  assert.match(script, /\$\{id\}\.hint/);
  assert.match(script, /\$\{id\}\.followUps\.\$\{followUpId\}/);

  const expected = INTERVIEW_QUESTIONS.reduce(
    (sum, question) => sum + 2 + question.followUpIds.length,
    0
  );
  assert.equal(expected, 32, "die Zahl der zu sprechenden Texte hat sich geaendert");
});

test("was schon erzeugt ist, ist auch benutzbar", () => {
  // Der Stand am 21.09.2026: die erste Frage und ihr Hinweis. Der Rest kommt,
  // wenn Maria das Skript mit ihrem eigenen Schluessel laufen laesst - der,
  // mit dem ich geprueft habe, wird gewechselt, weil er im Chat stand.
  const first = spokenText("de", "owned_last.title");
  if (first) {
    assert.match(first.src, /^\/audio\/interview\/de\/.+\.mp3$/);
    assert.ok(first.seconds > 0);
    assert.ok(hasSpokenTexts("de"));
  } else {
    // Auch das ist ein gueltiger Zustand: Dann zeigt die Seite keinen Knopf.
    assert.equal(hasSpokenTexts("de"), false);
  }
});
