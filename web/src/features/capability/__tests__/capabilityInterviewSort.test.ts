import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  INTERVIEW_QUESTIONS,
  findInterviewQuestion,
} from "@/features/capability/capabilityInterviewGuide";
import { MAX_CONFIRMED_AREAS } from "@/features/capability/capabilityTypes";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const ACTIONS = "src/features/capability/capabilityInterviewActions.ts";
const WRITE = "src/features/capability/capabilityEvidenceWrite.ts";
const FORM = "src/features/capability/InterviewSortForm.tsx";
const PAGE = "src/app/(product)/profile/interview/sort/page.tsx";
const DATA = "src/features/capability/capabilityInterviewData.ts";

const sortCopy = (locale: string) =>
  (
    JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      interview: { sort: Record<string, string> & { errors: Record<string, string> } };
    }
  ).interview.sort;

/**
 * Antworten einordnen - der Schritt, der das Gespräch einlöst.
 *
 * Bis dahin liegen acht Erzaehlungen in einer Tabelle und tun nichts. Hier
 * werden sie zu Eintraegen im Faehigkeitsmodell - und damit zu dem, was
 * Vergleich, Freigabeleiter und spaeter die Teamauswertung lesen koennen.
 *
 * Die Datenbankseite prueft `supabase/tests/capability_interview.sql` mit 18
 * pgTAP-Faellen, darunter die beiden Richtungen des Loeschens.
 */

