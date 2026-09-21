import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  INTERVIEW_MIN_ANSWERS,
  INTERVIEW_QUESTIONS,
  INTERVIEW_QUESTION_IDS,
  findInterviewQuestion,
  interviewProgress,
  nextCatalogueQuestion,
} from "@/features/capability/capabilityInterviewGuide";
import { OWNERSHIP_WISHES } from "@/features/capability/capabilityTypes";

const MIGRATION = "../supabase/migrations/20261021120000_capability_interview.sql";
const AREAS_MIGRATION = "../supabase/migrations/20260907160000_create_capability_snapshot_v01.sql";

const copy = (locale: string) =>
  (
    JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      interview: {
        questions: Record<string, { title: string; hint: string; followUps: Record<string, string> }>;
      } & Record<string, unknown>;
      areaLabels: Record<string, string>;
      families: Record<string, string>;
    }
  );

/**
 * Der Gesprächsleitfaden.
 *
 * GEWUENSCHT AM 21.09.2026: "Dass da eben gute Fragen gestellt werden [...] der
 * nach realen Situationen fragt, nach beruflichen Situationen, aber auch
 * privaten Situationen."
 *
 * Die Tabellen dahinter prueft `supabase/tests/capability_interview.sql` mit 15
 * pgTAP-Faellen. Hier steht, was den Katalog zu einem Leitfaden macht und nicht
 * zu einer Liste von Fragen.
 */

test("jede Frage fragt nach einer Situation, nicht nach einer Eigenschaft", () => {
  // DIE METHODISCHE REGEL DES GANZEN BEREICHS, und die einzige, die man am Text
  // pruefen kann: "Wie gut kannst du verhandeln?" misst Selbstbild und
  // Selbstvertrauen - und beides ist ungleich verteilt. Menschen, die gelernt
  // haben, sich zurueckzunehmen, antworten darauf systematisch niedriger.
  //
  // GEAENDERT AM 21.09.2026 nach Marias Formulierungen: Vorher verlangte dieser
  // Test einen ZEITANKER in jedem Fragetext. Ihre Frage 4 hat keinen ("Erzaehl
  // von einer Situation, in der du Menschen ... gewinnen musstest") und erfuellt
  // die Regel trotzdem vollstaendig - sie verlangt eine einzelne Begebenheit.
  // Der Zeitanker war also nur EINE Form davon; mein Test hat die Form geprueft
  // statt der Sache. Jetzt gilt beides: Zeitanker ODER die Einladung, eine
  // Situation zu erzaehlen.
  const episode = /zuletzt|schon einmal|gerade|letzte|nächsten|situation|erzähl|wiederholt/i;
  const traits = /wie gut|wie sehr|wie stark|bist du eher|würdest du dich/i;

  const de = copy("de").interview.questions;
  for (const question of INTERVIEW_QUESTIONS) {
    const text = de[question.id];
    assert.ok(text, `interview.questions.${question.id} fehlt`);

    // Eine Frage oder eine Erzaehlaufforderung - beides verlangt eine Antwort
    // aus dem eigenen Leben. Ein Aussagesatz waere keines von beidem.
    assert.ok(
      text.title.endsWith("?") || /^erzähl/i.test(text.title),
      `${question.id}: weder Frage noch Erzaehlaufforderung`
    );
    assert.match(text.title, episode, `${question.id}: verlangt keine einzelne Begebenheit`);
    assert.doesNotMatch(text.title, traits, `${question.id}: fragt nach einer Selbsteinschaetzung`);
  }
});

