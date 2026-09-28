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

test("es gibt die drei Pilotseiten", () => {
  // Ein Waechter, der eine leere Menge prueft, ist immer gruen.
  const pages = pagesOfPilot();
  assert.ok(pages.length >= 3, `zu wenige Seiten gefunden: ${pages.join(", ")}`);
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

test("die Testfassung wird nur von den Pilotseiten erreicht", () => {
  // Nicht mehr „nur unter debug“, aber weiterhin an einer Stelle: Ein Link aus
  // dem Dashboard ist in Ordnung, ein zweiter Fragebogen an anderer Stelle
  // nicht. Wer v2.1 einbindet, soll es bewusst tun.
  const outside: string[] = [];
  for (const file of sourceFiles(ROOT)) {
    if (file.startsWith(V21) || file.startsWith(PILOT)) continue;
    if (file.startsWith(INSTRUMENTS) && !file.includes(sep + "v2")) continue;
    if (MENTIONS.test(readFileSync(file, "utf8"))) outside.push(file);
  }
  assert.deepEqual(
    outside,
    [],
    "Diese Dateien binden die Testfassung ausserhalb der Pilotseiten ein:\n" + outside.join("\n"),
  );
});