test("es gibt nur einen Weg, auf dem eine Staerke in das Modell kommt", () => {
  // ZWEI UMSETZUNGEN DESSELBEN VORGANGS waeren zwei Wahrheiten darueber, was
  // eine Staerke ist - und die zweite haette beim ersten Schema-Wechsel
  // gefehlt. Deshalb schreibt das Interview mit derselben Funktion wie das
  // Textfeld.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /attachCapabilityEvidence\(\{/);
  assert.doesNotMatch(
    actions,
    /from\("person_capability_entries"\)/,
    "das Interview schreibt Eintraege selbst"
  );
  assert.doesNotMatch(
    actions,
    /from\("person_capability_evidence"\)/,
    "das Interview schreibt Belege selbst"
  );

  // Und das Textfeld nimmt denselben Weg.
  assert.match(
    codeOnly("src/features/capability/capabilityActions.ts"),
    /attachCapabilityEvidence\(\{/
  );
});

test("der Vermerk 'eingeordnet' kommt NACH dem Schreiben", () => {
  // Waere der Verweis vorher gesetzt, verschwaende ein fehlgeschlagenes
  // Schreiben die Antwort aus der Liste - und niemand wuesste, dass sie fehlt.
  const actions = codeOnly(ACTIONS);
  const writeAt = actions.indexOf("attachCapabilityEvidence({");
  const linkAt = actions.indexOf("evidence_id: written.evidenceId");
  assert.ok(writeAt > 0 && linkAt > writeAt, "der Vermerk steht vor dem Schreiben");

  // Und wenn der Vermerk scheitert, wird das gesagt - die Antwort kommt dann
  // noch einmal, und doppeltes Einordnen waere die Folge.
  assert.match(actions, /error=link/);
  for (const locale of ["de", "en"]) {
    const link = sortCopy(locale).errors.link;
    assert.ok(link, `${locale}: der Fehlertext fuer den Vermerk fehlt`);
    assert.match(
      link,
      locale === "de" ? /doppelt/ : /twice/,
      `${locale}: der Text warnt nicht vor doppeltem Einordnen`
    );
  }
});

test("eingeordnet heisst: es haengt ein Beleg daran", () => {
  // Kein eigenes Zustandsfeld, kein Datum "sorted_at": Eine Antwort ist
  // eingeordnet, wenn sie zu Evidenz geworden ist - das ist die Sache selbst
  // und nicht ihre Buchhaltung. Zwei Merkmale fuer denselben Zustand koennten
  // auseinanderlaufen.
  const data = codeOnly(DATA);
  assert.match(data, /\.is\("evidence_id", null\)/);
  assert.match(data, /\.not\("answer", "is", null\)/);
  // Aelteste zuerst - in der Reihenfolge, in der erzaehlt wurde.
  assert.match(data, /\.order\("answered_at", \{ ascending: true \}\)/);
});

test("die zwei Quellen stehen getrennt, mit ihrer Herkunft", () => {
  // AUS DEM TEXT erkannt ist etwas anderes als AUS DER FRAGE gefolgert. Beides
  // in einen Topf zu werfen waere ein Vorschlag, dessen Herkunft niemand mehr
  // pruefen kann - und die Frage-Herkunft ist die staerkere Aussage, weil sie
  // nicht von einer Begriffsliste abhaengt.
  const form = codeOnly(FORM);
  assert.match(form, /interview\.sort\.fromQuestion/);
  assert.match(form, /interview\.sort\.fromText/);
  // Was aus der Frage folgt, erscheint nicht doppelt.
  assert.match(form, /!suggestedAreas\.includes\(area\.areaId\)/);

  for (const locale of ["de", "en"]) {
    const copy = sortCopy(locale);
    assert.ok(copy.fromQuestionHint, `${locale}: die Herkunft wird nicht erklaert`);
    // Und die Erklaerung sagt ausdruecklich, dass es KEIN Fund im Text ist.
    assert.match(
      copy.fromQuestionHint,
      locale === "de" ? /kein Fund/ : /not a finding/,
      `${locale}: die Erklaerung unterscheidet die Quellen nicht`
    );
  }

  // Woran im Text erkannt wurde, steht dabei - nie eine Blackbox.
  assert.match(form, /area\.matchedTerms\.join/);
});

test("nichts ist vorangehakt, und keine Auswahl ist erlaubt", () => {
  // Vorbelegen wuerde die Frage beantworten, die gerade gestellt wird -
  // dieselbe Regel wie im Textfeld.
  const form = codeOnly(FORM);
  assert.match(form, /useState<string\[\]>\(\[\]\)/);
  assert.doesNotMatch(form, /defaultChecked/, "ein Bereich ist vorangehakt");

  // Eine leere Auswahl ist eine Aussage: Dann greift der Auffangwert, und die
  // Erzaehlung geht nicht verloren.
  assert.match(source(WRITE), /chosen\.length > 0 \? chosen : \["other"\]/);
  for (const locale of ["de", "en"]) {
    assert.ok(sortCopy(locale).emptyAllowed, `${locale}: es steht nicht da, dass leer geht`);
  }
});

test("die Grenze von drei gilt auch ohne Browser", () => {
  // Das Formular begrenzt schon, aber das Formular ist nicht die Grenze.
  assert.match(codeOnly(ACTIONS), /\.slice\(0, MAX_CONFIRMED_AREAS\)/);
  assert.match(codeOnly(FORM), /current\.length >= MAX_CONFIRMED_AREAS/);
  assert.equal(MAX_CONFIRMED_AREAS, 3, "die Grenze hat sich geaendert - die Texte nennen eine Zahl");
});

test("der Verantwortungswunsch ist nur da vorausgewaehlt, wo danach gefragt wurde", () => {
  // Wer auf "was wuerdest du lieber abgeben" geantwortet hat, hat den Wunsch
  // genannt. Ihn erneut leer zu erfragen waere, als haette man nicht
  // zugehoert. Bei allen anderen Fragen bleibt er offen - eine Vorauswahl
  // waere dort eine Behauptung.
  assert.match(codeOnly(FORM), /defaultValue=\{suggestedWish \?\? ""\}/);

  const withWish = INTERVIEW_QUESTIONS.filter((question) => question.suggestsWish !== null);
  assert.equal(withWish.length, 2, "genau die zwei Fragen nach dem Wollen");
  assert.equal(findInterviewQuestion("would_hand_over")?.suggestsWish, "prefer_other");
  assert.equal(findInterviewQuestion("want_to_own")?.suggestsWish, "grow_into");

  // Und die Seite gibt ihn weiter, statt ihn zu erfinden.
  assert.match(codeOnly(PAGE), /suggestedWish=\{question\?\.suggestsWish \?\? null\}/);
});

test("die Frage und die eigene Antwort stehen ueber dem Einordnen", () => {
  // Ohne sie ordnet man einen Text ein, den man vor drei Tagen geschrieben
  // hat, und erinnert sich nicht mehr, worauf er antwortete.
  const page = source(PAGE);
  const answerAt = page.indexOf("{turn.answer}");
  const formAt = page.indexOf("<InterviewSortForm");
  assert.ok(answerAt > 0 && answerAt < formAt, "die Antwort steht unter dem Formular");
});

test("ein leeres Ergebnis klingt nicht wie ein Mangel der Person", () => {
  // Derselbe Grundsatz wie im Textfeld: Nichts erkannt heisst, dass unsere
  // Begriffsliste nicht getroffen hat - nicht, dass die Erzaehlung nichts
  // hergab.
  for (const locale of ["de", "en"]) {
    const copy = sortCopy(locale);
    assert.ok(copy.nothingFound, `${locale}: der leere Fall fehlt`);
    assert.match(
      copy.nothingFound,
      locale === "de" ? /sagt nichts über deine Erzählung/ : /says nothing about your story/,
      `${locale}: der leere Fall klingt wie ein Mangel`
    );
  }
});

test("wartende Antworten stehen im Profil vor dem naechsten Gespraech", () => {
  // Wer acht Fragen beantwortet und nicht eingeordnet hat, hat noch nichts im
  // Profil - und ein zweites Gespraech zu beginnen waere die falsche naechste
  // Handlung.
  const profile = source("src/app/(product)/profile/page.tsx");
  assert.match(profile, /unsortedAnswers > 0 \?/);
  const pendingAt = profile.indexOf('t("interview.sortPending"');
  const startAt = profile.indexOf('t("interview.start")');
  assert.ok(pendingAt > 0 && pendingAt < startAt, "der Hinweis steht nach dem Startknopf");
  assert.match(profile, /href="\/profile\/interview\/sort"/);

  for (const locale of ["de", "en"]) {
    const interview = (
      JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
        interview: Record<string, string>;
      }
    ).interview;
    assert.ok(interview.sortPending, `${locale}: interview.sortPending fehlt`);
    assert.ok(interview.sortCta, `${locale}: interview.sortCta fehlt`);
    // Gebeugt: "1 Antworten warten" ist der Fehler, den man ueberall liest.
    assert.match(interview.sortPending, /\{count, plural,/, `${locale}: ungebeugt`);
  }
});

test("alle Texte des Schrittes stehen in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const copy = sortCopy(locale);
    for (const key of [
      "title",
      "remaining",
      "yourAnswer",
      "whichAreas",
      "whichAreasText",
      "fromQuestion",
      "fromQuestionHint",
      "fromText",
      "analysing",
      "nothingFound",
      "because",
      "limit",
      "submit",
      "emptyAllowed",
      "doneTitle",
      "doneText",
      "toProfile",
      "toInterview",
      "alreadySorted",
    ]) {
      assert.ok(copy[key], `${locale}: interview.sort.${key} fehlt`);
    }
    for (const key of ["area", "save", "link"]) {
      assert.ok(copy.errors[key], `${locale}: interview.sort.errors.${key} fehlt`);
    }
    assert.match(copy.remaining, /\{count, plural,/, `${locale}: ungebeugt`);
  }
});