test("beruflich UND privat - sonst findet der Katalog bei halben Leben nichts", () => {
  // Marias Vorgabe ausdruecklich: "nach beruflichen Situationen, aber auch
  // privaten Situationen".
  //
  // Und der Grund, warum das mehr ist als Vollstaendigkeit: Wer drei Jahre
  // Elternzeit hatte, einen Verein traegt oder eine Pflege organisiert, hat
  // dort Faehigkeiten erworben, die in keinem Arbeitszeugnis stehen. Ein
  // Katalog, der nur nach Arbeit fragt, findet bei diesen Menschen wenig - und
  // das waere kein Messergebnis, sondern ein Fehler des Messinstruments.
  const contexts = new Set(INTERVIEW_QUESTIONS.map((question) => question.context));
  assert.ok(contexts.has("professional"), "keine berufliche Frage");
  assert.ok(contexts.has("personal"), "keine Frage ausserhalb der Arbeit");
  assert.ok(contexts.has("either"), "keine Frage, die beides ausdruecklich zulaesst");

  // Und bei "beides" muss es im Text stehen: Ohne den Hinweis erzaehlen
  // Menschen bei einer neutralen Frage fast immer aus dem Beruf.
  for (const locale of ["de", "en"]) {
    const interview = copy(locale).interview as Record<string, string>;
    assert.ok(interview.contextEither, `${locale}: interview.contextEither fehlt`);
    assert.ok(interview.contextPersonal, `${locale}: interview.contextPersonal fehlt`);
    assert.ok(interview.contextProfessional, `${locale}: interview.contextProfessional fehlt`);
  }
});

test("beide Richtungen des Alignments werden gefragt, und zwar zuletzt", () => {
  // Ohne diese zwei Fragen kennt die Teamauswertung Faehigkeiten und keine
  // Rollen: `contested`, `openPosition` und `handoverPath` entstehen erst aus
  // dem Wollen.
  const away = INTERVIEW_QUESTIONS.filter((question) => question.target === "ownership_away");
  const growth = INTERVIEW_QUESTIONS.filter((question) => question.target === "ownership_growth");
  assert.equal(away.length, 1, "keine Frage nach dem Abgeben");
  assert.equal(growth.length, 1, "keine Frage nach dem Hineinwachsen");

  // Sie gehen in die Zukunft und brauchen den Anlauf davor.
  const positions = [away[0], growth[0]].map((question) => INTERVIEW_QUESTIONS.indexOf(question));
  const lastTwo = [INTERVIEW_QUESTIONS.length - 2, INTERVIEW_QUESTIONS.length - 1];
  assert.deepEqual(positions.sort(), lastTwo, "die Fragen nach dem Wollen stehen nicht am Ende");

  // Der vorgeschlagene Wunsch muss einer der gueltigen sein - sonst scheitert
  // die Vorauswahl erst beim Speichern.
  for (const question of INTERVIEW_QUESTIONS) {
    if (question.suggestsWish === null) continue;
    assert.ok(
      (OWNERSHIP_WISHES as readonly string[]).includes(question.suggestsWish),
      `${question.id}: ${question.suggestsWish} ist kein gueltiger Wunsch`
    );
  }
  // Abgeben heisst zunaechst "jemand anders im Team", nicht "einkaufen".
  assert.equal(away[0].suggestsWish, "prefer_other");
  assert.equal(growth[0].suggestsWish, "grow_into");
});

test("die Fragen zum Aussenauftritt zeigen auf Bereiche, die es gibt", () => {
  // Marias Beispiel: "Ihr seid beide sehr ruhig [...] dann braeuchtet ihr
  // vielleicht noch jemanden, der praesentieren kann." Die Bereiche dafuer sind
  // am 21.09.2026 dazugekommen; ein Verweis auf einen Bereich, den die
  // Datenbank nicht kennt, scheitert erst beim Bestaetigen.
  const migrations = readFileSync(MIGRATION, "utf8") + readFileSync(AREAS_MIGRATION, "utf8");
  const known = new Set(
    [...migrations.matchAll(/\('([a-z_0-9]+)', '[a-z_]+', \d+\)/g)].map((match) => match[1])
  );
  assert.ok(known.size >= 47, `nur ${known.size} Bereiche gefunden - das Muster greift nicht`);

  const suggested = INTERVIEW_QUESTIONS.flatMap((question) => [...question.suggestsAreas]);
  assert.ok(suggested.length > 0, "keine Frage legt einen Bereich nahe");
  for (const areaId of suggested) {
    assert.ok(known.has(areaId), `${areaId} steht in keiner Migration`);
  }

  // Und sie haben Beschriftungen, in beiden Sprachen.
  for (const locale of ["de", "en"]) {
    const bundle = copy(locale);
    for (const areaId of suggested) {
      assert.ok(bundle.areaLabels[areaId], `${locale}: areaLabels.${areaId} fehlt`);
    }
    assert.ok(
      bundle.families.communication_representation,
      `${locale}: die Familie hat keine Beschriftung`
    );
  }
});

