import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DIRECTION_FACETS,
  DIRECTION_MIN_ANSWERS,
  DIRECTION_QUESTIONS,
  directionProgress,
  findDirectionQuestion,
  nextDirectionQuestion,
} from "@/features/direction/directionInterviewGuide";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const GUIDE = "src/features/direction/directionInterviewGuide.ts";
const DATA = "src/features/direction/directionInterviewData.ts";
const ACTIONS = "src/features/direction/directionInterviewActions.ts";
const PAGE = "src/app/(product)/profile/direction/page.tsx";
const FORM = "src/features/interviews/InterviewAnswerForm.tsx";
const bundle = (locale: string) =>
  JSON.parse(source(`messages/${locale}/direction.json`)) as Record<string, never>;

// ---------------------------------------------------------------------------
// Das Direction-Interview, Schritt S2
// ---------------------------------------------------------------------------
//
// GEWÜNSCHT AM 21.09.2026: "Ein Interview in Richtung Golden Circle, wo man
// dann eben nochmal richtig toll ausgearbeitet bekommt, was treibt die Person
// eigentlich an."
//
// Architektur in `web/docs/direction-interview-technical-brief.md`. S2 ist
// das Gespräch OHNE Modell: sechs Fragen, geschriebene Nachfragen, Pausieren,
// Rückblick. Die Interpretation kommt in S3 und S4.

test("sechs Fragen, jede mit Facetten und mindestens einer Nachfrage", () => {
  assert.equal(DIRECTION_QUESTIONS.length, 6);
  const ids = DIRECTION_QUESTIONS.map((question) => question.id);
  assert.equal(new Set(ids).size, 6, "zwei Fragen teilen eine Kennung");
  for (const question of DIRECTION_QUESTIONS) {
    assert.ok(question.facets.length > 0, `${question.id} hat keine Facette`);
    for (const facet of question.facets) {
      assert.ok(
        (DIRECTION_FACETS as readonly string[]).includes(facet),
        `${question.id} zeigt auf eine unbekannte Facette: ${facet}`
      );
    }
    // KEINE GENERISCHE NACHFRAGE: "Kannst du mehr erzählen?" signalisiert,
    // dass niemand zugehört hat. Jede Frage braucht mindestens eine eigene -
    // sie ist der ganze Rückfall, wenn kein Modell läuft.
    assert.ok(question.followUpIds.length > 0, `${question.id} hat keine Nachfrage`);
  }
});

test("jede Frage verlangt eine Begebenheit, keine Selbsteinschätzung", () => {
  // DIE FACHLICHE GRUNDLAGE, dieselbe wie beim Capability-Interview: "Was ist
  // dein Why" misst Selbstbild und lädt zu einer Antwort ein, die man schon
  // einmal gehört hat. Gefragt wird nach einem Ereignis - über einen
  // Zeitanker ("zuletzt") oder über die Einladung zu erzählen.
  const anchors = /erzähl|zuletzt|wann hattest|welche|was würdest|wenn du|regt dich/i;
  for (const locale of ["de", "en"]) {
    const questions = (bundle(locale) as unknown as {
      interview: { questions: Record<string, { title: string }> };
    }).interview.questions;
    for (const question of DIRECTION_QUESTIONS) {
      const title = questions[question.id]?.title;
      assert.ok(title, `${locale}: ${question.id} hat keinen Fragetext`);
      // Keine Eigenschaftsfrage: "Was ist dein Antrieb" wäre genau das.
      assert.doesNotMatch(
        title!,
        /was ist dein|what is your|bist du|are you/i,
        `${locale}: ${question.id} fragt nach einer Eigenschaft`
      );
    }
    if (locale === "de") {
      for (const question of DIRECTION_QUESTIONS) {
        assert.match(questions[question.id]!.title, anchors, `de: ${question.id} ohne Anker`);
      }
    }
  }
});

