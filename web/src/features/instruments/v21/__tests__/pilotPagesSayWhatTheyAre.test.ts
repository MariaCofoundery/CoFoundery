import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import test from "node:test";

import { CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { REGISTRY_V21 } from "@/features/instruments/v21/registryV21";

/**
 * Die Testfassung ist erreichbar - und sagt, dass sie eine ist.
 *
 * ---------------------------------------------------------------------------
 * WAS DIESEN TEST ERSETZT HAT
 * ---------------------------------------------------------------------------
 *
 * Vorher hieß er „kein Zugang zu v2.1 außerhalb von debug“ und hielt die
 * Seiten in einem Ordner fest, der in Production 404 ist. Das ging nicht mehr:
 * Die fachliche Durchsicht empfiehlt v2.1 ausdrücklich für kognitive
 * Interviews und einen begleiteten Produktpilot - dafür müssen die
 * Teilnehmenden sie erreichen können.
 *
 * Der Schutz liegt jetzt woanders, und er ist stärker als ein Ordnername:
 *
 *   Die ROLLE ist das Tor. Ohne Anmeldung kommt niemand hierher, und die
 *   Datenbank lässt ein Konto ohne Founder-Rolle nicht einmal einen Fragebogen
 *   anlegen - das ist in `alignment_answers`/`assessments` per RLS geprüft.
 *
 *   v1 BLEIBT DIE FASSUNG, DIE GILT. `CURRENT_INSTRUMENT_ID` zeigt weiter auf
 *   v1. Wer v2.1 meint, muss es hinschreiben.
 *
 *   DIE SEITE SAGT, WAS SIE IST. Wer eine halbe Stunde ausfüllt und danach
 *   erfährt, dass es noch keine Auswertung gibt, ist zu Recht verärgert.
 */

const PILOT = join("src", "app", "(product)", "founder-alignment", "pilot");
/**
 * Die zweite Stelle, die die Testfassung kennen darf - und die einzige.
 *
 * Eine Liste statt eines Musters: Wer eine dritte Stelle einbaut, muss sie
 * hier eintragen und dabei kurz ueberlegen, ob sie dorthin gehoert. Genau das
 * ist der Zweck.
 */
const ERLAUBT = [
  join("src", "app", "(product)", "founder-alignment", "versionen") + sep,
  // Das Dashboard: Hinweis auf die neue Fassung und der Archivkasten. Es
  // FUEHRT dorthin, es enthaelt den Fragebogen nicht - ein eigener Test unten
  // haelt das fest.
  join("src", "app", "(product)", "dashboard") + sep,
  // Die Advisor-Seite: Sie zeigt fremde Antworten, wenn sie freigegeben sind.
  // Ein eigener Test unten haelt fest, dass sie dort nichts anfassen kann.
  join("src", "app", "(product)", "advisor", "person") + sep,
];
const ROOT = "src";
const V21 = join("src", "features", "instruments", "v21") + sep;
const INSTRUMENTS = join("src", "features", "instruments") + sep;
const MENTIONS = /instruments\/v21\//;

function pagesOfPilot(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === "page.tsx") found.push(path);
    }
  };
  walk(PILOT);
  return found;
}

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield path;
  }
}

test("der Waechter findet die Pilotseiten", () => {
  // Ein Waechter, der eine leere Menge prueft, ist immer gruen. Die Zahl steht
  // hier absichtlich nicht fest - sie waechst, und ein Test, der bei jeder
  // neuen Seite umfaellt, wird irgendwann nur noch nachgezogen statt gelesen.
  const pages = pagesOfPilot();
  assert.ok(pages.length >= 4, `zu wenige Seiten gefunden: ${pages.join(", ")}`);
  for (const erwartet of ["page.tsx", join("report", "page.tsx"),
                          join("compare", "[partnerId]", "page.tsx"),
                          join("discovery", "page.tsx")]) {
    assert.ok(
      pages.some((path) => path.endsWith(erwartet)),
      `diese Seite fehlt: ${erwartet}`,
    );
  }
});

test("der Fragebogen sagt VOR der ersten Frage, dass er eine Testfassung ist", () => {
  const page = readFileSync(join(PILOT, "page.tsx"), "utf8");
  assert.match(page, /Testfassung/);
  // Und die beiden Folgen, die man nicht hinterher erfahren darf.
  assert.match(page, /noch keine\s*\n?\s*Auswertung|keine\s*\n?\s*Auswertung/,
    "der Hinweis, dass es noch keine Auswertung gibt, fehlt");
  assert.match(page, /dieselbe Fassung|zwei verschiedene Fragebögen/,
    "der Hinweis auf den Vergleich nur innerhalb einer Fassung fehlt");
});

test("v1 bleibt die Fassung, die gilt", () => {
  // Solange das zwei verschiedene Konstanten sind, kann nichts versehentlich
  // die Testfassung ausliefern.
  assert.notEqual(CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID);
  assert.equal(CURRENT_INSTRUMENT_ID, "founder-compatibility-v1");
  assert.equal(REGISTRY_V21.status, "draft");
});