test("jede Nachfrage ist geschrieben - fuer den Fall, dass kein Modell da ist", () => {
  // Marias Entscheidung: "wenn es nicht verfuegbar ist, soll das angezeigt
  // werden und dann sollen vorgelegte Fragen ausgespielt werden."
  //
  // Und sie sind absichtlich nicht generisch: Eine Nachfrage wie "kannst du das
  // genauer sagen?" ist schlimmer als keine - sie signalisiert, dass niemand
  // zugehoert hat.
  const generic = /kannst du das genauer|mehr dazu|erzähl mehr|noch etwas hinzufügen/i;

  for (const locale of ["de", "en"]) {
    const questions = copy(locale).interview.questions;
    for (const question of INTERVIEW_QUESTIONS) {
      assert.ok(question.followUpIds.length >= 2, `${question.id}: weniger als zwei Nachfragen`);
      const followUps = questions[question.id]?.followUps ?? {};
      for (const followUpId of question.followUpIds) {
        const text = followUps[followUpId];
        assert.ok(text, `${locale}: ${question.id}.followUps.${followUpId} fehlt`);
        assert.match(text, /\?$/, `${locale}: ${question.id}.${followUpId} ist keine Frage`);
        if (locale === "de") {
          assert.doesNotMatch(text, generic, `${question.id}.${followUpId} ist eine Floskel`);
        }
      }
    }
  }
});

test("jede Frage hat einen Hinweis, der Beispiele nennt", () => {
  // Der Hinweis ist die Erlaubnis. "Was hast du ausserhalb der Arbeit auf die
  // Beine gestellt" beantwortet fast niemand, wenn nicht dabeisteht, dass ein
  // Umzug, ein Verein oder eine Pflege gemeint sein darf.
  for (const locale of ["de", "en"]) {
    const questions = copy(locale).interview.questions;
    for (const question of INTERVIEW_QUESTIONS) {
      const hint = questions[question.id]?.hint;
      assert.ok(hint, `${locale}: ${question.id}.hint fehlt`);
      assert.ok(hint.length > 40, `${locale}: ${question.id}.hint sagt zu wenig`);
    }
  }
});

test("die Kennungen passen zu dem, was die Datenbank annimmt", () => {
  assert.equal(
    new Set(INTERVIEW_QUESTION_IDS).size,
    INTERVIEW_QUESTION_IDS.length,
    "zwei Fragen mit derselben Kennung"
  );

  // Das Format steht als Constraint in der Migration - eine laengere oder
  // anders geschriebene Kennung scheitert erst beim Speichern der ersten
  // Antwort.
  for (const id of INTERVIEW_QUESTION_IDS) {
    assert.match(id, /^[a-z][a-z_0-9]{1,39}$/, `${id} passt nicht zum Constraint`);
    // 'model' ist fuer Modellfragen reserviert, auch per Constraint.
    assert.notEqual(id, "model", "'model' ist als Kennung reserviert");
  }
});

test("die Grenze fuer eine Auswertung liegt unter der Zahl der Fragen", () => {
  // Sonst waere eine Auswertung erst moeglich, wenn alles beantwortet ist - und
  // aufhoeren duerfte man nie.
  assert.ok(INTERVIEW_MIN_ANSWERS > 1, "eine Antwort soll keine Rollenlage ergeben");
  assert.ok(INTERVIEW_MIN_ANSWERS < INTERVIEW_QUESTIONS.length);
});