test("der Vertrag des geteilten Antwortfeldes ist in beiden Sprachen erfüllt", () => {
  // DER PREIS DER WIEDERVERWENDUNG: Das Feld nimmt seinen Namensraum als
  // Eigenschaft, statt neunzehn Beschriftungen einzeln zu verlangen. Damit
  // ist der Schlüsselname ein Vertrag - und ein fehlender Schlüssel fällt
  // sonst erst auf, wenn jemand vor dem Feld sitzt.
  const needed = [...codeOnly(FORM).matchAll(/t\("(interview\.[a-zA-Z]+)"/g)].map(
    (match) => match[1]!.replace("interview.", "")
  );
  assert.ok(needed.length >= 15, `nur ${needed.length} Schlüssel im Feld gefunden`);
  for (const locale of ["de", "en"]) {
    const interview = (bundle(locale) as unknown as {
      interview: Record<string, unknown>;
    }).interview;
    for (const key of new Set(needed)) {
      assert.ok(interview[key], `${locale}: interview.${key} fehlt`);
    }
  }
});

test("der Fortschritt zählt die Station, nicht die Antworten", () => {
  // GEMELDET AM 21.09.2026 am Capability-Interview: "Es wäre schön, wenn man
  // sieht, bei welcher Frage man ist - weil wenn du dann doch eine
  // überspringst, steht da trotzdem eine von acht."
  const progress = directionProgress(["more_of_this"], ["more_of_this", "keeps_bothering"]);
  assert.equal(progress.atQuestion, 2);
  assert.equal(progress.answeredCount, 1);
  assert.equal(progress.total, 6);
  assert.equal(progress.hasEnough, false);

  assert.equal(DIRECTION_MIN_ANSWERS, 4);
  const four = ["more_of_this", "keeps_bothering", "changed_something", "change_in_others"];
  assert.equal(directionProgress(four, four).hasEnough, true);
});

test("der Leitfaden geht der Reihe nach und kennt seine Fragen", () => {
  assert.equal(nextDirectionQuestion([])?.id, "more_of_this");
  assert.equal(nextDirectionQuestion(["more_of_this"])?.id, "keeps_bothering");
  assert.equal(nextDirectionQuestion(DIRECTION_QUESTIONS.map((q) => q.id)), null);
  assert.equal(findDirectionQuestion("five_years_back")?.facets.includes("desired_change"), true);
  assert.equal(findDirectionQuestion("gibt_es_nicht"), null);
});

test("jeder Leser und jede Aktion filtert auf die Art", () => {
  // Ohne den Filter holt `maybeSingle()` bei zwei offenen Gesprächen einen
  // Fehler, und der wird als "kein Gespräch" gelesen - beide Interviews wären
  // damit füreinander unsichtbar.
  for (const path of [DATA, ACTIONS]) {
    const code = codeOnly(path);
    const queries = code.split(/await client\s*\n?\s*\./).slice(1);
    for (const query of queries) {
      if (!/from\("capability_interview_(sessions|turns)"\)/.test(query)) continue;
      const chain = query.slice(0, query.includes(";") ? query.indexOf(";") : 400);
      assert.ok(
        /DIRECTION_INTERVIEW/.test(chain) || /\.eq\("session_id"/.test(chain),
        `${path}: eine Abfrage ohne Art: ${chain.slice(0, 80)}`
      );
    }
  }
  // Und beim Schreiben steht sie ausdrücklich da.
  const actions = codeOnly(ACTIONS);
  // Vier Schreibstellen: die Sitzung und drei Stellen, an denen eine Frage
  // angelegt wird (fortsetzen, erste Frage, nächste Frage).
  assert.equal((actions.match(/kind: DIRECTION_INTERVIEW/g) ?? []).length, 4);
});

test("S2 läuft ohne Modell, und die Seite behauptet auch keines", () => {
  // Ein Produkt, das eine Auswertung ankündigt, die es nicht gibt, hat sie
  // damit nicht. Die Seite sagt ausdrücklich, dass die Zusammenfassung noch
  // nicht automatisch entsteht - das ist ehrlicher als ein leerer Block.
  const actions = codeOnly(ACTIONS);
  assert.doesNotMatch(actions, /enqueue_ai_job|askModelForJson|ai_jobs/);
  const page = codeOnly(PAGE);
  assert.match(page, /review\.pendingSummary/);
  assert.match(page, /audio: null/);
  for (const locale of ["de", "en"]) {
    const review = (bundle(locale) as unknown as { review: Record<string, string> }).review;
    assert.ok(review.pendingSummary, `${locale}: der Hinweis auf die fehlende Zusammenfassung fehlt`);
  }
});

test("es ist kein Test und sagt das auch", () => {
  // Kein Purpose Score, kein Founder Type, keine psychologische Kategorie,
  // keine Erfolgsprognose. Die Begriffe sollen nicht erst in einer Auswertung
  // auftauchen, sondern nirgends.
  const all = [codeOnly(GUIDE), codeOnly(DATA), codeOnly(ACTIONS), codeOnly(PAGE)].join("\n");
  // Die Begriffe stehen einzeln da und nicht als breites Muster: Ein
  // `Typ[a-z]*` würde `ReturnType` treffen, und ein Test, der wegen seiner
  // eigenen Unschärfe rot wird, wird irgendwann gelockert statt gelesen.
  for (const forbidden of [
    /\bscores?\b/i,
    /purpose/i,
    /personality/i,
    /psycholog/i,
    /founder.?type/i,
    /pers\u00f6nlichkeitstyp/i,
    /motivdiagnostik/i,
  ]) {
    assert.doesNotMatch(all, forbidden, `verbotener Begriff: ${forbidden}`);
  }
  for (const locale of ["de", "en"]) {
    const guidance = (bundle(locale) as unknown as { guidance: Record<string, string> }).guidance;
    assert.ok(guidance.noTest, `${locale}: die Zusage "kein Test" fehlt`);
    assert.ok(guidance.private, `${locale}: die Zusage zur Sichtbarkeit fehlt`);
  }
});

test("die Anleitung und die Zusagen stehen vor dem Anfangen", () => {
  // Hier wird nach Ärger, Sinn und dem langen Blick gefragt. Wer erst
  // hinterher erfährt, wohin das geht, hat nicht eingewilligt, sondern
  // erzählt. Dieselbe Regel wie beim Capability-Interview, wo Frage 3 nach
  // dem Privaten fragt.
  const page = codeOnly(PAGE);
  const guidanceAt = page.indexOf("guidance.private");
  const startAt = page.indexOf("startDirectionInterviewAction} className");
  assert.ok(guidanceAt > 0 && startAt > 0, "Anleitung oder Startknopf fehlen");
  assert.ok(guidanceAt < startAt, "die Zusagen müssen vor dem Startknopf stehen");
  for (const key of ["time", "save", "stories"]) {
    assert.match(page, new RegExp(`guidance\\.${key}`), `guidance.${key} steht nicht auf der Seite`);
  }
});

test("das Antwortfeld wird geteilt, nicht kopiert", () => {
  // Zweihundertachtzig Zeilen zweischichtiges Speichern gibt es einmal.
  const page = codeOnly(PAGE);
  assert.match(page, /from "@\/features\/interviews\/InterviewAnswerForm"/);
  assert.match(page, /namespace="direction"/);
  assert.match(page, /autosave: autosaveDirectionAnswerAction/);
  // Und es gibt keine zweite Kopie im Direction-Bereich.
  assert.doesNotMatch(codeOnly(ACTIONS), /localStorage/);
});
