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

test("das Gespräch läuft auch ohne Modell, und die Seite sagt es", () => {
  // UMGEDREHT AM 22.09.2026 (Schritt S4). Vorher hielt dieser Test fest, dass
  // es noch gar kein Modell gibt ("keine Erwähnung von ai_jobs"). Jetzt gibt
  // es eines - und die Zusage dahinter ist dieselbe geblieben: Das Produkt
  // behauptet keine Auswertung, die es gerade nicht liefern kann.
  //
  // "Nicht erreichbar" ist deshalb ein Zustand, der dasteht, und kein Knopf,
  // der nichts tut.
  const page = codeOnly(PAGE);
  assert.match(page, /aiAvailable \?/);
  assert.match(page, /done\.withoutAi/);
  for (const locale of ["de", "en"]) {
    const done = (bundle(locale) as unknown as { done: Record<string, string> }).done;
    assert.ok(done.withoutAi, `${locale}: der Hinweis auf das fehlende Modell fehlt`);
    // GEMELDET AM 22.09.2026: "Da müsste es natürlich auch eine Möglichkeit
    // geben, dass das ohne KI auch funktioniert." Es genügt deshalb nicht zu
    // sagen, dass kein Modell da ist - der Satz muss den Weg nennen, der
    // trotzdem offen steht: selbst aufschreiben.
    assert.match(
      done.withoutAi,
      /Meine Richtung|My direction/,
      `${locale}: der Satz nennt den Weg ohne Modell nicht`
    );
  }

  // Das GESPRÄCH selbst bleibt ohne Modell vollständig: Fragen, Antworten,
  // Pausieren, Rückblick. Die Aktionen des Interviews rufen nichts.
  const interviewActions = codeOnly(ACTIONS);
  assert.doesNotMatch(interviewActions, /enqueue_ai_job|askModelForJson|ai_jobs/);
  // Und Stimme gibt es hier weiterhin nicht - das ist Schritt S5.
  assert.match(page, /audio: null/);
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

// ---------------------------------------------------------------------------
// Was aus dem Gespräch bleibt (Schritt S3)
// ---------------------------------------------------------------------------

const STATEMENT_DATA = "src/features/direction/directionStatementData.ts";
const STATEMENT_ACTIONS = "src/features/direction/directionStatementActions.ts";
const STATEMENT_VIEW = "src/features/direction/DirectionStatements.tsx";
const MIGRATION = "../supabase/migrations/20261036120000_direction_statements.sql";
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

test("die Facetten im Code und in der Datenbank sind dieselben", () => {
  // Wäre die Liste im Code länger, liefe eine Aussage in einen
  // Constraint-Fehler. Wäre sie kürzer, gäbe es eine Rubrik, die niemand
  // wählen kann.
  const migration = sqlCodeOnly(MIGRATION);
  const start = migration.indexOf("direction_statements_facet_check");
  const block = migration.slice(start, migration.indexOf("))", start));
  const inDatabase = [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(inDatabase, [...DIRECTION_FACETS].sort());
});

test("ein Vorschlag ist keine Aussage - und das steckt in zwei Tabellen", () => {
  // DIE ZUSAGE aus dem Briefing: "Nur bestätigte Inhalte dürfen später für
  // andere Produktbereiche genutzt werden." Sie wird nicht von der
  // Oberfläche eingehalten, sondern davon, dass es zwei Tabellen sind. Eine
  // `status`-Spalte in einer gemeinsamen Tabelle wäre dieselbe Zusage mit
  // einem vergessenen `where` Abstand.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /create table public\.direction_statements/);
  assert.match(migration, /create table public\.direction_statement_proposals/);
  // Kein Schreibrecht auf die Vorschläge - sie entstehen nur in Schritt S4.
  assert.doesNotMatch(migration, /grant insert[^;]*direction_statement_proposals/i);
  assert.match(migration, /grant update \(status, decided_at\) on public\.direction_statement_proposals/);

  // Und außerhalb des Direction-Bereichs liest niemand die Vorschläge.
  const readers = [codeOnly(STATEMENT_DATA), codeOnly(STATEMENT_VIEW)].join("\n");
  assert.doesNotMatch(readers, /direction_statement_proposals/);
});

test("die Anwendung schreibt nur eigene Worte", () => {
  // Die beiden anderen Herkünfte entstehen erst in Schritt S4, und zwar
  // durch eine Funktion in der Datenbank. Könnte die Anwendung sie schon
  // schreiben, wäre die Herkunft eine Behauptung des Aufrufers statt einer
  // Tatsache - und die Frage "wessen Formulierung ist das" wäre nicht mehr
  // beantwortbar.
  const actions = codeOnly(STATEMENT_ACTIONS);
  assert.match(actions, /origin: "own_words"/);
  assert.doesNotMatch(actions, /confirmed_proposal|edited_proposal/);
  // Und die Facette wird geprüft, bevor sie in die Datenbank geht: Der
  // Constraint fängt es auch, aber als Ausnahme statt als Meldung.
  assert.match(actions, /DIRECTION_FACETS as readonly string\[\]\)\.includes\(facet\)/);
});

test("entfernen heißt entfernen", () => {
  // Kein "verborgen"-Merkmal: Wer eine Aussage über sich zurücknimmt, will
  // nicht, dass sie irgendwo weiterlebt.
  const actions = codeOnly(STATEMENT_ACTIONS);
  assert.match(actions, /\.delete\(\)/);
  assert.doesNotMatch(actions, /hidden|archived|is_active/);
});

test("es gibt keine Freigabestufe, solange es kein Teilen gibt", () => {
  // "Privat" ist hier kein Vorgabewert in einer Spalte, sondern die
  // Abwesenheit jeder anderen Regel: Die Zeilensicherheit lässt nur die
  // eigene Person lesen. Eine Spalte `direction_disclosure`, die niemand
  // liest, wäre ein Versprechen, das nichts einlöst - abweichend vom Brief,
  // der sie für S3 vorsah.
  const migration = sqlCodeOnly(MIGRATION);
  assert.doesNotMatch(migration, /direction_disclosure/);
  assert.equal((migration.match(/user_id = auth\.uid\(\)/g) ?? []).length >= 4, true);
});

test("die Auswertung steht in beiden Sprachen und ohne Zahl", () => {
  for (const locale of ["de", "en"]) {
    const statements = (bundle(locale) as unknown as {
      statements: { facets: Record<string, string>; origins: Record<string, string> } & Record<string, string>;
    }).statements;
    for (const facet of DIRECTION_FACETS) {
      assert.ok(statements.facets[facet], `${locale}: ${facet} hat keinen Namen`);
    }
    assert.deepEqual(
      Object.keys(statements.facets).sort(),
      [...DIRECTION_FACETS].sort(),
      `${locale}: die Rubriken und die Facetten stimmen nicht überein`
    );
    for (const origin of ["own_words", "confirmed_proposal", "edited_proposal"]) {
      assert.ok(statements.origins[origin], `${locale}: Herkunft ${origin} fehlt`);
    }
    assert.ok(statements.pendingProposals, `${locale}: der Hinweis auf fehlende Vorschläge fehlt`);
  }
});

test("am Ende steht, was als Nächstes dran ist - nicht der Anfang", () => {
  // GEMELDET AM 22.09.2026: "Was ich nicht so gut fand, war der Flow am Ende,
  // wenn man durch ist und wo man dann hinspringen muss."
  //
  // Vorher landete man nach dem Abschließen wieder auf "Bevor du anfängst" -
  // das liest sich, als wäre nichts passiert. Die Anleitung erscheint jetzt
  // nur noch beim ersten Mal.
  const page = codeOnly(PAGE);
  assert.match(page, /answers\.length === 0 \? \(/);
  assert.match(page, /done\.title/);
  // "Noch einmal" steht ganz unten und leise: Es ist der seltenere Wunsch.
  const doneAt = page.indexOf("done.title");
  const againAt = page.indexOf("again.cta");
  assert.ok(doneAt > 0 && againAt > doneAt, "der Neustart darf nicht oben stehen");
});

test("ein Knopf statt sechs", () => {
  // GEMELDET AM 22.09.2026: "Wenn du das sechsmal anklicken musst, ist das ein
  // bisschen unhandlich." Es bleibt eine Entscheidung, nur eine statt sechs.
  const page = codeOnly(PAGE);
  assert.match(page, /askForAllDirectionProposalsAction/);
  assert.doesNotMatch(page, /name="turnId"/);
  // Und die Liste der Antworten kommt aus der Datenbank, nicht aus dem
  // Formular: Sonst bestimmte der Browser, welche Zeilen an ein Modell gehen.
  const actions = codeOnly("src/features/direction/directionStatementActions.ts");
  const from = actions.indexOf("askForAllDirectionProposalsAction");
  // Nur DIESE Funktion, nicht die nächste: Ein zu großzügiger Ausschnitt
  // findet das `formData` der folgenden und lässt den Test falsch rot werden.
  const body = actions.slice(from, actions.indexOf("export async function", from + 1));
  assert.match(body, /getDirectionAnswers\(client\)/);
  assert.doesNotMatch(body, /formData/);
});

test("die ersetzte Frage bleibt lesbar, wird aber nicht mehr gestellt", () => {
  // Wer sie schon beantwortet hat, findet seine Antwort im Rückblick wieder.
  // Ohne den Eintrag stünde dort die nackte Kennung - oder, schlimmer, der
  // Text einer ANDEREN Frage, wenn man die Kennung wiederverwendet.
  assert.equal(DIRECTION_QUESTIONS.some((question) => question.id === "change_in_others"), false);
  assert.ok(findDirectionQuestion("change_in_others"), "die alte Frage ist nicht mehr auffindbar");
  for (const locale of ["de", "en"]) {
    const questions = (bundle(locale) as unknown as {
      interview: { questions: Record<string, { title: string }> };
    }).interview.questions;
    assert.ok(questions.change_in_others, `${locale}: der alte Fragetext fehlt`);
    assert.ok(questions.not_again, `${locale}: die neue Frage fehlt`);
  }
});