test("fortgesetzt wird in der Reihenfolge des Leitfadens", () => {
  // Wer nach zwei Tagen weitermacht, soll dort weitermachen, wo der Leitfaden
  // weitergeht - nicht dort, wo der Verlauf endet. Zwischendurch koennen
  // Modellfragen gestanden haben.
  assert.equal(nextCatalogueQuestion([])?.id, INTERVIEW_QUESTIONS[0].id);
  assert.equal(
    nextCatalogueQuestion([INTERVIEW_QUESTIONS[0].id])?.id,
    INTERVIEW_QUESTIONS[1].id
  );
  // Eine uebersprungene Frage kommt nicht wieder: Gestellt ist gestellt.
  assert.equal(
    nextCatalogueQuestion([INTERVIEW_QUESTIONS[1].id])?.id,
    INTERVIEW_QUESTIONS[0].id
  );
  assert.equal(nextCatalogueQuestion(INTERVIEW_QUESTION_IDS), null);

  // Unbekanntes zaehlt nicht mit - eine Modellfrage ist keine Katalogfrage.
  const progress = interviewProgress([INTERVIEW_QUESTIONS[0].id, "model", "erfunden"]);
  assert.equal(progress.answered, 1);
  assert.equal(progress.total, INTERVIEW_QUESTIONS.length);
  assert.equal(progress.hasEnough, false);

  assert.equal(interviewProgress(INTERVIEW_QUESTION_IDS).hasEnough, true);
  assert.equal(findInterviewQuestion("gibt_es_nicht"), null);
});

test("die Anleitung sagt, dass man sich Zeit nehmen soll - und was gespeichert wird", () => {
  // GEFORDERT AM 21.09.2026: "es muss eine gute anleitung geben, dass man sich
  // zeit nehmen soll, es soll automatisch gespeichert sein, falls was abstürzt
  // bzw man auch speichern kann falls man nicht alles auf einmal beantworten
  // will."
  //
  // WARUM DAS EIN TEST IST UND NICHT NUR TEXT: Acht Fragen nach echten
  // Situationen sind eine halbe Stunde Arbeit. Wer das nicht weiss, faengt
  // zwischen zwei Terminen an, schreibt drei Stichworte und bekommt eine
  // Auswertung, die aus drei Stichworten besteht. Die Anleitung ist hier keine
  // Hoeflichkeit, sondern Teil des Messinstruments.
  for (const locale of ["de", "en"]) {
    const interview = copy(locale).interview as Record<string, string>;
    for (const key of [
      "guidanceTitle",
      "guidanceTime",
      "guidanceSaving",
      "guidanceDictate",
      "guidanceLength",
      "guidanceNoRight",
      "privacy",
    ]) {
      assert.ok(interview[key], `${locale}: interview.${key} fehlt`);
    }

    // Eine Zeitangabe, keine Floskel: "nimm dir Zeit" ohne Zahl beantwortet
    // die Frage nicht, die Menschen wirklich haben.
    assert.match(interview.guidanceTime, /\d/, `${locale}: die Anleitung nennt keine Dauer`);
    // Und die Erlaubnis, es NICHT in einem Zug zu machen.
    assert.ok(
      interview.guidanceTime.length > 80,
      `${locale}: die Anleitung sagt nicht, dass Aufhoeren in Ordnung ist`
    );

    // Das Speichern muss BEIDES nennen: von allein, und auf Wunsch.
    assert.match(
      interview.guidanceSaving,
      locale === "de" ? /automatisch/ : /automatically/,
      `${locale}: das automatische Speichern wird nicht zugesagt`
    );
    assert.match(
      interview.guidanceSaving,
      locale === "de" ? /später/ : /later/,
      `${locale}: das spaetere Weitermachen wird nicht zugesagt`
    );

    // Diktieren steht dabei - sonst tippen Menschen eine halbe Stunde auf
    // einem Telefon.
    assert.match(
      interview.guidanceDictate,
      locale === "de" ? /diktier/i : /dictate/i,
      `${locale}: das Diktieren wird nicht erwaehnt`
    );
  }
});