test("jede Pilotseite holt die Person über getRequestUser", () => {
  for (const path of pagesOfPilot()) {
    const page = readFileSync(path, "utf8");
    assert.match(page, /getRequestUser/, path);
    assert.ok(!/supabase\.auth\.getUser/.test(page), path);
  }
});

test("keine Pilotseite verwechselt v2 mit v2.1", () => {
  // Der teure Fehler: Die Seite sucht Antworten unter der Kennung von v2, und
  // jemand sieht einen leeren Fragebogen, obwohl er ihn ausgefuellt hat.
  for (const path of pagesOfPilot()) {
    const page = readFileSync(path, "utf8");
    assert.match(page, /ALIGNMENT_V21_INSTRUMENT_ID/, path);
    assert.ok(!/ALIGNMENT_V2_INSTRUMENT_ID/.test(page), path);
  }
});

test("die Wahlseite nennt beide Fassungen und empfiehlt keine", () => {
  const page = readFileSync(
    join("src", "app", "(product)", "founder-alignment", "versionen", "page.tsx"), "utf8");
  assert.match(page, /CURRENT_INSTRUMENT_ID/);
  assert.match(page, /ALIGNMENT_V21_INSTRUMENT_ID/);
  // Sie erzwingt nichts: kein redirect ausser dem zum Login.
  const redirects = page.match(/redirect\(/g) ?? [];
  assert.equal(redirects.length, 1, "die Wahlseite leitet irgendwohin um");
  assert.match(page, /login/);
});

test("das Dashboard fuehrt zur Testfassung, enthaelt sie aber nicht", () => {
  // Der Unterschied ist wichtig: Ein Link ist in Ordnung, ein zweiter
  // Fragebogen an anderer Stelle nicht. Sonst gaebe es zwei Wege, dieselbe
  // Antwort zu geben, und beide wuerden auseinanderlaufen.
  const page = readFileSync(
    join("src", "app", "(product)", "dashboard", "page.tsx"), "utf8");
  assert.match(page, /TransitionAnnounce/);
  assert.match(page, /VersionArchiveCard/);
  for (const verboten of ["QuestionnaireV21", "AnswerFieldV21", "saveAnswerV21", "ReportViewV21"]) {
    assert.ok(!page.includes(verboten), `das Dashboard enthaelt ${verboten}`);
  }
});

test("der Hinweis erscheint nicht fuer Menschen, die die alte Fassung nicht kennen", () => {
  // Wer gerade erst anfaengt, soll keinen Hinweis auf eine Neufassung von
  // etwas bekommen, das er nie gesehen hat - er soll einfach den aktuellen
  // Fragebogen sehen.
  const page = readFileSync(
    join("src", "app", "(product)", "dashboard", "page.tsx"), "utf8");
  assert.match(page, /versionState\.announce && <TransitionAnnounce/);
});

test("der Advisor kann fremde Antworten nicht anfassen", () => {
  // Dieselbe Ansicht zeigt dem Advisor fremde Antworten. Ein Haekchen
  // „darueber moechte ich sprechen“ an einer Antwort, die einem nicht gehoert,
  // waere dort falsch - die Datenbank wuerde den Schreibversuch abweisen, aber
  // ein Bedienelement, das nichts tun darf, ist ein Fehler in der Anzeige und
  // keine Sicherheitsstufe.
  const page = readFileSync(
    join("src", "app", "(product)", "advisor", "person", "[userId]", "page.tsx"), "utf8");
  assert.match(page, /ReportViewV21/);
  assert.ok(!/canMark/.test(page), "die Advisor-Seite erlaubt das Markieren");

  // Und die Voreinstellung muss „nein“ sein, sonst haette das Weglassen
  // genau die falsche Wirkung.
  const view = readFileSync(
    join("src", "features", "instruments", "v21", "ReportViewV21.tsx"), "utf8");
  assert.match(view, /canMark = false/);
});

test("die Testfassung wird nur von den Pilotseiten, der Wahlseite, dem Dashboard und der Advisor-Seite erreicht", () => {
  // Nicht mehr „nur unter debug“, aber weiterhin an einer Stelle: Ein Link aus
  // dem Dashboard ist in Ordnung, ein zweiter Fragebogen an anderer Stelle
  // nicht. Wer v2.1 einbindet, soll es bewusst tun.
  const outside: string[] = [];
  for (const file of sourceFiles(ROOT)) {
    if (file.startsWith(V21) || file.startsWith(PILOT)) continue;
    if (ERLAUBT.some((prefix) => file.startsWith(prefix))) continue;
    if (file.startsWith(INSTRUMENTS) && !file.includes(sep + "v2")) continue;
    if (MENTIONS.test(readFileSync(file, "utf8"))) outside.push(file);
  }
  assert.deepEqual(
    outside,
    [],
    "Diese Dateien binden die Testfassung ausserhalb der Pilotseiten ein:\n" + outside.join("\n"),
  );
});
